import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import AuthModal from "@/components/auth/AuthModal";
import AtmosWordmark from "@/components/brand/AtmosWordmark";
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
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loaderMinimumReady, setLoaderMinimumReady] = useState(false);
  const handleVideoError = () => {
    setVideoReady(false);
    setVideoFailed(true);
  };

  // Keep the branded entrance long enough to feel intentional, but never block
  // the visitor indefinitely while the video is unavailable.
  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setLoaderMinimumReady(true), 1500);
    return () => window.clearTimeout(minimumTimer);
  }, []);

  useEffect(() => {
    if (videoReady || videoFailed) return;

    const fallbackTimer = window.setTimeout(() => setVideoFailed(true), 6000);
    return () => window.clearTimeout(fallbackTimer);
  }, [videoReady, videoFailed]);

  const showAtmosLoader = !loaderMinimumReady || (!videoReady && !videoFailed);

  return (
    <section className="relative min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center bg-[#141C15] px-6 overflow-hidden">
      {/* Branded entrance masks the video startup without blocking forever. */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#141C15] transition-opacity duration-700 ease-out ${
          showAtmosLoader ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!showAtmosLoader}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,169,125,0.14),transparent_42%)]" />
        <div className="relative flex flex-col items-center px-8 text-center" role="status">
          <div className="relative mb-8 flex h-28 w-[21rem] items-center justify-center">
            <img
              src={storageUrl("home/simboloatmos.png")}
              alt=""
              aria-hidden="true"
              className="absolute left-1 top-1/2 h-14 w-14 -translate-y-1/2 object-contain opacity-80"
              loading="eager"
              decoding="async"
            />
            <AtmosWordmark className="h-24 w-64 translate-x-5 text-[#FAF9F6]" />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.45em] text-[#c4a97d]">
            Preparando sua atmosfera
          </p>
          <div className="mt-5 h-px w-32 overflow-hidden bg-white/10">
            <span className="block h-full w-1/2 bg-[#c4a97d] motion-safe:animate-pulse" />
          </div>
        </div>
      </div>

      {/* EXCLUSIVE VIVID VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {/* Mobile uses the local 720p cut; desktop keeps the 4K R2 master. */}
        {!videoFailed && <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onError={handleVideoError}
          title="Atmos Chapada dos Veadeiros Cinematic"
          className={`relative w-full h-full object-cover object-bottom transition-opacity duration-500 ${
            videoReady ? "opacity-70" : "opacity-0"
          }`}
        >
          <source
            media="(max-width: 767px)"
            src="/videos/hero-chapada.mp4"
            type="video/mp4"
            onError={handleVideoError}
          />
          <source
            src={storageUrl("home/hero-bg.mp4")}
            type="video/mp4"
            onError={handleVideoError}
          />
        </video>}
        
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
              Criar conta
            </Button>
            <Button 
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              className="rounded-full px-12 h-14 text-[10px] font-bold uppercase tracking-[0.2em] bg-[#FAF9F6] text-[#141C15] hover:bg-white transition-all shadow-2xl transform hover:scale-105"
            >
              Entrar
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
