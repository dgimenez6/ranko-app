'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Mail, Shield, RefreshCw, Cpu, Star, CornerDownRight, Globe } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Diccionario de traducciones para Español y Portugués
const translations = {
  es: {
    access: "Access Platform",
    engine: "Motor Autónomo Activo",
    heroTitle1: "Blind Your",
    heroTitle2: "Reputation.",
    heroSub: "Automatización de respuestas críticas para Google Business Profile. Mitigá el impacto de reseñas negativas de forma inteligente y en tiempo real.",
    cta: "Deploy AI Defense",
    previewTag: "Vista Previa de Interfaz",
    reviewerName: "Carlos M.",
    reviewText: "El producto llegó con demoras y la atención en el local de Palermo dejó bastante que desear. Espero una solución.",
    iaAgent: "Agente Autónomo Ranko AI",
    iaReply: "\"Hola Carlos. Lamentamos sinceramente la demora y que tu experiencia en nuestra sucursal de Palermo no haya sido la óptima. Tomamos tu reporte de inmediato para auditar el proceso de entrega. Nos pondremos en contacto contigo por privado para brindarte una solución prioritaria.\"",
    capabilities: "Arquitectura y Capacidades",
    card1Title: "1. Integración OAuth",
    card1Desc: "Vinculación segura y transparente mediante la API oficial de Google Business Profile. Sin almacenar credenciales críticas.",
    card2Title: "2. Sincronización Histórica",
    card2Desc: "Análisis automático de tus reseñas históricas. Sincronización continua en segundo plano mediante Webhooks optimizados.",
    card3Title: "3. Respuesta Activa IA",
    card3Desc: "Clasificación inteligente y generación de respuestas automatizadas adaptadas a la política de comunicación de tu marca.",
    footerDesc: "Ranko AI utiliza los servicios de la API oficial de Google Business Profile para la lectura y gestión automatizada de reseñas bajo autorización del comercio. Desarrollado por Ranko AI Tech Ltd.",
    support: "Soporte",
    legal: "Legal"
  },
  pt: {
    access: "Acessar Plataforma",
    engine: "Motor Autónomo Ativo",
    heroTitle1: "Blind Your",
    heroTitle2: "Reputation.",
    heroSub: "Automatização de respostas críticas para o Google Business Profile. Mitigue o impacto de avaliações negativas de forma inteligente e em tempo real.",
    cta: "Deploy AI Defense",
    previewTag: "Visualização da Interface",
    reviewerName: "Carlos M.",
    reviewText: "O produto chegou com atraso e o atendimento na loja de Palermo deixou a desejar. Espero uma solução.",
    iaAgent: "Agente Autónomo Ranko AI",
    iaReply: "\"Olá Carlos. Lamentamos sinceramente o atraso e que sua experiência em nossa filial de Palermo não tenha sido a ideal. Registramos seu relatório imediatamente para auditar o processo de entrega. Entraremos em contato em privado para oferecer uma solução prioritária.\"",
    capabilities: "Arquitetura e Recursos",
    card1Title: "1. Integração OAuth",
    card1Desc: "Vínculo seguro e transparente através da API oficial do Google Business Profile. Sem armazenar credenciais críticas.",
    card2Title: "2. Sincronização Histórica",
    card2Desc: "Análise automática de suas avaliações históricas. Sincronização contínua em segundo plano via Webhooks otimizados.",
    card3Title: "3. Resposta Ativa IA",
    card3Desc: "Classificação inteligente e geração de respostas automatizadas adaptadas à política de comunicação da sua marca.",
    footerDesc: "O Ranko AI utiliza os serviços da API oficial do Google Business Profile para a leitura e gestão automatizada de avaliações sob autorização do comércio. Desenvolvido por Ranko AI Tech Ltd.",
    support: "Suporte",
    legal: "Legal"
  }
};

