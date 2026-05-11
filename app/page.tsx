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

  // ESTADOS CONFIGURACIÓN
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

  // Función para el QR (Redirige al link de reviews de Google)
  const getGoogleReviewUrl = (biz: any) => {
    if (!biz?.google_location_id) return '#';
    return `https://search.google.com/local/writereview?placeid=${biz.google_location_id}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="max-w-6xl mx-auto px-5 py-5 flex justify-between items-center">
          <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase">RANKO AI</div>
          <button onClick={() => user ? supabase.auth.signOut().then(() => window.location.reload()) : loginWithGoogle()} className="px-4 py-2 rounded-xl font-black text-xs uppercase border border-white/10 hover:bg-white/5 transition-all">
            {user ? 'SIGN OUT' : 'LOGIN'}
          </button>
        </div>
      </nav>

      {!user ? (
        <div className="pt-20 pb-32 text-center px-5">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 italic uppercase leading-none">YOUR REPUTATION<br/>ON AUTOPILOT</h1>
            <button onClick={loginWithGoogle} className="px-8 py-5 bg-indigo-500 rounded-2xl font-black text-slate-950 flex items-center gap-3 mx-auto hover:scale-105 transition-all shadow-2xl shadow-indigo-500/40 uppercase italic">
              GET STARTED <ArrowRight size={20} />
            </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-5 py-10">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
          ) : (
            <div className="space-y-10">
              {/* TABS SELECTOR */}
              <div className="flex p-1 bg-white/5 rounded-2xl w-fit mx-auto border border-white/5">
                <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <div className="flex items-center gap-2"><LayoutDashboard size={14}/> Settings</div>
                </button>
                <button onClick={() => setActiveTab('growth')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${activeTab === 'growth' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <div className="flex items-center gap-2"><Zap size={14}/> Smart QR</div>
                </button>
              </div>

              {activeTab === 'overview' ? (
                <div className="grid lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* LEFT: STATS & BIZ */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                        <Heart size={20} className="text-pink-400 mx-auto mb-2" />
                        <p className="text-2xl font-black">{stats.happiness}%</p>
                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Happiness</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                        <Clock size={20} className="text-emerald-400 mx-auto mb-2" />
                        <p className="text-2xl font-black">{stats.timeSaved}</p>
                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Time Saved</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">SELECT LOCATION</h3>
                      <div className="space-y-2">
                        {myBusinesses.map(b => (
                          <button key={b.id} onClick={() => updateLocalStates(b)} className={`w-full p-4 rounded-2xl text-left border transition-all ${selectedBusiness?.id === b.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-transparent border-white/5'}`}>
                            <p className="font-black text-xs uppercase italic">{b.business_name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: CONFIG */}
                  <div className="lg:col-span-8">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 space-y-8">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">AI BUSINESS KNOWLEDGE</label>
                        <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Explain your business to the AI..." className="w-full bg-slate-950 border border-white/10 rounded-3xl p-5 text-sm focus:border-indigo-500 outline-none transition-all min-h-[120px]" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">WHATSAPP FOR ALERTS</label>
                          <div className="flex items-center gap-3 bg-slate-950 border border-white/10 rounded-3xl p-4">
                            <Phone size={18} className="text-indigo-400" />
                            <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="e.g. 54911..." className="bg-transparent w-full outline-none text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">REPLY LANGUAGE</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setReplyLang('es')} className={`py-3 rounded-2xl font-bold text-xs border ${replyLang === 'es' ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400'}`}>ES</button>
                            <button onClick={() => setReplyLang('pt')} className={`py-3 rounded-2xl font-bold text-xs border ${replyLang === 'pt' ? 'bg-white text-slate-950 border-white' : 'border-white/10 text-slate-400'}`}>PT</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><MessageSquare size={20}/></div>
                          <div>
                            <p className="text-xs font-black uppercase italic tracking-tighter">Auto-Responder (5⭐)</p>
                            <p className="text-[10px] text-slate-500">AI replies instantly to perfect reviews.</p>
                          </div>
                        </div>
                        <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-6 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <button onClick={saveSettings} disabled={isSaving} className="w-full bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black py-6 rounded-3xl transition-all shadow-xl shadow-indigo-500/20 uppercase italic">
                        {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'SAVE CONFIGURATION'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* GROWTH TAB: SMART QR */
                <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-8">
                    {myBusinesses.map(biz => (
                      <div key={biz.id} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-center group hover:border-emerald-500/50 transition-all">
                        <div className="bg-white p-6 rounded-3xl w-fit mx-auto mb-6 shadow-2xl shadow-white/10 group-hover:scale-105 transition-transform">
                          <QrCode size={120} className="text-slate-950" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 italic uppercase tracking-tighter">{biz.business_name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8">Boost your Google Ranking</p>
                        <a 
                          href={getGoogleReviewUrl(biz)} 
                          target="_blank" 
                          className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all italic"
                        >
                          DOWNLOAD ASSETS <Zap size={16}/>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="py-20 border-t border-white/5 mt-20">
        <div className="max-w-6xl mx-auto px-5 text-center md:text-left grid md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="text-xl font-black italic tracking-tighter uppercase text-indigo-400">RANKO AI</div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Hospitality Intelligence</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-300">Support</h4>
            <a href="mailto:support@rankoai.com" className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2 justify-center md:justify-start"><Mail size={14}/> support@rankoai.com</a>
          </div>
          <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] flex items-end justify-center md:justify-end">
            © 2026 RANKO AI
          </div>
        </div>
      </footer>
    </main>
  );
}