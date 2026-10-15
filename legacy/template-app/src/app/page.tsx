"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, ArrowUpRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function Home() {
  const nombreNegocio = "{{NOMBRE_NEGOCIO}}";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Fondo Glow de Gradiente Interactivo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/20 via-indigo-500/10 to-transparent blur-[140px] pointer-events-none" />

      {/* Navbar Minimalista */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <span className="text-sm font-bold tracking-widest uppercase text-emerald-400">
          {nombreNegocio}
        </span>
        <a
          href="#contacto"
          className="text-xs uppercase tracking-widest border border-slate-800 bg-slate-900/50 backdrop-blur-md px-5 py-2.5 rounded-full hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
        >
          Contacto
        </a>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-32 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-8 backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Experiencia Digital Exclusiva</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-none"
        >
          {nombreNegocio}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-2xl text-slate-400 font-light max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Elevando el estándar de presencia digital con diseño moderno, velocidad extrema e interacción fluida.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <a
            href={`https://wa.me/?text=Hola!%20Vi%20el%20sitio%20de%20${encodeURIComponent(nombreNegocio)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-1"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Consultar por WhatsApp</span>
          </a>
        </motion.div>
      </section>

      {/* Cards de Características con Microinteracciones */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl hover:border-emerald-500/40 transition-all"
          >
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Diseño Premium</h3>
            <p className="text-slate-400 leading-relaxed">
              Interfaces ultra-limpias optimizadas para destacar sobre la competencia y maximizar las conversiones de clientes.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl hover:border-indigo-500/40 transition-all"
          >
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Rendimiento Extremo</h3>
            <p className="text-slate-400 leading-relaxed">
              Tiempos de carga instantáneos e interacciones animadas diseñadas bajo las últimas tendencias internacionales.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 text-center text-xs text-slate-500 uppercase tracking-widest">
        Prototipo de vanguardia diseñado para {nombreNegocio}
      </footer>
    </main>
  );
}