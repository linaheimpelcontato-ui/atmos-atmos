import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { storageUrl } from "@/lib/storage";
import {
  Heart,
  Eye,
  Trees,
  Handshake,
  Aperture,
  HeartHandshake,
  Sprout,
  Mountain,
  Zap,
  Lightbulb,
  Fingerprint
} from "lucide-react";

const differentials = [
  {
    title: "Curadoria 360º",
    description: "Do planejamento à vivência, a ATMOS cuida de cada detalhe da jornada.",
    image: storageUrl("home/Curadoria360.png"),
    color: "bg-[#744404]/10 text-[#744404]"
  },
  {
    title: "Rede de Parceiros",
    description: "Parceiros locais escolhidos a dedo: hospedagens, restaurantes e experiências.",
    image: storageUrl("home/RedeParceiros.png"),
    color: "bg-[#566952]/10 text-[#566952]"
  },
  {
    title: "Conteúdo e Estética",
    description: "Uma marca que traduz o Cerrado com olhar cinematográfico e autêntico.",
    image: storageUrl("home/ConteudoEstetica.png"),
    color: "bg-[#2C3E2D]/10 text-[#2C3E2D]"
  },
  {
    title: "Atendimento",
    description: "Atendimento bilíngue com suporte real e presente do início ao fim da viagem.",
    image: storageUrl("home/Atendimentoatmos.png"),
    color: "bg-[#8d7b63]/10 text-[#8d7b63]"
  },
  {
    title: "Sustentabilidade Local",
    description: "Valorizamos a economy da Chapada e os produtores regionais.",
    image: storageUrl("home/SustentabilidadeLocal.png"),
    color: "bg-[#1f2c17]/10 text-[#1f2c17]"
  },
  {
    title: "Experiências com Propósito",
    description: "Mais do que passeios, vivências transformadoras que te conectam com o território.",
    image: storageUrl("home/ExperienciasComProposito.png"),
    color: "bg-[#2e2019]/10 text-[#2e2019]"
  }
];

const pillars = [
  {
    id: "acao",
    title: "AÇÃO",
    description: "Vivências participativas que convidam o turista a agir, interagir e se integrar à cultura e à comunidade.",
    image: "/assets/home/Acao.png",
    scale: 1.4,
    bg: "bg-[#744404]",
    textColor: "text-white"
  },
  {
    id: "pensamento",
    title: "PENSAMENTO",
    description: "Propostas que estimulam a criatividade, o aprendizado e novas formas de olhar o mundo.",
    image: "/assets/home/Pensamento.png",
    scale: 1.2,
    bg: "bg-[#8d7b63]",
    textColor: "text-white"
  },
  {
    id: "identificacao",
    title: "IDENTIFICAÇÃO",
    description: "Experiências pessoais e autênticas, nas quais o viajante se reconhece no território e em suas histórias.",
    image: "/assets/home/Identificacao.png",
    scale: 1.3,
    bg: "bg-[#566952]",
    textColor: "text-white"
  },
  {
    id: "atendimento",
    title: "ATENDIMENTO",
    description: "Atividades que despertam afeto e empatia, criando laços entre o visitante, o destino e as pessoas locais.",
    image: "/assets/home/Atendimentoatmos.png",
    scale: 0.7,
    bg: "bg-[#1f2c17]",
    textColor: "text-white"
  },
  {
    id: "sentido",
    title: "SENTIDO",
    description: "Experiências que envolvem os cinco sentidos (visão, audição, tato, paladar, olfato) gerando encantamento e presença.",
    image: "/assets/home/Sentido.png",
    scale: 1.0,
    bg: "bg-[#2e2019]",
    textColor: "text-white"
  }
];

