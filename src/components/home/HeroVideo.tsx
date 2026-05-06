import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { storageUrl } from "@/lib/storage";

interface HeroVideoProps {
  tagline?: string;
  title?: string;
}

export default function HeroVideo({ tagline, title }: HeroVideoProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] w-full overflow-hidden bg-black">
      {/* Background Video Loop */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-60 scale-105"
          style={{ filter: "brightness(0.9) contrast(1.1)" }}
        >
          <source
            src={storageUrl("home/hero-video.mp4")}
            type="video/mp4"
          />
          {/* Fallback to original mixkit if Supabase fails or as backup */}
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-a-forest-greenery-1153-large.mp4"
            type="video/mp4"
          />
        </video>
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40 z-1" />
        <div className="absolute inset-0 bg-black/20 z-1" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl"
        >
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-[#E4DBCC] uppercase tracking-[0.4em] text-[10px] md:text-xs font-bold mb-6"
          >
            {tagline || "O seu espaço para explorar a"}
          </motion.p>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-white text-5xl md:text-7xl lg:text-8xl font-display leading-[0.9] mb-10 tracking-tight"
          >
            {title || "Sua viagem começa agora"}
          </motion.h1>

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="flex flex-col md:flex-row items-center justify-center gap-6"
            >
              <Link 
                to="/signup"
                className="px-10 py-5 bg-[#FAF9F6] text-[#141C15] text-[11px] uppercase tracking-[0.2em] font-bold rounded-full hover:bg-white transition-all transform hover:scale-105 shadow-xl flex items-center gap-3"
              >
                Fazer meu cadastro
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link 
                to="/experiencias"
                className="text-white/80 hover:text-white text-[10px] uppercase tracking-[0.3em] font-bold transition-all border-b border-white/20 pb-1 hover:border-white"
              >
                Ver roteiros
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
        <span className="text-[9px] uppercase tracking-[0.4em] text-white/50 font-bold vertical-text">Scroll</span>
      </motion.div>
    </section>
  );
}
