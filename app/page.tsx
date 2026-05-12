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
  const [promoText, setPromoText] = useState('');
  const [autoCoupon, setAutoCoupon] = useState(false);
  const [interceptorMode, setInterceptorMode] = useState('safe');

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

        // Métricas Pro: Cálculo dinámico basado en logs reales
        const bizIds = businesses.map(b => b.id);
        const { data: logs } = await supabase
          .from('reviews_logs')
          .select('stars, status')
          .in('business_id', bizIds);

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
    } catch (error) { 
      console.error("Error cargando dashboard:", error); 
    } finally { 
      setLoading(false); 
    }
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
    
    // Manejo robusto del teléfono (objeto o array)
    const configs = biz.whatsapp_configs;
    const phone = Array.isArray(configs) ? configs[0]?.phone_number : configs?.phone_number;
    setWhatsappNumber(phone || '');
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      // 1. Actualización Atómica del Negocio
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
      
      // 2. Actualización de WhatsApp con limpieza de caracteres
      const cleanPhone = whatsappNumber.replace(/\D/g, '');
      const { error: waError } = await supabase
        .from('whatsapp_configs')
        .upsert({
          business_id: selectedBusiness.id,
          phone_number: cleanPhone
        }, { onConflict: 'business_id' });

      if (waError) throw waError;

      alert(replyLang === 'pt' ? 'Configurações salvas com sucesso!' : '¡Configuración guardada con éxito!');
      fetchData(user);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQR = (biz: any) => {
    if (!biz?.id) return alert("ID no encontrado");
    const interceptorUrl = `https://rankoai.com/review/${biz.id}`;
    // Usamos ecc=H para máxima resistencia a daños físicos en el local
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(interceptorUrl)}&ecc=H`;
    
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `RankoQR-${biz.business_name}.png`;
    link.target = "_blank";
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
      <p className="text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Ranko AI Loading</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-[3rem] p-12 text-center shadow-2xl">
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
          <Zap className="text-indigo-500 fill-indigo-500" size={32} />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Ranko AI</h1>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed uppercase tracking-widest font-medium">Reputation Management & Local SEO Automation</p>
        <button 
          onClick={loginWithGoogle}
          className="w-full bg-indigo-500 hover:bg-indigo-400 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-3"
        >
          <Globe size={20} /> Access Control Center
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* HEADER SECTION */}
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Zap className="text-slate-950 fill-slate-950" size={18} />
            </div>
            <span className="text-xl font-black italic tracking-tighter uppercase">Ranko</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-6">
              <span className="hover:text-white transition-colors cursor-pointer">Docs</span>
              <span className="hover:text-white transition-colors cursor-pointer">API</span>
            </div>
            <button 
              onClick={logout}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* STATS STRIP */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Auto Replies', val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: 'Avg Rating', val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: 'Happiness', val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: 'Time Saved', val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] group hover:border-indigo-500/20 transition-all">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <div className="text-3xl font-black italic tracking-tighter mb-1">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PLAN STATUS */}
      {selectedBusiness && (
        <div className="max-w-6xl mx-auto px-6 mb-8">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-indigo-400" size={20} />
              <p className="text-xs font-bold uppercase tracking-widest italic">
                {selectedBusiness.plan_status === 'trial' 
                  ? `Plan Trial: ${selectedBusiness.credits_used || 0}/5 Créditos` 
                  : 'Suscripción Premium 💎'}
              </p>
            </div>
            {selectedBusiness.plan_status === 'trial' && (
              <button className="bg-indigo-500 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic hover:scale-105 transition-all">Upgrade Now</button>
            )}
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      <div className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: NAVIGATION & SELECTOR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
              <LayoutDashboard size={14}/> Select Business
            </h3>
            <div className="space-y-3">
              {myBusinesses.map((b) => (
                <button 
                  key={b.id}
                  onClick={() => { setSelectedBusiness(b); applyBusinessData(b); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedBusiness?.id === b.id ? 'bg-indigo-500 border-indigo-400 text-slate-950' : 'bg-slate-950/50 border-white/5 hover:border-white/20 text-slate-400'}`}
                >
                  <span className="text-sm font-bold truncate pr-2">{b.business_name}</span>
                  {selectedBusiness?.id === b.id && <ArrowRight size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Growth Tools</h3>
            <div className="space-y-4">
              <button 
                onClick={() => downloadQR(selectedBusiness)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl text-left flex items-center gap-4 transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all">
                  <QrCode size={20} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase italic">Smart Interceptor</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Download QR Label</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CORE SETTINGS */}
        <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col">
          <div className="p-1 text-center bg-white/5 flex">
            {['overview', 'strategy', 'growth'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-slate-950 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-10 flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Languages size={14}/> Language Mode
                    </label>
                    <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5">
                      <button onClick={() => setReplyLang('es')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase italic transition-all ${replyLang === 'es' ? 'bg-indigo-500 text-slate-950 shadow-lg shadow-indigo-500/20' : 'text-slate-600 hover:text-slate-400'}`}>Español</button>
                      <button onClick={() => setReplyLang('pt')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase italic transition-all ${replyLang === 'pt' ? 'bg-indigo-500 text-slate-950 shadow-lg shadow-indigo-500/20' : 'text-slate-600 hover:text-slate-400'}`}>Português</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Phone size={14}/> WhatsApp Notifications
                    </label>
                    <input 
                      type="text" 
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+54 9 11..."
                      className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Settings size={14}/> The Brain: Business Knowledge Base
                  </label>
                  <textarea 
                    value={bizInfo}
                    onChange={(e) => setBizInfo(e.target.value)}
                    placeholder="Briefly describe your business (specialties, menu items, key staff, etc.) so the AI can provide personalized replies..."
                    className="w-full bg-slate-950 border border-white/5 p-6 rounded-[2rem] text-sm leading-relaxed min-h-[160px] outline-none focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-slate-950/50 border border-white/5 p-6 rounded-3xl space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Automation Switches</h4>
                  
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Zap size={20}/></div>
                      <div>
                        <div className="text-sm font-black uppercase italic">Auto-Reply 5 Stars</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">100% Hands-Free mode</div>
                      </div>
                    </div>
                    <button onClick={() => setAutoReply5(!autoReply5)} className={`w-14 h-8 rounded-full transition-all relative ${autoReply5 ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><ShieldAlert size={20}/></div>
                      <div>
                        <div className="text-sm font-black uppercase italic">Crisis Notification</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Alert owner on negative reviews</div>
                      </div>
                    </div>
                    <button onClick={() => setNotifyNegative(!notifyNegative)} className={`w-14 h-8 rounded-full transition-all relative ${notifyNegative ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${notifyNegative ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Personality Tone</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['friendly', 'professional', 'minimalist'].map((tone) => (
                      <button 
                        key={tone}
                        onClick={() => setAiTone(tone)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${aiTone === tone ? 'bg-white text-slate-950 border-white' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/30'}`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'growth' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-slate-950 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                      <Gift size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase italic leading-none">Smart Interceptor</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Convert complaints into private feedback</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Automatic Coupon on Feedback</span>
                      <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-14 h-8 rounded-full transition-all relative ${autoCoupon ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${autoCoupon ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interceptor Mode</label>
                      <select 
                        value={interceptorMode}
                        onChange={(e) => setInterceptorMode(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-400"
                      >
                        <option value="safe">Aggressive Defense (Redirect 1-3★ to private)</option>
                        <option value="balanced">Balanced (Redirect 1-2★ to private)</option>
                        <option value="minimal">Minimal (Always show Google Link)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Global Reputation Strategy v2.1</p>
            <button 
              onClick={saveSettings}
              disabled={isSaving}
              className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 px-10 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {isSaving ? 'Saving...' : 'Deploy Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 py-12">
        <div className="pt-12 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="text-xl font-black italic tracking-tighter uppercase text-indigo-400">RANKO AI</div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Elevating hospitality through<br/>Active Reputation Defense.</p>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Support</h4>
            <a href="mailto:support@rankoai.com" className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors justify-center md:justify-start"><Mail size={14}/> support@rankoai.com</a>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Legal</h4>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">Terms of Service</a>
              <a href="#" className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="pt-8 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
          © 2026 RANKO AI LABS
        </div>
      </footer>
    </main>
  );
}