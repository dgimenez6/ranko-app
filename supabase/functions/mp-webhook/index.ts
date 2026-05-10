import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    
    // 1. Identificación del recurso
    // Mercado Pago puede enviar el ID en diferentes lugares según el evento
    const resourceId = body.data?.id || body.resource?.split('/').pop();
    const topic = body.type || body.topic || body.action;

    // Ignoramos eventos que no sean pagos o suscripciones (preapprovals)
    if (!resourceId || (!topic.includes("payment") && !topic.includes("preapproval"))) {
      return new Response("Ignored topic", { status: 200 });
    }

    let paymentData = null;
    let usedCountry = "";

    // 2. Lógica de Reintento Multi-Mercado (AR/BR)
    // Intentamos obtener el pago con el token de Argentina
    const resAR = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_AR')}` }
    });

    if (resAR.ok) {
      paymentData = await resAR.json();
      usedCountry = "AR";
    } else {
      // Si falla AR, intentamos con el de Brasil
      const resBR = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_BR')}` }
      });
      if (resBR.ok) {
        paymentData = await resBR.json();
        usedCountry = "BR";
      }
    }

    // 3. Procesamiento del Pago Aprobado
    if (paymentData && (paymentData.status === "approved" || paymentData.status === "authorized")) {
      // El external_reference DEBE ser el UUID del negocio que guardamos en la DB
      const businessId = paymentData.external_reference;

      if (!businessId) {
        console.error("Critical: Pago aprobado sin external_reference");
        return new Response("No business_id associated", { status: 200 }); 
      }

      // 4. Actualización Atómica en Supabase
      // Reseteamos créditos y activamos el plan
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          plan_status: 'active',
          credits_used: 0,
          last_payment_date: new Date().toISOString(),
          mp_payment_id: String(resourceId),
          // Guardamos qué moneda/mercado pagó para métricas
          country_code: usedCountry 
        })
        .eq("id", businessId);

      if (updateError) throw updateError;

      console.log(`✅ Plan activado con éxito para: ${businessId} (Mercado: ${usedCountry})`);
    }

    // Mercado Pago requiere un 200 rápido para confirmar recepción
    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    // Respondemos 400 para que MP reintente si hubo un error de red o timeout
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});