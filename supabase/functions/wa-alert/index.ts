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
  const [error, setError] = useState(false);

  useEffect(() => {
    // 1. Extraemos el ID de la URL manualmente
    const pathSegments = window.location.pathname.split('/');
    const extractedId = pathSegments[pathSegments.length - 1];

    // 2. VALIDACIÓN CRÍTICA: Solo procedemos si el ID parece un UUID (36 caracteres)
    if (!extractedId || extractedId.length < 30 || extractedId === 'undefined') {
      console.log("ID no detectado todavía...");
      return;
    }

    const loadBusinessData = async () => {
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', extractedId)
          .maybeSingle();

        if (dbError) throw dbError;
        
        if (data) {
          setBiz(data);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error cargando negocio:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, []);

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
    if (!feedback.trim() || !biz?.id) return;

    try {
      const { error: insertError } = await supabase.from('interceptions').insert({
        business_id: biz.id,
        rating: rating,
        comment: feedback
      });

      if (insertError) throw insertError;
      setStep(3);
    } catch (err) {
      alert("Error al enviar el comentario.");
    }
  };

  // 3. ESTADOS DE CARGA Y ERROR PARA EL DUEÑO
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-4">⚠️</div>
        <h2 className="text-xl font-black uppercase italic">Enlace Inválido</h2>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Asegurate de que el ID en la URL sea el correcto.</p>
      </div>
    );
  }

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
        <div className="animate-in fade-in duration-500 max-w-sm w-full">
          <p className="text-lg mb-10 font-medium text-slate-300 italic italic">¿Cómo fue tu experiencia hoy?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s} 
                onClick={() => handleRating(s)} 
                className={`p-5 rounded-[1.5rem] transition-all border ${
                  rating >= s ? 'bg-indigo-500 border-indigo-400' : 'bg-white/5 border-white/10'
                }`}
              >
                <Star size={28} className={rating >= s ? 'fill-white text-white' : 'text-slate-500'} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h2 className="text-xl font-black mb-6 uppercase italic text-white">Queremos escucharte</h2>
            <textarea 
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-sm mb-6 outline-none focus:border-indigo-500 h-40 text-white resize-none"
              placeholder="Contanos qué podemos mejorar..."
            />
            <button 
              onClick={submitNegativeFeedback} 
              disabled={!feedback.trim()}
              className="w-full bg-indigo-500 text-slate-950 py-6 rounded-2xl font-black italic uppercase transition-all hover:bg-indigo-400 disabled:opacity-50"
            >
              ENVIAR COMENTARIO PRIVADO
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in zoom-in duration-700 max-w-sm w-full">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Zap size={40} className="fill-emerald-400" />
          </div>
          <h2 className="text-2xl font-black mb-4 italic uppercase text-white">¡Gracias por avisarnos!</h2>
          <div className="p-10 bg-slate-900 border border-white/10 rounded-[2.5rem] font-black italic">
            <p className="text-[10px] uppercase text-indigo-400 tracking-widest mb-3">Como atención especial:</p>
            <p className="text-2xl text-white uppercase">{biz.auto_coupon || 'Cortesía de la Casa'}</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-10 left-0 w-full text-center">
        <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">Powered by Ranko AI Reputation Defense</p>
      </div>
    </div>
  );
}