'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Star, Loader2, LogOut, Store, Settings, Activity, Clock, 
  ChevronRight, Sparkles, TrendingUp, AlertTriangle, QrCode, 
  BarChart3, LayoutDashboard, Megaphone, Heart
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'onboarding' | 'dashboard'>('hero');
  const [activeTab, setActiveTab] = useState<'overview' | 'growth'>('overview');
  const [loading, setLoading] = useState(true);
  
  // Métricas Reales e Inteligentes
  const [stats, setStats] = useState({
    totalReplies: 0,
    avgRating: 0,
    happiness: 0,
    timeSaved: '0h'
  });

  // Estados para configuración de IA y Marketing
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('Professional');
  const [replyLang, setReplyLang] = useState('Auto');
  const [promoText, setPromoText] = useState('');
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Ranko AI | Reputation & Growth Engine";
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
    const businesses = bizData || [];
    setMyBusinesses(businesses);

    if (businesses.length > 0) {
      // Consulta real a reviews_log para métricas verídicas
      const { data: logs } = await supabase
        .from('reviews_log')
        .select('stars')
        .in('business_id', businesses.map(b => b.id));

      const total = logs?.length || 0;
      const avg = total > 0 ? (logs!.reduce((acc, curr) => acc + curr.stars, 0) / total).toFixed(1) : 0;
      const happyPct = total > 0 ? Math.round((logs!.filter(l => l.stars >= 4).length / total) * 100) : 0;
      
      setStats({
        totalReplies: total,
        avgRating: Number(avg),
        happiness: happyPct,
        timeSaved: total > 0 ? `${Math.round((total * 5) / 60)}h` : 'Est. 2h/wk'
      });

      setStep('dashboard');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Simulación de guardado de config de Marketing e IA
    setTimeout(() => {
      setIsSaving(false);
      setSelectedBusiness(null);
    }, 1200);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter">RANKO AI</div>
        <div className="flex items-center gap-4">
          {user && (
            <button onClick={handleSignOut} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase hover:bg-red-500/20 transition-all">
              SIGN OUT
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <div className="pt-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 animate-pulse">
              <Sparkles size={14} /> REPUTATION MANAGEMENT REINVENTED
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-tight italic">Protect your brand. <br/><span className="text-indigo-500">Grow your sales.</span></h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed uppercase font-medium tracking-wide text-sm">IA de respuesta inteligente para Google Business en Argentina y Brasil.</p>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all flex items-center gap-4 mx-auto group">
              Start Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in duration-700">
            {/* Tabs de Navegación */}
            <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <LayoutDashboard size={14} /> Overview
              </button>
              <button 
                onClick={() => setActiveTab('growth')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'growth' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <TrendingUp size={14} /> Growth Tool
              </button>
            </div>

            {activeTab === 'overview' ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                  <div>
                    <p className="text-indigo-400 font-bold text-xs mb-2 uppercase tracking-[0.2em]">Live Reputation Insights</p>
                    <h1 className="text-5xl font-black tracking-tight italic">Business Health</h1>
                  </div>
                </div>

                {/* Métricas Reales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {[
                    { label: 'Total Replies', val: stats.totalReplies || 'Ready', icon: MessageSquare, col: 'text-indigo-400' },
                    { label: 'Avg Rating', val: stats.avgRating > 0 ? stats.avgRating : 'New', icon: Star, col: 'text-yellow-400' },
                    { label: 'Happiness', val: `${stats.happiness}%`, icon: Heart, col: 'text-pink-400' },
                    { label: 'Time Saved', val: stats.timeSaved, icon: Clock, col: 'text-emerald-400' },
                  ].map((m, i) => (
                    <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all">
                      <m.icon className={`${m.col} mb-4`} size={20} />
                      <p className="text-4xl font-black tracking-tighter mb-1">{m.val}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myBusinesses.map((b) => (
                    <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] group hover:border-indigo-500/50 transition-all flex flex-col h-full shadow-2xl">
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400"><Store size={24} /></div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-tighter">Monitoring</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-2xl mb-8 tracking-tight">{b.business_name}</h3>
                      
                      <div className="space-y-2 mb-8 flex-grow">
                        <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-slate-500">AI Mode</span>
                          <span className="text-indigo-400">{aiTone}</span>
                        </div>
                        <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-slate-500">Marketing</span>
                          <span className={promoText ? "text-emerald-400" : "text-slate-600"}>{promoText ? "Active" : "Off"}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedBusiness(b)}
                        className="w-full py-4 bg-white/5 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        <Settings size={14} className="group-hover/btn:rotate-90 transition-transform" /> CONFIGURE ENGINE
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-500">
                <div className="max-w-2xl">
                  <h2 className="text-4xl font-black mb-4 italic">Growth Center</h2>
                  <p className="text-slate-400 mb-12">Herramientas tácticas para conseguir más reseñas y subir tu posicionamiento en Google Maps.</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
                      <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6"><QrCode size={24} /></div>
                      <h3 className="text-xl font-bold mb-4">Smart QR Kit</h3>
                      <p className="text-sm text-slate-500 mb-8">Descargá el kit de mesa. El cliente escanea y va directo a calificarte con 5 estrellas.</p>
                      <button className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase hover:bg-indigo-500 transition-all">Download Kit</button>
                    </div>

                    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] opacity-60">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6"><BarChart3 size={24} /></div>
                      <h3 className="text-xl font-bold mb-4">Competitor Insights</h3>
                      <p className="text-sm text-slate-500 mb-8">Analizá qué están haciendo bien los locales de tu zona. (Próximamente).</p>
                      <button className="w-full py-4 bg-white/10 rounded-2xl font-black text-xs uppercase cursor-not-allowed">Locked</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Pro: Marketing + IA */}
        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-10">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter">STRATEGY SETTINGS</h2>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{selectedBusiness.business_name}</p>
                </div>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-8">
                {/* Tone Selector */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block">AI Persona</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Professional', 'Friendly', 'Concise', 'Witty'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setAiTone(t)}
                        className={`py-3 rounded-xl font-black text-[10px] transition-all border ${aiTone === t ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marketing Promo - El diferencial */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Megaphone size={14} className="text-emerald-400" />
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Promotion (Upsell)</label>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Ej: 10% off Martes en efectivo..."
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 font-bold text-sm"
                  />
                  <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Solo se mencionará en respuestas de 4 y 5 estrellas.</p>
                </div>

                {/* Emergency Toggle - Seguridad */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center"><AlertTriangle size={18} /></div>
                    <div>
                      <p className="text-xs font-black">EMERGENCY ALERTS</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Aviso al WhatsApp en reseñas negativas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEmergencyAlerts(!emergencyAlerts)}
                    className={`w-12 h-6 rounded-full transition-all relative ${emergencyAlerts ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emergencyAlerts ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> DEPLOY STRATEGY</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-20 bg-slate-950 mt-32">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-black tracking-tighter uppercase">Ranko AI &copy; 2026</div>
          <div className="flex gap-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span className="text-slate-600">support@rankoai.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}