import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Recibir datos del Webhook (db_reviews_logs)
  const payload = await req.json();
  const record = payload.record;

  if (!record) return new Response("No record found", { status: 400 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 2. Obtener datos del negocio y configuración de WhatsApp
    const { data: biz, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select(`
        business_name,
        language,
        country_code,
        whatsapp_configs (phone_number)
      `)
      .eq('id', record.business_id)
      .maybeSingle();

    if (bizError || !biz) throw new Error("Local no encontrado en la base de datos");

    const phone = Array.isArray(biz.whatsapp_configs) 
      ? biz.whatsapp_configs[0]?.phone_number 
      : (biz.whatsapp_configs as any)?.phone_number;

    if (!phone) {
      console.log(`⚠️ Negocio ${biz.business_name} sin teléfono configurado.`);
      return new Response("No phone configured", { status: 200 });
    }

    // 3. Internacionalización (ES/PT)
    const isPT = biz.language === 'pt' || biz.country_code === 'BR';
    const stars = "⭐".repeat(record.stars || 0);

    const message = isPT 
      ? `🚨 *ALERTA DE DEFESA RANKO*\n\n` +
        `📍 *Local:* ${biz.business_name}\n` +
        `⭐ *Rating:* ${stars} (${record.stars}/5)\n` +
        `💬 *Feedback:* "${record.review_text || 'Sem comentário'}"\n\n` +
        `*Ação:* O cliente está no Interceptor. Entre em contato se necessário!`
      : `🚨 *ALERTA DE DEFENSA RANKO*\n\n` +
        `📍 *Local:* ${biz.business_name}\n` +
        `⭐ *Rating:* ${stars} (${record.stars}/5)\n` +
        `💬 *Feedback:* "${record.review_text || 'Sin comentario'}"\n\n` +
        `*Acción:* El cliente está en el Interceptor. ¡Revisar en el salón!`;

    // 4. Envío vía Evolution API
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';
    const evoUrl = Deno.env.get('EVOLUTION_API_URL') || "https://evolution-api-production-0695.up.railway.app";
    
    const evoRes = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
      method: 'POST',
      headers: { 
        'apikey': evoApiKey!, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        number: phone, 
        text: message 
      })
    });

    if (!evoRes.ok) throw new Error("Error en el envío de alerta por WhatsApp.");

    return new Response("Alerta enviada correctamente", { status: 200 });

  } catch (err) {
    console.error("Critical Alert Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});