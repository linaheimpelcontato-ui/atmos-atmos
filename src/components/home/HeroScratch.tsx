import { motion } from "framer-motion";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Category 1: Experiences & Details (Inner Ring)
import expMassagem from "@/assets/exp-massagem.jpg";
import expYoga from "@/assets/exp-yoga.jpg";
import expBalao from "@/assets/exp-balao.jpg";
import expRapel from "@/assets/exp-rapel.jpg";
import expAstro from "@/assets/exp-astro.jpg";
import expCavalos from "@/assets/exp-cavalo.jpg";

// Category 2: Waterfalls (Middle Ring)
import wat1 from "@/assets/waterfall-placeholder-1.jpg";
import wat2 from "@/assets/waterfall-placeholder-2.jpg";
import wat3 from "@/assets/waterfall-placeholder-3.jpg";
import wat4 from "@/assets/waterfall-placeholder-4.jpg";
import daySantaBarbara from "@/assets/day-santa-barbara.jpg";
import dayCouros from "@/assets/day-cataratas-couros.jpg";

// Category 3: Landscapes & Heroes (Outer Ring)
import heroChapada from "@/assets/hero-chapada.jpg";
import heroCachoeiras from "@/assets/hero-cachoeiras.jpg";
import heroHome from "@/assets/hero-home.jpg";
import heroHospedagens from "@/assets/hero-hospedagens.jpg";
import heroRoteiros from "@/assets/hero-roteiros.jpg";
import imersoesHero from "@/assets/imersoes-hero.jpg";

const innerImages = [expMassagem, expYoga, expBalao, expRapel, expAstro, expCavalos, expMassagem, expYoga, expBalao, expRapel, expAstro, expCavalos];
const middleImages = [wat1, wat2, wat3, wat4, daySantaBarbara, dayCouros, wat1, wat2, wat3, wat4, daySantaBarbara, dayCouros];
const outerImages = [heroChapada, heroCachoeiras, heroHome, heroHospedagens, heroRoteiros, imersoesHero, heroChapada, heroCachoeiras, heroHome, heroHospedagens, heroRoteiros, imersoesHero];

const GalleryRing = ({ radius, count, speed, imgSize, opacity = 1, images }: { radius: number, count: number, speed: number, imgSize: number, opacity?: number, images: string[] }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ opacity }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angleStep = (i / count) * 360; 
        const angleRad = (i / count) * Math.PI * 2;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;
        const img = images[i % images.length];

        return (
          <div
            key={i}
            className="absolute shadow-2xl rounded-xl overflow-hidden bg-muted transition-all duration-700"
            style={{
              width: imgSize,
              aspectRatio: "3/4",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${angleStep + 90}deg)`,
            }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        );
      })}
    </motion.div>
  );
};

export default function HeroScratch({ 
  tagline = "O seu espaço para explorar a", 
  title = "Chapada dos Veadeiros" 
}: { 
  tagline?: string; 
  title?: string;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user } = useAuth();

  return (
    <section className="relative h-[100vh] w-full flex flex-col items-center justify-center bg-transparent px-6 border-t border-black/5">
      {/* Three concentrical rotating rings - Masked at the bottom for seamless fade */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-visible"
        style={{
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
        }}
      >
        {/* Ring 1 - Inner (12 photos) - Experiences - FASTEST */}
        <GalleryRing radius={380} count={12} speed={30} imgSize={70} opacity={1} images={innerImages} />
        {/* Ring 2 - Middle (12 photos) - Waterfalls - INTERMEDIATE */}
        <GalleryRing radius={560} count={12} speed={55} imgSize={100} opacity={0.7} images={middleImages} />
        {/* Ring 3 - Outer (12 photos) - Landscapes - SLOWEST */}
        <GalleryRing radius={750} count={12} speed={80} imgSize={130} opacity={0.4} images={outerImages} />
      </div>

      {/* Hero Content - Protected central zone */}
      <div className="relative z-20 text-center flex flex-col items-center pointer-events-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-10"
        >
          <p className="text-xs md:text-sm font-medium tracking-[0.3em] text-[#2C3E2D] mb-3 opacity-60 uppercase">
            {tagline}
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display text-[#2C3E2D] tracking-tight leading-tight">
            {title}
          </h1>
        </motion.div>

        {/* Action Buttons - Protected zone */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2"
          >
            <Button 
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
              }}
              className="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-[0.2em] bg-black text-white hover:bg-black/90 transition-all shadow-xl"
            >
              Sign up
            </Button>
            <Button 
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              variant="outline"
              className="rounded-full px-10 h-12 text-[10px] font-bold uppercase tracking-[0.2em] border-black/10 text-black hover:bg-black/5 transition-all bg-white"
            >
              Log In
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Blur Aura - Only affects the gallery images behind it */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 z-[21] pointer-events-none backdrop-blur-[6px]" 
        style={{
          maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)'
        }}
      />

      <AuthModal 
        open={authOpen} 
        defaultMode={authMode}
        onClose={() => setAuthOpen(false)} 
        onSuccess={() => setAuthOpen(false)} 
      />
    </section>
  );
}
