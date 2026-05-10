import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { storageUrl, optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";

export default function HeroMain({ 
  tagline = "O seu espaço para explorar a", 
  title = "Chapada dos Veadeiros" 
}: { 
  tagline?: string; 
  title?: string;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user } = useAuth();
  const [videoActive, setVideoActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Only activate video on non-mobile devices to save massive bandwidth
    if (window.innerWidth >= 768) {
      setVideoActive(true);
      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center bg-black px-6 overflow-hidden">
      {/* EXCLUSIVE VIVID VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {/* Desktop Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          title="Atmos Chapada dos Veadeiros Cinematic"
          poster={optimizedUrl("home/hero-home.jpg", IMAGE_PRESETS.large)}
          className="hidden md:block w-full h-full object-cover object-bottom opacity-70"
        >
          <source
            src={storageUrl("home/hero-bg.mp4")}
            type="video/mp4"
          />
        </video>

        {/* Mobile/Fallback Image - Simple and Reliable */}
        <img 
          src={optimizedUrl("home/hero-home.jpg", IMAGE_PRESETS.large)}
          className="md:hidden w-full h-full object-cover object-bottom opacity-70"
          alt="Atmos Chapada dos Veadeiros Hero"
          fetchPriority="high"
          loading="eager"
          width="1920"
          height="1080"
        />
        
        {/* Enhanced Vignette for Accessibility/Contrast (Page 20 of report) */}
        <div className="absolute inset-0 bg-black/30 z-1" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 z-1" />
      </div>

      {/* Hero Content - Optimized for Video Background */}
      <div className="relative z-20 text-center flex flex-col items-center pointer-events-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-10"
        >
          <p className="text-xs md:text-sm font-medium tracking-[0.4em] text-white/90 mb-4 uppercase drop-shadow-md">
            {tagline}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-display text-white tracking-tight leading-[1.1] drop-shadow-lg">
            {title}
          </h1>
        </motion.div>

        {/* Action Buttons - Atmos Palette for Max Legibility */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-2"
          >
            <Button 
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
              }}
              className="rounded-full px-12 h-14 text-[10px] font-bold uppercase tracking-[0.2em] bg-[#141C15] text-[#FAF9F6] hover:bg-[#141C15]/90 transition-all shadow-2xl transform hover:scale-105"
            >
              Sign up
            </Button>
            <Button 
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              className="rounded-full px-12 h-14 text-[10px] font-bold uppercase tracking-[0.2em] bg-[#FAF9F6] text-[#141C15] hover:bg-white transition-all shadow-2xl transform hover:scale-105"
            >
              Log In
            </Button>
          </motion.div>
        )}
      </div>

      <AuthModal 
        open={authOpen} 
        defaultMode={authMode}
        onClose={() => setAuthOpen(false)} 
        onSuccess={() => setAuthOpen(false)} 
      />
    </section>
  );
}
