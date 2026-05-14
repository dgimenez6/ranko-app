import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!authHeader || !authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const openAiKey = Deno.env.get('OPENAI_API_KEY');

  try {
    const { business_id, review_text, stars, language } = await req.json();
    if (!business_id) throw new Error("business_id es obligatorio.");

    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .maybeSingle();

    if (error || !business) throw new Error(`Negocio no encontrado`);

    const currentCredits = business.credits_used || 0;
    const hasCredits = business.plan_status === 'active' || (business.plan_status === 'trial' && currentCredits < 5);

    if (!hasCredits) {
      return new Response(JSON.stringify({ reply: "Límite alcanzado", status: "limit_reached" }), { status: 200, headers: corsHeaders });
    }

    // --- NUEVO SYSTEM PROMPT CON INTELIGENCIA ---
    const lang = business.language || language || 'es';
    const isPT = lang === 'pt';
    const staffList = business.staff_names?.join(', ') || 'No especificado';
    
    const systemPrompt = `Sos el encargado de "${business.business_name}".
    CEREBRO: ${business.business_info || 'Atención de calidad.'}
    TONO: ${business.reply_tone || 'profesional'}.
    STAFF DEL LOCAL: ${staffList}.

    TAREA: Analizá la reseña y devolvé un JSON con:
    1. "reply": Respuesta amable (${isPT ? 'Português' : 'Español'}).
    2. "analysis": Array de objetos con:
       - "topic": (Comida, Servicio, Limpieza, Precio, Ambiente, Atención).
       - "sentiment": (pos, neg).
       - "entity": Nombre del staff si se menciona (basado en la lista).

    FORMATO DE SALIDA (ESTRICTO JSON):
    { "reply": "...", "analysis": [{ "topic": "...", "sentiment": "...", "entity": "..." }] }`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Reseña: ${stars} estrellas. Comentario: "${review_text || 'Sin comentarios'}"` }
        ],
        response_format: { type: "json_object" }, // Forzamos JSON
        temperature: 0.7
      }),
    });

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // --- ACTUALIZACIÓN DE LOGS CON TAGS ---
    await Promise.all([
      supabase.from("businesses").update({ 
        credits_used: currentCredits + 1,
        last_sync_at: new Date().toISOString()
      }).eq("id", business.id),
      
      supabase.from("reviews_logs").insert({
        business_id: business.id,
        stars,
        review_text: review_text || "Sin comentario",
        reply_text: result.reply,
        tags: result.analysis, // AQUÍ GUARDAMOS LA INTELIGENCIA
        status: 'generated'
      })
    ]);

    return new Response(JSON.stringify({ reply: result.reply }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});