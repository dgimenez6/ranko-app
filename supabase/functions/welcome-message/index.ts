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

    // 1. Obtener datos con Join (Manejo correcto de arrays de Supabase)
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('*, whatsapp_configs(phone_number)')
      .eq('id', business_id)
      .maybeSingle();

    if (bizError || !biz) throw new Error("No se encontró el negocio.");

    // Extraemos el teléfono manejando el array de la relación
    const configs = biz.whatsapp_configs;
    const phone = Array.isArray(configs) ? configs[0]?.phone_number : configs?.phone_number;

    if (!phone) {
      throw new Error("El negocio no tiene un teléfono vinculado en whatsapp_configs.");
    }

    const isPT = biz.language === 'pt' || biz.country_code === 'BR'; 
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';

    if (!evoApiKey) throw new Error("Falta la configuración de EVOLUTION_API_KEY en el servidor.");

    // 2. Mensajes bilingües con Personalidad Ranko
    const message = isPT
      ? `Olá! Sou o *Ranko*, seu novo assistente de hospitalidade para *${biz.business_name}*. 🚀\n\nJá estou conectado ao seu Google Business. A partir de agora:\n✅ Responderei automaticamente as avaliações positivas (4 e 5⭐).\n🚨 Se chegar uma crítica, avisarei você por aqui com uma sugestão.\n\nDigite */status* a qualquer momento para ver o plano. Bem-vindo!`
      : `¡Hola! Soy *Ranko*, tu nuevo asistente de hospitalidad para *${biz.business_name}*. 🚀\n\nYa estoy conectado a tu Google Business. A partir de ahora:\n✅ Voy a responder solo todas las reseñas positivas (4 y 5⭐).\n🚨 Si llega una crítica, te aviso por acá con una sugerencia para que decidamos juntos.\n\nEscribí */status* en cualquier momento para ver tu configuración. ¡Bienvenido a bordo!`;

    // 3. Envío profesional vía Evolution API
    const evoResponse = await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
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

    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      throw new Error(`Error Evolution API: ${errorText}`);
    }

    // 4. Marcamos éxito en los logs para métricas
    await supabase.from('reviews_logs').insert({
      business_id: biz.id,
      status: 'welcome_sent',
      reply_text: 'Mensaje de bienvenida enviado correctamente'
    });

    return new Response(JSON.stringify({ success: true }), {
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