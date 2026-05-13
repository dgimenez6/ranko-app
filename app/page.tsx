'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, ArrowRight,
  LayoutDashboard, Heart, Globe, Phone, Mail, 
  ShieldAlert, Gift, Languages, Target, TrendingUp
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

  // CONFIGURACIÓN (Mapeada con DB)
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [replyLang, setReplyLang] = useState('es');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [aiTone, setAiTone] = useState('friendly');
  const [autoCoupon, setAutoCoupon] = useState(false);
  const [promoText, setPromoText] = useState(''); // El beneficio: ej "Café Gratis"
  const [interceptorMode, setInterceptorMode] = useState('safe');

  // DICCIONARIO DINÁMICO
  const content: any = {
    es: {
      totalReplies: 'Respuestas Totales',
      avgRating: 'Calificación Global',
      happiness: 'Índice de Felicidad',
      timeSaved: 'Tiempo Ahorrado',
      selectBiz: 'Seleccionar Negocio',
      growthTools: 'Herramientas de Crecimiento',
      smartInterceptor: 'Smart QR Interceptor',
      downloadQr: 'Descargar Etiqueta QR',
      overview: 'Overview',
      strategy: 'Defense',
      growth: 'Smart QR',
      langMode: 'Modo de Idioma',
      waNotifications: 'Notificaciones WhatsApp',
      brainLabel: 'Cerebro: Base de Conocimientos',
      brainPlaceholder: 'Describí brevemente tu negocio para la IA...',
      autoReply5: 'Respuesta Auto 5 Estrellas',
      handsFree: 'Modo 100% Manos Libres',
      crisisNotif: 'Notificación de Crisis',
      alertOwner: 'Alerta al dueño ante críticas',
      aiTone: 'Tono de Personalidad IA',
      automaticCoupon: 'Cupón Automático en Feedback',
      couponDetail: 'Detalle del Beneficio (Cupón)',
      couponPlaceholder: 'Ej: Café de cortesía, 10% OFF...',
      interceptorMode: 'Sensibilidad del Interceptor',
      aggressiveDef: 'Defensa Agresiva (1-3★)',
      balancedDef: 'Equilibrado (1-2★)',
      minimalDef: 'Mínimo (Siempre Google)',
      deployBtn: 'Deploy Changes',
      saving: 'Saving...',
    },
    pt: {
      totalReplies: 'Respostas Totais',
      avgRating: 'Avaliação Global',
      happiness: 'Índice de Felicidade',
      timeSaved: 'Tempo Economizado',
      selectBiz: 'Selecionar Negócio',
      growthTools: 'Ferramentas de Crescimento',
      smartInterceptor: 'Smart QR Interceptor',
      downloadQr: 'Baixar Etiqueta QR',
      overview: 'Overview',
      strategy: 'Defense',
      growth: 'Smart QR',
      langMode: 'Modo de Idioma',
      waNotifications: 'Notificações WhatsApp',
      brainLabel: 'Cérebro: Base de Conhecimento',
      brainPlaceholder: 'Descreva seu negócio para a IA...',
      autoReply5: 'Resposta Automática 5 Estrelas',
      handsFree: 'Modo 100% Mãos Livres',
      crisisNotif: 'Notificação de Crise',
      alertOwner: 'Alerta proprietário sobre críticas',
      aiTone: 'Tom de Personalidade da IA',
      automaticCoupon: 'Cupom Automático no Feedback',
      couponDetail: 'Detalhe do Benefício (Cupom)',
      couponPlaceholder: 'Ex: Café de cortesia, 10% OFF...',
      interceptorMode: 'Sensibilidade do Interceptor',
      aggressiveDef: 'Defesa Agresiva (1-3★)',
      balancedDef: 'Equilibrado (1-2★)',
      minimalDef: 'Mínimo (Sempre Google)',
      deployBtn: 'Deploy Changes',
      saving: 'Saving...',
    }
  };

  const t = content[replyLang] || content.es;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        await fetchData(currentUser);
      } else {
        setLoading(false);
      }
    };
    checkUser();
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
        const initialBiz = businesses[0];
        setSelectedBusiness(initialBiz);
        applyBusinessData(initialBiz);

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
    } catch (error) { console.error(error); } finally { setLoading(false); }
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
    
    const configs = biz.whatsapp_configs;
    const phone = Array.isArray(configs) ? configs[0]?.phone_number : configs?.phone_number;
    setWhatsappNumber(phone || '');
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          language: replyLang,
          business_info: bizInfo,
          reply_tone: aiTone,               
          promo_text: promoText,             
          auto_reply_5_stars: autoReply5,    
          notify_negative_reviews: notifyNegative,
          auto_coupon: autoCoupon,
          interceptor_mode: interceptorMode
        })
        .eq('id', selectedBusiness.id);

      if (bizError) throw bizError;
      
      const cleanPhone = whatsappNumber.replace(/\D/g, '');
      const { error: waError } = await supabase
        .from('whatsapp_configs')
        .upsert({ business_id: selectedBusiness.id, phone_number: cleanPhone }, { onConflict: 'business_id' });

      if (waError) throw waError;
      alert(replyLang === 'pt' ? 'Configurações salvas!' : '¡Configuración guardada!');
      fetchData(user);
    } catch (e: any) { alert(`Error: ${e.message}`); } finally { setIsSaving(false); }
  };

  const downloadQR = (biz: any) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`https://rankoai.com/review/${biz.id}`)}&ecc=H`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${biz.business_name}.png`;
    link.target = "_blank";
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
      <p className="text-slate-500 font-black uppercase tracking-[0.3em]">RANKO AI</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
      {/* NAV ORIGINAL */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-400 to-indigo-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
              <Zap className="text-slate-950 fill-slate-950" size={20} />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Ranko AI</span>
            <span className="hidden md:block text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 border border-white/10 px-2 py-1 rounded-full ml-2">Global Hospitality Tech</span>
          </div>
          <button onClick={logout} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Sign Out</button>
        </div>
      </nav>

      {/* STATS STRIP */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t.totalReplies, val: stats.totalReplies, icon: MessageSquare, color: 'from-indigo-500 to-purple-500' },
            { label: t.avgRating, val: stats.avgRating, icon: Star, color: 'from-amber-400 to-orange-500' },
            { label: t.happiness, val: `${stats.happiness}%`, icon: Heart, color: 'from-rose-500 to-pink-500' },
            { label: t.timeSaved, val: stats.timeSaved, icon: Clock, color: 'from-emerald-400 to-cyan-500' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${s.color}`} />
              <s.icon className="text-slate-600 mb-4 group-hover:text-white transition-colors" size={20} />
              <div className="text-4xl font-black italic tracking-tighter mb-1">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[3rem]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">LOCATIONS</h3>
            <div className="space-y-3">
              {myBusinesses.map((b) => (
                <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); }} className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                  <span className="text-xs font-black uppercase italic truncate">{b.business_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col">
          {/* TABS ORIGINALES */}
          <div className="p-3 flex bg-slate-950/50 gap-2 border-b border-white/5">
            {[
              { id: 'overview', icon: LayoutDashboard },
              { id: 'strategy', icon: ShieldAlert },
              { id: 'growth', icon: Zap }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
                <tab.icon size={14}/> {t[tab.id]}
              </button>
            ))}
          </div>

          <div className="p-12 flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-white/5">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-2">BASE SETTINGS</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">REPLY LANGUAGE</label>
                        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                          <button onClick={() => setReplyLang('es')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${replyLang === 'es' ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-600'}`}>ESPAÑOL</button>
                          <button onClick={() => setReplyLang('pt')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${replyLang === 'pt' ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-600'}`}>PORTUGUÊS</button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">WHATSAPP ALERTS</label>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16}/>
                          <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-900 border border-white/5 p-4 pl-12 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" />
                        </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">BUSINESS BRAIN DATA</label>
                  <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={t.brainPlaceholder} className="w-full bg-slate-950 border border-white/5 p-8 rounded-[2.5rem] text-sm leading-relaxed min-h-[180px] outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="bg-slate-950/50 p-8 rounded-[2.5rem] space-y-8 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20"><Zap size={24}/></div>
                      <div>
                        <div className="text-sm font-black uppercase italic tracking-tighter">{t.autoReply5}</div>
                        <div className="text-[10px] text-slate-600 uppercase font-bold">{t.handsFree}</div>
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
                        <div className="text-sm font-black uppercase italic tracking-tighter">{t.crisisNotif}</div>
                        <div className="text-[10px] text-slate-600 uppercase font-bold">{t.alertOwner}</div>
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
                      <span className="text-xs font-black uppercase tracking-tighter italic">{t.automaticCoupon}</span>
                    </div>
                    <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-16 h-9 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${autoCoupon ? 'right-1.5' : 'left-1.5'}`} />
                    </button>
                  </div>

                  {/* NUEVO CAMPO DE CUPÓN */}
                  {autoCoupon && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t.couponDetail}</label>
                      <textarea 
                        value={promoText} 
                        onChange={(e) => setPromoText(e.target.value)} 
                        placeholder={t.couponPlaceholder}
                        className="w-full bg-slate-900 border border-white/5 p-6 rounded-2xl text-sm font-bold outline-none focus:border-cyan-500 transition-all min-h-[100px]" 
                      />
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.interceptorMode}</label>
                    <select value={interceptorMode} onChange={(e) => setInterceptorMode(e.target.value)} className="w-full bg-slate-900 border border-white/5 p-5 rounded-2xl text-xs font-black uppercase italic text-white outline-none focus:border-indigo-500">
                      <option value="safe">{t.aggressiveDef}</option>
                      <option value="balanced">{t.balancedDef}</option>
                      <option value="minimal">{t.minimalDef}</option>
                    </select>
                  </div>
                </div>

                <button onClick={() => downloadQR(selectedBusiness)} className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 p-8 rounded-[2rem] flex items-center justify-between group hover:scale-[1.02] transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white"><QrCode size={32}/></div>
                      <div className="text-left">
                        <div className="text-xl font-black uppercase italic tracking-tighter text-white">{t.smartInterceptor}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Generate Physical QR Label</div>
                      </div>
                   </div>
                   <ArrowRight className="text-white group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <div className="p-10 bg-slate-950 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">RANKO ENGINE v2.1 // GLOBAL DEFENSE</p>
            <button onClick={saveSettings} disabled={isSaving} className="bg-white text-slate-950 px-12 py-5 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:bg-cyan-400 hover:scale-105 disabled:opacity-50 flex items-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={18} />}
              {isSaving ? t.saving : t.deployBtn}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}