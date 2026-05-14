import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    if (!body.message?.data) return new Response("No data", { status: 200 });

    // 1. Decodificación de la notificación de Google (Pub/Sub)
    const decodedData = atob(body.message.data);
    const rawData = JSON.parse(decodedData);
    const { locationName, reviewId } = rawData;

    if (!locationName || !reviewId) {
      console.log("Ping de prueba o notificación sin ID de reseña.");
      return new Response("Not a review notification", { status: 200 });
    }
    
    const reviewName = `${locationName}/reviews/${reviewId}`;

    // 2. Buscamos el negocio vinculado a esa locación
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, google_refresh_token, google_access_token, last_sync_at, auto_reply_5_stars, notify_negative_reviews")
      .eq("google_location_id", locationName) 
      .maybeSingle();

    if (!biz || bizError) {
      console.error("Local no encontrado para:", locationName);
      return new Response("Business not found", { status: 200 });
    }

    // 3. Gestión de Tokens (Auto-Refresh)
    let currentToken = biz.google_access_token;
    const tokenAge = biz.last_sync_at ? (new Date().getTime() - new Date(biz.last_sync_at).getTime()) / 60000 : 999;

    if (tokenAge > 50 || !currentToken) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
          refresh_token: biz.google_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshData = await refreshRes.json();
      if (refreshData.access_token) {
        currentToken = refreshData.access_token;
        await supabase.from("businesses").update({
          google_access_token: currentToken,
          last_sync_at: new Date().toISOString()
        }).eq("id", biz.id);
      }
    }

    // 4. Traemos la reseña real de Google API
    const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    const reviewData = await reviewRes.json();

    const starRatingMap: Record<string, number> = { "FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1 };
    const stars = starRatingMap[reviewData.starRating] || 0;

    // 5. Upsert en la tabla 'reviews'
    const { data: newReview, error: insError } = await supabase
      .from("reviews")
      .upsert({
        business_id: biz.id,
        google_review_id: reviewId,
        star_rating: stars,
        comment_text: reviewData.comment || "",
        reviewer_name: reviewData.reviewer?.displayName || "Cliente",
        review_name: reviewName,
        created_at: new Date().toISOString()
      }, { onConflict: 'google_review_id' })
      .select().single();

    if (insError) throw insError;

    // 6. DISPARO DE PROCESAMIENTO E INTELIGENCIA
    // Decidimos si procesar según la config del dueño
    const isHighRating = stars >= 4;
    const shouldProcess = isHighRating ? biz.auto_reply_5_stars : biz.notify_negative_reviews;

    if (shouldProcess && newReview) {
      // Llamamos a 'process-new-review' para que genere la respuesta Y los TAGS
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-new-review`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ 
          review_id: newReview.id,
          stars: stars,
          business_id: biz.id 
        })
      }).catch(e => console.error("Error en disparo asíncrono:", e));
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    return new Response("Processed with error", { status: 200 });
  }
});