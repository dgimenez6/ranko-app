'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, ArrowRight,
  LayoutDashboard, Heart, HelpCircle, Globe, Phone, Mail, FileText, 
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

  // CONFIGURACIÓN (Mapeada 1:1 con DB)
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

  // DICCIONARIO DE IDIOMAS (Español / Português)
  const content: any = {
    es: {
      overview: 'RESUMEN', strategy: 'DEFENSA', growth: 'CRECIMIENTO',
      totalReplies: 'Respuestas Totales', avgRating: 'Calificación Global',
      happiness: 'Felicidad del Cliente', timeSaved: 'Tiempo Ahorrado',
      selectBiz: 'TUS NEGOCIOS', growthTools: 'CRECIMIENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'DESCARGAR QR',
      langMode: 'IDIOMA DE RESPUESTA', waNotifications: 'ALERTAS WHATSAPP',
      brainLabel: 'CEREBRO DE IA', brainPlaceholder: 'Datos de tu negocio (menú, especialidades, etc.) para que la IA responda...',
      autoReply5: 'Auto-Respuesta 5★', handsFree: '100% Automático',
      crisisNotif: 'Alerta de Crítica', alertOwner: 'Notificar al dueño por WhatsApp',
      automaticCoupon: 'Cupón de Regalo', couponDetail: 'Beneficio del Cupón',
      couponPlaceholder: 'Ej: Un café de cortesía, 10% OFF...',
      interceptorMode: 'Modo del Interceptor',
      aggressive: 'Defensa Agresiva (1-3★)', balanced: 'Equilibrado (1-2★)', minimal: 'Mínimo (Siempre Google)',
      deployBtn: 'GUARDAR CAMBIOS', saving: 'GUARDANDO...'
    },
    pt: {
      overview: 'VISÃO GERAL', strategy: 'DEFESA', growth: 'CRESCIMENTO',
      totalReplies: 'Respostas Totais', avgRating: 'Avaliação Global',
      happiness: 'Índice de Felicidade', timeSaved: 'Tempo Economizado',
      selectBiz: 'SEUS NEGÓCIOS', growthTools: 'CRESCIMENTO',
      smartInterceptor: 'SMART QR INTERCEPTOR', downloadQr: 'BAIXAR QR',
      langMode: 'IDIOMA DE RESPOSTA', waNotifications: 'NOTIFICAÇÕES WHATSAPP',
      brainLabel: 'CÉREBRO DA IA', brainPlaceholder: 'Dados do seu negócio (menu, especialidades, etc.) para que a IA responda...',
      autoReply5: 'Resposta Auto 5★', handsFree: '100% Automático',
      crisisNotif: 'Notificação de Crise', alertOwner: 'Alertar proprietário por WhatsApp',
      automaticCoupon: 'Cupom de Presente', couponDetail: 'Detalhe do Benefício',
      couponPlaceholder: 'Ex: Um café cortesia, 10% OFF...',
      interceptorMode: 'Modo do Interceptor',
      aggressive: 'Defesa Agresiva (1-3★)', balanced: 'Equilibrado (1-2★)', minimal: 'Mínimo (Sempre Google)',
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
      const { data: businesses, error: bError } = await supabase
        .from('businesses')
        .select('*, whatsapp_configs(phone_number)')
        .eq('user_id', currentUser.id);
      
      if (bError) throw bError;

      if (businesses && businesses.length > 0) {
        setMyBusinesses(businesses);
        const first = businesses[0];
        setSelectedBusiness(first);
        applyBusinessData(first);

        const bizIds = businesses.map(b => b.id);
        const { data: logs, error: lError } = await supabase.from('reviews_logs').select('stars, status').in('business_id', bizIds);

        if (lError) throw lError;

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
    } catch (e) { console.error("Fetch error:", e); } finally { setLoading(false); }
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
      const { error: bizError } = await supabase.from('businesses').update({
        language: replyLang, business_info: bizInfo, reply_tone: aiTone,
        promo_text: promoText, auto_reply_5_stars: autoReply5,
        notify_negative_reviews: notifyNegative, auto_coupon: autoCoupon,
        interceptor_mode: interceptorMode
      }).eq('id', selectedBusiness.id);

      if (bizError) throw bizError;

      const phone = whatsappNumber.replace(/\D/g, '');
      const { error: waError } = await supabase.from('whatsapp_configs').upsert({ 
        business_id: selectedBusiness.id, 
        phone_number: phone 
      }, { onConflict: 'business_id' });

      if (waError) throw waError;
      
      alert(replyLang === 'pt' ? "Alterações salvas com sucesso!" : "¡Cambios guardados con éxito!");
      fetchData(user);
    } catch (e: any) { alert("Error al guardar: " + e.message); } finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">RANKO AI LOADING</span>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/50 border border-white/5 rounded-[3rem] p-12 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
          <Zap className="text-indigo-500 fill-indigo-500" size={32} />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Ranko AI</h1>
        <p className="text-slate-500 mb-10 text-[10px] uppercase tracking-[0.2em] font-black italic">Reputation Defense System</p>
        <button 
          onClick={loginWithGoogle}
          className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase italic tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-3 hover:bg-cyan-400"
        >
          <Globe size={20} /> Login with Google
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
              <Zap className="text-black fill-black" size={20} />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Ranko AI</span>
            <span className="hidden md:block text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 border border-white/5 px-2 py-1 rounded-full ml-2">Global Hospitality Tech</span>
          </div>
          <button onClick={() => logout()} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Logout</button>
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
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group hover:border-white/10 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <s.icon className={`${s.color} mb-4`} size={20} />
              <div className="text-4xl font-black italic tracking-tighter mb-1">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[3rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
                <LayoutDashboard size={14}/> {t.selectBiz}
              </h3>
              <div className="space-y-3">
                {myBusinesses.map((b) => (
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); }} className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                    <span className="text-[11px] font-black uppercase italic truncate">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[3rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">{t.growthTools}</h3>
              <button onClick={() => downloadQR(selectedBusiness)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center gap-4 group transition-all">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-black transition-all">
                  <QrCode size={24} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase italic tracking-tighter">{t.smartInterceptor}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">{t.downloadQr}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 flex bg-black/40 gap-2 border-b border-white/5">
              {[
                { id: 'overview', icon: LayoutDashboard },
                { id: 'strategy', icon: ShieldAlert },
                { id: 'growth', icon: Zap }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
                  <tab.icon size={14}/> {t[tab.id]}
                </button>
              ))}
            </div>

            <div className="p-12 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Languages size={14}/> {t.langMode}</label>
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5">
                        <button onClick={() => setReplyLang('es')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${replyLang === 'es' ? 'bg-white text-black shadow-xl' : 'text-slate-600'}`}>ESPAÑOL</button>
                        <button onClick={() => setReplyLang('pt')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${replyLang === 'pt' ? 'bg-white text-black shadow-xl' : 'text-slate-600'}`}>PORTUGUÊS</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Phone size={14}/> {t.waNotifications}</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 pl-12 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Settings size={14}/> {t.brainLabel}</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={t.brainPlaceholder} className="w-full bg-slate-950 border border-white/5 p-8 rounded-[2.5rem] text-sm leading-relaxed min-h-[180px] outline-none focus:border-indigo-500 transition-all shadow-inner" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-8 rounded-[2.5rem] space-y-8 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20"><Zap size={24}/></div>
                        <div>
                          <div className="text-[11px] font-black uppercase italic tracking-tighter">{t.autoReply5}</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold">{t.handsFree}</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-16 h-9 rounded-full relative transition-all ${autoReply5 ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${autoReply5 ? 'right-1.5' : 'left-1.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20"><ShieldAlert size={24}/></div>
                        <div>
                          <div className="text-[11px] font-black uppercase italic tracking-tighter">{t.crisisNotif}</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold">{t.alertOwner}</div>
                        </div>
                      </div>
                      <button onClick={() => setNotifyNegative(!notifyNegative)} className={`w-16 h-9 rounded-full relative transition-all ${notifyNegative ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${notifyNegative ? 'right-1.5' : 'left-1.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-8 rounded-[2.5rem] space-y-10 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500 border border-cyan-500/20"><Gift size={24}/></div>
                        <span className="text-[11px] font-black uppercase tracking-tighter italic">{t.automaticCoupon}</span>
                      </div>
                      <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-16 h-9 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${autoCoupon ? 'right-1.5' : 'left-1.5'}`} />
                      </button>
                    </div>
                    {autoCoupon && (
                      <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                        <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{t.couponDetail}</label>
                        <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder={t.couponPlaceholder} className="w-full bg-slate-900 border border-white/5 p-5 rounded-2xl text-sm font-bold outline-none focus:border-cyan-500 transition-all shadow-inner" />
                      </div>
                    )}
                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.interceptorMode}</label>
                      <select value={interceptorMode} onChange={(e) => setInterceptorMode(e.target.value)} className="w-full bg-slate-900 border border-white/5 p-5 rounded-2xl text-[10px] font-black uppercase italic text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer">
                        <option value="safe">{t.balanced}</option>
                        <option value="aggressive">{t.aggressive}</option>
                        <option value="minimal">{t.minimal}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">RANKO ENGINE v2.1 // BUZIOS-ARG</span>
              <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:bg-cyan-400 hover:scale-105 disabled:opacity-50 flex items-center gap-3 shadow-xl">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={20} />}
                {isSaving ? t.saving : t.deployBtn}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-16 py-12">
          <div className="space-y-6">
            <div className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Ranko AI</div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed font-bold italic">Elevating hospitality through<br/>Active Reputation Defense Systems.</p>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Support</h4>
            <div className="space-y-3">
              <a href="mailto:support@rankoai.com" className="flex items-center gap-3 text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase"><Mail size={16}/> support@rankoai.com</a>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 uppercase"><Globe size={16}/> Búzios // Argentina</div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Architecture</h4>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase italic">Terms of Service</a>
              <a href="#" className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase italic">Privacy Framework</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}