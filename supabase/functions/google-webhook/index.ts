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

    const decodedData = atob(body.message.data);
    const rawData = JSON.parse(decodedData);
    const { locationName, reviewId } = rawData;

    if (!locationName || !reviewId) return new Response("Not a review notification", { status: 200 });
    
    const reviewName = `${locationName}/reviews/${reviewId}`;

    // Buscamos el negocio y traemos también el tono y staff para la IA
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, google_refresh_token, google_access_token, last_sync_at, auto_reply_5_stars, notify_negative_reviews, reply_tone, staff_names")
      .eq("google_location_id", locationName) 
      .maybeSingle();

    if (!biz || bizError) return new Response("Business not found", { status: 200 });

    // Gestión de Tokens
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

    const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    const reviewData = await reviewRes.json();

    const starRatingMap: Record<string, number> = { "FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1 };
    const stars = starRatingMap[reviewData.starRating] || 0;

    const { data: newReview } = await supabase
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

    // DISPARO DE IA + DASHBOARD SYNC
    if (newReview) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ 
          business_id: biz.id,
          review_text: reviewData.comment || "",
          stars: stars,
          review_id: newReview.id
        })
      }).catch(e => console.error("Error disparando IA:", e));
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Handled Error", { status: 200 });
  }
});