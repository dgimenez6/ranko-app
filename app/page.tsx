'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, ArrowRight,
  LayoutDashboard, Heart, HelpCircle, Globe, Phone, Mail, FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'growth'>('overview');
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });

  // CONFIGURACIÓN
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [replyLang, setReplyLang] = useState('es');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData(session.user);
      else setLoading(false);
    });
  }, []);

  const fetchData = async (currentUser: any) => {
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*, whatsapp_configs(phone_number)')
        .eq('user_id', currentUser.id);
      
      if (businesses && businesses.length > 0) {
        setMyBusinesses(businesses);
        updateLocalStates(businesses[0]);

        const bizIds = businesses.map(b => b.id);
        const { data: logs } = await supabase.from('reviews_logs').select('stars').in('business_id', bizIds);
        if (logs) {
          const valid = logs.filter(l => l.stars != null);
          setStats({
            totalReplies: logs.length,
            avgRating: valid.length > 0 ? Number((valid.reduce((acc, curr) => acc + curr.stars, 0) / valid.length).toFixed(1)) : 0,
            happiness: valid.length > 0 ? Math.round((valid.filter(l => l.stars >= 4).length / valid.length) * 100) : 0,
            timeSaved: logs.length > 0 ? `${Math.round((logs.length * 5) / 60)}h` : '0h'
          });
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const updateLocalStates = (biz: any) => {
    setSelectedBusiness(biz);
    setReplyLang(biz.language || 'es');
    setBizInfo(biz.business_info || '');
    setWhatsappNumber(biz.whatsapp_configs?.phone_number || '');
    setAutoReply5(biz.is_active ?? true);
    setNotifyNegative(biz.notify_negative ?? true);
  };

  const saveSettings = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      await supabase.from('businesses').update({
        language: replyLang,
        business_info: bizInfo,
        is_active: autoReply5,
        notify_negative: notifyNegative
      }).eq('id', selectedBusiness.id);
      
      await supabase.from('whatsapp_configs').upsert({
        business_id: selectedBusiness.id,
        phone_number: whatsappNumber
      }, { onConflict: 'business_id' });

      alert('Settings saved successfully');
    } catch (e) { alert('Error saving settings'); } finally { setIsSaving(false); }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      
      {/* 1. NAVEGACIÓN */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="max-w-6xl mx-auto px-5 py-5 flex justify-between items-center overflow-hidden gap-4">
          <div className="flex-shrink-0">
            <div className="text-lg md:text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase whitespace-nowrap pr-2">
              RANKO AI
            </div>
          </div>
          <button 
            onClick={() => user ? supabase.auth.signOut().then(() => window.location.reload()) : loginWithGoogle()} 
            className={`px-4 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase border transition-all ${user ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'}`}
          >
            {user ? 'SIGN OUT' : 'LOGIN'}
          </button>
        </div>
      </nav>

      {!user ? (
        /* HERO */
        <div className="relative pt-20 pb-32 text-center px-5">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] uppercase italic">YOUR REPUTATION<br/>ON AUTOPILOT</h1>
            <button onClick={loginWithGoogle} className="group relative px-8 py-5 bg-indigo-500 rounded-2xl font-black text-slate-950 flex items-center gap-3 mx-auto hover:bg-indigo-400 transition-all hover:scale-105 shadow-2xl shadow-indigo-500/40 uppercase italic">
              GET STARTED <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-5 py-10 animate-in fade-in duration-700">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
          ) : (
            <div className="space-y-10">
              
              {/* 2. MÉTRICAS DE IMPACTO (Siempre arriba) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Replies", val: stats.totalReplies, icon: MessageSquare, col: 'text-indigo-400' },
                  { label: "Global Rating", val: stats.avgRating || 'New', icon: Star, col: 'text-yellow-400' },
                  { label: "Happiness Index", val: `${stats.happiness}%`, icon: Heart, col: 'text-pink-400' },
                  { label: "Time Saved", val: stats.timeSaved, icon: Clock, col: 'text-emerald-400' },
                ].map((m, i) => (
                  <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all">
                    <m.icon className={`${m.col} mb-4`} size={20} />
                    <p className="text-4xl font-black mb-1 leading-none">{m.val}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* 3. SELECTOR DE SOLAPAS (TABS) */}
              <div className="flex p-1 bg-white/5 rounded-2xl w-fit mx-auto border border-white/5">
                <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <div className="flex items-center gap-2"><LayoutDashboard size={14}/> Dashboard</div>
                </button>
                <button onClick={() => setActiveTab('growth')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${activeTab === 'growth' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <div className="flex items-center gap-2"><Zap size={14}/> Smart QR</div>
                </button>
              </div>

              {activeTab === 'overview' ? (
                <div className="grid lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-4 duration-500">
                  {/* SIDEBAR: LOCATIONS */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><LayoutDashboard size={14} /> MY LOCATIONS</h3>
                      <div className="space-y-3">
                        {myBusinesses.map(b => (
                          <button key={b.id} onClick={() => updateLocalStates(b)} className={`w-full p-4 rounded-3xl text-left border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-transparent border-white/5 hover:border-white/10'}`}>
                            <p className="font-black text-xs uppercase italic">{b.business_name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* MAIN: CONFIGURATION */}
                  <div className="lg:col-span-8">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Settings className="text-indigo-400" /> SETTINGS</h2>
                      
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">AI KNOWLEDGE BASE</label>
                        <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Provide specific business information to train your AI..." className="w-full bg-slate-950 border border-white/10 rounded-3xl p-5 text-sm focus:border-indigo-500 outline-none transition-all min-h-[120px]" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">WHATSAPP (ALERT SYSTEM)</label>
                          <div className="flex items-center gap-3 bg-slate-950 border border-white/10 rounded-3xl p-4">
                            <Phone size={18} className="text-indigo-400" />
                            <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="e.g. 54911..." className="bg-transparent w-full outline-none text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">REPLY LANGUAGE</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setReplyLang('es')} className={`py-4 rounded-2xl font-bold text-xs border ${replyLang === 'es' ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>ESPAÑOL</button>
                            <button onClick={() => setReplyLang('pt')} className={`py-4 rounded-2xl font-bold text-xs border ${replyLang === 'pt' ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>PORTUGUÊS</button>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                          <span className="text-[10px] font-black uppercase italic tracking-tighter">Auto-Responder 5⭐</span>
                          <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-6 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                          <span className="text-[10px] font-black uppercase italic tracking-tighter">Negative Alerts</span>
                          <button onClick={() => setNotifyNegative(!notifyNegative)} className={`w-12 h-6 rounded-full relative transition-all ${notifyNegative ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifyNegative ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>

                      <button onClick={saveSettings} disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-6 rounded-3xl transition-all shadow-xl shadow-emerald-500/20 italic tracking-tighter uppercase">
                        {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'SAVE CONFIGURATION'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* GROWTH TAB: SMART QR */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-500">
                  {myBusinesses.map(biz => (
                    <div key={biz.id} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center group hover:border-emerald-500/50 transition-all shadow-2xl">
                      <div className="bg-white p-6 rounded-3xl w-fit mx-auto mb-6 shadow-xl shadow-white/5 group-hover:scale-105 transition-transform">
                        <QrCode size={120} className="text-slate-950" />
                      </div>
                      <h3 className="text-2xl font-black mb-2 italic uppercase tracking-tighter">{biz.business_name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8">Increase your 5⭐ reviews</p>
                      <button className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all italic shadow-lg shadow-emerald-500/20">
                         GENERAR QR SMART <Zap size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. FOOTER GLOBAL */}
      <footer className="py-20 border-t border-white/5 bg-slate-950 mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div className="space-y-4 text-center md:text-left">
              <div className="text-xl font-black italic tracking-tighter uppercase text-indigo-400">RANKO AI</div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Hospitality Intelligence</p>
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
          <div className="pt-8 border-t border-white/5 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
            © 2026 RANKO AI
          </div>
        </div>
      </footer>
    </main>
  );
}