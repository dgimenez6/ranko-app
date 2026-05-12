'use client';

import React, { useState, useEffect } from 'react';
import { Star, Zap, Loader2, MessageSquare, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function InterceptorPage() {
  const [biz, setBiz] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const rawId = pathSegments[pathSegments.length - 1];
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!rawId || !uuidRegex.test(rawId)) {
      console.log("Esperando un UUID válido... Detectado:", rawId);
      return; 
    }

    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, business_name, google_location_id, auto_coupon, country_code')
          .eq('id', rawId)
          .maybeSingle();

        if (error) throw error;
        setBiz(data);
      } catch (err) {
        console.error("Error loading biz:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await supabase.from('reviews_logs').insert({
        business_id: biz.id,
        stars: rating,
        review_text: feedback,
        status: 'intercepted'
      });
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="text-indigo-500 animate-spin" size={40} />
    </div>
  );

  if (!biz) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-6 pt-20 font-sans selection:bg-indigo-500/30">
      
      {/* Header del Negocio */}
      <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 italic">
          {biz.business_name}
        </h1>
        {/* AJUSTE DINÁMICO: Detecta país para evitar ciudades fijas erróneas */}
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest italic">
          {biz.country_code === 'BR' ? 'Brasil' : 'Argentina'}
        </p>
      </div>

      {step === 1 && (
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold uppercase italic tracking-tight">¿Cómo fue tu experiencia?</h2>
            <p className="text-slate-400 text-sm">Tu opinión nos ayuda a mejorar cada día.</p>
          </div>
          
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s}
                onClick={() => {
                  if (s >= 4) {
                    window.location.href = `https://search.google.com/local/writereview?placeid=${biz.google_location_id}`;
                  } else {
                    setRating(s);
                    setStep(2);
                  }
                }}
                className="w-14 h-20 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-90 hover:bg-white/10 hover:border-indigo-500/50 group"
              >
                <Star size={24} className={rating >= s ? "fill-white text-white" : "text-slate-600 group-hover:text-slate-400 transition-colors"} />
                <span className="text-[10px] font-black text-slate-500 italic">{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-6 duration-500">
          <div className="bg-slate-900/50 border border-white/10 p-2 rounded-[2rem] backdrop-blur-xl">
            <textarea 
              className="w-full bg-transparent border-none p-6 rounded-3xl h-40 text-sm outline-none focus:ring-0 text-white placeholder:text-slate-600 resize-none"
              placeholder="¿Qué podemos mejorar?"
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button 
              onClick={submit} 
              disabled={isSubmitting}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-slate-950 py-5 rounded-[1.5rem] font-black uppercase italic transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (
                <>
                  ENVIAR COMENTARIO PRIVADO
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center animate-in zoom-in duration-700 max-w-sm">
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
            <Zap className="relative text-emerald-400 fill-emerald-400" size={64} />
          </div>
          <h2 className="text-3xl font-black uppercase italic mb-4 tracking-tighter">¡Gracias por avisarnos!</h2>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed">
            Ya notificamos al encargado. Tu feedback nos permite mejorar el servicio de inmediato.
          </p>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative p-10 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl">
              <p className="text-[10px] uppercase text-indigo-400 mb-2 font-black tracking-[0.3em] italic">Cortesía de la Casa:</p>
              <p className="text-3xl font-black uppercase tracking-tighter text-white">
                {biz.auto_coupon || 'Special Gift'}
              </p>
            </div>
          </div>
          
          <p className="mt-8 text-[10px] text-slate-600 uppercase font-bold tracking-widest">Presentá esta pantalla en el local</p>
        </div>
      )}

      {/* Footer minimalista */}
      <div className="fixed bottom-8 opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2">
        <div className="h-[1px] w-4 bg-slate-500"></div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Ranko AI Protection</p>
        <div className="h-[1px] w-4 bg-slate-500"></div>
      </div>

    </div>
  );
}