import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS para llamadas desde la Landing
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { phone, language } = await req.json();

    // 1. Limpieza de número de teléfono (evitar espacios o caracteres extra)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) throw new Error("Número de teléfono inválido");
    
    // 2. Generar código de 4 dígitos
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // 3. Guardar en user_sessions
    // Usamos el service_role para saltar RLS en esta tabla de sistema
    const { error: dbError } = await supabase
      .from('user_sessions')
      .upsert({ 
        phone: cleanPhone, 
        otp_code: otp, 
        otp_expires_at: expiresAt,
        is_verified: false 
      }, { onConflict: 'phone' });

    if (dbError) throw new Error(`Database Error: ${dbError.message}`);

    // 4. Mensaje localizado (Soporte nativo AR/BR)
    const isPT = language === 'pt';
    const message = isPT
      ? `Seu código de verificação Ranko é: *${otp}* 🚀`
      : `Tu código de verificación de Ranko es: *${otp}* 🚀`;

    // 5. Envío vía Evolution API
    // Usamos variables de entorno para la API Key por seguridad
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY') || '2EBE5DA7F3DB-43F1-998A-0616AE7E510F';
    
    const evoResponse = await fetch("https://evolution-api-production-0695.up.railway.app/message/sendText/ranko-test", {
      method: 'POST',
      headers: { 
        'apikey': evoApiKey, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    });

    if (!evoResponse.ok) {
      const errorData = await evoResponse.json();
      throw new Error(`Evolution API Error: ${errorData.message || evoResponse.statusText}`);
    }

    return new Response(JSON.stringify({ success: true, message: "OTP enviado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Critical Error en send-otp:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});