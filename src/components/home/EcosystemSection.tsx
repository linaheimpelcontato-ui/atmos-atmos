import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Shield, Clock, Layers, Zap, Heart } from "lucide-react";

const ecosystemItems = [
  {
    title: "Curadoria de Elite",
    description: "Filtramos o que há de melhor. Apenas 15% das hospedagens e experiências da Chapada passam pelo critério ATMOS.",
    icon: CheckCircle,
    color: "bg-emerald-500/10 text-emerald-600"
  },
  {
    title: "Segurança 24/7",
    description: "Suporte em tempo real. De seguros específicos para trilhas a assistência imediata em qualquer imprevisto.",
    icon: Shield,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Logística Inteligente",
    description: "4x4 exclusivos, guias bilingues e roteiros otimizados pelo sol e clima. Você não perde tempo em filas ou caminhos errados.",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    title: "Solução 360º",
    description: "Hospedagem, guia, alimentação e transporte. Um único ponto de contato para toda a sua jornada.",
    icon: Layers,
    color: "bg-violet-500/10 text-violet-600"
  },
  {
    title: "Acesso Exclusivo",
    description: "Locais secretos e experiências fora do mapa turístico tradicional que só nossa rede local acessa.",
    icon: Zap,
    color: "bg-orange-500/10 text-orange-600"
  },
  {
    title: "Respeito ao Local",
    description: "Trabalhamos com a comunidade. Seu investimento fomenta a preservação e a economia circular da Chapada.",
    icon: Heart,
    color: "bg-rose-500/10 text-rose-600"
  }
];

export default function EcosystemSection() {
  return (
    <section className="py-32 bg-[#FAF9F6] relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#566952]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#2C3E2D]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center mb-24">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#566952] uppercase tracking-[0.4em] text-xs font-bold mb-6 block"
          >
            Ecossistema Atmos
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#2C3E2D] font-display text-4xl md:text-6xl leading-tight mb-8"
          >
            A inteligência <span className="font-light">por trás da sua jornada.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[#2C3E2D]/60 text-lg md:text-xl font-sans font-light max-w-2xl leading-relaxed"
          >
            Não somos apenas uma plataforma ou agência. Somos um ecossistema 360º que integra tecnologia, logística local e curadoria afetiva.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ecosystemItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(44,62,45,0.05)] border border-[#2C3E2D]/5 hover:border-[#566952]/20 transition-all duration-500"
            >
              <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <item.icon className="w-7 h-7" />
              </div>

              <h3 className="text-[#2C3E2D] text-xl font-display mb-4 group-hover:text-[#566952] transition-colors">
                {item.title}
              </h3>

              <p className="text-[#2C3E2D]/60 text-sm font-sans font-light leading-relaxed">
                {item.description}
              </p>

              {/* Subtle hover indicator */}
              <div className="mt-8 h-1 w-0 bg-[#566952]/30 group-hover:w-full transition-all duration-700 rounded-full" />
            </motion.div>
          ))}
        </div>

        {/* Floating Call-to-Value */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-24 p-12 rounded-[40px] bg-[#2C3E2D] text-[#FAF9F6] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
            <div>
              <h3 className="text-3xl md:text-4xl font-display mb-4">Por que a ATMOS é 360º?</h3>
              <p className="text-white/60 font-sans font-light max-w-xl text-lg">
                Porque resolvemos da curadoria à segurança. Sua única preocupação é estar presente em cada momento. O resto, nós garantimos.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-white mb-2">100%</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">Suporte Local</span>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" />
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-white mb-2">0</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">Preocupações</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
