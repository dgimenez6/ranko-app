import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const payload = await req.json();
    const review_id = payload.record?.id || payload.review_id;
    if (!review_id) throw new Error("ID de reseña no proporcionado");

    // 1. Obtener datos con JOIN para tener todo el contexto
    const { data: review, error: revError } = await supabase
      .from('reviews')
      .select(`*, businesses (*, whatsapp_configs (phone_number))`)
      .eq('id', review_id)
      .single();

    if (revError || !review) throw new Error("Reseña o negocio no encontrado");

    const biz = review.businesses;
    const ownerPhone = Array.isArray(biz.whatsapp_configs) ? biz.whatsapp_configs[0]?.phone_number : biz.whatsapp_configs?.phone_number;
    
    if (!ownerPhone) return new Response("No phone configured", { status: 200 });

    const lang = biz.language || 'es';
    const isPT = lang === 'pt';
    const staffList = biz.staff_names?.join(', ') || 'No especificado';

    // 2. IA con Formato JSON para Tags e Inteligencia
    const systemPrompt = `Sos el asistente de "${biz.business_name}".
      TONO: ${biz.reply_tone || 'friendly'}.
      CEREBRO: ${biz.business_info || 'Atención de calidad.'}
      STAFF: ${staffList}.

      TAREA: Respondé al cliente y analizá la reseña.
      DEVOLVÉ UN JSON ESTRICTO:
      {
        "reply": "Texto de la respuesta (máx 2 párrafos)",
        "analysis": [{ "topic": "Comida|Servicio|Limpieza|Precio|Ambiente", "sentiment": "pos|neg", "entity": "Nombre de staff si aparece" }]
      }`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Rating: ${review.star_rating}⭐. Comentario: "${review.comment_text || 'Sin texto'}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // 3. Publicación en Google (4-5 estrellas)
    let postedStatus = 'pending';
    if (review.star_rating >= 4 && biz.auto_reply_5_stars && biz.google_access_token) {
      const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${review.review_name}/reply`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${biz.google_access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: result.reply })
      });
      if (gRes.ok) postedStatus = 'posted';
    }

    // 4. Notificación WhatsApp
    const message = (postedStatus === 'posted')
      ? (isPT ? `✅ *Auto-Resposta:* Respondi no Google (${review.star_rating}⭐):\n\n"${result.reply}"` : `✅ *Auto-Respuesta:* Respondí en Google (${review.star_rating}⭐):\n\n"${result.reply}"`)
      : (isPT ? `🔔 *Nova Avaliação (${review.star_rating}⭐):*\n"${review.comment_text || '-'}"\n\n*Sugestão:* "${result.reply}"` : `🔔 *Nueva Reseña (${review.star_rating}⭐):*\n"${review.comment_text || '-'}"\n\n*Sugerencia:* "${result.reply}"`);

    await fetch(`${Deno.env.get('EVOLUTION_API_URL')}/message/sendText/${Deno.env.get('EVOLUTION_INSTANCE')}`, {
      method: 'POST',
      headers: { 'apikey': Deno.env.get('EVOLUTION_API_KEY')!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: ownerPhone, text: message })
    });

    // 5. INSERT CLAVE: Guardamos los TAGS para el Dashboard
    await supabase.from("reviews_logs").insert({
      business_id: biz.id,
      stars: review.star_rating,
      review_text: review.comment_text,
      reply_text: result.reply,
      tags: result.analysis, // <--- Esto es lo que pinta el Dashboard
      status: postedStatus
    });

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});