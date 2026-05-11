import React, { useRef } from "react";
import { motion, useScroll, useTransform, animate, motionValue, useInView } from "framer-motion";
import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
const logoAtmos = optimizedUrl("home/logo-atmos.png", IMAGE_PRESETS.thumbnail);
const flowerSymbol = optimizedUrl("home/simboloatmos.png", IMAGE_PRESETS.thumbnail);

export default function AboutAtmosSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = React.useState(false);
  const isInView = useInView(containerRef, { amount: 0.2, once: true });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const fullText = "Conheça a Chapada dos Veadeiros\ndo jeito certo. A ATMOS cuida de tudo:\nroteiros sob medida, guias\nexperientes, hospedagens únicas,\nserviços pensados em cada detalhe\ne experiências que ficam para sempre.";

  const count = motionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayText = useTransform(rounded, (latest) => fullText.slice(0, latest));

  React.useEffect(() => {
    if (started) {
      const controls = animate(count, fullText.length, {
        duration: 3,
        ease: "linear"
      });
      return controls.stop;
    }
  }, [started, count, fullText.length]);

  // Reveal effect for the focus statement - triggered earlier due to compact layout
  const revealProgress = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);

  return (
    <section ref={containerRef} id="sobre-essencia" className="pb-32 pt-0 relative overflow-hidden bg-[#141C15]">

      {/* Background Watermark 1: SWEET SPOT POSITION */}
      <div className="absolute -top-[20vw] left-1/2 -translate-x-1/2 w-[150vw] md:w-[120vw] pointer-events-none z-0 opacity-[0.08]">
        <img
          src={logoAtmos}
          alt="ATMOS Logo Watermark"
          className="w-full h-auto object-contain invert pointer-events-none select-none scale-[1.1] md:scale-100"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Header Section - Anchored to the baseline of the watermark */}
        <div className="mb-20 pt-[27vw] md:pt-[21vw] lg:pt-[17vw]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-[#FAF9F6] text-5xl md:text-8xl font-display font-bold tracking-tight">
              O QUE É A ATMOS?
            </h2>
            <p className="text-[#FAF9F6]/90 text-2xl md:text-3xl font-sans font-medium tracking-tight">
              Curadoria de Experiências na Chapada dos Veadeiros.
            </p>
          </motion.div>
        </div>

        {/* Two Columns Section - Asymmetric Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-0 mb-24 items-start">
          {/* Left Column: A Origem */}
          <motion.div
            className="md:col-span-5 space-y-4"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-[#FAF9F6] text-sm uppercase tracking-[0.2em] font-bold">A Origem</h3>
            <p className="text-[#FAF9F6]/70 text-lg font-sans font-light leading-relaxed">
              ATMOS vem da palavra "atmosfera" o ambiente que envolve uma jornada. Essa camada invisível, mas perceptível, que transforma um roteiro comum em uma experiência memorável.
            </p>
          </motion.div>

          {/* Right Column: Reference Highlight (Shifted further right for editorial feel) */}
          <motion.div
            className="md:col-span-6 md:col-start-7"
            onViewportEnter={() => setStarted(true)}
          >
            <div className="text-[#FAF9F6] text-lg md:text-xl lg:text-[26px] font-display font-bold leading-[1.4] tracking-tight whitespace-pre-wrap">
              <motion.span>{displayText}</motion.span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="inline-block w-[2px] h-[0.9em] bg-[#FAF9F6] ml-1 align-middle"
              />
            </div>
          </motion.div>
        </div>

        {/* Professional Values Ticker - Compact, Clear & Magnetic */}
        <div className="mt-12 mb-12 border-t border-b border-[#FAF9F6]/10 py-6 overflow-hidden relative z-10 w-screen left-1/2 -translate-x-1/2">
          <div className="flex items-center">
            {/* Fixed Title Label */}
            <div className="pl-12 pr-10 border-r border-[#FAF9F6]/10 flex-shrink-0 bg-[#141C15] z-20">
              <h3 className="text-[#FAF9F6] font-display font-bold text-lg md:text-xl tracking-[0.2em] whitespace-nowrap">
                NOSSOS VALORES
              </h3>
            </div>

            {/* Scrolling Values Ticker */}
            <div className="flex-1 overflow-hidden relative">
              <style>{`
                @keyframes valuesTicker {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-values-ticker {
                  animation: valuesTicker 35s linear infinite;
                  animation-play-state: paused;
                }
                .animate-values-ticker.playing {
                  animation-play-state: running;
                }
              `}</style>

              <div className={`flex flex-none w-max animate-values-ticker pointer-events-none ${isInView ? 'playing' : ''}`}>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center">
                    {[
                      "Respeito ao território e à comunidade",
                      "Consciência ambiental e social",
                      "Ética e transparência nas relações",
                      "Criatividade e Inovação",
                      "Excelência e Autenticidade",
                      "Segurança e Empatia",
                      "Simplicidade e Inspiração"
                    ].map((value, vIndex) => (
                      <div key={vIndex} className="flex items-center whitespace-nowrap">
                        <span className="text-[#FAF9F6]/80 font-sans uppercase text-xs md:text-sm font-bold tracking-[0.1em] px-12 italic">
                          {value}
                        </span>
                        {/* Tiny rotating flower separator */}
                        <div className="w-5 h-5 opacity-40">
                          <motion.div
                            style={{
                              maskImage: `url(${flowerSymbol})`,
                              WebkitMaskImage: `url(${flowerSymbol})`,
                              maskSize: 'contain',
                              WebkitMaskSize: 'contain',
                              maskRepeat: 'no-repeat',
                              WebkitMaskRepeat: 'no-repeat',
                              maskPosition: 'center',
                              WebkitMaskPosition: 'center',
                              backgroundColor: '#FAF9F6',
                              width: '100%',
                              height: '100%'
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
