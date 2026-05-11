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
  
  const [stats, setStats] = useState({
    totalReplies: 0,
    avgRating: 0,
    happiness: 0,
    timeSaved: '0h'
  });

  // CONFIGURACIÓN INTEGRAL (Campos de tu DB)
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [aiTone, setAiTone] = useState('friendly');
  const [replyLang, setReplyLang] = useState('es');
  const [promoText, setPromoText] = useState('');
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [autoReplyHigh, setAutoReplyHigh] = useState(true); // 4 y 5 estrellas
  const [autoReplyLow, setAutoReplyLow] = useState(false);  // Menores a 4
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = "Ranko AI | Business Rep Dashboard";
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
      const bizIds = businesses.map(b => b.id);
      const { data: logs } = await supabase.from('reviews_logs').select('stars').in('business_id', bizIds);
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
    const { error } = await supabase.from('businesses').update({ 
      reply_tone: aiTone, 
      language: replyLang,
      promo_text: promoText,
      business_info: bizInfo,
      whatsapp_number: whatsappNumber,
      auto_reply_high: autoReplyHigh,
      auto_reply_low: autoReplyLow,
      notify_negative_reviews: emergencyAlerts 
    }).eq('id', selectedBusiness.id);

    if (!error) {
      await refreshUserStatus(user);
      setSelectedBusiness(null);
    } else {
      alert(`Error: ${error.message}`);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase">RANKO AI</div>
        {user && <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-black uppercase border border-red-500/10">SIGN OUT</button>}
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {step === 'dashboard' && (
          <div className="pt-12 animate-in fade-in duration-700">
            <div className="flex gap-2 mb-12 bg-white/5 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500'}`}><LayoutDashboard size={14} /> Dashboard</button>
              <button onClick={() => setActiveTab('growth')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'growth' ? 'bg-indigo-600 shadow-lg' : 'text-slate-500'}`}><QrCode size={14} /> Marketing QR</button>
            </div>

            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBusinesses.map((b) => (
                  <div key={b.id} className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] group hover:border-indigo-500/50 transition-all flex flex-col h-full shadow-2xl">
                    <h3 className="font-black text-2xl mb-8 italic uppercase">{b.business_name}</h3>
                    <div className="space-y-3 mb-8 flex-grow">
                      <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase border border-white/5">
                        <span className="text-slate-500">Status</span>
                        <span className="text-emerald-400">ACTIVE</span>
                      </div>
                      <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase border border-white/5">
                        <span className="text-slate-500">Language</span>
                        <span className="text-indigo-400 font-bold">{b.language?.toUpperCase() || 'ES'}</span>
                      </div>
                    </div>
                    <button onClick={() => openConfig(b)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/5">
                      <Settings size={14} /> CONFIGURE STRATEGY
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Growth Tab... (Mantener lógica de QR igual) */}
          </div>
        )}

        {selectedBusiness && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl my-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">SETTINGS: {selectedBusiness.business_name}</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Columna Izquierda: Identidad */}
                <div className="space-y-6">
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><BrainCircuit size={14}/> Knowledge Base</label>
                      <div className="group/tooltip relative cursor-help">
                        <HelpCircle size={12} className="text-slate-600" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-800 border border-indigo-500/30 rounded-xl text-[9px] font-bold text-slate-300 hidden group-hover/tooltip:block shadow-2xl z-[110]">
                          Detalles que la IA usará para responder. Ej: "Tenemos estacionamiento", "Aceptamos Pix".
                        </div>
                      </div>
                    </div>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Contale a la IA sobre tu local..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 text-xs h-32 resize-none" />
                  </div>

                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-2"><Globe size={14}/> Language / Idioma</label>
                    <select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 text-xs font-bold">
                      <option value="es">Español 🇦🇷</option>
                      <option value="pt">Português 🇧🇷</option>
                      <option value="en">English 🇺🇸</option>
                    </select>
                  </div>
                </div>

                {/* Columna Derecha: Automatización */}
                <div className="space-y-6">
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Sparkles size={14}/> Reply Tone</label>
                    </div>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 text-xs font-bold">
                      <option value="friendly">Friendly / Amigável</option>
                      <option value="professional">Professional / Profissional</option>
                      <option value="funny">Funny / Engraçado</option>
                    </select>
                  </div>

                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-2"><Megaphone size={14}/> Promo Upsell</label>
                    <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Ej: 10% off Martes..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 text-xs font-bold" />
                  </div>

                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-2"><Phone size={14}/> WhatsApp Notification</label>
                    <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+54 9 11..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-indigo-500 text-xs font-bold" />
                  </div>
                </div>
              </div>

              {/* Botones de Control de IA */}
              <div className="grid md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Reply 4 & 5 Stars ⭐</span>
                  <button onClick={() => setAutoReplyHigh(!autoReplyHigh)} className={`w-10 h-5 rounded-full relative transition-all ${autoReplyHigh ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoReplyHigh ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Reply &lt; 4 Stars ⚠️</span>
                  <button onClick={() => setAutoReplyLow(!autoReplyLow)} className={`w-10 h-5 rounded-full relative transition-all ${autoReplyLow ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoReplyLow ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button onClick={saveSettings} disabled={isSaving} className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95">
                {isSaving ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> UPDATE PRODUCTION STRATEGY</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}