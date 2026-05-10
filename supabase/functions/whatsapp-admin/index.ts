import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const payload = await req.json();
    
    // 1. Extracción y limpieza profunda del mensaje
    const incomingMessage = (payload.data?.message?.conversation || 
                             payload.data?.message?.extendedTextMessage?.text || "").trim();
    const senderPhone = payload.data?.key?.remoteJid?.split('@')[0];
    
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-test';

    // 2. Identificar al dueño y el negocio (Validación de Sesión)
    const { data: userSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('active_business_id, businesses(*)')
      .eq('phone', senderPhone)
      .maybeSingle();

    if (sessionError || !userSession || !userSession.businesses) {
      console.log(`Teléfono no registrado: ${senderPhone}`);
      return new Response("No registrado", { status: 200 });
    }

    const biz = userSession.businesses;
    const isPT = biz.language === 'pt'; 
    const msgLower = incomingMessage.toLowerCase();
    let responseText = "";

    // 3. Lógica de Comandos Robusta
    
    // AYUDA / MENU
    if (['ayuda', 'ajuda', '/start', 'help', 'menu'].some(cmd => msgLower.includes(cmd))) {
      responseText = isPT 
        ? `🤖 *Ranko Assistente (${biz.business_name})*\n\nComandos:\n👉 *STATUS*: Ver configs\n👉 *AUTO ON/OFF*: Resposta auto\n👉 *TOM [amigável/profissional]*: Mudar tom\n👉 *SIM*: Publicar sugestão`
        : `🤖 *Ranko Asistente (${biz.business_name})*\n\nComandos:\n👉 *STATUS*: Ver config actual\n👉 *AUTO ON/OFF*: Respuesta auto\n👉 *TONO [amigable/profesional]*: Cambiar tono\n👉 *SI*: Publicar sugerencia`;
    }

    // STATUS
    else if (msgLower.includes('status')) {
      const toneLabel = isPT ? (biz.reply_tone === 'friendly' ? 'Amigável' : 'Profissional') : (biz.reply_tone === 'friendly' ? 'Amigable' : 'Profesional');
      responseText = isPT
        ? `📊 *Status de ${biz.business_name}:*\n• Tom: *${toneLabel}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? '✅' : '❌'}*\n• Plano: *${biz.plan_status?.toUpperCase()}*`
        : `📊 *Status de ${biz.business_name}:*\n• Tono: *${toneLabel}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? '✅' : '❌'}*\n• Plan: *${biz.plan_status?.toUpperCase()}*`;
    }

    // AUTO-REPLY (ON/OFF)
    else if (msgLower.includes('auto ')) {
      const isEnabled = msgLower.includes('on');
      await supabase.from('businesses').update({ auto_reply_5_stars: isEnabled }).eq('id', biz.id);
      responseText = isPT 
        ? `✅ Resposta automática agora está: *${isEnabled ? 'ON' : 'OFF'}*`
        : `✅ La respuesta automática ahora está: *${isEnabled ? 'ON' : 'OFF'}*`;
    }

    // PUBLICAR (SI / SIM) - Mejora con .includes() para evitar fallos por espacios
    else if (msgLower === 'si' || msgLower === 'sim' || msgLower.startsWith('si ') || msgLower.startsWith('sim ')) {
      const { data: lastLog, error: logError } = await supabase
        .from('reviews_logs')
        .select('*')
        .eq('business_id', biz.id)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        // 1. Marcamos como posteado inmediatamente para evitar doble posteo
        await supabase.from('reviews_logs').update({ status: 'posted' }).eq('id', lastLog.id);
        
        // 2. Disparo a la función de publicación en Google
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-publish`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            review_name: lastLog.review_name, 
            reply: lastLog.reply_text, 
            business_id: biz.id 
          })
        }).catch(e => console.error("Error disparando publicación:", e));

        responseText = isPT ? "✅ Publicado no Google Maps!" : "✅ ¡Publicado en Google Maps!";
      } else {
        responseText = isPT ? "❌ Nenhuma sugestão pendente para aprovar." : "❌ No encontré ninguna sugerencia pendiente para aprobar.";
      }
    }

    // 4. Envío de respuesta final al usuario vía Evolution API
    if (responseText) {
      await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
        method: 'POST',
        headers: { 'apikey': evoApiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: senderPhone, text: responseText })
      });
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Admin Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});