export default function ExperienceEcosystem() {
  const quoteRef = useRef(null);
  const isQuoteInView = useInView(quoteRef, { amount: 0.2, once: true });

  return (
    <div className="bg-[#FAF9F6]">
      {/* SECTION 1: EXCLUSIVIDADE ATMOS */}
      <section className="relative py-40 overflow-hidden min-h-[70vh] flex items-center bg-[#141C15]">
        {/* Background Image specifically for this section */}
        <div className="absolute inset-0 z-0">
          <img
            src={storageUrl("home/exclusividade-rocks.jpg")}
            alt="Exclusividade Atmos Background"
            className="w-full h-full object-cover opacity-50 brightness-[0.35] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#141C15]/50 via-transparent to-[#141C15]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-white">
          <div className="text-center mb-24">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[#A88B4C] uppercase tracking-[0.6em] text-[10px] font-bold mb-6 block"
            >
              Curadoria de Experiências
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white font-display text-4xl md:text-6xl leading-tight"
            >
              Diferenciais <span className="italic font-extralight text-[#E4DBCC]">Atmos</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16 items-center">
            {/* Left Column */}
            <div className="space-y-12 md:space-y-20">
              {differentials.slice(0, 3).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col md:flex-row items-center md:items-start gap-6 group text-center md:text-left"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 transition-all group-hover:bg-[#A88B4C] group-hover:text-white">
                    <img src={item.image} alt={item.title} className="w-12 h-12 object-contain filter brightness-0 invert" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white text-lg font-display tracking-wide">{item.title}</h3>
                    <p className="text-white/60 text-sm font-sans font-light leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Middle Column: Visual Anchor */}
            <div className="hidden lg:flex flex-col items-center justify-center relative">
              {/* Outer rotating ring - Dotted for subtle texture */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="w-[360px] h-[360px] border border-white/10 border-dotted rounded-full absolute"
              />

              {/* Middle rotating ring - Dashed to show direction */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="w-[300px] h-[300px] border border-white/20 border-dashed rounded-full flex items-center justify-center relative"
              />

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="w-[200px] h-[200px] border border-white/30 border-dashed rounded-full flex items-center justify-center bg-white/[0.02] backdrop-blur-3xl absolute"
              >
                <img
                  src={storageUrl("home/simboloatmos.png")}
                  alt="ATMOS Symbol"
                  className="w-24 h-24 opacity-60 brightness-0 invert"
                />
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-12 md:space-y-20">
              {differentials.slice(3, 6).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col md:flex-row-reverse items-center md:items-start gap-6 group text-center md:text-right"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 transition-all group-hover:bg-[#A88B4C] group-hover:text-white">
                    <img src={item.image} alt={item.title} className="w-12 h-12 object-contain filter brightness-0 invert" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white text-lg font-display tracking-wide">{item.title}</h3>
                    <p className="text-white/60 text-sm font-sans font-light leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CONCEITO SENSORIAL */}
      <section className="pt-32 pb-0 bg-[#FAF9F6] relative z-10 border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[#744404] uppercase tracking-[0.4em] text-xs font-sans font-bold mb-6 block"
            >
              Conceito Sensorial
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[#2C3E2D] font-display text-4xl md:text-6xl leading-tight"
            >
              Turismo de Experiência
            </motion.h2>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap justify-center gap-8 md:gap-10 lg:gap-12 relative z-10">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                className="flex flex-col items-center flex-1 min-w-[250px] max-w-[300px] group"
              >
                {/* Extreme Proximity: Negative margin to stick text to symbol */}
                <div className="mb-6 relative transition-transform duration-500 group-hover:scale-110 flex items-center justify-center h-48">
                  <div 
                    style={{ 
                      maskImage: `url(${pillar.image})`, 
                      WebkitMaskImage: `url(${pillar.image})`,
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      backgroundColor: pillar.bg.match(/\[(.*?)\]/)?.[1] || 'currentColor',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      width: `${160 * (pillar.scale || 1)}px`,
                      height: `${160 * (pillar.scale || 1)}px`
                    }}
                    role="img"
                    aria-label={pillar.title}
                  />
                </div>

                <span className="text-[12px] font-bold tracking-[0.3em] mb-3 uppercase text-[#141C15]">{pillar.title}</span>
                <p className="text-[#2C3E2D]/70 text-[13px] font-sans font-light leading-relaxed text-center group-hover:text-[#2C3E2D] transition-colors max-w-[220px]">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SECTION 3: QUOTE MARQUEE - Transparent Background with Green Text - Adjusted for balanced spacing */}
        <div ref={quoteRef} className="w-screen pt-12 pb-24 overflow-hidden relative left-1/2 -translate-x-1/2 mt-10">
          <style>{`
          @keyframes marqueeScroll {
            0% { transform: translateX(20vw); }
            100% { transform: translateX(calc(-50% + 20vw)); }
          }
          .animate-marquee {
            animation: marqueeScroll 45s linear infinite;
            animation-play-state: paused;
          }
          .animate-marquee.playing {
            animation-play-state: running;
          }
        `}</style>

          <div className={`flex w-max animate-marquee ${isQuoteInView ? 'playing' : ''}`}>
            {/* First set of phrases */}
            <div className="flex items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-[#141C15] font-display italic text-4xl md:text-6xl mx-16 opacity-90 tracking-tight leading-none">
                    A verdadeira viagem de descoberta não consiste em procurar novas paisagens, mas em ter novos olhos.
                  </span>
                  <div
                    className="w-12 h-12 bg-[#141C15] opacity-80 mx-8"
                    style={{
                      maskImage: `url(${storageUrl("home/simboloatmos.png")})`,
                      WebkitMaskImage: `url(${storageUrl("home/simboloatmos.png")})`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center'
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Identical second set for seamless loop */}
            <div className="flex items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-[#141C15] font-display italic text-4xl md:text-6xl mx-16 opacity-90 tracking-tight leading-none">
                    A verdadeira viagem de descoberta não consiste em procurar novas paisagens, mas em ter novos olhos.
                  </span>
                  <div
                    className="w-12 h-12 bg-[#141C15] opacity-80 mx-8"
                    style={{
                      maskImage: `url(${storageUrl("home/simboloatmos.png")})`,
                      WebkitMaskImage: `url(${storageUrl("home/simboloatmos.png")})`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
