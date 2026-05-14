'use client';

import React from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-emerald-500/30">
      <nav className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center justify-center min-w-fit">
          <span className="inline-block text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap pr-8">
            Ranko AI
          </span>
        </div>
        <button onClick={loginWithGoogle} className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Login</button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto space-y-12 pb-20">
        <h1 className="text-5xl md:text-9xl font-black italic tracking-tighter leading-[0.85] uppercase animate-in slide-in-from-bottom-8 duration-700">
          BLIND YOUR REPUTATION
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm md:text-base leading-relaxed uppercase tracking-widest font-medium opacity-80">
          El primer sistema de defensa activa para Google Maps. Interceptá reseñas negativas y automatizá tu hospitalidad a escala.
        </p>
        <button onClick={loginWithGoogle} className="group relative bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] flex items-center gap-4 active:scale-95">
          COMENZAR AHORA <ArrowRight className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>

      <footer className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center md:text-left">
          <div className="space-y-6">
            <div className="inline-block text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap pr-8">Ranko AI</div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed italic">Active Reputation Defense.</p>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support</h4>
            <a href="mailto:support@rankoai.com" className="flex items-center justify-center md:justify-start gap-3 text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase"><Mail size={16}/> support@rankoai.com</a>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal</h4>
            <div className="flex flex-col gap-3">
              <Link href="/terms" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">Terms of Service</Link>
              <Link href="/privacy" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}