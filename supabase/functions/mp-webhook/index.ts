import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    
    // 1. Identificación del recurso y tópico
    // MP manda 'data.id' para notificaciones nuevas y 'resource' para las viejas
    const resourceId = body.data?.id || (body.resource ? body.resource.split('/').pop() : null);
    const topic = body.type || body.topic || "";

    if (!resourceId || (!topic.includes("payment") && !topic.includes("preapproval"))) {
      return new Response("Ignored topic", { status: 200 });
    }

    let paymentData = null;
    let usedCountry = "";

    // 2. Lógica Multi-Mercado Inteligente
    const endpoint = topic.includes("preapproval") ? "preapprovals" : "payments";
    
    // Función auxiliar para probar tokens
    const fetchFromMP = async (token: string) => {
      const res = await fetch(`https://api.mercadopago.com/v1/${endpoint}/${resourceId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      return res.ok ? await res.json() : null;
    };

    // Intentamos AR primero, luego BR
    paymentData = await fetchFromMP(Deno.env.get('MP_ACCESS_TOKEN_AR')!);
    if (paymentData) {
      usedCountry = "AR";
    } else {
      paymentData = await fetchFromMP(Deno.env.get('MP_ACCESS_TOKEN_BR')!);
      if (paymentData) usedCountry = "BR";
    }

    if (!paymentData) {
      return new Response("Resource not found in AR or BR", { status: 200 });
    }

    // 3. Procesamiento de Estado (Aprobado o Autorizado para Suscripciones)
    const isApproved = ["approved", "authorized"].includes(paymentData.status);

    if (isApproved) {
      // Búsqueda profunda de businessId (Mercado Pago es inconsistente con este campo)
      const businessId = paymentData.external_reference || 
                         paymentData.reason || // A veces se guarda aquí en suscripciones
                         (paymentData.back_url ? new URL(paymentData.back_url).searchParams.get("external_reference") : null);

      if (!businessId) {
        console.error(`⚠️ Pago ${resourceId} sin external_reference. Datos:`, JSON.stringify(paymentData));
        return new Response("No business_id found", { status: 200 }); 
      }

      // 4. Verificación de Idempotencia (No activar dos veces lo mismo)
      const { data: existingBiz } = await supabase
        .from("businesses")
        .select("mp_payment_id, plan_status")
        .eq("id", businessId)
        .maybeSingle();

      if (existingBiz?.mp_payment_id === String(resourceId)) {
        return new Response("Already processed", { status: 200 });
      }

      // 5. Activación Atómica
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          plan_status: 'active',
          credits_used: 0, 
          last_payment_date: new Date().toISOString(),
          mp_payment_id: String(resourceId),
          country_code: usedCountry,
          language: usedCountry === 'BR' ? 'pt' : 'es'
        })
        .eq("id", businessId);

      if (updateError) throw updateError;

      console.log(`✅ SaaS ACTIVADO: ${businessId} | Mercado: ${usedCountry} | Ref: ${resourceId}`);
    }

    return new Response(JSON.stringify({ status: "processed" }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Critical Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});