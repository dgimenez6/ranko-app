import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const i18n = {
  es: { 
    pauso: "⏸️ Automatización pausada", activo: "▶️ Automatización activa", gestionando: "✅ Gestionando:", 
    listado: "Tenés varios locales. Elegí uno:", alerta: "⚠️ ALERTA: Reseña negativa en",
    bienvenida: "¡Hola! Soy *Ranko*, tu asistente de reputación. Gestionarás tus negocios desde aquí.\n\nComandos:\n/menu - Cambiar de local\n/status - Estado del bot\n/pause - Pausar respuestas\n/resume - Activar respuestas",
    error: "❌ Hubo un error procesando tu solicitud.", ayuda: "💬 Entendido. ¿Necesitás ayuda con algo o es una reseña?",
    estado: "Estado", plan: "Plan", prueba: "Prueba", premium: "Premium 💎"
  },
  pt: { 
    pauso: "⏸️ Automação pausada", activo: "▶️ Automação ativa", gestionando: "✅ Gerenciando:", 
    listado: "Você tem vários locais. Escolha um:", alerta: "⚠️ ALERTA: Avaliação negativa em",
    bienvenida: "Olá! Sou o *Ranko*, seu assistente de reputação. Você gerenciará seus negócios daqui.\n\nComandos:\n/menu - Trocar de local\n/status - Status do bot\n/pause - Pausar respostas\n/resume - Ativar respostas",
    error: "❌ Ocorreu um erro ao processar sua solicitação.", ajuda: "💬 Entendido. Precisa de ajuda com algo ou é uma avaliação?",
    estado: "Status", plan: "Plano", prueba: "Teste", premium: "Premium 💎"
  }
};

serve(async (req) => {
  const urlParams = new URL(req.url).searchParams;
  if (urlParams.get("api_key") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const payload = await req.json();
  
  // Ignorar estados de lectura o notificaciones que no sean mensajes nuevos
  if (payload.event !== "messages.upsert" || payload.data.key.fromMe) return new Response("OK", { status: 200 });

  const senderPhone = payload.data.key.remoteJid.split("@")[0];
  const text = (payload.data.message.conversation || payload.data.message.extendedTextMessage?.text || "").trim();

  try {
    const { data: configs } = await supabase
      .from("whatsapp_configs")
      .select("business_id, businesses(id, business_name, is_active, reply_tone, language, country_code, plan_status, credits_used)")
      .eq("phone_number", senderPhone);

    if (!configs || configs.length === 0) return new Response("OK", { status: 200 });

    const { data: session } = await supabase.from("user_sessions").select("active_business_id").eq("phone", senderPhone).maybeSingle();
    
    if (!session) {
      const firstBiz = configs[0].businesses;
      const initialLang = firstBiz.language === 'pt' ? 'pt' : 'es';
      await supabase.from("user_sessions").upsert({ phone: senderPhone, active_business_id: firstBiz.id });
      await sendWhatsApp(senderPhone, i18n[initialLang].bienvenida);
      return new Response("OK", { status: 200 });
    }

    const biz = configs.find(c => c.business_id === session.active_business_id)?.businesses;
    if (!biz) return new Response("OK", { status: 200 });

    const lang = biz.language === 'pt' ? 'pt' : 'es';
    const t = i18n[lang];

    // Lógica de Comandos
    if (text === "/menu") {
      const lista = configs.map((c, i) => `${i + 1}. ${c.businesses.business_name}`).join("\n");
      await sendWhatsApp(senderPhone, `${t.listado}\n\n${lista}`);
      return new Response("OK", { status: 200 });
    }

    if (/^\d+$/.test(text) && text.length < 3) {
      const index = parseInt(text) - 1;
      if (configs[index]) {
        await supabase.from("user_sessions").upsert({ phone: senderPhone, active_business_id: configs[index].business_id });
        const newBiz = configs[index].businesses;
        const newT = i18n[newBiz.language === 'pt' ? 'pt' : 'es'];
        await sendWhatsApp(senderPhone, `${newT.gestionando} *${newBiz.business_name}*`);
        return new Response("OK", { status: 200 });
      }
    }

    if (text.startsWith("/")) {
      if (text === "/pause") { 
        await supabase.from("businesses").update({ is_active: false }).eq("id", biz.id); 
        await sendWhatsApp(senderPhone, `${t.pauso} *${biz.business_name}*`); 
      }
      else if (text === "/resume") { 
        await supabase.from("businesses").update({ is_active: true }).eq("id", biz.id); 
        await sendWhatsApp(senderPhone, `${t.activo} *${biz.business_name}*`); 
      }
      else if (text === "/status") { 
        const statusIcon = biz.is_active ? '✅' : '⏸️';
        const planInfo = biz.plan_status === 'trial' ? `(${t.prueba}: ${biz.credits_used}/5)` : `(${t.premium})`;
        await sendWhatsApp(senderPhone, `⚙️ *${biz.business_name}*\n- ${t.estado}: ${statusIcon}\n- ${t.plan}: ${planInfo}`); 
      }
      return new Response("OK", { status: 200 });
    }

    // Respuesta con IA
    if (biz.is_active) {
      if (text.length < 10) {
        await sendWhatsApp(senderPhone, t.ayuda);
      } else {
        const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-reply`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` // <-- CRÍTICO
          },
          body: JSON.stringify({ business_id: biz.id, review_text: text, stars: 5, language: lang })
        });

        const aiResult = await aiResponse.json();
        const msg = aiResult.status === "limit_reached" ? aiResult.reply : `🤖 *Ranko (${biz.business_name}):*\n\n${aiResult.reply}`;
        
        await sendWhatsApp(senderPhone, msg);
        if (aiResult.status !== "limit_reached") {
          await supabase.from("message_logs").insert({ business_id: biz.id, user_phone: senderPhone, incoming_text: text, ai_reply: aiResult.reply });
        }
      }
    } else {
      await sendWhatsApp(senderPhone, `${t.pauso} (Use /resume para activar)`);
    }

  } catch (e) {
    console.error("Error en Webhook:", e);
    await sendWhatsApp(senderPhone, i18n.es.error);
  }
  return new Response("OK", { status: 200 });
});

async function sendWhatsApp(number: string, text: string) {
  const instance = Deno.env.get("EVOLUTION_INSTANCE") || "ranko-test";
  const apikey = Deno.env.get("EVOLUTION_API_KEY");
  
  await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": apikey! },
    body: JSON.stringify({ number, text })
  }).catch(err => console.error("Error enviando WhatsApp:", err));
}