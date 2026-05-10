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
    const { phone, code, business_id } = await req.json();
    
    // 1. Limpieza consistente (mismo formato que send-otp)
    const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');

    // 2. Validar el código contra la base de datos
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('otp_code', code)
      .gt('otp_expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Código inválido o expirado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      });
    }

    // 3. Actualizar sesión y vincular WhatsApp (Atómico)
    const { error: errorSession } = await supabase
      .from('user_sessions')
      .update({ is_verified: true, active_business_id: business_id })
      .eq('phone', cleanPhone);

    if (errorSession) throw new Error(`Error en sesión: ${errorSession.message}`);

    // Guardar configuración vinculando el ID de instancia desde los Secrets
    const { error: errorConfig } = await supabase
      .from('whatsapp_configs')
      .upsert({
        business_id: business_id,
        phone_number: cleanPhone,
        instance_key: Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-test',
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id' });

    if (errorConfig) throw new Error(`Error en config: ${errorConfig.message}`);

    // 4. Trigger de bienvenida (Opcional: no bloquea la verificación si falla)
    const welcomeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/welcome-message`;
    fetch(welcomeUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ business_id })
    }).catch(e => console.error("Error enviando bienvenida:", e));

    return new Response(JSON.stringify({ success: true, verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Error crítico en verify-otp:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});