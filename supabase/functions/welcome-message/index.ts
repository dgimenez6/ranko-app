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
    const { business_id } = await req.json();

    // 1. Obtener datos con Join de configuración de WhatsApp
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('*, whatsapp_configs(phone_number)')
      .eq('id', business_id)
      .single();

    if (bizError || !biz || !biz.whatsapp_configs) {
      throw new Error("No se encontró la configuración de WhatsApp para este negocio.");
    }

    const phone = biz.whatsapp_configs.phone_number;
    const isPT = biz.language === 'pt'; //
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY') || '2EBE5DA7F3DB-43F1-998A-0616AE7E510F';

    // 2. Mensajes bilingües con formato enriquecido
    const message = isPT
      ? `Olá! Sou o *Ranko*, seu novo assistente de hospitalidade para *${biz.business_name}*. 🚀\n\nJá estou conectado ao seu Google Business. A partir de agora:\n✅ Responderei automaticamente as avaliações positivas (4 e 5⭐).\n🔔 Se chegar uma crítica, avisarei você por aqui com uma sugestão.\n\nDigite *AJUDA* a qualquer momento para ver meus comandos. Bem-vindo!`
      : `¡Hola! Soy *Ranko*, tu nuevo asistente de hospitalidad para *${biz.business_name}*. 🚀\n\nYa estoy conectado a tu Google Business. A partir de ahora:\n✅ Voy a responder solo todas las reseñas positivas (4 y 5⭐).\n🔔 Si llega una crítica, te aviso por acá con una sugerencia para que decidamos juntos.\n\nEscribí *AYUDA* en cualquier momento para ver qué puedo hacer. ¡Bienvenido a bordo!`;

    // 3. Envío profesional vía Evolution API
    const evoResponse = await fetch("https://evolution-api-production-0695.up.railway.app/message/sendText/ranko-test", {
      method: 'POST',
      headers: { 
        'apikey': evoApiKey, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    if (!evoResponse.ok) throw new Error("Error al contactar con la API de WhatsApp");

    return new Response(JSON.stringify({ success: true, message: "Bienvenida enviada correctamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Error en welcome-message:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});