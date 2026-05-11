'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, Sparkles, QrCode, ArrowRight,
  LayoutDashboard, Megaphone, Heart, HelpCircle, BrainCircuit, Globe, Phone, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'dashboard'>('hero');
  const [activeTab, setActiveTab] = useState<'overview' | 'growth'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });

  // ESTADOS DE CONFIGURACIÓN (Mapeados 1:1 con tu tabla business)
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('professional');
  const [replyLang, setReplyLang] = useState('es');
  const [promoText, setPromoText] = useState('');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [autoReply5, setAutoReply5] = useState(true); 
  const [autoReplyLow, setAutoReplyLow] = useState(false); // Nueva lógica para < 5 estrellas
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const translations: any = {
    es: {
      myBiz: "Mis Negocios", qr: "Marketing QR",
      stats: ["Respuestas", "Rating", "Felicidad", "Ahorro"],
      configTitle: "ESTRATEGIA IA",
      bizInfo: "Cerebro del Local", lang: "Idioma Interfaz",
      tone: "Tono IA", promo: "Promoción Activa",
      whatsapp: "WhatsApp Alertas", autoHigh: "Responder 5 ⭐",
      autoLow: "Responder < 5 ⭐", notifyNeg: "Notificar Negativas",
      saveBtn: "GUARDAR ESTRATEGIA",
      placeholderInfo: "Ej: Especialidad en carnes, aceptamos Pix...",
      tooltip: "Información que usará la IA para que las respuestas sean únicas."
    },
    pt: {
      myBiz: "Meus Negócios", qr: "Marketing QR",
      stats: ["Respostas", "Avaliação", "Felicidade", "Tempo"],
      configTitle: "ESTRATÉGIA IA",
      bizInfo: "Cérebro do Local", lang: "Idioma Interface",
      tone: "Tom da IA", promo: "Promoção Ativa",
      whatsapp: "WhatsApp Alertas", autoHigh: "Responder 5 ⭐",
      autoLow: "Responder < 5 ⭐", notifyNeg: "Notificar Negativas",
      saveBtn: "ATUALIZAR ESTRATÉGIA",
      placeholderInfo: "Ex: Especialidade em carnes, aceitamos Pix...",
      tooltip: "Informação que a IA usará para respostas exclusivas."
    }
  };

  const t = translations[replyLang] || translations.es;

  useEffect(() => {
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

  const refreshUserStatus = async (currentUser: any) => {
    if (!currentUser) return;
    const { data: bizData } = await supabase.from('businesses').select('*').eq('user_id', currentUser.id);
    setMyBusinesses(bizData || []);
    if (bizData && bizData.length > 0) setStep('dashboard');
  };

  const openConfig = (biz: any) => {
    setSelectedBusiness(biz);
    // CARGAMOS TODO DESDE LA FILA DE LA DB
    setAiTone(biz.reply_tone || 'professional');
    setReplyLang(biz.language || 'es');
    setPromoText(biz.promo_text || '');
    setBizInfo(biz.business_info || '');
    setWhatsappNumber(biz.whatsapp_number || ''); // Aquí traemos el teléfono
    setAutoReply5(biz.auto_reply_5_stars ?? true);
    setAutoReplyLow(biz.auto_reply_low_stars ?? false); // Mapeo de la nueva lógica
    setNotifyNegative(biz.notify_negative_reviews ?? true);
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    const { error } = await supabase.from('businesses').update({ 
      reply_tone: aiTone, 
      language: replyLang,
      promo_text: promoText,
      business_info: bizInfo,
      whatsapp_number: whatsappNumber,
      auto_reply_5_stars: autoReply5,
      auto_reply_low_stars: autoReplyLow,
      notify_negative_reviews: notifyNegative
    }).eq('id', selectedBusiness.id);

    if (!error) {
      await refreshUserStatus(user);
      setSelectedBusiness(null);
    }
    setIsSaving(false);
  };

  const downloadQR = (biz: any) => {
    const bizId = biz.google_location_id?.split('/').pop() || biz.id;
    const url = biz.review_url || `https://search.google.com/local/writereview?placeid=${bizId}`;
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic uppercase tracking-tighter">RANKO AI</div>
        {user ? (
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-black uppercase border border-red-500/10">SIGN OUT</button>
        ) : (
          <button onClick={() => loginWithGoogle()} className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase border border-indigo-500/10">LOGIN</button>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <div className="pt-24 text-center">
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic uppercase">AI Reputation.<br/><span className="text-indigo-500">Zero Effort.</span></h1>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl transition-all flex items-center gap-4 mx-auto group shadow-xl shadow-indigo-500/20 uppercase italic">
              Empieza ahora <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in duration-700">
            <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500'}`}><LayoutDashboard size={14}/> {t.myBiz}</button>
              <button onClick={() => setActiveTab('growth')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${activeTab === 'growth' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500'}`}><QrCode size={14}/> {t.qr}</button>
            </div>

            {activeTab === 'overview' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBusinesses.map((b) => (
                  <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] shadow-2xl flex flex-col group hover:border-indigo-500/50 transition-all">
                    <h3 className="font-black text-2xl mb-8 italic uppercase tracking-tighter">{b.business_name}</h3>
                    <button onClick={() => openConfig(b)} className="mt-auto w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all italic">
                      <Settings size={14} /> {t.configTitle}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        )}

        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-3xl rounded-[3rem] p-8 md:p-12 shadow-2xl my-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">{t.configTitle}</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-3 italic"><BrainCircuit size={14} className="text-indigo-400"/> {t.bizInfo}</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={t.placeholderInfo} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs h-40 outline-none focus:border-indigo-500 transition-all font-bold resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-3 italic"><Globe size={14} className="text-indigo-400"/> {t.lang}</label>
                    <select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold outline-none appearance-none cursor-pointer uppercase">
                      <option value="es" className="bg-slate-900">Español 🇦🇷</option>
                      <option value="pt" className="bg-slate-900">Português 🇧🇷</option>
                      <option value="en" className="bg-slate-900">English 🇺🇸</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-3 italic"><Sparkles size={14} className="text-indigo-400"/> {t.tone}</label>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold outline-none appearance-none cursor-pointer uppercase">
                      <option value="friendly" className="bg-slate-900">Friendly</option>
                      <option value="professional" className="bg-slate-900">Professional</option>
                      <option value="funny" className="bg-slate-900">Funny</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-3 italic"><Megaphone size={14} className="text-emerald-400"/> {t.promo}</label>
                    <input value={promoText} onChange={(e) => setPromoText(e.target.value)} type="text" placeholder="Ej: 10% OFF Martes..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-3 italic"><Phone size={14} className="text-emerald-400"/> {t.whatsapp}</label>
                    <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} type="text" placeholder="+54 9 11..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
              </div>

              {/* AUTOMATIZACIÓN */}
              <div className="grid md:grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/5">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                  <span className="text-[10px] font-black uppercase italic">{t.autoHigh}</span>
                  <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-6 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                  <span className="text-[10px] font-black uppercase italic">{t.autoLow}</span>
                  <button onClick={() => setAutoReplyLow(!autoReplyLow)} className={`w-12 h-6 rounded-full relative transition-all ${autoReplyLow ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReplyLow ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button onClick={saveSettings} disabled={isSaving} className="w-full mt-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 text-sm uppercase italic">
                {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> {t.saveBtn}</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}