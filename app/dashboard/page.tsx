'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, MessageSquare, Zap, Star, Loader2, 
  Clock, LayoutDashboard, Heart, 
  ShieldAlert, Gift, CheckCircle, BarChart3, 
  Lightbulb, Download, ExternalLink,
  Users, Code, Send, Copy, Check, Play, X, Eye
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase/client';

export default function DashboardPage() {
  const { logout, user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'growth' | 'staff'>('overview');
  const [viewMode, setViewMode] = useState<'single' | 'global'>('single');
  const [copied, setCopied] = useState(false);

  // ESTADOS PARA MODAL DE PREVIEW
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // ESTADOS DE NEGOCIO
  const [bizInfo, setBizInfo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); 
  const [replyLang, setReplyLang] = useState('es'); 
  const [replyTone, setReplyTone] = useState('friendly');
  const [promoText, setPromoText] = useState(''); 
  const [autoCoupon, setAutoCoupon] = useState(''); 
  const [autoReply5, setAutoReply5] = useState(true);
  const [interceptorMode, setInterceptorMode] = useState(true);
  const [notifyNegative, setNotifyNegative] = useState(true);
  const [staffNames, setStaffNames] = useState('');

  // ESTADOS DE DATOS
  const [stats, setStats] = useState({ totalReplies: 0, avgRating: 0, happiness: 0, timeSaved: '0h' });
  const [insights, setInsights] = useState<any[]>([]);
  const [staffRanking, setStaffRanking] = useState<any[]>([]);

  const t: any = {
    es: {
      overview: 'Resumen', strategy: 'Defensa', growth: 'Marketing', staff: 'Equipo',
      singleView: 'Vista Individual', globalView: 'Comparativa Global',
      replies: 'Respuestas', rating: 'Rating Global', happiness: 'Felicidad', saved: 'Tiempo Ahorrado',
      businesses: 'Tus Negocios', alerts: 'Alertas WhatsApp', lang: 'Idioma del Sistema',
      brain: 'Cerebro de IA (Contexto)', placeholderBrain: 'Datos del local, especialidades, horarios...',
      auto5: 'Auto-Respuesta 5★', crisis: 'Modo Interceptor',
      safe: 'Redirigir a WhatsApp', smart: 'Asistente IA',
      fidelization: 'Fidelización', couponLabel: 'Cupón de Regalo',
      prize: 'Texto del Cupón', placeholderPrize: 'Ej: 10% de descuento',
      tone: 'Tono de Respuesta', toneFriendly: 'Amigable', toneProfessional: 'Profesional',
      kit: 'Kit de Marketing', downloadQr: 'Descargar QR',
      kitDesc: 'QR para que tus clientes califiquen el local.',
      clientView: 'Vista Cliente', saveBtn: 'Actualizar Sistema', saving: 'Guardando...',
      intelligence: 'Inteligencia IA', staffTitle: 'Menciones de Staff',
      widgetTitle: 'Widget para Web', widgetDesc: 'Reseñas en tu sitio.',
      reportTitle: 'Reporte Semanal WhatsApp', reportDesc: 'Resumen todos los lunes.',
      staffPlaceholder: 'Nombres del equipo (separados por coma)...',
      emptyInsights: 'Esperando datos de reseñas...',
      staffSectionTitle: 'Gestión de Equipo',
      backlogTitle: 'Backlog Intelligence',
      backlogDesc: 'Reseñas pendientes detectadas.',
      backlogBtn: 'Analizar Historial',
      backlogConfirm: 'Confirmar y Publicar Todo',
      backlogModalTitle: 'Pre-visualización de Respuestas'
    },
    pt: {
      overview: 'Resumo', strategy: 'Defesa', growth: 'Marketing', staff: 'Equipe',
      singleView: 'Vista Individual', globalView: 'Comparativa Global',
      replies: 'Respostas', rating: 'Rating Global', happiness: 'Felicidade', saved: 'Tempo Salvo',
      businesses: 'Seus Negócios', alerts: 'WhatsApp', lang: 'Idioma do Sistema',
      brain: 'Cérebro IA', placeholderBrain: 'Dados do local, especialidades, horários...',
      auto5: 'Auto-Resposta 5★', crisis: 'Modo Interceptor',
      safe: 'Redirecionar WhatsApp', smart: 'Assistente IA',
      fidelization: 'Fidelidade', couponLabel: 'Cupom de Presente',
      prize: 'Texto do Cupom', placeholderPrize: 'Ex: 10% de desconto',
      tone: 'Tom da Resposta', toneFriendly: 'Amigável', toneProfessional: 'Profissional',
      kit: 'Kit de Marketing', downloadQr: 'Baixar QR',
      kitDesc: 'QR para seus clientes avaliarem o local.',
      clientView: 'Vista Cliente', saveBtn: 'Atualizar Sistema', saving: 'Salvando...',
      intelligence: 'Inteligência IA', staffTitle: 'Menções da Equipe',
      widgetTitle: 'Widget para Web', widgetDesc: 'Avaliações no seu site.',
      reportTitle: 'Relatório Semanal WhatsApp', reportDesc: 'Resumo toda segunda-feira.',
      staffPlaceholder: 'Nomes da equipe (separados por vírgula)...',
      emptyInsights: 'Aguardando dados...',
      staffSectionTitle: 'Gestão de Equipe',
      backlogTitle: 'Backlog Intelligence',
      backlogDesc: 'Avaliações pendentes detectadas.',
      backlogBtn: 'Analisar Histórico',
      backlogConfirm: 'Confirmar e Publicar Tudo',
      backlogModalTitle: 'Pré-visualização de Respostas'
    }
  };

  const cur = t[replyLang] || t.es;

  useEffect(() => {
    if (authUser) fetchData(authUser);
  }, [authUser, viewMode, selectedBusiness?.id]);

  const fetchData = async (currentUser: any) => {
    const { data: businesses } = await supabase.from('businesses').select('*, whatsapp_configs(phone_number)').eq('user_id', currentUser.id);
    if (businesses && businesses.length > 0) {
      setMyBusinesses(businesses);
      const biz = selectedBusiness || businesses[0];
      if (!selectedBusiness) setSelectedBusiness(biz);
      applyBusinessData(biz);
      const bizIds = viewMode === 'global' ? businesses.map((b: any) => b.id) : [biz.id];
      const { data: logs } = await supabase.from('reviews_logs').select('stars, status, business_id, tags').in('business_id', bizIds);
      if (logs) { calculateStats(logs); processInsights(logs); processStaff(logs); }
    }
    setLoading(false);
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
        if (!tag.topic) return;
        if (!counts[tag.topic]) counts[tag.topic] = { pos: 0, neg: 0 };
        tag.sentiment === 'pos' ? counts[tag.topic].pos++ : counts[tag.topic].neg++;
      });
    });
    setInsights(Object.keys(counts).map(k => ({ topic: k, ...counts[k] })));
  };

  const processStaff = (logs: any[]) => {
    const mentions: any = {};
    logs.forEach(log => {
      const tags = Array.isArray(log.tags) ? log.tags : [];
      tags.forEach((tag: any) => {
        if (tag.entity) {
          if (!mentions[tag.entity]) mentions[tag.entity] = { pos: 0, neg: 0 };
          tag.sentiment === 'pos' ? mentions[tag.entity].pos++ : mentions[tag.entity].neg++;
        }
      });
    });
    setStaffRanking(Object.keys(mentions).map(name => ({ name, ...mentions[name] })));
  };

  const applyBusinessData = (biz: any) => {
    setBizInfo(biz.business_info || '');
    setReplyLang(biz.language || 'es');
    setReplyTone(biz.reply_tone || 'friendly');
    setPromoText(biz.promo_text || '');
    setAutoCoupon(biz.auto_coupon || '');
    setAutoReply5(biz.auto_reply_5_stars ?? true);
    setInterceptorMode(biz.interceptor_mode ?? true);
    setNotifyNegative(biz.notify_negative_reviews ?? true);
    setStaffNames(biz.staff_names?.join(', ') || '');
    const phone = Array.isArray(biz.whatsapp_configs) ? biz.whatsapp_configs[0]?.phone_number : biz.whatsapp_configs?.phone_number;
    setWhatsappNumber(phone || '');
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    setIsSaving(true);
    try {
      const namesArray = staffNames.split(',').map(n => n.trim()).filter(n => n !== '');
      await supabase.from('businesses').update({
        business_info: bizInfo, language: replyLang, reply_tone: replyTone,
        promo_text: promoText, auto_coupon: autoCoupon, staff_names: namesArray,
        auto_reply_5_stars: autoReply5, interceptor_mode: interceptorMode,
        notify_negative_reviews: notifyNegative
      }).eq('id', selectedBusiness.id);
      await supabase.from('whatsapp_configs').upsert({ 
        business_id: selectedBusiness.id, 
        phone_number: whatsappNumber.replace(/\D/g, '') 
      }, { onConflict: 'business_id' });
      alert(replyLang === 'es' ? "Guardado con éxito" : "Salvo com sucesso");
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  // LOGICA DE BACKLOG CON PREVIEW
  const handleBacklogPreview = async () => {
    if (!selectedBusiness) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-history', {
        body: { business_id: selectedBusiness.id, preview_only: true }
      });
      if (error) throw error;
      setPreviewData(data?.pending_reviews || []);
      setShowPreview(true);
    } catch (e) {
      console.error(e);
      alert("Error analizando historial");
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmBacklogSync = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-history', {
        body: { business_id: selectedBusiness.id, execute: true }
      });
      if (error) throw error;
      setShowPreview(false);
      alert(replyLang === 'es' ? "Proceso de respuesta iniciado" : "Processo de resposta iniciado");
      fetchData(authUser);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWidgetCode = () => {
    const code = `<iframe src="https://rankoai.com/widget/${selectedBusiness?.id}" width="100%" height="400" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !authUser) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
      {/* MODAL DE PREVIEW */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><Eye size={18}/></div>
                <h3 className="text-[12px] font-black uppercase italic">{cur.backlogModalTitle}</h3>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {previewData.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-[10px] uppercase font-black italic">No hay reseñas pendientes para este local.</div>
              ) : previewData.map((rev, i) => (
                <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-tighter">Reseña de {rev.reviewer_name}</span>
                    <div className="flex text-amber-400"><Star size={10} fill="currentColor"/> <span className="text-[10px] ml-1 font-bold">{rev.stars}</span></div>
                  </div>
                  <p className="text-[11px] text-slate-300 italic">"{rev.comment || 'Sin comentario'}"</p>
                  <div className="bg-emerald-500/5 border-l-2 border-emerald-500 p-3 rounded-r-xl">
                    <span className="text-[9px] font-black text-emerald-500 uppercase block mb-1">Respuesta sugerida:</span>
                    <p className="text-[11px] text-slate-200 leading-relaxed">{rev.suggested_reply}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-black/40 border-t border-white/5">
              <button 
                onClick={confirmBacklogSync}
                disabled={isSyncing || previewData.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                {cur.backlogConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl"><Zap className="text-white fill-white" size={18} /></div>
            <span className="text-2xl font-black italic uppercase bg-gradient-to-r from-indigo-500 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap pr-4">Ranko AI</span>
          </div>
          <button onClick={logout} className="text-[10px] font-black uppercase text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => setViewMode('single')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${viewMode === 'single' ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-500'}`}>{cur.singleView}</button>
          <button onClick={() => setViewMode('global')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'global' ? 'bg-emerald-600 shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-500'}`}><BarChart3 size={14}/> {cur.globalView}</button>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: cur.replies, val: stats.totalReplies, icon: MessageSquare, color: 'text-indigo-400' },
            { label: cur.rating, val: stats.avgRating, icon: Star, color: 'text-amber-400' },
            { label: cur.happiness, val: `${stats.happiness}%`, icon: Heart, color: 'text-rose-400' },
            { label: cur.saved, val: stats.timeSaved, icon: Clock, color: 'text-emerald-400' }
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] shadow-inner backdrop-blur-sm">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <div className="text-3xl font-black italic tracking-tighter">{s.val}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><LayoutDashboard size={14}/> {cur.businesses}</h3>
              <div className="space-y-2">
                {myBusinesses.map((b) => (
                  <button key={b.id} onClick={() => { setSelectedBusiness(b); applyBusinessData(b); setViewMode('single'); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedBusiness?.id === b.id && viewMode === 'single' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-[1.02]' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'}`}>
                    <span className="text-[11px] font-black uppercase italic truncate block">{b.business_name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2"><Lightbulb size={14}/> {cur.intelligence}</h3>
              <div className="space-y-4">
                {insights.length === 0 ? <p className="text-[10px] uppercase text-slate-600 italic text-center py-4">{cur.emptyInsights}</p> : insights.map((ins, idx) => (
                  <div key={idx} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-300">{ins.topic}</div>
                      <div className="flex gap-1 mt-1">
                        <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${(ins.pos / (ins.pos + ins.neg)) * 40}px` }} />
                        <div className="h-1 rounded-full bg-rose-500" style={{ width: `${(ins.neg / (ins.pos + ins.neg)) * 40}px` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-black italic ${ins.pos >= ins.neg ? 'text-emerald-500' : 'text-rose-500'}`}>{Math.round((ins.pos / (ins.pos + ins.neg)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2"><Users size={14}/> {cur.staffTitle}</h3>
              <div className="space-y-3">
                {staffRanking.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                    <span className="text-[11px] font-black italic uppercase">{s.name}</span>
                    <div className="flex gap-3">
                       <span className="text-emerald-500 text-[10px] font-bold">+{s.pos}</span>
                       <span className="text-rose-500 text-[10px] font-bold">-{s.neg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-2 flex bg-black/40 gap-2 border-b border-white/5 overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: cur.overview, icon: LayoutDashboard },
                { id: 'strategy', label: cur.strategy, icon: ShieldAlert },
                { id: 'growth', label: cur.growth, icon: Zap },
                { id: 'staff', label: cur.staff, icon: Users }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`min-w-fit flex-1 py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  <tab.icon size={14}/> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 overflow-y-auto max-h-[700px] custom-scrollbar">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* COMPACT BACKLOG BANNER (Sin Scroll Lateral) */}
                  <div className="bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/20 p-3 rounded-xl ring-1 ring-emerald-500/30">
                        <Clock className="text-emerald-400" size={20}/>
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase italic text-white tracking-tight leading-none mb-1">{cur.backlogTitle}</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter leading-none">{cur.backlogDesc}</div>
                      </div>
                    </div>
                    <button 
                      onClick={handleBacklogPreview} 
                      disabled={isSyncing} 
                      className="w-full sm:w-auto bg-white text-black px-6 py-3 rounded-xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="animate-spin" size={14}/> : <Play size={14} fill="black"/>}
                      {cur.backlogBtn}
                    </button>
                  </div>

                  {/* WEEKLY REPORT ROW */}
                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/20 p-2.5 rounded-full"><Send className="text-emerald-500" size={16}/></div>
                      <div className="text-left"><div className="text-[10px] font-black uppercase italic">{cur.reportTitle}</div><div className="text-[8px] text-slate-500 uppercase tracking-tighter">{cur.reportDesc}</div></div>
                    </div>
                    <div className="w-10 h-6 bg-emerald-600 rounded-full flex items-center justify-end px-0.5 cursor-not-allowed opacity-50"><div className="w-4 h-4 bg-white rounded-full shadow-lg"/></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500">{cur.alerts}</label><input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500">{cur.lang}</label><select value={replyLang} onChange={(e) => setReplyLang(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none"><option value="es">Español</option><option value="pt">Português</option></select></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500">{cur.tone}</label><select value={replyTone} onChange={(e) => setReplyTone(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none"><option value="friendly">{cur.toneFriendly}</option><option value="professional">{cur.toneProfessional}</option></select></div>
                    <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500">Google Location ID</label><div className="flex gap-2"><input type="text" disabled value={selectedBusiness?.google_location_id || ''} className="flex-1 bg-slate-950/50 border border-white/5 p-4 rounded-xl text-[10px] font-mono text-slate-500" /><div className="bg-white/5 p-4 rounded-xl text-slate-400"><ExternalLink size={14}/></div></div></div>
                  </div>

                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500">{cur.brain}</label><textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} placeholder={cur.placeholderBrain} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs min-h-[140px] outline-none focus:border-emerald-500 transition-all" /></div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 shadow-inner space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="bg-emerald-500/10 p-3 rounded-xl"><CheckCircle className="text-emerald-500" size={24}/></div><div className="text-[12px] font-black uppercase italic">{cur.auto5}</div></div>
                      <button onClick={() => setAutoReply5(!autoReply5)} className={`w-14 h-8 rounded-full relative transition-all ${autoReply5 ? 'bg-emerald-600' : 'bg-slate-800'}`}><div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${autoReply5 ? 'right-1.5' : 'left-1.5'}`} /></button>
                    </div>
                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase text-slate-500">{cur.crisis}</label>
                      <select value={interceptorMode ? 'safe' : 'smart'} onChange={(e) => setInterceptorMode(e.target.value === 'safe')} className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xs font-bold outline-none"><option value="safe">{cur.safe}</option><option value="smart">{cur.smart}</option></select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="space-y-8">
                  <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-inner">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="bg-indigo-500/10 p-3 rounded-xl"><Gift className="text-indigo-400" size={24}/></div><span className="text-[12px] font-black uppercase italic">{cur.fidelization}</span></div><button onClick={() => setAutoCoupon(autoCoupon ? '' : 'Gift')} className={`w-14 h-8 rounded-full relative transition-all ${autoCoupon ? 'bg-indigo-600' : 'bg-slate-800'}`}><div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${autoCoupon ? 'right-1.5' : 'left-1.5'}`} /></button></div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${autoCoupon ? 'opacity-100' : 'opacity-30 grayscale pointer-events-none'}`}>
                      <div className="space-y-4"><label className="text-[10px] font-black uppercase text-slate-500">{cur.prize}</label><input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder={cur.placeholderPrize} className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none" /></div>
                      <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-6 rounded-[2rem] shadow-2xl"><span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 block mb-3">{cur.clientView}</span><h4 className="text-xl font-black italic uppercase mb-1">{promoText || '...'}</h4><p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Valid in {selectedBusiness?.business_name}</p></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center gap-4 shadow-xl">
                      <div className="bg-white p-3 rounded-xl shadow-lg"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent("https://rankoai.com/review/" + selectedBusiness?.id)}`} alt="QR" className="w-24 h-24" /></div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase italic mb-1">{cur.kit}</h4>
                        <p className="text-[9px] text-slate-500 uppercase tracking-tighter mb-4">{cur.kitDesc}</p>
                        <button className="bg-white text-black px-6 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 mx-auto transition-transform active:scale-95"><Download size={12}/> {cur.downloadQr}</button>
                      </div>
                    </div>
                    <div className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 flex flex-col gap-4">
                      <div className="flex items-center gap-3"><Code className="text-indigo-400" size={18}/><div><div className="text-[11px] font-black uppercase italic">{cur.widgetTitle}</div><div className="text-[9px] text-slate-500 uppercase">{cur.widgetDesc}</div></div></div>
                      <div className="bg-black/60 p-4 rounded-xl font-mono text-[9px] text-indigo-300 border border-white/5 relative group h-full">
                        <div className="break-all line-clamp-3">{`<iframe src="https://rankoai.com/widget/${selectedBusiness?.id}" width="100%" height="400" frameborder="0"></iframe>`}</div>
                        <button onClick={copyWidgetCode} className="absolute right-2 top-2 p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
                          {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'staff' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-inner">
                    <div className="flex items-center gap-4"><div className="bg-indigo-500/10 p-3 rounded-xl"><Users className="text-indigo-400" size={24}/></div><span className="text-[12px] font-black uppercase italic tracking-tighter">{cur.staffSectionTitle}</span></div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cur.staffTitle}</label>
                      <textarea value={staffNames} onChange={(e) => setStaffNames(e.target.value)} placeholder={cur.staffPlaceholder} className="w-full bg-slate-950 border border-white/5 p-6 rounded-2xl text-xs min-h-[140px] outline-none focus:border-indigo-500 transition-all" />
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest italic">La IA detectará automáticamente menciones a estos nombres en las reseñas para calificarlos.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM BAR CON BOTÓN DE GUARDAR */}
            <div className="p-6 bg-black border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic">RANKO ENGINE v4.3 // DEPLOYED</span>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full sm:w-auto bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase italic tracking-widest transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={20} />}
                {isSaving ? cur.saving : cur.saveBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}