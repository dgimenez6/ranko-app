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

    // 1. Decodificación Segura
    const decodedData = atob(body.message.data);
    const rawData = JSON.parse(decodedData);
    const { locationName, reviewId } = rawData;

    if (!locationName || !reviewId) {
      console.log("Notificación de Google recibida pero sin ID de reseña (posible ping de prueba).");
      return new Response("Not a review notification", { status: 200 });
    }
    
    const reviewName = `${locationName}/reviews/${reviewId}`;

    // 2. Buscamos el negocio y su configuración
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, google_refresh_token, google_access_token, last_sync_at, auto_reply_5_stars, notify_negative_reviews")
      .eq("google_location_id", locationName) 
      .maybeSingle();

    if (!biz || bizError) {
      console.error(`Negocio no encontrado para location: ${locationName}`);
      return new Response("Business not found", { status: 200 });
    }

    // 3. Gestión Inteligente de Tokens (Solo refresca si es necesario)
    let currentToken = biz.google_access_token;
    
    // Si el token tiene más de 50 minutos o no existe, refrescamos
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
        // Actualizamos en DB para la próxima reseña
        await supabase.from("businesses").update({
          google_access_token: currentToken,
          last_sync_at: new Date().toISOString()
        }).eq("id", biz.id);
      }
    }

    // 4. Obtener la reseña real de Google
    const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    const reviewData = await reviewRes.json();

    if (reviewData.error) throw new Error(`Google API Error: ${reviewData.error.message}`);

    const starRatingMap: Record<string, number> = {
      "FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1
    };
    const stars = starRatingMap[reviewData.starRating] || 0;

    // 5. Upsert para evitar duplicados si Google reintenta el webhook
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
      .select()
      .single();

    if (insError) throw insError;

    // 6. Disparar Procesamiento (IA + WhatsApp)
    const isHighRating = stars >= 4;
    const shouldProcess = isHighRating ? biz.auto_reply_5_stars : biz.notify_negative_reviews;

    if (shouldProcess) {
      // Llamada asíncrona a la función de procesamiento
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
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Critical Webhook Error:", err.message);
    // Devolvemos 200 para que Google no reintente infinitamente si es un error de nuestra lógica
    return new Response("Handled Error", { status: 200 });
  }
});