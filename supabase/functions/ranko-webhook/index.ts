import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const i18n: any = {
  es: { 
    pauso: "⏸️ Automatización pausada", 
    activo: "▶️ Automatización activa", 
    gestionando: "✅ Gestionando ahora:", 
    listado: "Tenés varios locales. Elegí uno enviando el número:", 
    bienvenida: "¡Hola! Soy *Ranko AI* 🤖. Desde acá controlás tus negocios.\n\n🚀 *Comandos:*\n/menu - Ver mis locales\n/status - Estado y Plan\n/pause - Pausar bot\n/resume - Activar bot",
    error: "❌ Error procesando la solicitud.", 
    ayuda: "💬 ¿En qué puedo ayudarte? Podés enviarme una reseña para que te ayude a responderla.",
    estado: "Estado", plan: "Plan", prueba: "Prueba", premium: "Premium 💎", cerebro: "Cerebro IA"
  },
  pt: { 
    pauso: "⏸️ Automação pausada", 
    activo: "▶️ Automação ativa", 
    gestionando: "✅ Gerenciando agora:", 
    listado: "Você tem vários locais. Escolha um enviando o número:", 
    bienvenida: "Olá! Sou o *Ranko AI* 🤖. Daqui você gerencia seus negócios.\n\n🚀 *Comandos:*\n/menu - Ver meus locais\n/status - Status e Plano\n/pause - Pausar bot\n/resume - Ativar bot",
    error: "❌ Erro ao processar sua solicitação.", 
    ayuda: "💬 Como posso ajudar? Você pode me enviar uma avaliação para eu te ajudar a responder.",
    estado: "Status", plan: "Plano", prueba: "Teste", premium: "Premium 💎", cerebro: "Cérebro IA"
  }
};

serve(async (req) => {
  const url = new URL(req.url);
  // 1. VALIDACIÓN DE SEGURIDAD
  if (url.searchParams.get("api_key") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const payload = await req.json();
  
  // Ignorar mensajes propios o eventos que no sean mensajes nuevos
  if (payload.event !== "messages.upsert" || payload.data.key.fromMe) return new Response("OK", { status: 200 });

  const senderPhone = payload.data.key.remoteJid.split("@")[0];
  const text = (payload.data.message.conversation || payload.data.message.extendedTextMessage?.text || "").trim();

  try {
    // 2. BUSCAR CONFIGURACIÓN DEL DUEÑO
    const { data: configs } = await supabase
      .from("whatsapp_configs")
      .select("business_id, businesses(*)")
      .eq("phone_number", senderPhone);

    if (!configs || configs.length === 0) return new Response("OK", { status: 200 });

    // 3. GESTIÓN DE SESIÓN ACTIVA
    const { data: session } = await supabase.from("user_sessions").select("active_business_id").eq("phone", senderPhone).maybeSingle();
    
    // Si no hay sesión, inicializamos con el primer negocio
    let activeId = session?.active_business_id;
    if (!activeId) {
      activeId = configs[0].business_id;
      await supabase.from("user_sessions").upsert({ phone: senderPhone, active_business_id: activeId });
    }

    const bizConfig = configs.find(c => c.business_id === activeId);
    const biz = bizConfig?.businesses;
    
    if (!biz) return new Response("OK", { status: 200 });

    const lang = biz.language === 'pt' ? 'pt' : 'es';
    const t = i18n[lang];

    // --- LÓGICA DE COMANDOS ---
    if (text === "/menu") {
      const lista = configs.map((c: any, i: number) => {
        const flag = c.businesses.country_code === 'BR' ? '🇧🇷' : '🇦🇷';
        return `${i + 1}. ${flag} ${c.businesses.business_name}`;
      }).join("\n");
      await sendWhatsApp(senderPhone, `🏢 *${t.listado}*\n\n${lista}`);
      return new Response("OK", { status: 200 });
    }

    // Selección de negocio por número (1, 2, 3...)
    if (/^\d+$/.test(text) && text.length <= 2) {
      const idx = parseInt(text) - 1;
      if (configs[idx]) {
        const newBiz = configs[idx].businesses;
        await supabase.from("user_sessions").upsert({ phone: senderPhone, active_business_id: newBiz.id });
        const newLang = newBiz.language === 'pt' ? 'pt' : 'es';
        await sendWhatsApp(senderPhone, `${i18n[newLang].gestionando} *${newBiz.business_name}*`);
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
        const statusIcon = biz.is_active ? '✅ ON' : '⏸️ OFF';
        const planInfo = biz.plan_status === 'trial' ? `${t.prueba} (${biz.credits_used}/5)` : t.premium;
        const brainStatus = biz.business_info ? '🧠 ON' : '❌ OFF';
        
        const statusMsg = `⚙️ *RANKO STATUS*\n\n` +
                         `🏢 Negocio: ${biz.business_name}\n` +
                         `🚦 ${t.estado}: ${statusIcon}\n` +
                         `💎 ${t.plan}: ${planInfo}\n` +
                         `🧠 ${t.cerebro}: ${brainStatus}\n` +
                         `🎭 Tono: ${biz.reply_tone}`;
        await sendWhatsApp(senderPhone, statusMsg); 
      }
      return new Response("OK", { status: 200 });
    }

    // --- CONSULTA IA (Usando el "Cerebro" del negocio) ---
    if (text.length > 5) {
      // Llamamos a la función de generación con el SERVICE_ROLE_KEY interno
      const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` 
        },
        body: JSON.stringify({ business_id: biz.id, review_text: text, stars: 5 })
      });

      const aiResult = await aiResponse.json();
      const msg = aiResult.status === "limit_reached" ? aiResult.reply : `🤖 *Ranko AI sugerencia:*\n\n${aiResult.reply}`;
      await sendWhatsApp(senderPhone, msg);
    } else {
      await sendWhatsApp(senderPhone, t.ayuda);
    }

  } catch (e) {
    console.error("WhatsApp Webhook Error:", e);
    await sendWhatsApp(senderPhone, i18n.es.error);
  }
  return new Response("OK", { status: 200 });
});

async function sendWhatsApp(number: string, text: string) {
  const instance = Deno.env.get("EVOLUTION_INSTANCE") || "ranko-main";
  const apikey = Deno.env.get("EVOLUTION_API_KEY");
  
  await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": apikey! },
    body: JSON.stringify({ number, text })
  }).catch(err => console.error("Error Evolution API:", err));
}