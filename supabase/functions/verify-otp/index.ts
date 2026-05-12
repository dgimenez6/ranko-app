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
    
    if (!phone || !code || !business_id) throw new Error("Datos incompletos.");

    // 1. Limpieza RIGUROSA (Igual que en send-otp)
    const cleanPhone = phone.replace(/\D/g, '');

    // 2. Validar el código contra la base de datos
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('otp_code', code)
      .gt('otp_expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ 
        error: "El código es incorrecto o ya expiró." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      });
    }

    // 3. Ejecución Atómica de Alta
    // Usamos Promise.all para que sea rápido
    const results = await Promise.all([
      // A. Quemamos el código y marcamos sesión verificada
      supabase
        .from('user_sessions')
        .update({ 
          is_verified: true, 
          active_business_id: business_id,
          otp_code: null // Seguridad: No se puede volver a usar
        })
        .eq('phone', cleanPhone),

      // B. Guardamos configuración de WhatsApp
      supabase
        .from('whatsapp_configs')
        .upsert({
          business_id: business_id,
          phone_number: cleanPhone,
          instance_key: Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main',
          updated_at: new Date().toISOString()
        }, { onConflict: 'business_id' }),

      // C. Marcamos el negocio como activo y configurado
      supabase
        .from('businesses')
        .update({ 
          is_active: true,
          connection_status: 'connected',
          whatsapp_number: cleanPhone // Guardamos respaldo para alertas
        })
        .eq('id', business_id)
    ]);

    // Chequeamos errores en las promesas
    if (results.some(r => r.error)) {
      throw new Error("Error guardando la configuración final.");
    }

    // 4. Disparar Bienvenida (Background task)
    const welcomeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/welcome-message`;
    fetch(welcomeUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ business_id, phone: cleanPhone })
    }).catch(e => console.error("Error trigger bienvenida:", e));

    return new Response(JSON.stringify({ 
      success: true, 
      message: "WhatsApp vinculado correctamente." 
    }), {
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