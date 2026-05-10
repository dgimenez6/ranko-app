'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Globe, Star, Smartphone, MousePointer2, TrendingUp, Search,
  Loader2, LogOut, BarChart3, Store, Settings, Mail, FileText, Shield, UserCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'onboarding' | 'dashboard'>('hero');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'es' | 'pt'>('es');
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Función unificada para determinar dónde debe estar el usuario
  const refreshUserStatus = async (currentUser: any) => {
    if (!currentUser) {
      setStep('hero');
      return;
    }

    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', currentUser.id);
    
    const businesses = bizData || [];
    setMyBusinesses(businesses);

    // Si ya tiene negocios vinculados, vamos directo al Dashboard
    if (businesses.length > 0) {
      setStep('dashboard');
      localStorage.setItem('ranko_setup_complete', 'true');
    } else {
      // Si no tiene negocios, lo dejamos en el Hero para que inicie el flujo de Google
      setStep('hero');
    }
  };

  useEffect(() => {
    const browserLang = typeof window !== 'undefined' ? navigator.language.split('-')[0] : 'es';
    if (browserLang === 'pt') setLang('pt');

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await refreshUserStatus(session.user);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('ranko_setup_complete');
    await supabase.auth.signOut();
    setUser(null);
    setMyBusinesses([]);
    setStep('hero');
    window.location.href = '/';
  };

  const handleAction = async () => {
    if (!user) {
      await loginWithGoogle();
    } else if (myBusinesses.length > 0) {
      setStep('dashboard');
    } else {
      // Flujo de vinculación de cuenta de Google Business
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = "https://wcfmayenbxkttctqgxle.supabase.co/functions/v1/google-callback";
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent&state=${user.id}`;
    }
  };

  const sendOtp = async () => {
    if (!phone) return;
    setIsVerifying(true);
    try {
      await supabase.functions.invoke('send-otp', { body: { phone, language: lang } });
      setOtpSent(true);
    } catch (e) { console.error(e); }
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
        setStep('dashboard');
      }
    } catch (e) { console.error(e); }
    finally { setIsVerifying(false); }
  };

  const t = {
    es: {
      hero: "Tus reseñas en Autopilot.",
      sub: "IA que responde por vos y te avisa por WhatsApp. Aumentá tu reputación en Google sin mover un dedo.",
      cta_start: "Empezar Gratis",
      cta_dashboard: "Ir a mi Panel",
      login: "Ingresar",
      logout: "Salir",
      dashboard: "Mi Panel de Gestión",
      contact: "support@rankoai.com",
      legal: { privacy: "Privacidad", terms: "Términos" }
    },
    pt: {
      hero: "Suas avaliações no Autopilot.",
      sub: "IA que responde por você e te avisa pelo WhatsApp. Melhore sua reputação no Google sem esforço.",
      cta_start: "Começar Grátis",
      cta_dashboard: "Ir para o Painel",
      login: "Entrar",
      logout: "Sair",
      dashboard: "Meu Painel",
      contact: "support@rankoai.com",
      legal: { privacy: "Privacidade", terms: "Termos" }
    }
  }[lang];

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter">RANKO AI</div>
        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'es' ? 'pt' : 'es')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all uppercase flex items-center gap-2">
            <Globe size={14} /> {lang.toUpperCase()}
          </button>
          {!user ? (
            <button onClick={() => loginWithGoogle()} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 border border-white/10 rounded-xl hover:bg-white/5 transition-all">
              <UserCircle size={16} /> {t.login}
            </button>
          ) : (
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase hover:bg-red-500/20 transition-all">
              <LogOut size={14} /> {t.logout}
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <>
            <div className="pt-24 text-center">
              <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-tight">{t.hero}</h1>
              <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
              <button onClick={handleAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all flex items-center gap-4 mx-auto group">
                {user && myBusinesses.length > 0 ? t.cta_dashboard : t.cta_start} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="mt-32 grid md:grid-cols-3 gap-8 py-20 border-t border-white/5">
                <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem]">
                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-6"><Zap /></div>
                    <h3 className="text-xl font-bold mb-4">Respuestas en Segundos</h3>
                    <p className="text-slate-400 leading-relaxed">IA que responde positivamente al instante para mejorar tu SEO.</p>
                </div>
                <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem]">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6"><MessageSquare /></div>
                    <h3 className="text-xl font-bold mb-4">Control por WhatsApp</h3>
                    <p className="text-slate-400 leading-relaxed">Alertas y aprobación de respuestas críticas desde tu celular.</p>
                </div>
                <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem]">
                    <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center mb-6"><TrendingUp /></div>
                    <h3 className="text-xl font-bold mb-4">SEO y Rating</h3>
                    <p className="text-slate-400 leading-relaxed">Mejorá tu posicionamiento frente a la competencia en Google Maps.</p>
                </div>
            </div>
          </>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-fade-in">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><BarChart3 size={24} /></div>
              <h1 className="text-4xl font-black tracking-tight">{t.dashboard}</h1>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBusinesses.map((b) => (
                <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{b.business_name}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-1"><Store size={14}/> Google Profile Activo</p>
                    </div>
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><CheckCircle2 size={16} /></div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 mb-6">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Reputación</p>
                    <p className="text-2xl font-black text-yellow-400">★ 5.0</p>
                  </div>
                  <button className="w-full py-4 bg-indigo-600/10 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Settings size={16} /> Configurar IA
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'onboarding' && (
          <div className="max-w-md mx-auto py-32">
             <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10">
                <h2 className="text-3xl font-black mb-2 text-center">Último Paso</h2>
                <p className="text-slate-500 text-center mb-8">Vinculá tu WhatsApp para recibir las alertas.</p>
                <div className="space-y-4">
                  {!otpSent ? (
                    <>
                      <input type="text" placeholder="54911..." value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-indigo-500" />
                      <button onClick={sendOtp} disabled={isVerifying} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl transition-all">
                        {isVerifying ? <Loader2 className="animate-spin mx-auto" /> : 'Siguiente'}
                      </button>
                    </>
                  ) : (
                    <>
                      <input type="text" placeholder="CÓDIGO" value={otp} onChange={(e)=>setOtp(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-center text-4xl font-black tracking-[0.5em] text-white outline-none" />
                      <button onClick={verifyOtpAndFinish} disabled={isVerifying} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-5 rounded-2xl transition-all">
                        {isVerifying ? <Loader2 className="animate-spin mx-auto" /> : 'Activar Cuenta'}
                      </button>
                    </>
                  )}
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-24 bg-black/40 mt-32">
        <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="text-2xl font-black mb-6 tracking-tighter">RANKO AI</div>
            <p className="text-slate-500 max-w-xs leading-relaxed">Gestión inteligente de reseñas para negocios en Argentina y Brasil.</p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-xs uppercase tracking-widest text-slate-400">Legal</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><a href="/privacy" className="hover:text-white transition-colors">{t.legal.privacy}</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">{t.legal.terms}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-xs uppercase tracking-widest text-slate-400">Contacto</h4>
            <div className="inline-flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
              <Mail className="text-indigo-400" size={18} />
              <span className="text-sm font-medium text-slate-300">{t.contact}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}