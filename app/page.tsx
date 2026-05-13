'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, ArrowRight,
  LayoutDashboard, Heart, Globe, Phone, Mail, 
  ShieldAlert, Gift, Languages
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle, logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'growth'>('overview');
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });

  // CONFIGURACIÓN
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [replyLang, setReplyLang] = useState('es');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [aiTone, setAiTone] = useState('friendly');
  const [autoCoupon, setAutoCoupon] = useState(false);
  const [promoText, setPromoText] = useState(''); 
  const [interceptorMode, setInterceptorMode] = useState('safe');

  const content: any = {
    es: {
      heroTitle: 'BLIND YOUR REPUTATION',
      heroSub: 'El primer sistema de defensa activa para Google Maps. Interceptá reseñas negativas y automatizá tu hospitalidad a escala.',
      getStarted: 'COMENZAR AHORA',
      overview: 'RESUMEN', strategy: 'DEFENSA', growth: 'CRECIMIENTO',
      totalReplies: 'Respuestas Totales', avgRating: 'Calificación Global',
      happiness: 'Felicidad del Cliente', timeSaved: 'Tiempo Ahorrado',
      selectBiz: 'TUS NEGOCIOS', growthTools: 'CRECIMIENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'DESCARGAR QR',
      langMode: 'IDIOMA DE RESPUESTA', waNotifications: 'ALERTAS WHATSAPP',
      brainLabel: 'CEREBRO DE IA', brainPlaceholder: 'Datos de tu negocio...',
      autoReply5: 'Auto-Respuesta 5★', handsFree: '100% Automático',
      crisisNotif: 'Alerta de Crítica', alertOwner: 'Notificar al dueño',
      automaticCoupon: 'Cupón de Regalo', couponDetail: 'Beneficio',
      couponPlaceholder: 'Ej: 10% OFF...',
      deployBtn: 'GUARDAR CAMBIOS', saving: 'GUARDANDO...'
    },
    pt: {
      heroTitle: 'BLIND YOUR REPUTATION',
      heroSub: 'O primeiro sistema de defesa ativa para o Google Maps. Intercepte avaliações negativas e automatize sua hospitalidade em escala.',
      getStarted: 'COMEÇAR AGORA',
      overview: 'VISÃO GERAL', strategy: 'DEFESA', growth: 'CRESCIMENTO',
      totalReplies: 'Respostas Totais', avgRating: 'Avaliação Global',
      happiness: 'Índice de Felicidade', timeSaved: 'Tempo Economizado',
      selectBiz: 'SEUS NEGÓCIOS', growthTools: 'CRESCIMENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'BAIXAR QR',
      langMode: 'IDIOMA DE RESPOSTA', waNotifications: 'NOTIFICAÇÕES WHATSAPP',
      brainLabel: 'CÉREBRO DA IA', brainPlaceholder: 'Dados do seu negócio...',
      autoReply5: 'Resposta Auto 5★', handsFree: '100% Automático',
      crisisNotif: 'Notificação de Crise', alertOwner: 'Alertar proprietário',
      automaticCoupon: 'Cupom de Presente', couponDetail: 'Detalhe do Benefício',
      couponPlaceholder: 'Ex: 10% OFF...',
      deployBtn: 'SALVAR ALTERAÇÕES', saving: 'SALVANDO...'
    }
  };

  const t = content[replyLang] || content.es;

  const downloadQR = (biz: any) => {
    if (!biz?.id) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`https://rankoai.com/review/${biz.id}`)}&ecc=H`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchData(session.user);
      } else {
        setLoading(false);
      }
    };
    init();
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
        applyBusinessData(first);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const applyBusinessData = (biz: any) => {
    setReplyLang(biz.language || 'es');
    setBizInfo(biz.business_info || '');
    setAiTone(biz.reply_tone || 'friendly');
    setPromoText(biz.promo_text || '');
    setAutoReply5(biz.auto_reply_5_stars ?? true);
    setNotifyNegative(biz.notify_negative_reviews ?? true);
    setAutoCoupon(biz.auto_coupon ?? false);
    setInterceptorMode(biz.interceptor_mode || 'safe');
    const phone = Array.isArray(biz.whatsapp_configs) ? biz.whatsapp_configs[0]?.phone_number : biz.whatsapp_configs?.phone_number;
    setWhatsappNumber(phone || '');
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      await supabase.from('businesses').update({
        language: replyLang, business_info: bizInfo, reply_tone: aiTone,
        promo_text: promoText, auto_reply_5_stars: autoReply5,
        notify_negative_reviews: notifyNegative, auto_coupon: autoCoupon,
        interceptor_mode: interceptorMode
      }).eq('id', selectedBusiness.id);

      const phone = whatsappNumber.replace(/\D/g, '');
      await supabase.from('whatsapp_configs').upsert({ business_id: selectedBusiness.id, phone_number: phone }, { onConflict: 'business_id' });
      
      alert(replyLang === 'pt' ? "Alterações salvas!" : "¡Cambios guardados!");
      fetchData(user);
    } catch (e) { alert("Error"); } finally { setIsSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  // LANDING PRINCIPAL
  if (!user) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-emerald-500/30">
      <nav className="max-w-7xl mx-auto w-full px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-fit">
          <span className="text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">Ranko AI</span>
          <span className="hidden md:block text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 border border-white/5 px-2 py-1 rounded-full">Global Tech</span>
        </div>
        <button onClick={loginWithGoogle} className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Login</button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto space-y-12 pb-20">
        <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter leading-[0.85] uppercase animate-in slide-in-from-bottom-8 duration-700">
          {t.heroTitle}
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm md:text-base leading-relaxed uppercase tracking-widest font-medium opacity-80">
          {t.heroSub}
        </p>
        <button 
          onClick={loginWithGoogle}
          className="group relative bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] flex items-center gap-4 active:scale-95"
        >
          {t.getStarted} <ArrowRight className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>

      <footer className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <div className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">Ranko AI</div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed italic">Active Reputation Defense.</p>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support</h4>
            <a href="mailto:support@rankoai.com" className="flex items-center gap-3 text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase"><Mail size={16}/> support@rankoai.com</a>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal</h4>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">Terms</a>
              <a href="#" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  // DASHBOARD
  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl flex-shrink-0">
              <Zap className="text-white fill-white" size={18} />
            </div>
            {/* Logo Dashboard con el degrade Esmeralda y sin cortes */}
            <span className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap pr-4">
              Ranko AI
            </span>
          </div>
          <button onClick={() => logout()} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all flex-shrink-0">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: t.totalReplies, val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: t.avgRating, val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: t.happiness, val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: t.timeSaved, val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem]">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <div className="text-3xl font-black italic tracking-tighter">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">{t.selectBiz}</h3>
              <div className="space-y-2">
                {myBusinesses.map((b) => (
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                    <span className="text-[11px] font-black uppercase italic truncate block">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">{t.growthTools}</h3>
              <button onClick={() => downloadQR(selectedBusiness)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl flex items-center gap-4 group">
                <QrCode className="text-emerald-400 group-hover:scale-110 transition-transform" size={24} />
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase italic">{t.smartInterceptor}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">{t.downloadQr}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-2 flex bg-black/40 gap-2 border-b border-white/5">
              {[
                { id: 'overview', icon: LayoutDashboard },
                { id: 'strategy', icon: ShieldAlert },
                { id: 'growth', icon: Zap }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                  <tab.icon size={14}/> {t[tab.id]}
                </button>
              ))}
            </div>

            <div className="p-8 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.langMode}</label>
                      <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setReplyLang('es')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase italic transition-all ${replyLang === 'es' ? 'bg-white text-black shadow-md' : 'text-slate-600'}`}>ESPAÑOL</button>
                        <button onClick={() => setReplyLang('pt')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase italic transition-all ${replyLang === 'pt' ? 'bg-white text-black shadow-md' : 'text-slate-600'}`}>PORTUGUÊS</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.waNotifications}</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 pl-10 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.brainLabel}</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={t.brainPlaceholder} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs leading-relaxed min-h-[160px] outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Zap size={20}/></div>
                        <div>
                          <div className="text-[11px] font-black uppercase italic">{t.autoReply5}</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold">{t.handsFree}</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-7 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500"><Gift size={20}/></div>
                        <span className="text-[11px] font-black uppercase italic">{t.automaticCoupon}</span>
                      </div>
                      <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-12 h-7 rounded-full relative transition-all ${autoCoupon ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoCoupon ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">RANKO ENGINE v2.1 // BUZIOS-ARG</span>
              <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black uppercase italic tracking-widest transition-all hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} />}
                {isSaving ? t.saving : t.deployBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}