'use client';

import React, { useState, useEffect } from 'react';
import { Star, Send, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

export default function InterceptorPage() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [biz, setBiz] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);

  // 1. EXTRAER EL ID DIRECTAMENTE DE LA URL (A prueba de errores de Next.js)
  useEffect(() => {
    const path = window.location.pathname;
    const extractedId = path.split('/').pop();
    if (extractedId) setId(extractedId);
  }, []);

  // 2. CARGAR DATOS SOLO CUANDO EL ID ES REAL
  useEffect(() => {
    if (!id || id === 'review' || id === 'undefined') return;

    const loadBusinessData = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
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
  }, [id]);

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
    if (!feedback.trim() || !id) return;

    try {
      const { error } = await supabase.from('interceptions').insert({
        business_id: id,
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
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="mb-12">
        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 italic">RANKO AI x REPUTATION</div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{biz.business_name}</h1>
      </div>

      {step === 1 && (
        <div className="max-w-sm w-full">
          <p className="text-lg mb-10 font-medium text-slate-300 italic">¿Cómo calificarías tu experiencia hoy?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s} 
                onClick={() => handleRating(s)} 
                className={`p-5 rounded-[1.5rem] transition-all border active:scale-90 ${
                  rating >= s ? 'bg-indigo-500 border-indigo-400 shadow-lg' : 'bg-white/5 border-white/10'
                }`}
              >
                <Star size={28} className={rating >= s ? 'fill-white text-white' : 'text-slate-500'} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h2 className="text-xl font-black mb-2 uppercase italic text-white text-center">Queremos escucharte</h2>
            <textarea 
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-sm mb-6 outline-none focus:border-indigo-500 h-40 text-white"
              placeholder="Contanos qué falló..."
            />
            <button 
              onClick={submitNegativeFeedback} 
              className="w-full bg-indigo-500 text-slate-950 py-6 rounded-2xl font-black italic uppercase"
            >
              ENVIAR COMENTARIO PRIVADO
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-sm w-full">
          <Zap size={48} className="mx-auto mb-8 text-emerald-400" />
          <h2 className="text-3xl font-black mb-4 italic uppercase text-white">¡Gracias!</h2>
          <div className="p-10 bg-slate-900 border border-white/10 rounded-[2.5rem] font-black italic">
            <p className="text-3xl text-white uppercase">{biz.auto_coupon || 'Cortesía de la Casa'}</p>
          </div>
        </div>
      )}
    </div>
  );
}