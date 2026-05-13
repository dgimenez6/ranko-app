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

  // ESTADOS DE CONFIGURACIÓN
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
      overview: 'RESUMEN', strategy: 'DEFENSA', growth: 'CRECIMIENTO',
      totalReplies: 'Respuestas Totales', avgRating: 'Calificación Global',
      happiness: 'Índice de Felicidad', timeSaved: 'Tiempo Ahorrado',
      selectBiz: 'SELECCIONAR NEGOCIO', growthTools: 'HERRAMENTAS DE CRECIMIENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'DESCARGAR ETIQUETA QR',
      langMode: 'MODO DE IDIOMA', waNotifications: 'NOTIFICACIONES WHATSAPP',
      brainLabel: 'CEREBRO: BASE DE CONOCIMIENTOS', brainPlaceholder: 'Describí tu negocio para la IA...',
      autoReply5: 'Respuesta Auto 5★', handsFree: 'Modo 100% Manos Libres',
      crisisNotif: 'Notificación de Crisis', alertOwner: 'Alertar al dueño ante críticas',
      automaticCoupon: 'Cupón Automático en Feedback', couponDetail: 'Detalle del Beneficio (Cupón)',
      couponPlaceholder: 'Ej: Café de cortesía, 10% OFF...',
      deployBtn: 'DEPLOY CHANGES', saving: 'SAVING...',
    },
    pt: {
      overview: 'VISÃO GERAL', strategy: 'DEFESA', growth: 'CRESCIMENTO',
      totalReplies: 'Respostas Totais', avgRating: 'Avaliação Global',
      happiness: 'Índice de Felicidade', timeSaved: 'Tempo Economizado',
      selectBiz: 'SELECIONAR NEGÓCIO', growthTools: 'FERRAMENTAS DE CRESCIMENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'BAIXAR ETIQUETA QR',
      langMode: 'MODO DE IDIOMA', waNotifications: 'NOTIFICAÇÕES WHATSAPP',
      brainLabel: 'CÉREBRO: BASE DE CONHECIMENTO', brainPlaceholder: 'Descreva seu negócio para a IA...',
      autoReply5: 'Resposta Auto 5★', handsFree: 'Modo 100% Mãos Livres',
      crisisNotif: 'Notificação de Crise', alertOwner: 'Alertar proprietário sobre críticas',
      automaticCoupon: 'Cupom Automático no Feedback', couponDetail: 'Detalhe do Benefício (Cupom)',
      couponPlaceholder: 'Ex: Café de cortesia, 10% OFF...',
      deployBtn: 'DEPLOY CHANGES', saving: 'SAVING...',
    }
  };

  const t = content[replyLang] || content.es;

  // FUNCIÓN QUE FALTABA PARA COMPILAR
  const downloadQR = (biz: any) => {
    if (!biz?.id) return alert("Seleccioná un local primero");
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`https://rankoai.com/review/${biz.id}`)}&ecc=H`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${biz.business_name}.png`;
    link.target = "_blank";
    link.click();
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
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*, whatsapp_configs(phone_number)')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      if (businesses && businesses.length > 0) {
        setMyBusinesses(businesses);
        const first = businesses[0];
        setSelectedBusiness(first);
        applyBusinessData(first);

        const bizIds = businesses.map(b => b.id);
        const { data: logs } = await supabase.from('reviews_logs').select('stars, status').in('business_id', bizIds);

        if (logs) {
          const valid = logs.filter(l => l.stars != null);
          const posted = logs.filter(l => l.status === 'posted').length;
          setStats({
            totalReplies: posted,
            avgRating: valid.length > 0 ? Number((valid.reduce((acc, curr) => acc + curr.stars, 0) / valid.length).toFixed(1)) : 0,
            happiness: valid.length > 0 ? Math.round((valid.filter(l => l.stars >= 4).length / valid.length) * 100) : 0,
            timeSaved: posted > 0 ? `${Math.round((posted * 8) / 60)}h` : '0h'
          });
        }
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
      
      alert(replyLang === 'pt' ? "Configurações salvas!" : "¡Configuración guardada!");
      fetchData(user);
    } catch (e) { alert("Error al guardar"); } finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-500" size={40} />
      <span className="text-[10px] font-black tracking-[0.4em] text-slate-700 uppercase">Ranko AI Loading</span>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <button onClick={loginWithGoogle} className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase italic tracking-widest hover:bg-cyan-400 transition-all">
        Login with Google
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-2 rounded-xl">
              <Zap className="text-black fill-black" size={20} />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent whitespace-nowrap">Ranko AI</span>
          </div>
          <button onClick={() => logout()} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* STATS CON COLORES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: t.totalReplies, val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: t.avgRating, val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: t.happiness, val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: t.timeSaved, val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
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
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-950/50 border-white/5 text-slate-500'}`}>
                    <span className="text-[11px] font-black uppercase italic">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">{t.growthTools}</h3>
              <button onClick={() => downloadQR(selectedBusiness)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl flex items-center gap-4 group transition-all">
                <QrCode className="text-indigo-400 group-hover:scale-110 transition-transform" size={24} />
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
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
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
                        <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 pl-10 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.brainLabel}</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={t.brainPlaceholder} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs leading-relaxed min-h-[160px] outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Zap size={20}/></div>
                        <div>
                          <div className="text-[11px] font-black uppercase italic">{t.autoReply5}</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold">{t.handsFree}</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-7 rounded-full relative transition-all ${autoReply5 ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><ShieldAlert size={20}/></div>
                        <div>
                          <div className="text-[11px] font-black uppercase italic">{t.crisisNotif}</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold">{t.alertOwner}</div>
                        </div>
                      </div>
                      <button onClick={() => setNotifyNegative(!notifyNegative)} className={`w-12 h-7 rounded-full relative transition-all ${notifyNegative ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${notifyNegative ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500"><Gift size={20}/></div>
                        <span className="text-[11px] font-black uppercase italic">{t.automaticCoupon}</span>
                      </div>
                      <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-12 h-7 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoCoupon ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    {autoCoupon && (
                      <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{t.couponDetail}</label>
                        <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder={t.couponPlaceholder} className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-cyan-500 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">RANKO AI v2.1 // BUZIOS-ARG</span>
              <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase italic tracking-widest transition-all hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2">
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