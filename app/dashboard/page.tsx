'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, LayoutDashboard, Heart, Phone, 
  ShieldAlert, Gift, CheckCircle, BarChart3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase/client';

export default function DashboardPage() {
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'growth'>('overview');
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });
  const [viewMode, setViewMode] = useState<'single' | 'global'>('single');

  // CONFIGURACIÓN 1:1
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [promoText, setPromoText] = useState(''); 
  const [interceptorMode, setInterceptorMode] = useState('safe');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = '/';
      else {
        setUser(session.user);
        await fetchData(session.user);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const fetchData = async (currentUser: any) => {
    const { data: businesses } = await supabase.from('businesses').select('*, whatsapp_configs(phone_number)').eq('user_id', currentUser.id);
    if (businesses && businesses.length > 0) {
      setMyBusinesses(businesses);
      setSelectedBusiness(businesses[0]);
      applyBusinessData(businesses[0]);
      
      // Lógica de Stats Globales vs Únicos
      const bizIds = businesses.map((b: any) => b.id);
      const { data: logs } = await supabase.from('reviews_logs').select('stars, status, business_id').in('business_id', bizIds);
      if (logs) calculateStats(logs, viewMode === 'global' ? null : businesses[0].id);
    }
  };

  const calculateStats = (logs: any[], businessId: string | null) => {
    const filtered = businessId ? logs.filter(l => l.business_id === businessId) : logs;
    const valid = filtered.filter(l => l.stars != null);
    const posted = filtered.filter(l => l.status === 'posted').length;
    setStats({
      totalReplies: posted,
      avgRating: valid.length > 0 ? Number((valid.reduce((acc, curr) => acc + curr.stars, 0) / valid.length).toFixed(1)) : 0,
      happiness: valid.length > 0 ? Math.round((valid.filter(l => l.stars >= 4).length / valid.length) * 100) : 0,
      timeSaved: posted > 0 ? `${Math.round((posted * 8) / 60)}h` : '0h'
    });
  };

  const applyBusinessData = (biz: any) => {
    setBizInfo(biz.business_info || '');
    setPromoText(biz.promo_text || '');
    setAutoReply5(biz.auto_reply_5_stars ?? true);
    setInterceptorMode(biz.interceptor_mode || 'safe');
    const phone = Array.isArray(biz.whatsapp_configs) ? biz.whatsapp_configs[0]?.phone_number : biz.whatsapp_configs?.phone_number;
    setWhatsappNumber(phone || '');
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      await supabase.from('businesses').update({
        business_info: bizInfo, promo_text: promoText, 
        auto_reply_5_stars: autoReply5, interceptor_mode: interceptorMode
      }).eq('id', selectedBusiness.id);
      await supabase.from('whatsapp_configs').upsert({ business_id: selectedBusiness.id, phone_number: whatsappNumber.replace(/\D/g, '') }, { onConflict: 'business_id' });
      alert("¡Configuración actualizada!");
    } catch (e) { alert("Error al guardar"); } finally { setIsSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl"><Zap className="text-white fill-white" size={18} /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap pr-8">Ranko AI</span>
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Selector de Modo de Vista */}
        <div className="flex gap-4 mb-8">
           <button onClick={() => setViewMode('single')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white'}`}>Vista Individual</button>
           <button onClick={() => setViewMode('global')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'global' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white'}`}><BarChart3 size={14}/> Comparativa Global</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Respuestas', val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: 'Rating Global', val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: 'Felicidad', val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: 'Tiempo Ahorrado', val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] shadow-inner transition-all hover:border-white/10">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <div className="text-3xl font-black italic tracking-tighter">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><LayoutDashboard size={14}/> Tus Negocios</h3>
              <div className="space-y-2">
                {myBusinesses.map((b) => (
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); setViewMode('single'); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedBusiness?.id === b.id && viewMode === 'single' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                    <span className="text-[11px] font-black uppercase italic truncate block">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-2 flex bg-black/40 gap-2 border-b border-white/5">
              {[ { id: 'overview', label: 'Resumen', icon: LayoutDashboard }, { id: 'strategy', label: 'Defensa', icon: ShieldAlert }, { id: 'growth', label: 'Crecimiento', icon: Zap } ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-500 hover:text-white'}`}>
                  <tab.icon size={14}/> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center sm:text-left">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alertas WhatsApp</label>
                      <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cerebro de IA</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Datos para la IA..." className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs min-h-[160px] outline-none focus:border-emerald-500 transition-all shadow-inner" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Zap size={20}/></div><div className="text-[11px] font-black uppercase italic">Auto-Respuesta 5★</div></div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-7 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-600' : 'bg-slate-800'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} /></button>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modo Interceptor (Reseñas Negativas)</label>
                      <select value={interceptorMode} onChange={(e) => setInterceptorMode(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"><option value="safe">Redirigir a WhatsApp</option><option value="smart">Gestionar con IA</option></select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-6">
                  {/* Vista Pro del Cupón */}
                  <div className="bg-slate-950/50 p-8 rounded-3xl border border-emerald-500/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><Gift className="text-emerald-400" size={24}/><span className="text-sm font-black uppercase italic italic tracking-tighter">Cupón de Fidelización Visual</span></div>
                      <div className="text-[9px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Killer de Trustar</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Beneficio del Cupón</label>
                        <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Ej: 15% OFF en tu próxima cena" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-inner" />
                      </div>
                      {/* Vista Previa de la Card */}
                      <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-3">Vista Previa Cliente</span>
                        <h4 className="text-xl font-black italic tracking-tighter uppercase mb-1">{promoText || 'Tu Beneficio Aquí'}</h4>
                        <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-widest">Válido en {selectedBusiness?.business_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">RANKO ENGINE v2.3 // MULTI-SINC</span>
              <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black uppercase italic tracking-widest transition-all hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} />}
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}