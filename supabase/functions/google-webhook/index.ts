import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    const rawData = JSON.parse(atob(body.message.data));
    const { locationName, reviewName } = rawData;

    // 1. Buscamos el negocio y su configuración regional
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, google_access_token, google_refresh_token, language, country_code, auto_reply_5_stars")
      .eq("google_location_id", locationName)
      .single();

    if (!biz) return new Response("Business not found", { status: 200 });

    // 2. Refrescar Token (Determinismo: Aseguramos la conexión)
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: JSON.stringify({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
        refresh_token: biz.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const { access_token } = await refreshRes.json();

    // 3. Obtener la reseña
    const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
      headers: { "Authorization": `Bearer ${access_token}` }
    });
    const reviewData = await reviewRes.json();

    // 4. Llamar a la IA con el idioma del negocio
    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        business_id: biz.id, 
        review_text: reviewData.comment, 
        stars: reviewData.starRating,
        language: biz.language // <--- CRÍTICO: Aquí le decimos a la IA en qué idioma hablar
      })
    });
    const { reply } = await aiResponse.json();

    // 5. Publicar en Google
    await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: "PUT",
      headers: { 
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ comment: reply })
    });

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Error", { status: 500 });
  }
});