import { supabase } from '@/lib/supabase/client';

export default async function WidgetPage({ params }: { params: { id: string } }) {
  // Traemos las mejores 5 reseñas del negocio
  const { data: reviews } = await supabase
    .from('reviews_logs')
    .select('*')
    .eq('business_id', params.id)
    .gte('stars', 4)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="bg-slate-950 p-4 font-sans text-white border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">Ranko AI Verified</span>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => <span key={i} className="text-emerald-500 text-xs">★</span>)}
        </div>
      </div>
      
      <div className="space-y-3">
        {reviews.map((rev) => (
          <div key={rev.id} className="bg-white/5 p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1 mb-2">
              {[...Array(rev.stars)].map((_, i) => (
                <span key={i} className="text-emerald-400 text-[10px]">★</span>
              ))}
            </div>
            <p className="text-[11px] text-slate-300 italic leading-relaxed">
              "{rev.comment || 'Excelente servicio'}"
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <a href={`https://rankoai.com/review/${params.id}`} target="_blank" className="text-[9px] font-black uppercase text-slate-500 hover:text-emerald-400 transition-colors">
          Dejá tu reseña →
        </a>
      </div>
    </div>
  );
}