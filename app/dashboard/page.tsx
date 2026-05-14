'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Clock, QrCode, LayoutDashboard, Heart, 
  ShieldAlert, Gift, CheckCircle, BarChart3, Languages,
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb
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
  const [insights, setInsights] = useState<any[]>([]);

  // CONFIGURACIÓN DE NEGOCIO
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true); 
  const [replyLang, setReplyLang] = useState('es'); 
  const [promoText, setPromoText] = useState(''); 
  const [autoCoupon, setAutoCoupon] = useState(true); 
  const [interceptorMode, setInterceptorMode] = useState('safe');

  // DICCIONARIO BILINGÜE
  const t: any = {
    es: {
      overview: 'Resumen', strategy: 'Defensa', growth: 'Crecimiento',
      singleView: 'Vista Individual', globalView: 'Comparativa Global',
      replies: 'Respuestas', rating: 'Rating Global', happiness: 'Felicidad', saved: 'Tiempo Ahorrado',
      businesses: 'Tus Negocios', alerts: 'Alertas WhatsApp', lang: 'Idioma de la App y Respuestas',
      brain: 'Cerebro de IA (Contexto del Local)', placeholderBrain: 'Ej: Somos una posada en Búzios...',
      auto5: 'Auto-Respuesta 5★', crisis: 'Gestión de Crisis (Negativas)',
      safe: 'Redirigir a WhatsApp', smart: 'Asistente IA de Contención',
      fidelization: 'Programa de Fidelización', couponActive: 'Cupón Activado', couponInactive: 'Cupón Desactivado',
      prize: 'Premio por Reseña Positiva', placeholderPrize: 'Ej: 15% OFF en tu próxima cena',
      clientView: 'Vista del Cliente', saveBtn: 'Actualizar Sistema', saving: 'Guardando...',
      intelligence: 'Análisis de Inteligencia (IA)', positive: 'Fortalezas', negative: 'Oportunidades de Mejora',
      emptyInsights: 'Esperando datos de reseñas para analizar...'
    },
    pt: {
      overview: 'Resumo', strategy: 'Defesa', growth: 'Crescimento',
      singleView: 'Vista Individual', globalView: 'Comparativo Global',
      replies: 'Respostas', rating: 'Rating Global', happiness: 'Felicidade', saved: 'Tempo Salvo',
      businesses: 'Seus Negócios', alerts: 'Alertas WhatsApp', lang: 'Idioma do App e Respostas',
      brain: 'Cérebro de IA (Contexto do Local)', placeholderBrain: 'Ex: Somos uma pousada em Búzios...',
      auto5: 'Auto-Resposta 5★', crisis: 'Gestão de Crise (Negativas)',
      safe: 'Redirecionar para WhatsApp', smart: 'Assistente IA de Contenção',
      fidelization: 'Programa de Fidelidade', couponActive: 'Cupom Ativado', couponInactive: 'Cupom Desativado',
      prize: 'Prêmio por Avaliação Positiva', placeholderPrize: 'Ex: 15% OFF no próximo jantar',
      clientView: 'Vista do Cliente', saveBtn: 'Atualizar Sistema', saving: 'Salvando...',
      intelligence: 'Análise de Inteligência (IA)', positive: 'Pontos Fortes', negative: 'Oportunidades de Melhoria',
      emptyInsights: 'Aguardando dados de avaliações para analisar...'
    }
  };

  const cur = t[replyLang] || t.es;

  useEffect(() => {
    if (authUser) {
      fetchData(authUser);
      setLoading(false);
    }
  }, [authUser, viewMode, selectedBusiness?.id]);

  const fetchData = async (currentUser: any) => {
    const { data: businesses } = await supabase.from('businesses').select('*, whatsapp_configs(phone_number)').eq('user_id', currentUser.id);
    if (businesses && businesses.length > 0) {
      setMyBusinesses(businesses);
      const bizToUse = selectedBusiness || businesses[0];
      if (!selectedBusiness) {
        setSelectedBusiness(bizToUse);
        applyBusinessData(bizToUse);
      }
      
      const bizIds = viewMode === 'global' ? businesses.map((b: any) => b.id) : [bizToUse.id];
      const { data: logs } = await supabase.from('reviews_logs').select('stars, status, business_id, tags').in('business_id', bizIds);
      if (logs) {
        calculateStats(logs);
        processInsights(logs);
      }
    }
  };

  const calculateStats = (logs: any[]) => {
    const valid = logs.filter(l => l.stars != null);
    const posted = logs.filter(l => l.status === 'posted').length;
    setStats({
      totalReplies: posted,
      avgRating: valid.length > 0 ? Number((valid.reduce((acc, curr) => acc + curr.stars, 0) / valid.length).toFixed(1)) : 0,
      happiness: valid.length > 0 ? Math.round((valid.filter(l => l.stars >= 4).length / valid.length) * 100) : 0,
      timeSaved: posted > 0 ? `${Math.round((posted * 8) / 60)}h` : '0h'
    });
  };

  const processInsights = (logs: any[]) => {
    const counts: any = {};
    logs.forEach(log => {
      const tags = Array.isArray(log.tags) ? log.tags : [];
      tags.forEach((tag: any) => {
        const key = tag.topic;
        if (!counts[key]) counts[key] = { pos: 0, neg: 0 };
        if (tag.sentiment === 'pos') counts[key].pos++;
        else counts[key].neg++;
      });
    });
    setInsights(Object.keys(counts).map(k => ({ topic: k, ...counts[k] })));
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
        business_info: bizInfo, promo_text: promoText, reply_lang: replyLang, 
        auto_reply_5_stars: autoReply5, auto_coupon: autoCoupon, interceptor_mode: interceptorMode
      }).eq('id', selectedBusiness.id);
      await supabase.from('whatsapp_configs').upsert({ business_id: selectedBusiness.id, phone_number: whatsappNumber.replace(/\D/g, '') }, { onConflict: 'business_id' });
      alert(replyLang === 'es' ? "Configuración actualizada" : "Configuração atualizada");
    } catch (e) { alert("Error"); } finally { setIsSaving(false); }
  };

  if (loading || !authUser) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl"><Zap className="text-white fill-white" size={18} /></div>
            <div className="min-w-[180px]">
              <span className="text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent block leading-none">
                Ranko AI
              </span>
            </div>
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-4 mb-8">
           <button onClick={() => setViewMode('single')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500'}`}>{cur.singleView}</button>
           <button onClick={() => setViewMode('global')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'global' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500'}`}><BarChart3 size={14}/> {cur.globalView}</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: cur.replies, val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: cur.rating, val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: cur.happiness, val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: cur.saved, val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] shadow-inner">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <div className="text-3xl font-black italic tracking-tighter">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><LayoutDashboard size={14}/> {cur.businesses}</h3>
              <div className="space-y-2">
                {myBusinesses.map((b) => (
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); setViewMode('single'); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedBusiness?.id === b.id && viewMode === 'single' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                    <span className="text-[11px] font-black uppercase italic truncate block">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COMPONENTE DE INTELIGENCIA FASE 3 */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2"><Lightbulb size={14}/> {cur.intelligence}</h3>
              <div className="space-y-4">
                {insights.length === 0 ? (
                  <p className="text-[10px] uppercase text-slate-600 italic">{cur.emptyInsights}</p>
                ) : insights.map((ins, idx) => (
                  <div key={idx} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-tighter text-slate-300">{ins.topic}</div>
                      <div className="flex gap-1 mt-1">
                        <div className={`h-1 rounded-full bg-emerald-500`} style={{ width: `${(ins.pos / (ins.pos + ins.neg)) * 40}px` }} />
                        <div className={`h-1 rounded-full bg-rose-500`} style={{ width: `${(ins.neg / (ins.pos + ins.neg)) * 40}px` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ins.pos >= ins.neg ? <TrendingUp size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-rose-500" />}
                      <span className={`text-xs font-black italic ${ins.pos >= ins.neg ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {Math.round((ins.pos / (ins.pos + ins.neg)) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-2 flex bg-black/40 gap-2 border-b border-white/5">
              {[ { id: 'overview', label: cur.overview, icon: LayoutDashboard }, { id: 'strategy', label: cur.strategy, icon: ShieldAlert }, { id: 'growth', label: cur.growth, icon: Zap } ].map((tab) => (
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cur.alerts}</label>
                      <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Languages size={12}/> {cur.lang}</label>
                      <select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 rounded-xl text-xs font-bold outline-none focus:border-emerald-500">
                        <option value="es">Español (Latam)</option>
                        <option value="pt">Português (Brasil)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cur.brain}</label>
                    <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={cur.placeholderBrain} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs min-h-[160px] outline-none focus:border-emerald-500 shadow-inner transition-all" />
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><CheckCircle size={20}/></div><div className="text-[11px] font-black uppercase italic">{cur.auto5}</div></div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-12 h-7 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-600' : 'bg-slate-800'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1' : 'left-1'}`} /></button>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cur.crisis}</label>
                      <select value={interceptorMode} onChange={(e) => setInterceptorMode(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500">
                        <option value="safe">{cur.safe}</option>
                        <option value="smart">{cur.smart}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-slate-950/50 p-8 rounded-3xl border border-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400"><Gift size={20}/></div><span className="text-sm font-black uppercase italic tracking-tighter">{cur.fidelization}</span></div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{autoCoupon ? cur.couponActive : cur.couponInactive}</span>
                        <button onClick={() => setAutoCoupon(!autoCoupon)} className={`w-12 h-7 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${autoCoupon ? 'right-1' : 'left-1'}`} /></button>
                      </div>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${autoCoupon ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cur.prize}</label>
                        <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder={cur.placeholderPrize} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 shadow-inner" />
                      </div>
                      <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 block mb-3 flex items-center gap-2"><CheckCircle size={10}/> {cur.clientView}</span>
                        <h4 className="text-xl font-black italic tracking-tighter uppercase mb-1">{promoText || 'Benefit'}</h4>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Valid in {selectedBusiness?.business_name || '...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">RANKO ENGINE v3.0 // INTELLIGENCE SYNC</span>
              <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 text-white px-10 py-4 rounded-xl font-black uppercase italic tracking-widest transition-all hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} />}
                {isSaving ? cur.saving : cur.saveBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}