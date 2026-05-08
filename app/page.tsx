'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Phone, Send, Loader2, LogOut, Globe, Star, Instagram, Twitter
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'onboarding' | 'success'>('hero');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'es' | 'pt'>('es');
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'pt') setLang('pt');

    const isComplete = localStorage.getItem('ranko_setup_complete');
    if (isComplete === 'true') setStep('success');

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from('businesses').select('*').eq('user_id', session.user.id);
        setMyBusinesses(data || []);
        if (data && data.length > 0 && isComplete !== 'true') setStep('onboarding');
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('ranko_setup_complete');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleAction = async () => {
    if (!user) {
      await loginWithGoogle();
    } else {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = "https://wcfmayenbxkttctqgxle.supabase.co/functions/v1/google-callback";
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent&state=${user.id}`;
    }
  };

  // Lógica de OTP (Mantenida igual)
  const sendOtp = async () => {
    if (!phone) return alert("Ingresá un número");
    setIsVerifying(true);
    try {
      await supabase.functions.invoke('send-otp', { body: { phone, language: lang } });
      setOtpSent(true);
    } catch (e) { alert("Error al enviar código"); }
    finally { setIsVerifying(false); }
  };

  const verifyOtpAndFinish = async () => {
    if (!otp) return;
    setIsVerifying(true);
    try {
      const { data } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code: otp, business_id: myBusinesses[0]?.id }
      });
      if (data?.success || data?.verified) {
        localStorage.setItem('ranko_setup_complete', 'true');
        setStep('success');
      }
    } catch (e) { alert("Código incorrecto"); }
    finally { setIsVerifying(false); }
  };

  const content = {
    es: {
      hero: "Tus reseñas en Autopilot.",
      sub: "IA que responde por vos y te avisa por WhatsApp. Aumentá tu reputación en Google sin mover un dedo.",
      features: [
        { t: "Respuesta Inmediata", d: "La IA responde en segundos con el tono de tu marca." },
        { t: "Control Total", d: "Aprobá o editá las respuestas desde tu WhatsApp." },
        { t: "Bilingüe Nativo", d: "Optimizado para locales en Argentina y Brasil." }
      ],
      steps: [
        { t: "Conectá", d: "Vinculá tu cuenta de Google Business." },
        { t: "Recibí", d: "Te avisamos por WhatsApp de cada nueva reseña." },
        { t: "Crecé", d: "Mejorá tu posicionamiento orgánico en Google." }
      ]
    },
    pt: {
      hero: "Suas avaliações no Autopilot.",
      sub: "IA que responde por você e te avisa pelo WhatsApp. Melhore sua reputação no Google sem esforço.",
      features: [
        { t: "Resposta Imediata", d: "A IA responde em segundos com o tom da sua marca." },
        { t: "Controle Total", d: "Aprove ou edite as respostas pelo seu WhatsApp." },
        { t: "Bilíngue Nativo", d: "Otimizado para locais no Brasil e Argentina." }
      ],
      steps: [
        { t: "Conecte", d: "Vincule sua conta do Google Business." },
        { t: "Receba", d: "Avisamos pelo WhatsApp sobre cada nova avaliação." },
        { t: "Cresça", d: "Melhore seu posicionamento orgânico no Google." }
      ]
    }
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter">RANKO AI</div>
        <div className="flex items-center gap-6">
          <button onClick={() => setLang(lang === 'es' ? 'pt' : 'es')} className="text-slate-500 hover:text-white"><Globe size={18} /></button>
          {user && (
            <button onClick={handleSignOut} className="text-xs text-slate-500 hover:text-red-400">Log Out</button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto pt-20 px-6">
        {step === 'hero' && (
          <>
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8">
                <Zap size={14} fill="currentColor" /> Beta abierta: 7 días gratis
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">{t.hero}</h1>
              <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">{t.sub}</p>
              <button onClick={handleAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-2xl shadow-2xl transition-all flex items-center gap-4 mx-auto">
                Comenzar ahora <ArrowRight />
              </button>
            </div>

            {/* FEATURES */}
            <div className="grid md:grid-cols-3 gap-8 mb-32">
              {t.features.map((f, i) => (
                <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                  <div className="mb-4 text-indigo-400">{i === 0 ? <MessageSquare /> : i === 1 ? <ShieldCheck /> : <Zap />}</div>
                  <h3 className="font-bold text-xl mb-2">{f.t}</h3>
                  <p className="text-slate-500">{f.d}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {(step === 'onboarding' || step === 'success') && (
          <div className="max-w-md mx-auto py-20">
             {/* Aquí va tu lógica de OTP y Success que ya teníamos */}
             {step === 'onboarding' ? (
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-xl">
                  <h2 className="text-2xl font-bold mb-6 text-center">Vinculá tu WhatsApp</h2>
                  <div className="space-y-4">
                    {!otpSent ? (
                      <>
                        <input type="text" placeholder="549..." value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500" />
                        <button onClick={sendOtp} className="w-full bg-white text-black font-bold py-4 rounded-2xl">Enviar Código</button>
                      </>
                    ) : (
                      <>
                        <input type="text" placeholder="0000" value={otp} onChange={(e)=>setOtp(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-center text-2xl tracking-widest outline-none focus:border-emerald-500" />
                        <button onClick={verifyOtpAndFinish} className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl">Activar Ranko</button>
                      </>
                    )}
                  </div>
                </div>
             ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="text-emerald-400" size={40} /></div>
                  <h2 className="text-4xl font-bold mb-4">¡Listo!</h2>
                  <p className="text-slate-400">Ya estás operando. Recibirás un mensaje cuando detectemos una nueva reseña.</p>
                </div>
             )}
          </div>
        )}
      </main>

      {/* FOOTER - Requerido por Google */}
      <footer className="border-t border-white/5 py-20 bg-black/20 mt-20">
        <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="text-xl font-black mb-4">RANKO AI</div>
            <p className="text-slate-500 max-w-xs">La solución definitiva para la reputación online de negocios físicos en Latinoamérica.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-slate-400">Legal</h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li><a href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Términos de Servicio</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-slate-400">Contacto</h4>
            <p className="text-slate-500 text-sm">soporte@rankoai.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}