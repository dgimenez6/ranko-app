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
    const { phone, language } = await req.json();

    // 1. Limpieza del número
    const cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.length < 10) throw new Error("Formato de teléfono inválido");
    
    // 2. PROTECCIÓN ANTI-SPAM
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('otp_expires_at')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingSession?.otp_expires_at) {
      const now = new Date();
      const expires = new Date(existingSession.otp_expires_at);
      const diff = (expires.getTime() - now.getTime()) / 1000;
      
      // Bloqueo si envió hace menos de 1 minuto (asumiendo 10 min de vida total)
      if (diff > 540) {
        return new Response(JSON.stringify({ 
          error: language === 'pt' ? "Aguarde 1 minuto para reenviar." : "Esperá 1 minuto para reenviar." 
        }), { status: 429, headers: corsHeaders });
      }
    }

    // 3. Generar OTP y Expiración (10 minutos)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 4. Persistencia
    const { error: dbError } = await supabase
      .from('user_sessions')
      .upsert({ 
        phone: cleanPhone, 
        otp_code: otp, 
        otp_expires_at: expiresAt,
        is_verified: false,
        last_sent_at: new Date().toISOString()
      }, { onConflict: 'phone' });

    if (dbError) throw new Error("Error interno de autenticación.");

    // 5. Mensaje Bilingüe
    const isPT = language === 'pt' || cleanPhone.startsWith('55');
    const message = isPT
      ? `🤖 *Ranko AI*\nSeu código de verificação é: *${otp}*\n\nNão compartilhe este código com ninguém.`
      : `🤖 *Ranko AI*\nTu código de verificación es: *${otp}*\n\nNo compartas este código con nadie.`;

    // 6. Envío vía Evolution API
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'ranko-main';
    const evoApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evoUrl = Deno.env.get('EVOLUTION_API_URL') || "https://evolution-api-production-0695.up.railway.app";
    
    const evoResponse = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
      method: 'POST',
      headers: { 'apikey': evoApiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: cleanPhone, text: message })
    });
    
    if (!evoResponse.ok) throw new Error("Error al enviar el mensaje de WhatsApp.");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: err.message.includes("Aguarde") || err.message.includes("Esperá") ? 429 : 500
    });
  }
});