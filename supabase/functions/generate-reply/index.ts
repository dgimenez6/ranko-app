import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de preflight para CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 1. VALIDACIÓN DE SEGURIDAD (Solo llamadas internas autorizadas)
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!authHeader || !authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'No autorizado: Acceso restringido a procesos internos' }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey
  );
  
  const openAiKey = Deno.env.get('OPENAI_API_KEY');

  try {
    const { business_id, review_text, stars, language } = await req.json();
    if (!business_id) throw new Error("business_id es obligatorio.");

    const cleanBusinessId = business_id.trim();

    // 2. OBTENER CONFIGURACIÓN DEL NEGOCIO
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", cleanBusinessId)
      .maybeSingle();

    if (error || !business) throw new Error(`Negocio no encontrado: ${cleanBusinessId}`);

    // 3. LÓGICA DE AUTOMATIZACIÓN (Verifica si el dueño quiere respuesta automática)
    const isHighRating = stars >= 4;
    const shouldAutoReply = isHighRating ? business.auto_reply_5_stars : business.notify_negative_reviews;

    if (shouldAutoReply === false) {
      return new Response(JSON.stringify({ 
        reply: "SKIP: Automatización desactivada para esta calificación.", 
        status: "skipped_by_config" 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. CONTROL DE CRÉDITOS Y SUSCRIPCIÓN (Protección de costos)
    const currentCredits = business.credits_used || 0;
    const isTrial = business.plan_status === 'trial';
    const hasCredits = business.plan_status === 'active' || (isTrial && currentCredits < 5);

    if (!hasCredits) {
      const isPT = business.language === 'pt';
      const planId = isPT ? Deno.env.get('MP_PLAN_ID_BR') : Deno.env.get('MP_PLAN_ID_AR');
      // Link que pasa por tu dominio para trackeo y profesionalismo
      const paymentLink = `https://rankoai.com/upgrade?id=${business.id}&plan=${planId}`;

      return new Response(JSON.stringify({ 
        reply: isPT ? `⚠️ Limite atingido. Ative aqui: ${paymentLink}` : `⚠️ Límite alcanzado. Activa aquí: ${paymentLink}`,
        status: "limit_reached" 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. CONFIGURACIÓN DEL SYSTEM PROMPT (Cerebro + Regionalismo)
    const lang = business.language || language || 'es';
    const isPT = lang === 'pt';
    const tone = business.reply_tone || (isPT ? 'profissional e amigável' : 'profesional y amable');
    
    const regionInstructions = business.country_code === 'AR' 
      ? "Respondé en Español de Argentina con voseo (usá 'vení', 'atendé', 'che')." 
      : isPT ? "Responda em Português do Brasil de forma natural." : "Respondé en Español neutro.";

    const systemPrompt = `Sos el encargado de atención de "${business.business_name}".
    
    CEREBRO DEL NEGOCIO:
    ${business.business_info || 'Comercio enfocado en excelente atención.'}
    
    REGLAS:
    - Tono: ${tone}.
    - ${regionInstructions}
    - Si la reseña es 4-5 estrellas: Agradecé. ${business.promo_text ? `Incluí: ${business.promo_text}` : ''}
    - Si es 1-3 estrellas: Empatía, disculpas y contacto privado.
    - Respuestas cortas (máximo 150 palabras). No inventes servicios.`;

    // 6. GENERACIÓN CON OPENAI (Límite de tokens para ahorrar dinero)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Reseña: ${stars} estrellas. Comentario: "${review_text || 'Sin comentarios'}"` }
        ],
        temperature: 0.7,
        max_tokens: 200 // Protección contra respuestas innecesariamente largas
      }),
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);

    const reply = aiData.choices[0].message.content.trim();

    // 7. ACTUALIZACIÓN DE CONSUMO Y LOGS
    await Promise.all([
      supabase.from("businesses").update({ 
        credits_used: currentCredits + 1,
        last_sync_at: new Date().toISOString()
      }).eq("id", cleanBusinessId),
      
      supabase.from("reviews_logs").insert({
        business_id: cleanBusinessId,
        stars,
        review_text: review_text || "Sin comentario",
        reply_text: reply,
        status: 'generated'
      })
    ]);

    return new Response(JSON.stringify({ reply }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Error en generate-reply:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});