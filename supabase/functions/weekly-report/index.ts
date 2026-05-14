import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 1. Buscamos todos los negocios activos con sus configs de WhatsApp
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        language,
        country_code,
        whatsapp_configs (phone_number)
      `)
      .eq('is_active', true);

    if (bizError || !businesses) throw new Error("Error al obtener negocios");

    for (const biz of businesses) {
      // Extraemos el teléfono igual que en tu waalert
      const phone = Array.isArray(biz.whatsapp_configs) 
        ? biz.whatsapp_configs[0]?.phone_number 
        : (biz.whatsapp_configs as any)?.phone_number;

      if (!phone) continue;

      // 2. Cálculo de fechas (últimos 7 días)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: logs } = await supabaseAdmin
        .from('reviews_logs')
        .select('stars, status, tags')
        .eq('business_id', biz.id)
        .gte('created_at', oneWeekAgo.toISOString());

      if (!logs || logs.length === 0) continue;

      // 3. Procesar métricas
      const total = logs.length;
      const positive = logs.filter(l => l.stars >= 4).length;
      const happinessScore = Math.round((positive / total) * 100);
      
      // Procesar Staff del JSONB tags
      const staffMentions: Record<string, number> = {};
      logs.forEach(l => {
        const tags = Array.isArray(l.tags) ? l.tags : [];
        tags.forEach((t: any) => {
          if (t.entity) {
            if (!staffMentions[t.entity]) staffMentions[t.entity] = 0;
            staffMentions[t.entity] += (t.sentiment === 'pos' ? 1 : -1);
          }
        });
      });
      
      const topStaff = Object.keys(staffMentions).length > 0 
        ? Object.keys(staffMentions).reduce((a, b) => staffMentions[a] > staffMentions[b] ? a : b) 
        : "N/A";

      // 4. Mensaje Bilingüe (i18n)
      const isPT = biz.language === 'pt' || biz.country_code === 'BR';
      const message = isPT ? 
        `🚀 *RANKO AI: RELATÓRIO SEMANAL*\n\n` +
        `📍 *Local:* ${biz.business_name}\n` +
        `😊 *Felicidade:* ${happinessScore}% ${happinessScore > 80 ? '✅' : '⚠️'}\n` +
        `💬 *Reviews:* ${total} novas esta semana\n` +
        `🏆 *Destaque:* ${topStaff}\n\n` +
        `_Sua reputação em Búzios está blindada!_` :
        `🚀 *RANKO AI: REPORTE SEMANAL*\n\n` +
        `📍 *Local:* ${biz.business_name}\n` +
        `😊 *Felicidad:* ${happinessScore}% ${happinessScore > 80 ? '✅' : '⚠️'}\n` +
        `💬 *Reseñas:* ${total} nuevas esta semana\n` +
        `🏆 *Destacado:* ${topStaff}\n\n` +
        `_Tu reputación está blindada. ¡Buena semana!_`;

      // 5. Envío vía Railway (Evolution API)
      const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
      const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';
      
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

    return new Response(JSON.stringify({ status: "ok", message: "Reportes procesados" }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});