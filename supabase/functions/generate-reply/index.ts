import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Manejo de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 2. Validación de Seguridad (Solo permite llamadas con Service Role Key)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const openAiKey = Deno.env.get('OPENAI_API_KEY');

  try {
    const { business_id, review_text, stars, language } = await req.json();
    const cleanBusinessId = business_id?.trim();

    // 3. Obtener configuración del negocio
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", cleanBusinessId)
      .maybeSingle();

    if (error || !business) throw new Error(`Negocio no encontrado: ${cleanBusinessId}`);

    // 4. Lógica de Créditos y Suscripción
    const isTrial = business.plan_status === 'trial';
    const hasCredits = business.plan_status === 'active' || (isTrial && (business.credits_used || 0) < 5);

    if (!hasCredits) {
      const isPT = business.language === 'pt';
      const planId = isPT ? Deno.env.get('MP_PLAN_ID_BR') : Deno.env.get('MP_PLAN_ID_AR');
      const domain = isPT ? 'com.br' : 'com.ar';
      const paymentLink = `https://www.mercadopago.${domain}/subscriptions/checkout?preapproval_plan_id=${planId}&external_reference=${business.id}`;

      return new Response(JSON.stringify({ 
        reply: isPT ? `⚠️ Limite atingido. Ative aqui: ${paymentLink}` : `⚠️ Límite alcanzado. Activa aquí: ${paymentLink}`,
        status: "limit_reached" 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Configuración de Idioma y Tono dinámico
    const lang = business.language || language || 'es';
    const isPT = lang === 'pt';
    const tone = business.reply_tone || (isPT ? 'profissional e amigável' : 'profesional y amable');
    
    // Ajuste regional para Argentina o Brasil
    const regionContext = business.country_code === 'AR' 
      ? "Respondé en Español con modismos de Argentina (usá 'voseo': vení, atendé, che, etc.)." 
      : isPT ? "Responda em Português do Brasil de forma natural." : "Respondé en Español neutro y amable.";

    const systemPrompt = `Sos el encargado de atención al cliente de "${business.business_name}". 
    Tu objetivo es responder reseñas de Google Maps.
    Instrucciones:
    - Tono: ${tone}.
    - Si la reseña es de 4-5 estrellas: Agradecé efusivamente e invitá a volver.
    - Si la reseña es de 1-3 estrellas: Mostrá empatía, pedí disculpas y pedí que contacten al privado para solucionar el problema.
    - ${regionContext}
    - Mantené la respuesta breve (máximo 3 párrafos).`;

    // 6. Generación con GPT-4o-mini
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Cliente dejó ${stars} estrellas. Comentario: "${review_text || 'El cliente no dejó comentarios, solo la puntuación.'}"` }
        ],
        temperature: 0.7
      }),
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);

    const reply = aiData.choices[0].message.content.trim();

    // 7. Registro de logs y actualización de consumo
    const newCredits = (business.credits_used || 0) + 1;
    
    await Promise.all([
      supabase.from("businesses").update({ 
        credits_used: isTrial ? newCredits : business.credits_used,
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