import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Manejo de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state"); 

  if (!code || !userId) return new Response("Missing parameters", { status: 400 });

  try {
    // 2. Intercambio de código por tokens (OAuth2)
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
    if (tokens.error) throw new Error(`Token Error: ${tokens.error_description}`);

    // 3. Descubrimiento de cuenta de Business Profile
    const accountsRes = await fetch("https://mybusinessbusinessinformation.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const accountsData = await accountsRes.json();
    
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      throw new Error("No se encontró una cuenta de Google Business Profile.");
    }

    // Seleccionamos la cuenta principal (usualmente la Personal)
    const accountName = accountsData.accounts[0].name;

    // 4. Obtención de locales (con pageSize aumentado para no perder datos)
    const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,languageCode&pageSize=100`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const locData = await locRes.json();

    if (!locData.locations || locData.locations.length === 0) {
      throw new Error("No se encontraron locales físicos vinculados.");
    }

    // 5. Upsert de locales con formato Opción A (ID completo)
    for (const loc of locData.locations) {
      // Detección regional automática: Búzios o idioma portugués
      const isPT = loc.languageCode === 'pt' || loc.title.toLowerCase().includes('buzios');
      
      await supabase
        .from("businesses")
        .upsert({
          user_id: userId,
          google_location_id: loc.name, // Guarda el path completo: accounts/xxx/locations/yyy
          business_name: loc.title,
          google_access_token: tokens.access_token,
          // Actualiza refresh_token solo si Google lo provee
          ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token }),
          connection_status: 'connected',
          language: isPT ? 'pt' : 'es',
          country_code: isPT ? 'BR' : 'AR', // Asignación de país para el voseo de la IA
          last_sync_at: new Date().toISOString()
        }, { onConflict: 'google_location_id' });
    }

    // 6. Redirección final a producción
    const targetUrl = "https://rankoai.com/dashboard"; // Cambiado de localhost a producción
    return Response.redirect(targetUrl, 302);

  } catch (err) {
    console.error("Error en Callback:", err.message);
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});