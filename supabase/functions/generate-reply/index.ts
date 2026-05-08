import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS para llamadas desde el navegador
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const openAiKey = Deno.env.get('OPENAI_API_KEY');

  try {
    const { business_id, review_text, stars } = await req.json();

    // Limpiamos el ID por si vienen espacios en el JSON de prueba
    const cleanBusinessId = business_id?.trim();

    // 1. Obtener configuración del negocio
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", cleanBusinessId)
      .maybeSingle();

    if (error) throw new Error(`Error de base de datos: ${error.message}`);
    if (!business) throw new Error(`Negocio no encontrado con el ID: ${cleanBusinessId}`);

    // Determinamos el idioma de operación (prioriza lo guardado en DB)
    const lang = business.language || 'es';
    const isPT = lang === 'pt';

    // 2. Lógica de Créditos y Suscripción (Nada hardcodeado)
    const isTrial = business.plan_status === 'trial';
    const hasCredits = business.plan_status === 'active' || (isTrial && (business.credits_used || 0) < 5);

    if (!hasCredits) {
      const planId = isPT ? Deno.env.get('MP_PLAN_ID_BR') : Deno.env.get('MP_PLAN_ID_AR');
      const domain = isPT ? 'com.br' : 'com.ar';
      
      const paymentLink = `https://www.mercadopago.${domain}/subscriptions/checkout?preapproval_plan_id=${planId}&external_reference=${business.id}`;

      const alertMessage = isPT 
        ? `⚠️ *Ranko AI:* Limite atingido. Ative sua assinatura aqui: ${paymentLink}`
        : `⚠️ *Ranko AI:* Límite de prueba alcanzado. Activa tu suscripción aquí: ${paymentLink}`;

      return new Response(JSON.stringify({ 
        reply: alertMessage,
        status: "limit_reached" 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Prompt de IA optimizado y bilingüe
    const tone = business.reply_tone || (isPT ? 'profissional e amigável' : 'profesional y amable');
    
    const systemPrompt = isPT
      ? `Você é o gerente de hospitalidade de "${business.business_name}". Instruções: Tom ${tone}. Avaliação 4-5: agradeça. 1-3: seja empático, peça desculpas e convide ao privado. Responda em Português.`
      : `Sos el gerente de hospitalidad de "${business.business_name}". Instrucciones: Tono ${tone}. Reseña 4-5: agradecé. 1-3: sé empático, pedí disculpas y ofrece contacto privado. Respondé en Español (natural de Argentina).`;

    // 4. Generación con GPT-4o-mini
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${openAiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Reseña de ${stars} estrellas: "${review_text}"` }
        ],
        temperature: 0.7
      }),
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);

    const reply = aiData.choices[0].message.content.trim();

    // 5. Actualización de consumo y logs
    const newCredits = (business.credits_used || 0) + 1;
    
    await Promise.all([
      supabase.from("businesses").update({ 
        credits_used: isTrial ? newCredits : business.credits_used,
        last_sync_at: new Date().toISOString()
      }).eq("id", cleanBusinessId),
      
      supabase.from("reviews_logs").insert({
        business_id: cleanBusinessId,
        stars,
        review_text,
        reply_text: reply,
        status: 'generated'
      })
    ]);

    return new Response(JSON.stringify({ reply }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});