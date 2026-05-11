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

    const rawData = JSON.parse(atob(body.message.data));
    const { locationName, reviewId } = rawData;

    if (!locationName || !reviewId) return new Response("Not a review notification", { status: 200 });
    
    const reviewName = `${locationName}/reviews/${reviewId}`;

    // 1. Buscamos el negocio con toda su configuración estratégica
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, google_refresh_token, language, auto_reply_5_stars, notify_negative_reviews")
      .eq("google_location_id", locationName) 
      .single();

    if (!biz || bizError) return new Response("Business not found", { status: 200 });

    // 2. Refrescar Token de Google
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
    const access_token = refreshData.access_token;

    // 3. Obtener la reseña real de Google
    const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
      headers: { "Authorization": `Bearer ${access_token}` }
    });
    const reviewData = await reviewRes.json();

    // Mapeo de estrellas de Google (String) a Número
    const starRatingMap: Record<string, number> = {
      "FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1
    };
    const stars = starRatingMap[reviewData.starRating] || 1;

    // 4. Guardar en la DB (reviews)
    const { data: newReview, error: insError } = await supabase
      .from("reviews")
      .insert({
        business_id: biz.id,
        google_review_id: reviewId,
        star_rating: stars,
        comment_text: reviewData.comment || "",
        reviewer_name: reviewData.reviewer?.displayName || "Cliente",
        review_name: reviewName
      })
      .select()
      .single();

    if (insError) throw insError;

    // 5. DECISIÓN DE PROCESAMIENTO (Basado en tu Dashboard)
    // Verificamos si, según las estrellas, debemos disparar la IA o la Alerta
    const isHighRating = stars >= 4;
    const shouldProcess = isHighRating ? biz.auto_reply_5_stars : biz.notify_negative_reviews;

    if (shouldProcess) {
      console.log(`Disparando proceso para reseña de ${stars} estrellas en ${biz.id}`);
      
      // Llamamos a 'process-new-review' que es la que se encarga de:
      // A) Generar respuesta con IA usando el CEREBRO.
      // B) Mandar WhatsApp si el dueño configuró alertas.
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
      }).catch(e => console.error("Error disparando process-new-review:", e));
    } else {
      console.log(`Reseña de ${stars} estrellas ignorada por configuración del usuario.`);
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Error", { status: 200 });
  }
});