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
    
    // 1. Extracción del mensaje (Evolution API)
    const incomingMessage = (payload.data?.message?.conversation || 
                             payload.data?.message?.extendedTextMessage?.text || "").trim();
    const senderPhone = payload.data?.key?.remoteJid?.split('@')[0];
    
    if (!senderPhone || !incomingMessage) return new Response("Ignored", { status: 200 });

    // 2. Identificar al dueño y sus locales vinculados
    const { data: configs, error: bizError } = await supabase
      .from('whatsapp_configs')
      .select('business_id, businesses(*)')
      .eq('phone_number', senderPhone);

    if (bizError || !configs || configs.length === 0) {
      console.log(`⚠️ Teléfono no autorizado: ${senderPhone}`);
      return new Response("Unauthorized", { status: 200 });
    }

    // 3. Gestión de "Negocio Activo" (Sesión)
    // Esto es vital para que si el dueño tiene 2 locales, sepa a cuál le está hablando
    const { data: session } = await supabase
      .from('user_sessions')
      .select('active_business_id')
      .eq('phone', senderPhone)
      .maybeSingle();

    let activeId = session?.active_business_id || configs[0].business_id;
    const currentBiz = configs.find(c => c.business_id === activeId)?.businesses;

    if (!currentBiz) return new Response("Error: Business Not Found", { status: 200 });

    const isPT = currentBiz.language === 'pt' || currentBiz.country_code === 'BR'; 
    const msgLower = incomingMessage.toLowerCase();
    let responseText = "";

    // 4. Lógica de Comandos Pro
    
    // AYUDA / MENU / START
    if (['ayuda', 'ajuda', '/start', 'help', 'menu'].some(cmd => msgLower.includes(cmd))) {
      responseText = isPT 
        ? `🤖 *Ranko Assistente (${currentBiz.business_name})*\n\nComandos:\n👉 *STATUS*: Configuração atual\n👉 *AUTO ON/OFF*: Responder 5⭐ auto\n👉 *NOTIF ON/OFF*: Alertas críticas\n👉 *SIM*: Publicar última sugestão\n\n_Para trocar de local, envie o número do ID._`
        : `🤖 *Ranko Asistente (${currentBiz.business_name})*\n\nComandos:\n👉 *STATUS*: Ver configuración\n👉 *AUTO ON/OFF*: Respuesta auto 5⭐\n👉 *NOTIF ON/OFF*: Alertas críticas\n👉 *SI*: Publicar última sugerencia\n\n_Para cambiar de local, enviá el ID del comercio._`;
    }

    // STATUS
    else if (msgLower.includes('status')) {
      const brainStatus = currentBiz.business_info ? (isPT ? 'TREINADO ✅' : 'ENTRENADO ✅') : (isPT ? 'VAZIO ❌' : 'VACÍO ❌');
      responseText = isPT
        ? `📊 *Status - ${currentBiz.business_name}:*\n• Tom: *${currentBiz.reply_tone}*\n• Cérebro: *${brainStatus}*\n• Auto-Reply: *${currentBiz.auto_reply_5_stars ? 'ON' : 'OFF'}*\n• Alertas: *${currentBiz.notify_negative_reviews ? 'ON' : 'OFF'}*\n• Plano: *${currentBiz.plan_status}*`
        : `📊 *Status - ${currentBiz.business_name}:*\n• Tono: *${currentBiz.reply_tone}*\n• Cerebro: *${brainStatus}*\n• Auto-Reply: *${currentBiz.auto_reply_5_stars ? 'ON' : 'OFF'}*\n• Alertas: *${currentBiz.notify_negative_reviews ? 'ON' : 'OFF'}*\n• Plan: *${currentBiz.plan_status}*`;
    }

    // TOGGLES (AUTO/NOTIF)
    else if (msgLower.includes('auto ') || msgLower.includes('notif ')) {
      const isEnabled = msgLower.includes('on');
      const field = msgLower.includes('auto') ? 'auto_reply_5_stars' : 'notify_negative_reviews';
      
      await supabase.from('businesses').update({ [field]: isEnabled }).eq('id', currentBiz.id);
      
      responseText = isPT 
        ? `✅ Configuração atualizada para *${currentBiz.business_name}*`
        : `✅ Configuración actualizada para *${currentBiz.business_name}*`;
    }

    // SI / SIM (Aprobación Manual)
    else if (['si', 'sim'].some(s => msgLower === s)) {
      const { data: lastLog } = await supabase
        .from('reviews_logs')
        .select('*')
        .eq('business_id', currentBiz.id)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        // Marcamos como posteado y ejecutamos la publicación real
        await supabase.from('reviews_logs').update({ status: 'posted' }).eq('id', lastLog.id);
        
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-new-review`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ review_id: lastLog.review_id, force_publish: true })
        }).catch(e => console.error("Error disparando publicación:", e));

        responseText = isPT ? "✅ Publicado no Google!" : "✅ ¡Publicado en Google!";
      } else {
        responseText = isPT ? "❌ Não há nada pendente." : "❌ No hay nada pendiente para publicar.";
      }
    }

    // 5. Envío Final vía Evolution API
    if (responseText) {
      const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
      const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';
      
      await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
        method: 'POST',
        headers: { 'apikey': evoApiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: senderPhone, text: responseText })
      });
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Critical Admin Bot Error:", err.message);
    return new Response("Error", { status: 500 });
  }
});