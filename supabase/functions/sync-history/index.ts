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
    const { business_id, google_access_token: clientToken } = await req.json();
    if (!business_id) throw new Error("business_id es requerido");

    // 1. Obtener datos del negocio
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();

    if (bizError || !biz) throw new Error("Negocio no encontrado");

    // Priorizamos el token fresco del cliente para evitar delays de base de datos
    const activeToken = clientToken || biz.google_access_token;
    if (!activeToken) throw new Error("No hay un token de acceso de Google disponible.");

    let finalLocationId = biz.google_location_id;

    // --- BLOQUE DE AUTO-CORRECCIÓN INTELIGENTE ---
    if (finalLocationId && finalLocationId.startsWith('ChIJ')) {
      console.log("Detectado Place ID. Solicitando Account Name administrativo...");
      
      const accRes = await fetch("https://mybusinessbusinessinformation.googleapis.com/v1/accounts", {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      
      if (!accRes.ok) {
        const errContext = await accRes.text();
        throw new Error(`Google Accounts API Error: ${accRes.status} - ${errContext}`);
      }

      const accData = await accRes.json();
      const accountName = accData.accounts?.[0]?.name; 

      if (accountName) {
        console.log("Account Name obtenido:", accountName, "Buscando ubicación...");
        
        // Corregimos la sintaxis del filtro envolviendo el placeId entre comillas como pide Google obligatoriamente
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,metadata&filter=placeId=%22${finalLocationId}%22`,
          { headers: { "Authorization": `Bearer ${activeToken}` } }
        );
        
        const locData = await locRes.json();
        
        if (locData.locations?.[0]) {
          finalLocationId = locData.locations[0].name; // locations/XXXXXXXX
        } else {
          // PLAN B: Si el filtro estricto falla, listamos las ubicaciones de la cuenta y emparejamos
          console.log("Filtro directo sin resultados, ejecutando Plan B (Listado general)...");
          const fallbackRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,metadata`,
            { headers: { "Authorization": `Bearer ${activeToken}` } }
          );
          const fallbackData = await fallbackRes.json();
          
          // Buscamos manualmente cuál de las ubicaciones del listado tiene el placeId que necesitamos
          const matchedLocation = fallbackData.locations?.find((l: any) => l.metadata?.placeId === finalLocationId);
          
          if (matchedLocation) {
            finalLocationId = matchedLocation.name;
          } else if (fallbackData.locations?.[0]) {
            // PLAN C: Si no coincide explícitamente pero hay un solo local en la cuenta, lo usamos por defecto
            finalLocationId = fallbackData.locations[0].name;
          } else {
            throw new Error(`No se encontraron ubicaciones administrables en esta cuenta de Google Business Profile.`);
          }
        }

        // Si logramos resolver el ID real, actualizamos la base de datos de inmediato
        if (finalLocationId && !finalLocationId.startsWith('ChIJ')) {
          await supabase.from('businesses').update({ 
            google_location_id: finalLocationId,
            google_place_id: biz.google_location_id 
          }).eq('id', biz.id);
          console.log("¡Base de datos auto-corregida con éxito! ID real:", finalLocationId);
        }
      } else {
        throw new Error("No se encontraron cuentas de Google Business asociadas a este perfil de Google.");
      }
    }
    // --- FIN BLOQUE AUTO-CORRECCIÓN ---

    // 2. Pedir reseñas a Google con el ID administrativo real (API v4)
    console.log("Solicitando reseñas a Google para la ubicación:", finalLocationId);
    const googleRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${finalLocationId}/reviews?pageSize=50`,
      { headers: { "Authorization": `Bearer ${activeToken}` } }
    );
    
    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      throw new Error(`Google API Reviews Error: ${googleRes.status} - ${errorText}`);
    }

    const googleData = await googleRes.json();
    const reviews = googleData.reviews || [];
    const bizCreatedAt = new Date(biz.created_at);
    let syncedCount = 0;

    // 3. Procesar y Clasificar Reseñas Históricas
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

      // 4. Upsert en Tablas de Destino
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
      message: "Sincronización histórica realizada con éxito."
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