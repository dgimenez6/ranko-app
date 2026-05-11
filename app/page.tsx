'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Star, Loader2, LogOut, Store, Settings, Activity, Clock, 
  ChevronRight, Sparkles, TrendingUp, AlertTriangle, QrCode, 
  BarChart3, LayoutDashboard, Megaphone, Heart, HelpCircle, BrainCircuit
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
  
  const [stats, setStats] = useState({
    totalReplies: 0,
    avgRating: 0,
    happiness: 0,
    timeSaved: '0h'
  });

  // Configuración de Negocio (Brain + Promo + Alertas)
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('friendly');
  const [replyLang, setReplyLang] = useState('es');
  const [promoText, setPromoText] = useState('');
  const [bizInfo, setBizInfo] = useState(''); // El "Cerebro"
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Ranko AI | Business Reputation Hub";
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
      try {
        const bizIds = businesses.map(b => b.id);
        const { data: logs, error: logError } = await supabase
          .from('reviews_logs')
          .select('stars')
          .in('business_id', bizIds);

        if (!logError && logs) {
          const total = logs.length;
          const validStars = logs.filter(l => l.stars != null);
          const avg = validStars.length > 0 
            ? (validStars.reduce((acc, curr) => acc + curr.stars, 0) / validStars.length).toFixed(1) 
            : 0;
          const happyPct = validStars.length > 0 
            ? Math.round((validStars.filter(l => l.stars >= 4).length / validStars.length) * 100) 
            : 0;
          
          setStats({
            totalReplies: total,
            avgRating: Number(avg),
            happiness: happyPct,
            timeSaved: total > 0 ? `${Math.round((total * 5) / 60)}h` : 'Est. 2h/wk'
          });
        }
      } catch (e) {
        console.error("Error cargando métricas:", e);
      }
      setStep('dashboard');
    }
  };

  const openConfig = (biz: any) => {
    setSelectedBusiness(biz);
    setAiTone(biz.reply_tone || 'friendly');
    setReplyLang(biz.language || 'es');
    setPromoText(biz.promo_text || '');
    setBizInfo(biz.business_info || ''); // Cargamos el cerebro
    setEmergencyAlerts(biz.notify_negative_reviews ?? true);
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('businesses')
      .update({ 
        reply_tone: aiTone.toLowerCase(), 
        language: replyLang,
        promo_text: promoText,
        business_info: bizInfo, // Guardamos el cerebro
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
    const googleReviewUrl = biz.review_url || `https://search.google.com/local/writereview?placeid=${bizId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(googleReviewUrl)}`;
    window.open(qrUrl, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter italic">RANKO AI</div>
        {user && <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase hover:bg-red-500/20 transition-all">SIGN OUT</button>}
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <div className="pt-24 text-center">
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic uppercase">Global AI. <br/><span className="text-indigo-500">Local Heart.</span></h1>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl transition-all flex items-center gap-4 mx-auto group">
              Access My Console <ArrowRight />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in duration-700">
            <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard size={14} /> Overview</button>
              <button onClick={() => setActiveTab('growth')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'growth' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><TrendingUp size={14} /> Growth Center</button>
            </div>

            {activeTab === 'overview' ? (
              <>
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
                      <h3 className="font-black text-2xl mb-8 italic uppercase">{b.business_name}</h3>
                      <div className="space-y-2 mb-8 flex-grow">
                        <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase border border-white/5">
                          <span className="text-slate-500">Brain Status</span>
                          <span className={b.business_info ? "text-emerald-400" : "text-amber-400"}>{b.business_info ? "TRAINED" : "EMPTY"}</span>
                        </div>
                      </div>
                      <button onClick={() => openConfig(b)} className="w-full py-4 bg-white/5 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-indigo-400 group/btn">
                        <Settings size={14} className="group-hover/btn:rotate-90 transition-transform" /> CONFIGURE BRAIN
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                {myBusinesses.map(biz => (
                  <div key={biz.id} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center">
                    <QrCode size={32} className="mx-auto mb-6 text-indigo-400" />
                    <h3 className="text-2xl font-black mb-2 italic uppercase">{biz.business_name}</h3>
                    <button onClick={() => downloadQR(biz)} className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3">
                      <Zap size={16}/> GENERATE SMART QR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-10">
                <h2 className="text-3xl font-black italic uppercase italic tracking-tighter">BRAIN TRAINING</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-8">
                {/* Knowledge Base Field */}
                <div className="group relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit size={16} className="text-indigo-400" />
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Business Knowledge</label>
                    </div>
                    <div className="group/tooltip relative cursor-help">
                       <HelpCircle size={14} className="text-slate-600" />
                       <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-800 border border-indigo-500/30 rounded-2xl text-[10px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                          <p className="mb-2 text-indigo-400 uppercase tracking-widest">💡 Consejo Maestro:</p>
                          Explicale a la IA cómo es tu negocio. Ej: "Somos un hotel frente al mar, aceptamos perros, servimos desayuno hasta las 11 y tenemos transfer gratuito". ¡Esto hace que las respuestas sean únicas!
                       </div>
                    </div>
                  </div>
                  <textarea 
                    placeholder="Contale a la IA detalles únicos de tu local..." 
                    value={bizInfo} 
                    onChange={(e) => setBizInfo(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 font-bold text-xs h-32 resize-none"
                  />
                </div>

                {/* Promo Field */}
                <div className="group relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Megaphone size={14} className="text-emerald-400" />
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Active Promo (Upsell)</label>
                    </div>
                    <div className="group/tooltip relative cursor-help">
                       <HelpCircle size={14} className="text-slate-600" />
                       <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-800 border border-emerald-500/30 rounded-2xl text-[10px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                          <p className="mb-2 text-emerald-400 uppercase tracking-widest">💰 Aumentá tus ventas:</p>
                          Si alguien te pone 5 estrellas, la IA sutilmente le dirá esto. Ej: "Te esperamos los martes con 10% de descuento en efectivo". ¡Ideal para fomentar la recompra!
                       </div>
                    </div>
                  </div>
                  <input type="text" placeholder="Ej: 10% off Martes en efectivo..." value={promoText} onChange={(e) => setPromoText(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 font-black text-xs" />
                </div>

                {/* Alertas Field */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center group relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center"><AlertTriangle size={18} /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black uppercase italic italic">Guard Mode</p>
                        <div className="group/tooltip relative cursor-help">
                           <HelpCircle size={12} className="text-slate-600" />
                           <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-slate-800 border border-red-500/30 rounded-2xl text-[10px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                              <p className="mb-2 text-red-400 uppercase tracking-widest">🛡️ Escudo Anti-Crisis:</p>
                              Si recibís una reseña de 1 o 2 estrellas, te avisamos al WhatsApp para que puedas manejar la situación personalmente antes que la IA responda.
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setEmergencyAlerts(!emergencyAlerts)} className={`w-12 h-6 rounded-full transition-all relative ${emergencyAlerts ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emergencyAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <button onClick={saveSettings} disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> TRAIN & DEPLOY</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}