export default function LandingPage() {
  const { loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const [lang, setLang] = useState<'es' | 'pt'>('es');

  // Si el usuario ya está logueado, lo mandamos directo al dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* Efectos de luces de fondo sutiles */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-6 z-10 relative">
        <div className="flex items-center justify-center min-w-fit">
          <span className="inline-block text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent pr-8">
            Ranko AI
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Selector de Idioma Esmeralda */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button 
              onClick={() => setLang('es')} 
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${lang === 'es' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ES
            </button>
            <button 
              onClick={() => setLang('pt')} 
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${lang === 'pt' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              PT
            </button>
          </div>

          <button 
            onClick={loginWithGoogle} 
            className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 text-slate-300 hover:text-white"
          >
            {t.access}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 pt-12 pb-24 text-center z-10 relative">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">{t.engine}</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
          {t.heroTitle1} <br/>
          <span className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t.heroTitle2}</span>
        </h1>

        <p className="max-w-xl text-slate-400 text-xs md:text-sm uppercase tracking-wide leading-relaxed mb-12 font-medium">
          {t.heroSub}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center mb-24">
          <button 
            onClick={loginWithGoogle}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300 flex items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98]"
          >
            {t.cta} <ArrowRight size={14} className="group hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Mockup Interactivo de la Interfaz */}
        <div className="w-full max-w-3xl border border-white/5 bg-slate-950/40 rounded-2xl p-6 backdrop-blur-md text-left mb-32 relative shadow-2xl">
          <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest text-indigo-400">
            {t.previewTag}
          </div>
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest ml-2">reputation-interceptor.sys</span>
          </div>
          
          <div className="space-y-4">
            {/* Review Simulado */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wide">{t.reviewerName}</h5>
                  <div className="flex gap-0.5 text-amber-500 my-1">
                    <Star size={10} fill="currentColor" />
                    <Star size={10} fill="currentColor" />
                    <Star size={10} />
                    <Star size={10} />
                    <Star size={10} />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500">LIVE</span>
              </div>
              <p className="text-[11px] text-slate-400">{t.reviewText}</p>
            </div>

            {/* Respuesta Automática */}
            <div className="pl-6 border-l-2 border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                <CornerDownRight size={12} /> {t.iaAgent}
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-[11px] text-slate-300 leading-relaxed italic">
                {t.iaReply}
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Arquitectura / Capacidades */}
        <div className="w-full max-w-4xl text-left border-t border-white/5 pt-16">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-12 text-center md:text-left">
            {t.capabilities}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors group relative">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6 group-hover:scale-105 transition-transform">
                <Shield size={16} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest mb-3">{t.card1Title}</h4>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide leading-relaxed">
                {t.card1Desc}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors group relative">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 mb-6 group-hover:scale-105 transition-transform">
                <RefreshCw size={16} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest mb-3">{t.card2Title}</h4>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide leading-relaxed">
                {t.card2Desc}
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors group relative">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-6 group-hover:scale-105 transition-transform">
                <Cpu size={16} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest mb-3">{t.card3Title}</h4>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide leading-relaxed">
                {t.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Bilingüe */}
      <footer className="border-t border-white/5 bg-slate-950/60 backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left items-start">
          <div className="space-y-4">
            <div className="text-xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-indigo-500 to-emerald-400 bg-clip-text text-transparent pr-8">
              Ranko AI
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed italic">
              Active Reputation Defense.
            </p>
            {/* Texto de Compliance de la API */}
            <p className="text-[9px] text-slate-600 uppercase tracking-wider leading-relaxed pt-2 max-w-sm font-medium">
              {t.footerDesc}
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.support}</h4>
            <a 
              href="mailto:support@rankoai.com" 
              className="flex items-center justify-center md:justify-start gap-3 text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase"
            >
              <Mail size={16}/> support@rankoai.com
            </a>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.legal}</h4>
            <div className="flex flex-col gap-3">
              <Link href="/terms" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors uppercase italic">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}