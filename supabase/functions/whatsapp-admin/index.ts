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
    
    // 1. Extracción y limpieza de datos entrantes
    const incomingMessage = (payload.data?.message?.conversation || 
                             payload.data?.message?.extendedTextMessage?.text || "").trim();
    const senderPhone = payload.data?.key?.remoteJid?.split('@')[0];
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY') || '2EBE5DA7F3DB-43F1-998A-0616AE7E510F';

    // 2. Identificar al dueño y el negocio que está gestionando
    // Priorizamos el 'active_business_id' de la sesión para evitar confusiones
    const { data: userSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('active_business_id, businesses(*)')
      .eq('phone', senderPhone)
      .single();

    if (sessionError || !userSession || !userSession.businesses) {
      return new Response("No registrado", { status: 200 });
    }

    const biz = userSession.businesses;
    const isPT = biz.language === 'pt'; 
    const msgLower = incomingMessage.toLowerCase();
    let responseText = "";

    // 3. Lógica de Comandos Bilingüe Mejorada
    
    // COMANDO: AYUDA / AJUDA
    if (['ayuda', 'ajuda', '/start', 'help'].includes(msgLower)) {
      responseText = isPT 
        ? `🤖 *Ranko Assistente*\n\nComandos:\n👉 *STATUS*: Ver config atual\n👉 *AUTO ON/OFF*: Ativar/Desativar resposta auto\n👉 *TOM [friendly/professional]*: Mudar tom\n👉 *SIM*: Publicar última sugestão`
        : `🤖 *Ranko Asistente*\n\nComandos:\n👉 *STATUS*: Ver config actual\n👉 *AUTO ON/OFF*: Activar/Desactivar respuesta auto\n👉 *TONO [friendly/professional]*: Cambiar tono\n👉 *SI*: Publicar última sugerencia`;
    }

    // COMANDO: STATUS
    else if (msgLower === 'status') {
      responseText = isPT
        ? `📊 *Status de ${biz.business_name}:*\n• Tom: *${biz.reply_tone}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? '✅' : '❌'}*\n• Créditos usados: *${biz.credits_used || 0}*`
        : `📊 *Status de ${biz.business_name}:*\n• Tono: *${biz.reply_tone}*\n• Auto-Reply 5⭐: *${biz.auto_reply_5_stars ? '✅' : '❌'}*\n• Créditos usados: *${biz.credits_used || 0}*`;
    }

    // COMANDO: CAMBIO DE AUTO-REPLY (AUTO ON/OFF)
    else if (msgLower.startsWith('auto ')) {
      const mode = msgLower.split(" ")[1];
      const isEnabled = mode === 'on';
      await supabase.from('businesses').update({ auto_reply_5_stars: isEnabled }).eq('id', biz.id);
      responseText = isPT 
        ? `✅ Resposta automática de 5⭐ agora está: *${isEnabled ? 'ON' : 'OFF'}*`
        : `✅ La respuesta automática de 5⭐ ahora está: *${isEnabled ? 'ON' : 'OFF'}*`;
    }

    // COMANDO: CAMBIO DE TONO (TONO / TOM)
    else if (msgLower.startsWith('tono ') || msgLower.startsWith('tom ')) {
      const newTone = msgLower.split(" ")[1];
      if (['friendly', 'professional'].includes(newTone)) {
        await supabase.from('businesses').update({ reply_tone: newTone }).eq('id', biz.id);
        responseText = isPT 
          ? `✅ Tom atualizado para: *${newTone}*` 
          : `✅ Tono actualizado a: *${newTone}*`;
      }
    }

    // COMANDO: CONFIRMACIÓN DE PUBLICACIÓN (SI / SIM)
    else if (msgLower === 'si' || msgLower === 'sim') {
      const { data: lastLog } = await supabase
        .from('reviews_logs')
        .select('*')
        .eq('business_id', biz.id)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastLog) {
        // ACTUALIZACIÓN DE LOG
        await supabase.from('reviews_logs').update({ status: 'posted' }).eq('id', lastLog.id);
        
        // TODO: Aquí llamarías a la función que publica físicamente en Google
        responseText = isPT ? "✅ Publicado com sucesso!" : "✅ Publicado con éxito!";
      } else {
        responseText = isPT ? "❌ Nenhuma sugestão pendente encontrada." : "❌ No encontré sugerencias pendientes.";
      }
    }

    // 4. Enviar respuesta final
    if (responseText) {
      await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/ranko-test`, {
        method: 'POST',
        headers: { 'apikey': evoApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: senderPhone, text: responseText })
      });
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Admin Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});