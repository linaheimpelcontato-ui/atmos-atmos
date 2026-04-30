import { motion } from "framer-motion";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

import { storageUrl } from "@/lib/storage";

const innerImages = [
  storageUrl("experiencias/massagem-1.jpg"),
  storageUrl("experiencias/yoga-1.jpg"),
  storageUrl("experiencias/balao-1.jpg"),
  storageUrl("experiencias/rapel-1.jpg"),
  storageUrl("experiencias/astro-1.jpg"),
  storageUrl("experiencias/cavalo-1.jpg"),
  storageUrl("experiencias/massagem-1.jpg"),
  storageUrl("experiencias/yoga-1.jpg"),
  storageUrl("experiencias/balao-1.jpg"),
  storageUrl("experiencias/rapel-1.jpg"),
  storageUrl("experiencias/astro-1.jpg"),
  storageUrl("experiencias/cavalo-1.jpg")
];

const middleImages = [
  storageUrl("cachoeiras/segredo-1.jpg"),
  storageUrl("cachoeiras/vale-da-lua-1.jpg"),
  storageUrl("cachoeiras/macacao-1.jpg"),
  storageUrl("cachoeiras/dragao-1.jpg"),
  storageUrl("cachoeiras/santa-barbara-1.jpg"),
  storageUrl("cachoeiras/couros-1.jpg"),
  storageUrl("cachoeiras/segredo-1.jpg"),
  storageUrl("cachoeiras/vale-da-lua-1.jpg"),
  storageUrl("cachoeiras/macacao-1.jpg"),
  storageUrl("cachoeiras/dragao-1.jpg"),
  storageUrl("cachoeiras/santa-barbara-1.jpg"),
  storageUrl("cachoeiras/couros-1.jpg")
];

const outerImages = [
  storageUrl("home/hero-chapada.jpg"),
  storageUrl("home/hero-cachoeiras.jpg"),
  storageUrl("home/hero-home.jpg"),
  storageUrl("home/hero-hospedagens.jpg"),
  storageUrl("home/hero-roteiros.jpg"),
  storageUrl("home/imersoes-hero.jpg"),
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

export default function FinalCtaSection() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user } = useAuth();

  return (
    <section className="relative h-[100vh] w-full flex flex-col items-center justify-center bg-[#FAF9F6] overflow-hidden px-6 border-t border-[#2C3E2D]/5">
      {/* Three concentrical rotating rings - Identical to Hero */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-visible"
        style={{
          maskImage: 'radial-gradient(circle at center, black 0%, black 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, black 70%, transparent 100%)'
        }}
      >
        {/* Ring 1 - Inner - FASTEST */}
        <GalleryRing radius={380} count={12} speed={30} imgSize={70} opacity={0.8} images={innerImages} />
        {/* Ring 2 - Middle - INTERMEDIATE */}
        <GalleryRing radius={560} count={12} speed={55} imgSize={100} opacity={0.5} images={middleImages} />
        {/* Ring 3 - Outer - SLOWEST */}
        <GalleryRing radius={750} count={12} speed={80} imgSize={130} opacity={0.3} images={outerImages} />
      </div>

      {/* CTA Content - High impact closing */}
      <div className="relative z-20 text-center flex flex-col items-center pointer-events-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-10"
        >
          <p className="text-xs md:text-sm font-medium tracking-[0.3em] text-[#2C3E2D] mb-4 opacity-60 uppercase">
            A jornada recomeça aqui
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display text-[#2C3E2D] tracking-tight leading-tight">
            Pronto para despertar sua <br/><span className="italic opacity-80 text-3xl md:text-5xl lg:text-7xl">próxima aventura?</span>
          </h2>
        </motion.div>

        {/* Action Buttons - Identical to Hero but with "Final" context */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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

      {/* Auth Modal integration */}
      <AuthModal 
        open={authOpen} 
        defaultMode={authMode}
        onClose={() => setAuthOpen(false)} 
        onSuccess={() => setAuthOpen(false)} 
      />
    </section>
  );
}
