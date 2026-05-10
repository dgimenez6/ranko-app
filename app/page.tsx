'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, ArrowRight, CheckCircle2, 
  Globe, Star, Smartphone, MousePointer2, TrendingUp, Search,
  Loader2, LogOut, BarChart3, Store, Settings, Mail, FileText, Shield, 
  UserCircle, Activity, Heart, Clock, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [step, setStep] = useState<'hero' | 'onboarding' | 'dashboard'>('hero');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'es' | 'pt'>('es');
  
  // Estados para configuración de IA
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('Professional');
  const [replyLang, setReplyLang] = useState('Auto');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Título Pro en Inglés por defecto para el navegador
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
    const { data: bizData } = await supabase.from('businesses').select('*').eq('user_id', currentUser.id);
    const businesses = bizData || [];
    setMyBusinesses(businesses);
    if (businesses.length > 0) {
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
    // Simulación de guardado para feedback visual inmediato
    setTimeout(() => {
      setIsSaving(false);
      setSelectedBusiness(null);
    }, 1500);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
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
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-tight">Google Reviews on Autopilot.</h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">IA que responde por vos y te avisa por WhatsApp. Aumentá tu reputación en Google sin mover un dedo.</p>
            <button onClick={() => loginWithGoogle()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-bold px-12 py-6 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all flex items-center gap-4 mx-auto group">
              Start Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="pt-12 animate-fade-in">
            <div className="flex justify-between items-end mb-12">
              <div>
                <p className="text-indigo-400 font-bold text-sm mb-2 uppercase tracking-widest">Management Dashboard</p>
                <h1 className="text-5xl font-black tracking-tight">Active Businesses</h1>
              </div>
              <div className="hidden md:flex gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center"><Activity size={20}/></div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">System Status</p>
                    <p className="text-sm font-bold">Operational</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Quick Look */}
            <div className="grid md:grid-cols-4 gap-4 mb-12">
              {[
                { label: 'Total Replies', val: '124', icon: MessageSquare, col: 'text-indigo-400' },
                { label: 'Avg Rating', val: '4.9', icon: Star, col: 'text-yellow-400' },
                { label: 'Time Saved', val: '12h', icon: Clock, col: 'text-emerald-400' },
                { label: 'AI Accuracy', val: '98%', icon: ShieldCheck, col: 'text-blue-400' },
              ].map((m, i) => (
                <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <m.icon className={`${m.col} mb-4`} size={20} />
                  <p className="text-3xl font-black">{m.val}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBusinesses.map((b) => (
                <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] group hover:border-indigo-500/50 transition-all">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="font-bold text-2xl mb-1">{b.business_name}</h3>
                      <p className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Store size={14}/> Google Profile Active</p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner"><CheckCircle2 size={20} /></div>
                  </div>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                      <span className="text-xs font-bold text-slate-400 uppercase">AI Status</span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full italic tracking-tighter">RESPONDING</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                      <span className="text-xs font-bold text-slate-400 uppercase">Tone</span>
                      <span className="text-xs font-black text-indigo-400">{aiTone}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedBusiness(b)}
                    className="w-full py-4 bg-white/5 hover:bg-indigo-600 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <Settings size={16} className="group-hover/btn:rotate-90 transition-transform" /> AI SETTINGS
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Configuración - El valor agregado para vender */}
        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic">AI Configuration</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 block">Select Response Tone</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Professional', 'Friendly', 'Concise', 'Witty'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setAiTone(t)}
                        className={`py-4 rounded-2xl font-bold text-sm transition-all border ${aiTone === t ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 block">Target Language</label>
                  <select 
                    value={replyLang}
                    onChange={(e) => setReplyLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="Auto">Auto-detect (Recommended)</option>
                    <option value="es">Spanish Only</option>
                    <option value="pt">Portuguese Only</option>
                    <option value="en">English Only</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> UPDATE AI MODEL</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Pro en Inglés */}
      <footer className="border-t border-white/5 py-20 bg-slate-950 mt-32">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-black tracking-tighter">RANKO AI</div>
          <div className="flex gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <span className="text-slate-800">|</span>
            <span className="text-slate-600">support@rankoai.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}