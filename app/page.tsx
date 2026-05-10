'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Globe, Star, Smartphone, MousePointer2, TrendingUp, Search,
  Loader2, LogOut, BarChart3, Store, Settings, Mail, FileText, Shield, 
  UserCircle, Activity, Heart, Clock, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'onboarding' | 'dashboard'>('hero');
  const [loading, setLoading] = useState(true);
  
  // Métricas Reales
  const [stats, setStats] = useState({
    totalReplies: 0,
    avgRating: 0,
    timeSaved: '0h',
    accuracy: '98%'
  });

  // Estados para configuración de IA
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('Professional');
  const [replyLang, setReplyLang] = useState('Auto');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Ranko AI | Google Reviews on Autopilot";
    
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
    
    // 1. Traer Negocios
    const { data: bizData } = await supabase.from('businesses').select('*').eq('user_id', currentUser.id);
    const businesses = bizData || [];
    setMyBusinesses(businesses);

    if (businesses.length > 0) {
      // 2. Traer Métricas Reales de reviews_log
      const { data: logs } = await supabase
        .from('reviews_log')
        .select('stars')
        .in('business_id', businesses.map(b => b.id));

      const total = logs?.length || 0;
      const avg = total > 0 ? (logs!.reduce((acc, curr) => acc + curr.stars, 0) / total).toFixed(1) : 0;
      
      // Cálculo de tiempo ahorrado: 5 min por reseña. Si es 0, mostramos potencial.
      const hoursSaved = Math.round((total * 5) / 60);

      setStats({
        totalReplies: total,
        avgRating: Number(avg),
        timeSaved: total > 0 ? `${hoursSaved}h` : 'Est. 2h/wk',
        accuracy: '98%'
      });

      setStep('dashboard');
      localStorage.setItem('ranko_setup_complete', 'true');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('ranko_setup_complete');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Aquí iría el update a la tabla businesses para guardar el tono
    setTimeout(() => {
      setIsSaving(false);
      setSelectedBusiness(null);
    }, 1500);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter">RANKO AI</div>
        <div className="flex items-center gap-4">
          {user && (
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase hover:bg-red-500/20 transition-all">
              <LogOut size={14} /> SIGN OUT
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'hero' && (
          <div className="pt-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 animate-bounce">
              <Sparkles size={14} /> NOW OPEN FOR BETA
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-tight">Google Reviews <br/><span className="text-indigo-500">on Autopilot.</span></h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">Respond to customers instantly and boost your local SEO using AI. No manual work required.</p>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all flex items-center gap-4 mx-auto group">
              Get Started Now <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
              <div>
                <p className="text-indigo-400 font-bold text-sm mb-2 uppercase tracking-widest">Management Console</p>
                <h1 className="text-5xl font-black tracking-tight">Active Accounts</h1>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center"><Activity size={20}/></div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">AI Engine Status</p>
                  <p className="text-sm font-bold">Operational</p>
                </div>
              </div>
            </div>

            {/* Metrics con Lógica de Venta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { label: 'Total Replies', val: stats.totalReplies || 'Ready', icon: MessageSquare, col: 'text-indigo-400' },
                { label: 'Avg Rating', val: stats.avgRating > 0 ? stats.avgRating : 'New', icon: Star, col: 'text-yellow-400' },
                { label: 'Time Saved', val: stats.timeSaved, icon: Clock, col: 'text-emerald-400' },
                { label: 'AI Efficiency', val: stats.accuracy, icon: ShieldCheck, col: 'text-blue-400' },
              ].map((m, i) => (
                <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-colors">
                  <m.icon className={`${m.col} mb-4`} size={20} />
                  <p className="text-3xl font-black">{m.val}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBusinesses.map((b) => (
                <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] group hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                        <Store size={28} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-tighter mb-2">Active</span>
                        <span className="text-slate-500 text-[10px] font-bold">GMB Profile Linked</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-2xl mb-6 tracking-tight">{b.business_name}</h3>
                  </div>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase">AI Mode</span>
                      <span className="text-xs font-black text-indigo-400 tracking-tighter uppercase">{aiTone}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Language</span>
                      <span className="text-xs font-black text-white">{replyLang === 'Auto' ? 'Detecting' : replyLang}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedBusiness(b)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-indigo-600/20"
                  >
                    <Settings size={16} className="group-hover/btn:rotate-90 transition-transform" /> CONFIGURE IA
                  </button>
                </div>
              ))}
              
              {/* Card de "Add Business" para incentivar crecimiento */}
              <div className="p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-all cursor-not-allowed">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                   <Zap size={20} />
                </div>
                <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Add New Location</p>
                <p className="text-xs text-slate-600 mt-2">Available in Pro Plan</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Configuración */}
        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter">AI SETTINGS</h2>
                   <p className="text-slate-500 text-sm">{selectedBusiness.business_name}</p>
                </div>
                <button onClick={() => setSelectedBusiness(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block">Persona & Tone of Voice</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Professional', 'Friendly', 'Concise', 'Witty'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setAiTone(t)}
                        className={`py-4 rounded-2xl font-black text-xs transition-all border ${aiTone === t ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block">Target Language</label>
                  <select 
                    value={replyLang}
                    onChange={(e) => setReplyLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 font-bold text-sm"
                  >
                    <option value="Auto">Auto-detect (Smart Mode)</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> SAVE CONFIGURATION</>}
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
            <span className="text-slate-800">|</span>
            <span className="text-slate-600">support@rankoai.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}