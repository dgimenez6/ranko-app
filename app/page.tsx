'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, Sparkles, QrCode, ArrowRight,
  LayoutDashboard, Megaphone, Heart, HelpCircle, BrainCircuit, Globe, Phone
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });
  const [activeTab, setActiveTab] = useState<'overview' | 'growth'>('overview');

  // ESTADOS CONFIGURACIÓN
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('professional');
  const [replyLang, setReplyLang] = useState('es');
  const [promoText, setPromoText] = useState('');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // DICCIONARIO UNIFICADO (Fuera del render para evitar errores de declaración)
  const translations: any = {
    es: {
      heroTitle: "Tu Reputación en Piloto Automático",
      heroSub: "IA que responde tus reseñas de Google Maps con el ADN de tu negocio.",
      start: "Comenzar ahora",
      setup: "Configuración del Local",
      myBiz: "Mis Negocios",
      qr: "Marketing QR",
      stats: ["Respuestas", "Rating", "Felicidad", "Ahorro"],
      cerebro: "Cerebro del Local (Knowledge)",
      auto5: "Auto-Responder 5⭐",
      notifyNeg: "Alertar Negativas WhatsApp",
      saveBtn: "GUARDAR CONFIGURACIÓN",
      placeholderInfo: "Ej: Especialidad en carnes, aceptamos Pix..."
    },
    pt: {
      heroTitle: "Sua Reputação no Piloto Automático",
      heroSub: "IA que responde suas avaliações do Google Maps com o ADN do seu negócio.",
      start: "Começar agora",
      setup: "Configuração do Local",
      myBiz: "Meus Negócios",
      qr: "Marketing QR",
      stats: ["Respostas", "Avaliação", "Felicidade", "Tempo"],
      cerebro: "Cérebro do Local (Knowledge)",
      auto5: "Auto-Responder 5⭐",
      notifyNeg: "Alertar Negativas WhatsApp",
      saveBtn: "ATUALIZAR ESTRATÉGIA",
      placeholderInfo: "Ex: Especialidade em carnes, aceitamos Pix..."
    }
  };

  const t = translations[replyLang] || translations.es;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData(session.user);
      else setLoading(false);
    });
  }, []);

  const fetchData = async (currentUser: any) => {
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*, whatsapp_configs(phone_number)')
        .eq('user_id', currentUser.id);
      
      if (businesses && businesses.length > 0) {
        setMyBusinesses(businesses);
        const first = businesses[0];
        setSelectedBusiness(first);
        setAiTone(first.reply_tone || 'professional');
        setReplyLang(first.language || 'es');
        setPromoText(first.promo_offers || '');
        setBizInfo(first.business_info || '');
        setWhatsappNumber(first.whatsapp_configs?.phone_number || '');
        setAutoReply5(first.is_active ?? true);
        setNotifyNegative(first.notify_negative ?? true);

        // Cálculo de Estadísticas (Felicidad, Horas, etc)
        const bizIds = businesses.map(b => b.id);
        const { data: logs } = await supabase.from('reviews_logs').select('stars').in('business_id', bizIds);
        if (logs) {
          const total = logs.length;
          const valid = logs.filter(l => l.stars != null);
          setStats({
            totalReplies: total,
            avgRating: valid.length > 0 ? Number((valid.reduce((acc, curr) => acc + curr.stars, 0) / valid.length).toFixed(1)) : 0,
            happiness: valid.length > 0 ? Math.round((valid.filter(l => l.stars >= 4).length / valid.length) * 100) : 0,
            timeSaved: total > 0 ? `${Math.round((total * 5) / 60)}h` : '0h'
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      await supabase.from('businesses').update({
        reply_tone: aiTone,
        language: replyLang,
        promo_offers: promoText,
        business_info: bizInfo,
        is_active: autoReply5,
        notify_negative: notifyNegative
      }).eq('id', selectedBusiness.id);
      
      // También actualizamos el teléfono si cambió
      await supabase.from('whatsapp_configs').upsert({
        business_id: selectedBusiness.id,
        phone_number: whatsappNumber
      }, { onConflict: 'business_id' });

      alert('Configuración guardada correctamente');
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQR = (biz: any) => {
    const bizId = biz.google_location_id?.split('/').pop() || biz.id;
    const url = biz.review_url || `https://search.google.com/local/writereview?placeid=${bizId}`;
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      
      {/* 1. NAV (Ajustado para que no se corte el logo) */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="max-w-6xl mx-auto px-5 py-5 flex justify-between items-center overflow-hidden gap-4">
          <div className="flex-shrink-0">
            <div className="text-lg md:text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase whitespace-nowrap pr-2">
              RANKO AI
            </div>
          </div>
          <button 
            onClick={() => user ? supabase.auth.signOut().then(() => window.location.reload()) : loginWithGoogle()} 
            className={`px-4 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase border transition-all whitespace-nowrap ${user ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'}`}
          >
            {user ? 'SIGN OUT' : 'LOGIN'}
          </button>
        </div>
      </nav>

      {/* 2. LANDING PAGE (Visible si no hay sesión) */}
      {!user ? (
        <div className="relative pt-20 pb-32 overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 animate-bounce">
              <Sparkles size={14} /> REVOLUCIONANDO GOOGLE BUSINESS
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] uppercase italic">
              {t.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
              {t.heroSub}
            </p>
            <button 
              onClick={loginWithGoogle}
              className="group relative px-8 py-5 bg-indigo-500 rounded-2xl font-black text-slate-950 flex items-center gap-3 mx-auto hover:bg-indigo-400 transition-all hover:scale-105 shadow-2xl shadow-indigo-500/40 uppercase italic"
            >
              {t.start} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        /* 3. DASHBOARD (Sincronizado con tus métricas y QR) */
        <div className="max-w-6xl mx-auto px-5 py-10 animate-in fade-in duration-700">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
              <p className="text-slate-500 font-bold italic uppercase text-xs tracking-widest">Sincronizando con Google...</p>
            </div>
          ) : (
            <>
              {/* TABS DASHBOARD */}
              <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
                <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}><LayoutDashboard size={14}/> {t.myBiz}</button>
                <button onClick={() => setActiveTab('growth')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${activeTab === 'growth' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}><QrCode size={14}/> {t.qr}</button>
              </div>

              {activeTab === 'overview' ? (
                <>
                  {/* MÉTRICAS (Tus stats de felicidad y tiempo) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                      { label: t.stats[0], val: stats.totalReplies, icon: MessageSquare, col: 'text-indigo-400' },
                      { label: t.stats[1], val: stats.avgRating || 'New', icon: Star, col: 'text-yellow-400' },
                      { label: t.stats[2], val: `${stats.happiness}%`, icon: Heart, col: 'text-pink-400' },
                      { label: t.stats[3], val: stats.timeSaved, icon: Clock, col: 'text-emerald-400' },
                    ].map((m, i) => (
                      <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all">
                        <m.icon className={`${m.col} mb-4`} size={20} />
                        <p className="text-4xl font-black mb-1">{m.val}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <Globe size={14} /> Seleccionar Mercado
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setReplyLang('es')} className={`py-3 rounded-2xl font-bold text-xs border transition-all ${replyLang === 'es' ? 'bg-indigo-500 border-indigo-500 text-slate-950' : 'bg-transparent border-white/10 text-slate-400'}`}>ARGENTINA</button>
                          <button onClick={() => setReplyLang('pt')} className={`py-3 rounded-2xl font-bold text-xs border transition-all ${replyLang === 'pt' ? 'bg-indigo-500 border-indigo-500 text-slate-950' : 'bg-transparent border-white/10 text-slate-400'}`}>BRASIL</button>
                        </div>
                      </div>

                      <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <LayoutDashboard size={14} /> {t.myBiz}
                        </h3>
                        <div className="space-y-3">
                          {myBusinesses.map(b => (
                            <button key={b.id} onClick={() => setSelectedBusiness(b)} className={`w-full p-4 rounded-3xl text-left transition-all border ${selectedBusiness?.id === b.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-transparent border-white/5 hover:border-white/20'}`}>
                              <p className="font-black text-xs uppercase italic">{b.business_name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-8">
                      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-3">
                          <Settings className="text-indigo-400" /> {t.setup}
                        </h2>
                        <div className="space-y-8">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">{t.cerebro}</label>
                            <textarea 
                              value={bizInfo} onChange={(e) => setBizInfo(e.target.value)}
                              placeholder={t.placeholderInfo}
                              className="w-full bg-slate-950 border border-white/10 rounded-3xl p-5 text-sm focus:border-indigo-500 outline-none transition-all min-h-[120px]"
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                              <span className="text-[10px] font-black uppercase italic tracking-tighter">{t.auto5}</span>
                              <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-6 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                              <span className="text-[10px] font-black uppercase italic tracking-tighter">{t.notifyNeg}</span>
                              <button onClick={() => setNotifyNegative(!notifyNegative)} className={`w-12 h-6 rounded-full relative transition-all ${notifyNegative ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifyNegative ? 'right-1' : 'left-1'}`} />
                              </button>
                            </div>
                          </div>

                          <button onClick={saveSettings} disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 text-sm uppercase italic tracking-tighter">
                            {isSaving ? <Loader2 className="animate-spin" /> : t.saveBtn}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* QR SECTION (Marketing Center) */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
                  {myBusinesses.map(biz => (
                    <div key={biz.id} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center group hover:border-emerald-500/50 transition-all">
                      <QrCode size={48} className="mx-auto mb-6 text-indigo-400" />
                      <h3 className="text-2xl font-black mb-6 italic uppercase tracking-tighter">{biz.business_name}</h3>
                      <button onClick={() => downloadQR(biz)} className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all italic shadow-lg shadow-emerald-500/20">
                        <Zap size={16}/> GENERAR QR SMART
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-black italic tracking-tighter text-slate-700 uppercase">RANKO AI</div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">© 2026 Búzios & Argentina</div>
        </div>
      </footer>
    </main>
  );
}