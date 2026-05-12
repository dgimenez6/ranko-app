'use client';

import React, { useState, useEffect } from 'react';
import { Star, Send, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // Ajustá esta ruta si tu archivo está en otro lado

export default function InterceptorPage() {
  const [biz, setBiz] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // 1. Extraemos el ID de la URL físicamente
    const pathSegments = window.location.pathname.split('/');
    const rawId = pathSegments[pathSegments.length - 1];
    
    // 2. VALIDACIÓN DE HIERRO: Si no es un UUID real, no llamamos a Supabase
    // Esto evita que mandes "undefined" o "review" y te tire el error 400
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!rawId || !uuidRegex.test(rawId)) {
      console.log("Esperando UUID válido... Detectado:", rawId);
      return;
    }

    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, business_name, google_location_id, auto_coupon')
          .eq('id', rawId)
          .maybeSingle();
        
        if (error) throw error;
        if (data) setBiz(data);
      } catch (err) {
        console.error("Error en query:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRating = (val: number) => {
    setRating(val);
    if (val >= 4) {
      const loc = biz.google_location_id?.split('/').pop();
      if (loc) window.location.href = `https://search.google.com/local/writereview?placeid=${loc}`;
    } else {
      setStep(2);
    }
  };

  const submit = async () => {
    if (!feedback.trim() || !biz?.id) return;
    try {
      const { error } = await supabase.from('interceptions').insert({
        business_id: biz.id,
        rating: rating,
        comment: feedback
      });
      if (error) throw error;
      setStep(3);
    } catch (e) {
      alert("Error al enviar el feedback");
    }
  };

  if (loading || !biz) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center font-sans">
      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 italic">RANKO AI x DEFENSE</div>
      <h1 className="text-3xl font-black mb-12 uppercase italic tracking-tighter text-center leading-none">
        {biz.business_name}
      </h1>
      
      {step === 1 && (
        <div className="flex gap-3 animate-in fade-in zoom-in duration-500">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => handleRating(s)} className="p-5 bg-white/5 border border-white/10 rounded-2xl transition-all active:scale-90">
              <Star size={28} className={rating >= s ? "fill-white text-white" : "text-slate-600"} />
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-6">
          <textarea 
            className="w-full bg-slate-900 border border-white/10 p-6 rounded-3xl mb-4 h-40 text-sm outline-none focus:border-indigo-400 transition-all text-white"
            placeholder="¿Qué podemos mejorar?"
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button onClick={submit} className="w-full bg-indigo-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic">
            ENVIAR COMENTARIO PRIVADO
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center animate-in zoom-in">
          <Zap className="mx-auto mb-6 text-emerald-400 fill-emerald-400" size={56} />
          <h2 className="text-2xl font-black uppercase italic">¡Gracias por avisarnos!</h2>
          <div className="mt-8 p-10 bg-slate-900 border border-white/10 rounded-[2.5rem]">
            <p className="text-[10px] uppercase text-indigo-400 mb-2 font-bold tracking-widest">Tu atención especial:</p>
            <p className="text-2xl font-black uppercase tracking-tighter">{biz.auto_coupon || 'Cortesía de la Casa'}</p>
          </div>
        </div>
      )}
    </div>
  );
}