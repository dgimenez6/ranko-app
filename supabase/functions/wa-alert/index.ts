import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Recibir los datos del Webhook de la tabla 'interceptions'
  const { record } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 2. Buscar el nombre del local y el número del dueño
    const { data: biz, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select(`
        business_name,
        language,
        whatsapp_configs!inner(phone_number)
      `)
      .eq('id', record.business_id)
      .maybeSingle();

    if (bizError || !biz) throw new Error("Local no encontrado");

    const phone = biz.whatsapp_configs?.[0]?.phone_number || biz.whatsapp_configs?.phone_number;
    const isPT = biz.language === 'pt';

    if (phone) {
      // 3. Armar el mensaje de alerta (Interceptor)
      const message = isPT 
        ? `⚠️ *ALERTA DE DEFESA RANKO*\n\n` +
          `📍 *Local:* ${biz.business_name}\n` +
          `⭐ *Rating:* ${record.rating}/5\n` +
          `💬 *Feedback:* "${record.comment}"\n\n` +
          `*Ação:* O cliente recebeu um cupom automático. Verifique no local!`
        : `⚠️ *ALERTA DE DEFENSA RANKO*\n\n` +
          `📍 *Local:* ${biz.business_name}\n` +
          `⭐ *Rating:* ${record.rating}/5\n` +
          `💬 *Feedback:* "${record.comment}"\n\n` +
          `*Acción:* El cliente recibió un cupón automático. ¡Revisar en el salón!`;

      const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
      const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-test';
      
      // 4. Envío vía tu servidor de Railway (mismo que usas en el admin)
      await fetch(`https://evolution-api-production-0695.up.railway.app/message/sendText/${evoInstance}`, {
        method: 'POST',
        headers: { 
          'apikey': evoApiKey!, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          number: phone, 
          text: message 
        })
      });
    }

    return new Response("Alerta enviada", { status: 200 });

  } catch (err) {
    console.error("Alert Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});