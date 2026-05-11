import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    
    // 1. Identificación del recurso (Pagos o Suscripciones)
    const resourceId = body.data?.id || body.resource?.split('/').pop();
    const topic = body.type || body.topic || body.action || "";

    if (!resourceId || (!topic.includes("payment") && !topic.includes("preapproval"))) {
      return new Response("Ignored topic", { status: 200 });
    }

    let paymentData = null;
    let usedCountry = "";
    let businessId = "";

    // 2. Lógica Multi-Mercado (AR/BR)
    // Intentamos obtener el recurso (Payment o Preapproval)
    const endpoint = topic.includes("preapproval") ? "preapprovals" : "payments";
    
    // Intento con Argentina
    const resAR = await fetch(`https://api.mercadopago.com/v1/${endpoint}/${resourceId}`, {
      headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_AR')}` }
    });

    if (resAR.ok) {
      paymentData = await resAR.json();
      usedCountry = "AR";
    } else {
      // Intento con Brasil
      const resBR = await fetch(`https://api.mercadopago.com/v1/${endpoint}/${resourceId}`, {
        headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_BR')}` }
      });
      if (resBR.ok) {
        paymentData = await resBR.json();
        usedCountry = "BR";
      }
    }

    // 3. Procesamiento del Recurso Aprobado
    // En suscripciones el estado es "authorized", en pagos es "approved"
    if (paymentData && ["approved", "authorized"].includes(paymentData.status)) {
      businessId = paymentData.external_reference;

      if (!businessId) {
        console.error("Critical: Pago sin external_reference");
        return new Response("No business_id", { status: 200 }); 
      }

      // 4. Actualización Atómica y Sincronización de Idioma
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          plan_status: 'active',
          credits_used: 0, // Reseteo de consumo al pagar
          last_payment_date: new Date().toISOString(),
          mp_payment_id: String(resourceId),
          country_code: usedCountry,
          // Seteamos el idioma base según el mercado del pago
          language: usedCountry === 'BR' ? 'pt' : 'es'
        })
        .eq("id", businessId);

      if (updateError) throw updateError;

      console.log(`✅ Plan ACTIVADO: ${businessId} | Mercado: ${usedCountry} | Idioma: ${usedCountry === 'BR' ? 'PT' : 'ES'}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});