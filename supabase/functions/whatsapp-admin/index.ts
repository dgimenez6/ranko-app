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
    
    // 1. Extracción del mensaje (Compatible con Evolution API)
    const incomingMessage = (payload.data?.message?.conversation || 
                             payload.data?.message?.extendedTextMessage?.text || "").trim();
    const senderPhone = payload.data?.key?.remoteJid?.split('@')[0];
    
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-test';

    // 2. Identificar al dueño (Validación de Sesión vinculada al negocio)
    // Nota: El dueño debe estar en la tabla 'whatsapp_configs' para que esto sea seguro
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select(`
        *,
        whatsapp_configs!inner(phone_number)
      `)
      .eq('whatsapp_configs.phone_number', senderPhone)
      .maybeSingle();

    if (bizError || !biz) {
      console.log(`Teléfono no autorizado para comandos: ${senderPhone}`);
      return new Response("No autorizado", { status: 200 });
    }

    const isPT = biz.language === 'pt'; 
    const msgLower = incomingMessage.toLowerCase();
    let responseText = "";

    // 3. Lógica de Comandos (Ajustada para las nuevas funciones)
    
    // AYUDA / MENU
    if (['ayuda', 'ajuda', '/start', 'help', 'menu'].some(cmd => msgLower.includes(cmd))) {
      responseText = isPT 
        ? `🤖 *Ranko Assistente (${biz.business_name})*\n\nComandos:\n👉 *STATUS*: Ver configs\n👉 *AUTO ON/OFF*: Resposta auto 5⭐\n👉 *NOTIF ON/OFF*: Alertas de negativas\n👉 *SIM*: Publicar sugestão`
        : `🤖 *Ranko Asistente (${biz.business_name})*\n\nComandos:\n👉 *STATUS*: Ver config actual\n👉 *AUTO ON/OFF*: Respuesta auto 5⭐\n👉 *NOTIF ON/OFF*: Alertas de negativas\n👉 *SI*: Publicar sugerencia`;
    }

    // STATUS (Incluye el Cerebro)
    else if (msgLower.includes('status')) {
      const brainStatus = biz.business_info ? (isPT ? 'TREINADO ✅' : 'ENTRENADO ✅') : (isPT ? 'VAZIO ❌' : 'VACÍO ❌');
      responseText = isPT
        ? `📊 *Status de ${biz.business_name}:*\n• Tom: *${biz.reply_tone}*\n• Cérebro: *${brainStatus}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? 'ON' : 'OFF'}*\n• Alertas Negativas: *${biz.notify_negative_reviews ? 'ON' : 'OFF'}*`
        : `📊 *Status de ${biz.business_name}:*\n• Tono: *${biz.reply_tone}*\n• Cerebro: *${brainStatus}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? 'ON' : 'OFF'}*\n• Alertas Negativas: *${biz.notify_negative_reviews ? 'ON' : 'OFF'}*`;
    }

    // AUTO-REPLY 5 ESTRELLAS
    else if (msgLower.includes('auto ')) {
      const isEnabled = msgLower.includes('on');
      await supabase.from('businesses').update({ auto_reply_5_stars: isEnabled }).eq('id', biz.id);
      responseText = isPT 
        ? `✅ Resposta automática 5⭐: *${isEnabled ? 'ON' : 'OFF'}*`
        : `✅ Respuesta automática 5⭐: *${isEnabled ? 'ON' : 'OFF'}*`;
    }

    // NOTIFICACIONES NEGATIVAS
    else if (msgLower.includes('notif ')) {
      const isEnabled = msgLower.includes('on');
      await supabase.from('businesses').update({ notify_negative_reviews: isEnabled }).eq('id', biz.id);
      responseText = isPT 
        ? `✅ Alertas de negativas: *${isEnabled ? 'ON' : 'OFF'}*`
        : `✅ Alertas de negativas: *${isEnabled ? 'ON' : 'OFF'}*`;
    }

    // PUBLICAR (SI / SIM)
    else if (msgLower === 'si' || msgLower === 'sim' || msgLower.startsWith('si ') || msgLower.startsWith('sim ')) {
      const { data: lastLog } = await supabase
        .from('reviews_logs')
        .select('*')
        .eq('business_id', biz.id)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        await supabase.from('reviews_logs').update({ status: 'posted' }).eq('id', lastLog.id);
        
        // Disparamos la publicación real
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
        }).catch(e => console.error("Error publicando:", e));

        responseText = isPT ? "✅ Publicado com sucesso!" : "✅ ¡Publicado con éxito!";
      } else {
        responseText = isPT ? "❌ Nada pendente." : "❌ No hay nada pendiente.";
      }
    }

    // 4. Envío vía Evolution API
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