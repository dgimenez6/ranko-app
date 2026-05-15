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
    if (!business_id) throw new Error("business_id es requerido");

    // 1. Obtener datos del negocio
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();

    if (bizError || !biz) throw new Error("Negocio no encontrado");

    let finalLocationId = biz.google_location_id;

    // --- BLOQUE DE AUTO-CORRECCIÓN DE ID ---
    // Si el ID empieza con ChIJ, es un Place ID y Google API v4 dará 404.
    if (finalLocationId && finalLocationId.startsWith('ChIJ')) {
      console.log("Detectado Place ID. Buscando el Location Name administrativo...");
      
      // A. Obtenemos la cuenta (Account) asociada al token
      const accRes = await fetch("https://mybusinessbusinessinformation.googleapis.com/v1/accounts", {
        headers: { "Authorization": `Bearer ${biz.google_access_token}` }
      });
      const accData = await accRes.json();
      const accountName = accData.accounts?.[0]?.name; 

      if (accountName) {
        // B. Buscamos la ubicación real usando el Place ID como filtro
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name&filter=placeId=${finalLocationId}`,
          { headers: { "Authorization": `Bearer ${biz.google_access_token}` } }
        );
        const locData = await locRes.json();
        
        if (locData.locations?.[0]) {
          const realLocationName = locData.locations[0].name; // Retorna "locations/123456789"
          
          // C. Actualizamos la DB para que no vuelva a fallar
          await supabase.from('businesses').update({ 
            google_location_id: realLocationName,
            google_place_id: finalLocationId // Respaldamos el ChIJ en la nueva columna
          }).eq('id', biz.id);
          
          finalLocationId = realLocationName;
          console.log("ID corregido con éxito:", finalLocationId);
        } else {
          throw new Error("No se encontró una Location vinculada a ese Place ID en tu cuenta de Google.");
        }
      } else {
        throw new Error("No se pudo acceder a las cuentas de Google Business. Revisa el token.");
      }
    }
    // --- FIN BLOQUE AUTO-CORRECCIÓN ---

    // 2. Pedir reseñas a Google con el ID correcto
    const googleRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${finalLocationId}/reviews?pageSize=50`,
      { headers: { "Authorization": `Bearer ${biz.google_access_token}` } }
    );
    
    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      throw new Error(`Google API Error: ${googleRes.status} - ${errorText}`);
    }

    const googleData = await googleRes.json();
    const reviews = googleData.reviews || [];
    const bizCreatedAt = new Date(biz.created_at);
    let syncedCount = 0;

    // 3. Procesar y Clasificar
    for (const rev of reviews) {
      const starMap: any = { "FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1 };
      const hasReply = !!rev.reviewReply;
      const replyDate = hasReply ? new Date(rev.reviewReply.updateTime) : null;
      
      let source = 'pending';
      if (hasReply) {
        if (replyDate < bizCreatedAt) {
          source = 'manual_old';
        } else {
          const { data: logExists } = await supabase
            .from('reviews_logs')
            .select('id')
            .eq('google_review_id', rev.reviewId)
            .maybeSingle();
          source = logExists ? 'ranko' : 'manual_external';
        }
      }

      // 4. Upsert en Tablas
      await supabase.from('reviews').upsert({
        business_id: biz.id,
        google_review_id: rev.reviewId,
        star_rating: starMap[rev.starRating] || 0,
        comment_text: rev.comment || "",
        reviewer_name: rev.reviewer?.displayName || "Cliente",
        review_name: rev.name,
        created_at: rev.createTime
      }, { onConflict: 'google_review_id' });

      await supabase.from('reviews_logs').upsert({
        business_id: biz.id,
        stars: starMap[rev.starRating] || 0,
        review_text: rev.comment || "Sin comentario",
        reply_text: rev.reviewReply?.comment || null,
        status: hasReply ? 'posted' : 'pending',
        source: source,
        google_review_id: rev.reviewId,
        created_at: rev.createTime
      }, { onConflict: 'google_review_id' });

      syncedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount,
      message: `Sincronización exitosa. ID corregido y ${syncedCount} reseñas procesadas.`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});