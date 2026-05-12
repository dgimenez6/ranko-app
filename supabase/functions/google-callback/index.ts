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

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state"); 

  if (!code || !userId) return new Response("Parámetros faltantes", { status: 400 });

  try {
    // 1. Intercambio de Código por Tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
        redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI"),
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(`Google Auth Error: ${tokens.error_description}`);

    // 2. Obtener Cuenta de Business Profile
    const accountsRes = await fetch("https://mybusinessbusinessinformation.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const accountsData = await accountsRes.json();
    
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      throw new Error("No se encontró una cuenta de Google Business configurada.");
    }

    const accountName = accountsData.accounts[0].name;

    // 3. Obtener Locales vinculados
    const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,languageCode,storefrontAddress&pageSize=100`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const locData = await locRes.json();

    if (!locData.locations || locData.locations.length === 0) {
      throw new Error("No se encontraron locales físicos activos.");
    }

    // 4. Procesamiento y Persistencia (Upsert Inteligente)
    for (const loc of locData.locations) {
      // Lógica de región mejorada
      const isBrazil = loc.languageCode?.startsWith('pt') || loc.storefrontAddress?.regionCode === 'BR';
      
      const updateData: any = {
        user_id: userId,
        google_location_id: loc.name, // El 'name' de Google es el ID único (locations/XXXX)
        business_name: loc.title,
        google_access_token: tokens.access_token,
        connection_status: 'connected',
        language: isBrazil ? 'pt' : 'es',
        country_code: isBrazil ? 'BR' : 'AR',
        last_sync_at: new Date().toISOString(),
        // Seteamos defaults solo si es registro nuevo
        reply_tone: 'friendly',
        auto_reply_5_stars: true,
        notify_negative_reviews: true,
        interceptor_mode: true
      };

      // CRÍTICO: Solo actualizamos el refresh_token si Google nos mandó uno nuevo
      // Si no, dejamos el que ya teníamos guardado para no perder la conexión
      if (tokens.refresh_token) {
        updateData.google_refresh_token = tokens.refresh_token;
      }

      const { error: upsertError } = await supabase
        .from("businesses")
        .upsert(updateData, { onConflict: 'google_location_id' });

      if (upsertError) console.error(`Error haciendo upsert de ${loc.title}:`, upsertError);
    }

    // Redirección segura al Dashboard
    return Response.redirect("https://rankoai.com/dashboard?status=success", 302);

  } catch (err) {
    console.error("Error crítico en Callback:", err.message);
    return Response.redirect(`https://rankoai.com/dashboard?status=error&message=${encodeURIComponent(err.message)}`, 302);
  }
});