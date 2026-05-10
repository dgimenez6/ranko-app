import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const payload = await req.json();
    // Soporte tanto para triggers de DB como para llamadas directas
    const review_id = payload.record?.id || payload.review_id;
    
    if (!review_id) throw new Error("ID de reseña no proporcionado");

    // 1. Obtener reseña y configuración regional
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

    if (revError || !review) throw new Error("Reseña no encontrada");

    const biz = review.businesses;
    const ownerPhone = biz.whatsapp_configs?.phone_number;
    
    if (!ownerPhone) {
      console.log(`⚠️ Skip: No hay teléfono para ${biz.business_name}`);
      return new Response("No phone configured", { status: 200 });
    }

    const lang = biz.language || 'es';
    const isPT = lang === 'pt';

    // 2. IA con contexto regional (Voseo para AR / Portugués para BR)
    const tone = biz.reply_tone || 'profesional y amable';
    const regionPrompt = biz.country_code === 'AR' 
      ? "Respondé en Español de Argentina (usá voseo: vení, che, saludá)." 
      : isPT ? "Responda em Português do Brasil de forma natural." : "Respondé en Español neutro.";

    const systemPrompt = isPT
      ? `Você é o assistente de "${biz.business_name}". Tom: ${tone}. ${regionPrompt}`
      : `Sos el asistente de "${biz.business_name}". Tono: ${tone}. ${regionPrompt}`;

    // 3. Generar respuesta con GPT-4o-mini
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Reseña de ${review.star_rating} estrellas: "${review.comment_text || 'Solo puntuación.'}"` }
        ],
        temperature: 0.7
      }),
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0].message.content;

    // 4. Lógica de Notificación vs Auto-Reply
    const isAuto = (review.star_rating === 5 && biz.auto_reply_5_stars) || 
                   (review.star_rating === 4 && biz.auto_reply_4_stars);

    let whatsappText = "";
    if (isAuto) {
      whatsappText = isPT
        ? `✅ *Ranko Auto:* Respondi em *${biz.business_name}* (${review.star_rating}⭐):\n\n"${reply}"`
        : `✅ *Ranko Auto:* Respondí en *${biz.business_name}* (${review.star_rating}⭐):\n\n"${reply}"`;
      
      // TODO: Aquí llamarías a la función de publicación en Google My Business
    } else {
      whatsappText = isPT
        ? `🔔 *Nova Avaliação (${review.star_rating}⭐):*\n"${review.comment_text || '(Sem texto)'}"\n\n*Sugestão do Ranko:*\n"${reply}"\n\n¿Deseja publicar? (Responda "SIM")`
        : `🔔 *Nueva Reseña (${review.star_rating}⭐):*\n"${review.comment_text || '(Sin texto)'}"\n\n*Sugerencia de Ranko:*\n"${reply}"\n\n¿Querés publicar? (Respondé "SI")`;
    }

    // 5. Envío vía Evolution API
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-test';
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    
    await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
      method: 'POST',
      headers: { 'apikey': evoApiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: ownerPhone, text: whatsappText })
    });

    // 6. Registro en Log
    await supabase.from("reviews_logs").insert({
      business_id: biz.id,
      stars: review.star_rating,
      review_text: review.comment_text || "Sin comentario",
      reply_text: reply,
      status: isAuto ? 'posted' : 'pending_approval'
    });

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("CRITICAL ERROR: ", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});