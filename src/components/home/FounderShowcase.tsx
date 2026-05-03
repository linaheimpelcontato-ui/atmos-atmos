import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Car, Languages, Heart, Camera, Shield, Search, Leaf, Mountain, Users, Award } from "lucide-react";

import { storageUrl, optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";

// Supabase Storage Public URLs for Joao's photos - Optimized for fast loading
const JOAO_IMAGES = [
  optimizedUrl("home/Joao/joao-1.jpg", IMAGE_PRESETS.large),
  optimizedUrl("home/Joao/joao-2.jpg", IMAGE_PRESETS.large),
  optimizedUrl("home/Joao/joao-4.jpg", IMAGE_PRESETS.large),
  optimizedUrl("home/Joao/joao-5.jpg", IMAGE_PRESETS.large),
  optimizedUrl("home/Joao/joao-6.jpg", IMAGE_PRESETS.large),
];

// Real Guide Images from public folder
const GUIDE_IMAGES = [
  storageUrl("home/guides/guia-aline.jpg"),
  storageUrl("home/guides/guia-anacarolina.jpg"),
  storageUrl("home/guides/guia-aurora.jpg"),
  storageUrl("home/guides/guia-big.jpg"),
  storageUrl("home/guides/guia-camilla.jpg"),
  storageUrl("home/guides/guia-chico.jpg"),
  storageUrl("home/guides/guia-gudu.jpg"),
  storageUrl("home/guides/guia-henrique.jpg"),
  storageUrl("home/guides/guia-jessica.jpg"),
  storageUrl("home/guides/guia-joao.jpg"),
  storageUrl("home/guides/guia-leocanastra.jpg"),
  storageUrl("home/guides/guia-magela.jpg"),
  storageUrl("home/guides/guia-naia.jpg"),
  storageUrl("home/guides/guia-nissen.jpg"),
  storageUrl("home/guides/guia-pedropilla.jpg"),
  storageUrl("home/guides/guia-raphaelmaia.jpg"),
  storageUrl("home/guides/guia-thiagoalmanamala.jpg"),
  storageUrl("home/guides/guia-thiagoqueiroz.jpg"),
  storageUrl("home/guides/guia-tony.jpg"),
  storageUrl("home/guides/guia-victoria.jpg"),
  storageUrl("home/guides/guia-vini.jpg"),
  storageUrl("home/guides/guia-yago.jpg")
];

const StatItem = ({ number, label, suffix = "" }: { number: number, label: string, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = number;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [number, isInView]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center w-full">
      <div className="text-4xl md:text-5xl font-sans font-bold text-[#2C3E2D] mb-2 tracking-tighter">
        +{count.toLocaleString()}{suffix}
      </div>
      <div className="text-[#2C3E2D]/60 text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium leading-relaxed">
        {label}
      </div>
    </div>
  );
};

export default function FounderShowcase() {
  const [imgIndex, setImgIndex] = useState(0);

  // Auto-rotate Joao's photos - Slower interval (2s) for better pacing
  useEffect(() => {
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % JOAO_IMAGES.length);
    }, 2000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-32 pb-0 bg-[#FAF9F6] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* Left Side: Editorial Image Carousel with Ken Burns Effect */}
          <motion.div
            className="lg:col-span-6 relative"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-[#E4DBCC]/20">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={imgIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1.0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 1.5, ease: "easeInOut" },
                    scale: { duration: 6, ease: "linear" } // Subtle Ken Burns zoom
                  }}
                  className="absolute inset-0"
                >
                  <img
                    src={JOAO_IMAGES[imgIndex]}
                    alt="João Accioly"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 bg-gradient-to-t from-[#2C3E2D]/40 to-transparent pointer-events-none" />

              {/* Name Tag Overlay */}
              <div className="absolute bottom-8 left-8 text-white z-10 text-start">
                <p className="text-sm uppercase tracking-[0.3em] font-sans font-light mb-1 opacity-80">Fundador & Guia</p>
                <h3 className="text-3xl font-display">João Accioly</h3>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#566952]/10 rounded-full blur-3xl opacity-50" />
          </motion.div>

          {/* Right Side: Content */}
          <div className="lg:col-span-6 flex flex-col items-start px-4 md:px-0 pt-2 text-start">
            <motion.span
              className="text-[#566952] uppercase tracking-[0.4em] text-xs font-bold mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Nossa Liderança
            </motion.span>

            <motion.h2
              className="text-[#2C3E2D] leading-[1.35] mb-10 tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span className="font-display text-4xl md:text-5xl block mb-2 leading-[1.2]">Explore a Chapada</span>
              <span className="block font-sans font-light text-xl md:text-2xl opacity-90 tracking-normal hover:opacity-100 transition-opacity">pelos olhos de quem conhece.</span>
            </motion.h2>

            <motion.div
              className="space-y-6 text-[#2C3E2D]/80 text-lg md:text-xl font-light leading-relaxed max-w-xl mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <p>
                Guia bilíngue há 10 anos na Chapada dos Veadeiros, é quem nos abre as trilhas, os segredos e os encantos da região, com profundo respeito pela terra, pelos saberes locais e pela segurança do grupo.
              </p>
              <p>
                Sua missão é mostrar a Chapada que poucos conhecem, os acessos secretos, os horários mágicos, os ângulos perfeitos. Cada detalhe é pensado para criar memórias que duram uma vida. Com a ATMOS cada milésimo de segundo da sua viagem importa.
              </p>
            </motion.div>

            {/* Big Numbers Grid - Perfectly Balanced */}
            <motion.div
              className="grid grid-cols-3 gap-4 border-t border-[#2C3E2D]/10 pt-16 w-full"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex justify-center border-r border-[#2C3E2D]/5">
                <StatItem number={10} label="Anos na Chapada" />
              </div>
              <div className="flex justify-center border-r border-[#2C3E2D]/5">
                <StatItem number={1000} label="Grupos Guiados" />
              </div>
              <div className="flex justify-center">
                <StatItem number={5000} label="Pessoas Guiadas" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* --- New: Guide Team Sub-section (Reordered) --- */}
        <div className="mt-20 pt-10 text-center">
          <div className="max-w-4xl mx-auto mb-16 px-6">
            <motion.p
              className="text-[#2C3E2D] text-lg md:text-2xl font-sans font-light leading-relaxed italic"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              João Accioly, guia fundador da ATMOS, selecionou os melhores guias da Chapada dos Veadeiros para todo perfil de viajante.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Full-width Marquee of Guide Photos - Now in the Middle */}
      <div className="relative w-full py-8 overflow-hidden">
        <style>{`
          .guides-marquee-inner {
            animation: marqueeScrollSide linear infinite;
            animation-duration: 40s;
          }
          @keyframes marqueeScrollSide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        <div className="guides-marquee-inner flex w-fit gap-6 px-6">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-32 md:w-40 aspect-[3/4] rounded-xl overflow-hidden flex-shrink-0 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] grayscale-[0.3] hover:grayscale-0 transition-all duration-700"
            >
              <img
                src={`${GUIDE_IMAGES[i % GUIDE_IMAGES.length]}?w=400&h=600&auto=format&fit=crop&q=70`}
                alt="Equipe de Guias Atmos"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
      </div>

      <div className="relative w-full py-24 bg-[#141C15] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-16">
            {[
              { label: "Veículos 4x4", icon: Car },
              { label: "Guias Bilingues", icon: Languages },
              { label: "Primeiro Socorros", icon: Heart },
              { label: "Registros Fotograficos", icon: Camera },
              { label: "Segurança", icon: Shield },
              { label: "Curadoria", icon: Search },
              { label: "Biólogos", icon: Leaf },
              { label: "Geólogos", icon: Mountain },
              { label: "Todas as idades", icon: Users },
              { label: "Formações especializadas", icon: Award },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col items-center gap-4 group text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#FAF9F6] flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:bg-white">
                  <item.icon className="w-5 h-5 text-[#141C15]" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.25em] font-sans font-bold text-[#FAF9F6] max-w-[120px] leading-tight opacity-70 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
