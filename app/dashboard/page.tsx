'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Settings, Clock, QrCode, LayoutDashboard, Heart, Phone, 
  ShieldAlert, Gift, CheckCircle, BarChart3, Languages
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase/client';

export default function DashboardPage() {
  const { logout, user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'growth'>('overview');
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });
  const [viewMode, setViewMode] = useState<'single' | 'global'>('single');

  // CONFIGURACIÓN RECUPERADA
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [replyLang, setReplyLang] = useState('es'); // Recuperado: indispensable para Búzios
  const [promoText, setPromoText] = useState(''); 
  const [autoCoupon, setAutoCoupon] = useState(true); // Recuperado: interruptor de cupón
  const [interceptorMode, setInterceptorMode] = useState('safe');

  useEffect(() => {
    if (authUser) {
      fetchData(authUser);
      setLoading(false);
    }
  }, [authUser]);

  const fetchData = async (currentUser: any) => {
    const { data: businesses } = await supabase.from('businesses').select('*, whatsapp_configs(phone_number)').eq('user_id', currentUser.id);
    if (businesses && businesses.length > 0) {
      setMyBusinesses(businesses);
      const initialBiz = businesses[0];
      setSelectedBusiness(initialBiz);
      applyBusinessData(initialBiz);
      
      const bizIds = businesses.map((b: any) => b.id);
      const { data: logs } = await supabase.from('reviews_logs').select('stars, status, business_id').in('business_id', bizIds);
      if (logs) calculateStats(logs, viewMode === 'global' ? null : initialBiz.id);
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
    setReplyLang(biz.reply_lang || 'es');
    setAutoReply5(biz.auto_reply_5_stars ?? true);
    setAutoCoupon(biz.auto_coupon ?? true);
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
        reply_lang: replyLang, auto_reply_5_stars: autoReply5,
        auto_coupon: autoCoupon, interceptor_mode: interceptorMode
      }).eq('id', selectedBusiness.id);
      
      await supabase.from('whatsapp_configs').upsert({ 
        business_id: selectedBusiness.id, 
        phone_number: whatsappNumber.replace(/\D/g, '') 
      }, { onConflict: 'business_id' });
      
      alert("Configuración actualizada correctamente");
    } catch (e) { alert("Error al guardar"); } finally { setIsSaving(false); }
  };

  if (loading || !authUser) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl"><Zap className="text-white fill-white" size={18} /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Ranko AI</span>
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-4 mb-8">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alertas WhatsApp</label>
                      <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Languages size={12}/> Idioma de Respuesta</label>
                      <select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500">
                        <option value="es">Español (Argentina/Latam)</option>
                        <option value="pt">Português (Brasil)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cerebro de IA (Contexto del Local)</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder="Ej: Somos una posada en Búzios frente al mar, servimos desayuno artesanal..." className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs min-h-[160px] outline-none focus:border-emerald-500 transition-all shadow-inner" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><CheckCircle size={20}/></div><div className="text-[11px] font-black uppercase italic">Auto-Respuesta 5★</div></div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-7 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-600' : 'bg-slate-800'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} /></button>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gestión de Crisis (Reseñas Negativas)</label>
                      <select value={interceptorMode} onChange={(e) => setInterceptorMode(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"><option value="safe">Redirigir a WhatsApp del Dueño</option><option value="smart">Asistente IA de Contención</option></select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-8 rounded-3xl border border-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400"><Gift size={20}/></div>
                        <span className="text-sm font-black uppercase italic tracking-tighter">Programa de Fidelización</span>
                      </div>
                      {/* Interruptor de activación del cupón - Limpio y Pro */}
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{autoCoupon ? 'Activado' : 'Desactivado'}</span>
                        <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-12 h-7 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoCoupon ? 'right-1' : 'left-1'}`} /></button>
                      </div>
                    </div>
                    
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center transition-opacity duration-300 ${autoCoupon ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Premio por Reseña Positiva</label>
                        <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Ej: 15% OFF en tu próxima cena" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 shadow-inner" />
                        <p className="text-[9px] text-slate-500 italic uppercase">Este beneficio se muestra automáticamente tras calificar con 5 estrellas.</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group shadow-2xl">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl transition-all"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 block mb-3 flex items-center gap-2"><CheckCircle size={10}/> Vista del Cliente</span>
                        <h4 className="text-xl font-black italic tracking-tighter uppercase mb-1">{promoText || 'Tu Beneficio Aquí'}</h4>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Válido en {selectedBusiness?.business_name || 'tu local'}</p>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                           <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">Powered by Ranko AI</span>
                           <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center"><QrCode size={14} className="text-slate-500"/></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic tracking-[0.2em]">RANKO ENGINE v2.4 // GLOBAL SYNC</span>
              <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 text-white px-10 py-4 rounded-xl font-black uppercase italic tracking-widest transition-all hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} />}
                {isSaving ? "Guardando..." : "Actualizar Sistema"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}