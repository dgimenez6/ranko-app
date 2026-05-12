import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const payload = await req.json();
    // Soporta disparos manuales o por Webhook de base de datos
    const review_id = payload.record?.id || payload.review_id;
    
    if (!review_id) throw new Error("ID de reseña no proporcionado");

    // 1. Obtener reseña y configuración (JOIN con whatsapp_configs para el teléfono)
    const { data: review, error: revError } = await supabase
      .from('reviews')
      .select(`
        *,
        businesses (
          *,
          whatsapp_configs (phone_number)
        )
      `)
      .eq('id', review_id)
      .single();

    if (revError || !review) throw new Error("Reseña o configuración de negocio no encontrada");

    const biz = review.businesses;
    // Extraemos el teléfono desde la tabla relacionada whatsapp_configs
    const ownerPhone = biz.whatsapp_configs?.[0]?.phone_number || biz.whatsapp_configs?.phone_number;
    
    if (!ownerPhone) {
      console.log(`⚠️ Skip: No se encontró teléfono en whatsapp_configs para ${biz.business_name}`);
      return new Response("No phone in whatsapp_configs", { status: 200 });
    }

    const lang = biz.language || 'es';
    const isPT = lang === 'pt';
    const tone = biz.reply_tone || 'professional';
    
    // 2. IA con el "Cerebro" del negocio y regionalismos
    const regionPrompt = biz.country_code === 'AR' 
      ? "Respondé en Español de Argentina con voseo (usá 'vení', 'che', 'atendé')." 
      : isPT ? "Responda em Português do Brasil de forma natural e amigável." : "Respondé en Español neutro.";

    const systemPrompt = `Sos el asistente de atención al cliente de "${biz.business_name}". 
      Instrucciones de región: ${regionPrompt}
      Tono: ${tone}.
      Info del negocio: ${biz.business_info || 'Comercio enfocado en excelente atención.'}
      
      Reglas de respuesta:
      - Si es 4-5 estrellas: Agradecé cálidamente e incluí: ${biz.promo_text || 'Gracias por tu visita.'}
      - Si es 1-3 estrellas: Mostrá empatía, pedí disculpas y pedí que se contacten por privado.
      - Sé breve (máximo 2 párrafos). No inventes información que no esté en el contexto.`;

    let reply = "";
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Rating: ${review.star_rating} estrellas. Comentario: "${review.comment_text || 'El cliente no dejó comentarios.'}"` }
          ],
          temperature: 0.7,
          max_tokens: 250
        }),
      });
      const aiData = await aiResponse.json();
      if (aiData.error) throw new Error(aiData.error.message);
      reply = aiData.choices[0].message.content.trim();
    } catch (aiErr) {
      console.error("Error OpenAI:", aiErr);
      reply = isPT ? "Nova avaliação recebida! Verifique seu painel para responder." : "¡Nueva reseña recibida! Entra a tu panel para responder.";
    }

    // 3. Publicación automática en Google My Business (Solo 4-5 estrellas si está activo)
    const isAutoReplyEnabled = (review.star_rating >= 4 && biz.auto_reply_5_stars);
    let postedStatus = 'pending';

    if (isAutoReplyEnabled && biz.google_access_token) {
      try {
        const googleRes = await fetch(`https://mybusiness.googleapis.com/v4/${review.review_name}/reply`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${biz.google_access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ comment: reply })
        });
        
        if (googleRes.ok) postedStatus = 'posted';
      } catch (gErr) {
        console.error("Error publicando en Google:", gErr);
        postedStatus = 'error_posting';
      }
    }

    // 4. Notificación vía WhatsApp (Evolution API)
    const whatsappText = isAutoReplyEnabled
      ? (isPT 
          ? `✅ *Auto-Resposta:* Respondi no Google para *${biz.business_name}* (${review.star_rating}⭐):\n\n"${reply}"` 
          : `✅ *Auto-Respuesta:* Respondí en Google por *${biz.business_name}* (${review.star_rating}⭐):\n\n"${reply}"`)
      : (isPT 
          ? `🔔 *Nova Avaliação (${review.star_rating}⭐):*\n"${review.comment_text || '-'}"\n\n*Sugestão de resposta:* \n"${reply}"` 
          : `🔔 *Nueva Reseña (${review.star_rating}⭐):*\n"${review.comment_text || '-'}"\n\n*Sugerencia de respuesta:* \n"${reply}"`);

    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    
    await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
      method: 'POST',
      headers: { 'apikey': evoApiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: ownerPhone, text: whatsappText })
    });

    // 5. Registro final de la gestión
    await supabase.from("reviews_logs").insert({
      business_id: biz.id,
      stars: review.star_rating,
      review_text: review.comment_text,
      reply_text: reply,
      status: postedStatus
    });

    return new Response("Process Completed", { status: 200 });

  } catch (err) {
    console.error("Error crítico en process-new-review:", err.message);
    return new Response(err.message, { status: 500 });
  }
});