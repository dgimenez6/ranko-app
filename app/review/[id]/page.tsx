'use client';
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

export default function InterceptorPage({ params }: { params: { id: string } }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [biz, setBiz] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: Rating, 2: Feedback/Redirección

  useEffect(() => {
    // Buscamos la info del local para el branding y el link de Google
    supabase.from('businesses').select('*').eq('id', params.id).single()
   .then(({ data }: { data: any }) => setBiz(data));
  }, [params.id]);

  const handleRating = (value: number) => {
    setRating(value);
    if (value >= 4) {
      // SI ES BUENA: Lo mandamos a Google Maps (Extraemos el ID del string de la DB)
      const locationId = biz.google_location_id?.split('/').pop();
      window.location.href = `https://search.google.com/local/writereview?placeid=${locationId}`;
    } else {
      // SI ES MALA: Vamos al paso de "Amortiguador"
      setStep(2);
    }
  };

  const submitNegative = async () => {
    // Guardamos la queja internamente
    await supabase.from('interceptions').insert({
      business_id: params.id,
      rating,
      comment: feedback
    });
    setStep(3); // Paso final de agradecimiento + cupón
  };

  if (!biz) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">RANKO AI x {biz.business_name}</h1>
      
      {step === 1 && (
        <div className="animate-in fade-in duration-500">
          <p className="text-lg mb-8 font-medium">¿Cómo fue tu experiencia hoy?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => handleRating(s)} className="p-4 bg-white/5 rounded-2xl hover:bg-indigo-500 transition-all border border-white/10">
                <Star size={32} className={rating >= s ? 'fill-white' : ''} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-4">
          <p className="text-indigo-400 font-bold mb-4 uppercase text-xs tracking-widest">Lo sentimos mucho</p>
          <h2 className="text-xl font-black mb-6">Queremos compensarte. ¿Qué falló?</h2>
          <textarea 
            value={feedback} 
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-sm mb-6 outline-none focus:border-indigo-500 h-32"
            placeholder="Comida fría, mala atención..."
          />
          <button onClick={submitNegative} className="w-full bg-indigo-500 py-5 rounded-2xl font-black italic uppercase flex items-center justify-center gap-3">
            ENVIAR AL ENCARGADO <Send size={18} />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="fill-emerald-400" />
          </div>
          <h2 className="text-2xl font-black mb-4 italic uppercase">¡Gracias por avisarnos!</h2>
          <p className="text-slate-400 mb-8 text-sm">Tu mensaje llegó directo al dueño. Como disculpa, queremos ofrecerte esto:</p>
          <div className="p-8 bg-indigo-500 text-slate-950 rounded-[2rem] font-black italic">
            <p className="text-xs uppercase opacity-70">Tu Cupón VIP:</p>
            <p className="text-3xl mt-2">{biz.auto_coupon || 'Café de Cortesía'}</p>
          </div>
          <p className="mt-8 text-[10px] text-slate-600 uppercase font-bold tracking-widest">Mostrá esta pantalla al pagar</p>
        </div>
      )}
    </div>
  );
}