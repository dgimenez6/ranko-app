import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    
    // 1. Validación de tipo de evento
    // Mercado Pago envía notificaciones por 'payment' o 'subscription' (preapproval)
    const resourceId = body.data?.id || body.resource?.split('/').pop();
    const topic = body.type || body.topic;

    if (!resourceId || (topic !== "payment" && topic !== "subscription_preapproval")) {
      return new Response("Ignored topic", { status: 200 });
    }

    let paymentData = null;
    let usedToken = "";

    // 2. Lógica de Reintento Multi-Mercado (AR/BR)
    // Intentamos AR
    const resAR = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_AR')}` }
    });

    if (resAR.ok) {
      paymentData = await resAR.json();
      usedToken = "AR";
    } else {
      // Si falla AR, intentamos BR
      const resBR = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { "Authorization": `Bearer ${Deno.env.get('MP_ACCESS_TOKEN_BR')}` }
      });
      if (resBR.ok) {
        paymentData = await resBR.json();
        usedToken = "BR";
      }
    }

    // 3. Procesamiento del Pago Aprobado
    if (paymentData && (paymentData.status === "approved" || paymentData.status === "authorized")) {
      // IMPORTANTE: Asegúrate de enviar el ID del negocio en el campo 'external_reference' 
      // cuando crees el checkout en el frontend.
      const businessId = paymentData.external_reference;

      if (!businessId) {
        console.error("Critical: Pago sin external_reference");
        return new Response("No business_id associated", { status: 200 }); 
      }

      // 4. Actualización Atómica en Supabase
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          plan_status: 'active',
          credits_used: 0,
          last_payment_date: new Date().toISOString(),
          mp_payment_id: resourceId
        })
        .eq("id", businessId);

      if (updateError) throw updateError;

      // 5. Notificación al dueño por WhatsApp (Opcional pero muy Pro)
      // Podés llamar a tu función de WhatsApp aquí para avisarle que su plan está activo.
      console.log(`✅ Plan activado para negocio ${businessId} (${usedToken})`);
    }

    // Mercado Pago requiere un 200 o 201 rápido para no reintentar el envío
    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    // Respondemos 400 solo en errores críticos para que MP reintente si es necesario
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});