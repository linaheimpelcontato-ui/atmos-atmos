import { motion } from "framer-motion";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

import { storageUrl } from "@/lib/storage";

const innerImages = [
  storageUrl("home/exp-massagem.jpg"),
  storageUrl("home/exp-yoga.jpg"),
  storageUrl("home/exp-balao.jpg"),
  storageUrl("home/exp-rapel.jpg"),
  storageUrl("home/exp-astro.jpg"),
  storageUrl("home/exp-cavalo.jpg")
];

const middleImages = [
  storageUrl("home/waterfall-placeholder-1.jpg"),
  storageUrl("home/waterfall-placeholder-2.jpg"),
  storageUrl("home/waterfall-placeholder-3.jpg"),
  storageUrl("home/waterfall-placeholder-4.jpg"),
  storageUrl("home/day-santa-barbara.jpg"),
  storageUrl("home/day-cataratas-couros.jpg")
];

const outerImages = [
  storageUrl("home/hero-chapada.jpg"),
  storageUrl("home/hero-cachoeiras.jpg"),
  storageUrl("home/hero-home.jpg"),
  storageUrl("home/hero-hospedagens.jpg"),
  storageUrl("home/hero-roteiros.jpg"),
  storageUrl("home/imersoes-hero.jpg")
];

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
    <section className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center bg-transparent px-6 border-t border-black/5">
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
