import { motion } from "framer-motion";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { storageUrl } from "@/lib/storage";

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

  return (
    <section className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center bg-black px-6 overflow-hidden">
      {/* EXCLUSIVE VIVID VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={storageUrl("home/hero-bg-poster.jpg")}
          className="w-full h-full object-cover object-bottom opacity-80"
        >
          <source
            src={storageUrl("home/hero-bg.mp4")}
            type="video/mp4"
          />
          <source
            src={storageUrl("home/hero-bg.MOV")}
            type="video/quicktime"
          />
        </video>
        
        {/* Subtle Dark Vignette for Premium Legibility */}
        <div className="absolute inset-0 bg-black/15 z-1" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 z-1" />
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
