import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { optimizedUrl } from "@/lib/storage";
import { motion } from "framer-motion";

const heroImage = optimizedUrl("home/hero-home.jpg", { quality: 80 });

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-[100vh] min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-black">
      <motion.div 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <img
          src={heroImage}
          alt="Chapada dos Veadeiros"
          className="w-full h-full object-cover"
          fetchPriority="high"
        />
        {/* Cosmos-like elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/90" />
      </motion.div>

      <div className="relative z-10 container flex flex-col items-center text-center text-white px-4 mt-16 max-w-7xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.4, 0, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-bold leading-[1.05] tracking-tight mb-6"
        >
          {t("hero.tagline")}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.4, 0, 1] }}
          className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-12 text-white/85 font-light"
        >
          {t("hero.subtitle")}
        </motion.p>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <Button asChild size="lg" className="bg-white text-black hover:bg-white/90 rounded-full px-8 py-7 md:px-10 h-auto text-base md:text-lg font-semibold group transition-all duration-300 shadow-2xl hover:shadow-white/20 hover:-translate-y-1">
            <Link to="/monte-seu-roteiro" className="flex items-center gap-3">
               Descubra suas preferências
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/50"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] font-medium">Explore</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
      </motion.div>
    </section>
  );
}
