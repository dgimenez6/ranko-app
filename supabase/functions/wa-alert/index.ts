'use client';

import React, { useState, useEffect, use } from 'react';
import { Star, Send, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

export default function InterceptorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.id;

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [biz, setBiz] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const loadBusinessData = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle();

        if (error) throw error;
        if (data) setBiz(data);
      } catch (err) {
        console.error("Error loading business:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [businessId]);

  const handleRating = (value: number) => {
    setRating(value);
    if (value >= 4) {
      const locationId = biz?.google_location_id?.split('/').pop();
      if (locationId) {
        window.location.href = `https://search.google.com/local/writereview?placeid=${locationId}`;
      } else {
        alert("Google Location ID no configurado.");
      }
    } else {
      setStep(2);
    }
  };

  const submitNegativeFeedback = async () => {
    if (!feedback.trim()) return;

    try {
      const { error } = await supabase.from('interceptions').insert({
        business_id: businessId,
        rating: rating,
        comment: feedback
      });

      if (error) throw error;
      setStep(3);
    } catch (err) {
      alert("Error al enviar el comentario.");
    }
  };

  if (loading || !biz) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">RANKO SECURE LOAD...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center font-sans">
      
      <div className="mb-12">
        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 italic">RANKO AI x REPUTATION</div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{biz.business_name}</h1>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in zoom-in duration-500 max-w-sm w-full">
          <p className="text-lg mb-10 font-medium text-slate-300 italic italic">¿Cómo calificarías tu experiencia hoy?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s} 
                onClick={() => handleRating(s)} 
                className={`p-5 rounded-[1.5rem] transition-all border active:scale-90 ${
                  rating >= s ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 hover:border-white/20'
                }}
              >
                <Star size={28} className={rating >= s ? 'fill-white text-white' : 'text-slate-500'} />
              </button>
            ))}
          </div>
          <p className="mt-10 text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Toca una estrella para comenzar</p>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-6 duration-500">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
            <h2 className="text-xl font-black mb-2 uppercase italic tracking-tight text-white">Queremos escucharte</h2>
            <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-bold">Tu opinión va directo a la gerencia</p>
            
            <textarea 
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-sm mb-6 outline-none focus:border-indigo-500 transition-all h-40 resize-none text-white"
              placeholder="Contanos qué falló..."
            />
            
            <button 
              onClick={submitNegativeFeedback} 
              disabled={!feedback.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-slate-950 py-6 rounded-2xl font-black italic uppercase flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/20"
            >
              ENVIAR COMENTARIO PRIVADO <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in zoom-in duration-700 max-w-sm w-full text-center">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-12">
            <Zap size={48} className="fill-emerald-400" />
          </div>
          <h2 className="text-3xl font-black mb-4 italic uppercase tracking-tighter text-white">¡Gracias por avisarnos!</h2>
          <p className="text-slate-400 mb-10 text-sm leading-relaxed px-4">Tu mensaje fue notificado al equipo. Como atención especial por tu tiempo:</p>
          
          <div className="relative p-10 bg-slate-900 border border-white/10 rounded-[2.5rem] font-black italic shadow-2xl">
            <p className="text-[10px] uppercase text-indigo-400 tracking-[0.2em] mb-3">Tu Beneficio:</p>
            <p className="text-3xl uppercase tracking-tighter text-white">{biz.auto_coupon || 'Cortesía de la Casa'}</p>
          </div>
          
          <p className="mt-12 text-[10px] text-slate-600 uppercase font-black tracking-[0.3em] italic">Menciona esta pantalla al pagar</p>
        </div>
      )}

      <div className="fixed bottom-10 left-0 w-full text-center">
        <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">Powered by Ranko AI Reputation Defense</p>
      </div>
    </div>
  );
}