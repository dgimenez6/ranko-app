'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Star, Loader2, LogOut, Store, Settings, Activity, Clock, 
  ChevronRight, Sparkles, TrendingUp, AlertTriangle, QrCode, 
  BarChart3, LayoutDashboard, Megaphone, Heart, HelpCircle, BrainCircuit, Globe, Phone
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
  
  // Métricas Reales
  const [stats, setStats] = useState({
    totalReplies: 0,
    avgRating: 0,
    happiness: 0,
    timeSaved: '0h'
  });

  // CONFIGURACIÓN INTEGRAL (Mapeado exacto a tu tabla businesses)
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('friendly');
  const [replyLang, setReplyLang] = useState('es');
  const [promoText, setPromoText] = useState('');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [autoReplyHigh, setAutoReplyHigh] = useState(true); 
  const [autoReplyLow, setAutoReplyLow] = useState(false);  
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Ranko AI | Business Dashboard";
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
    
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', currentUser.id);
    
    const businesses = bizData || [];
    setMyBusinesses(businesses);

    if (businesses.length > 0) {
      const bizIds = businesses.map(b => b.id);
      const { data: logs } = await supabase
        .from('reviews_logs')
        .select('stars')
        .in('business_id', bizIds);

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
      setStep('dashboard');
    }
  };

  const openConfig = (biz: any) => {
    setSelectedBusiness(biz);
    // CARGA DE DATOS DESDE LA DB AL ESTADO
    setAiTone(biz.reply_tone || 'friendly');
    setReplyLang(biz.language || 'es');
    setPromoText(biz.promo_text || '');
    setBizInfo(biz.business_info || '');
    setWhatsappNumber(biz.whatsapp_number || '');
    setAutoReplyHigh(biz.auto_reply_high ?? true);
    setAutoReplyLow(biz.auto_reply_low ?? false);
    setEmergencyAlerts(biz.notify_negative_reviews ?? true);
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('businesses')
      .update({ 
        reply_tone: aiTone, 
        language: replyLang,
        promo_text: promoText,
        business_info: bizInfo,
        whatsapp_number: whatsappNumber,
        auto_reply_high: autoReplyHigh,
        auto_reply_low: autoReplyLow,
        notify_negative_reviews: emergencyAlerts 
      })
      .eq('id', selectedBusiness.id);

    if (!error) {
      await refreshUserStatus(user);
      setSelectedBusiness(null);
    } else {
      alert(`Error al guardar: ${error.message}`);
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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase">RANKO AI</div>
        {user && <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-black uppercase border border-red-500/10">SIGN OUT</button>}
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <div className="pt-24 text-center">
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic uppercase">AI Reputation.<br/><span className="text-indigo-500">Zero Effort.</span></h1>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl transition-all flex items-center gap-4 mx-auto group shadow-xl shadow-indigo-500/20">
              Access My Console <ArrowRight />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in duration-700">
            {/* TABS PRINCIPALES */}
            <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard size={14} /> My Businesses</button>
              <button onClick={() => setActiveTab('growth')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'growth' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-white'}`}><QrCode size={14} /> Marketing QR</button>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* MÉTRICAS QUE HABÍAN DESAPARECIDO */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {[
                    { label: 'Total Replies', val: stats.totalReplies || 'Ready', icon: MessageSquare, col: 'text-indigo-400' },
                    { label: 'Avg Rating', val: stats.avgRating > 0 ? stats.avgRating : 'New', icon: Star, col: 'text-yellow-400' },
                    { label: 'Happiness', val: `${stats.happiness}%`, icon: Heart, col: 'text-pink-400' },
                    { label: 'Time Saved', val: stats.timeSaved, icon: Clock, col: 'text-emerald-400' },
                  ].map((m, i) => (
                    <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all">
                      <m.icon className={`${m.col} mb-4`} size={20} />
                      <p className="text-4xl font-black mb-1">{m.val}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myBusinesses.map((b) => (
                    <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] group hover:border-indigo-500/50 transition-all flex flex-col h-full shadow-2xl">
                      <h3 className="font-black text-2xl mb-8 italic uppercase tracking-tighter">{b.business_name}</h3>
                      <div className="space-y-3 mb-8 flex-grow text-[10px] font-black uppercase tracking-widest">
                        <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-slate-500 italic">Tone</span>
                          <span className="text-indigo-400">{b.reply_tone || 'Friendly'}</span>
                        </div>
                        <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-slate-500 italic">Language</span>
                          <span className="text-emerald-400">{b.language?.toUpperCase() || 'ES'}</span>
                        </div>
                      </div>
                      <button onClick={() => openConfig(b)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/5">
                        <Settings size={14} /> CONFIGURE STRATEGY
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* MARKETING QR RECUPERADO */
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
                {myBusinesses.map(biz => (
                  <div key={biz.id} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center group hover:border-emerald-500/50 transition-all">
                    <QrCode size={48} className="mx-auto mb-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl font-black mb-6 italic uppercase tracking-tighter">{biz.business_name}</h3>
                    <button onClick={() => downloadQR(biz)} className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all">
                      <Zap size={16}/> GENERATE SMART QR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL DE CONFIGURACIÓN COMPLETO */}
        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-3xl rounded-[3rem] p-8 md:p-12 shadow-2xl my-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">AI SETTINGS: {selectedBusiness.business_name}</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* IDENTIDAD Y CEREBRO */}
                <div className="space-y-6">
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 italic"><BrainCircuit size={14} className="text-indigo-400"/> Business Knowledge</label>
                      <div className="group/tooltip relative cursor-help">
                        <HelpCircle size={14} className="text-slate-600" />
                        <div className="absolute bottom-full right-0 mb-3 w-64 p-4 bg-slate-800 border border-indigo-500/30 rounded-2xl text-[10px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                          Explicá detalles de tu local: platos estrella, si aceptás mascotas, estacionamiento, etc. La IA usará esto para responder.
                        </div>
                      </div>
                    </div>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Ej: Somos un local en Búzios, aceptamos Pix, especialidad en carnes..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-indigo-500 text-xs h-40 resize-none font-bold" />
                  </div>

                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 block flex items-center gap-2 italic"><Globe size={14} className="text-indigo-400"/> Response Language</label>
                    <select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-indigo-500 text-xs font-bold appearance-none">
                      <option value="es" className="bg-slate-900">Español 🇦🇷</option>
                      <option value="pt" className="bg-slate-900">Português 🇧🇷</option>
                      <option value="en" className="bg-slate-900">English 🇺🇸</option>
                    </select>
                  </div>
                </div>

                {/* AUTOMATIZACIÓN Y CONTACTO */}
                <div className="space-y-6">
                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 block flex items-center gap-2 italic"><Sparkles size={14} className="text-indigo-400"/> Personality Tone</label>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-indigo-500 text-xs font-bold appearance-none">
                      <option value="friendly" className="bg-slate-900">Friendly & Warm</option>
                      <option value="professional" className="bg-slate-900">Formal & Professional</option>
                      <option value="funny" className="bg-slate-900">Funny & Casual</option>
                    </select>
                  </div>

                  <div className="group relative">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 italic"><Megaphone size={14} className="text-emerald-400"/> Active Promotion</label>
                      <div className="group/tooltip relative cursor-help">
                        <HelpCircle size={14} className="text-slate-600" />
                        <div className="absolute bottom-full right-0 mb-3 w-64 p-4 bg-slate-800 border border-emerald-500/30 rounded-2xl text-[10px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                          Este texto se incluirá en respuestas de 5 estrellas. Ej: "Te esperamos el martes con 10% off!".
                        </div>
                      </div>
                    </div>
                    <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Ej: 10% off pagando en efectivo..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-indigo-500 text-xs font-bold" />
                  </div>

                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 block flex items-center gap-2 italic"><Phone size={14} className="text-emerald-400"/> WhatsApp for Alerts</label>
                    <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+54 9 11 1234 5678" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-indigo-500 text-xs font-bold" />
                  </div>
                </div>
              </div>

              {/* BOTONES DE AUTO-REPLY (LO NUEVO) */}
              <div className="grid md:grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/5">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Reply 4 & 5 Stars ⭐</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Automatic Growth</p>
                  </div>
                  <button onClick={() => setAutoReplyHigh(!autoReplyHigh)} className={`w-12 h-6 rounded-full relative transition-all shadow-lg ${autoReplyHigh ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReplyHigh ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Reply &lt; 4 Stars ⚠️</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Auto Crisis Management</p>
                  </div>
                  <button onClick={() => setAutoReplyLow(!autoReplyLow)} className={`w-12 h-6 rounded-full relative transition-all shadow-lg ${autoReplyLow ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReplyLow ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button onClick={saveSettings} disabled={isSaving} className="w-full mt-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 text-sm uppercase italic tracking-tighter">
                {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> DEPLOY PRODUCTION STRATEGY</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}