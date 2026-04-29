import { motion } from "framer-motion";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Re-using the same high-end assets from the Hero
import expMassagem from "@/assets/exp-massagem.jpg";
import expYoga from "@/assets/exp-yoga.jpg";
import expBalao from "@/assets/exp-balao.jpg";
import expRapel from "@/assets/exp-rapel.jpg";
import expAstro from "@/assets/exp-astro.jpg";
import expCavalos from "@/assets/exp-cavalo.jpg";
import wat1 from "@/assets/waterfall-placeholder-1.jpg";
import wat2 from "@/assets/waterfall-placeholder-2.jpg";
import wat3 from "@/assets/waterfall-placeholder-3.jpg";
import wat4 from "@/assets/waterfall-placeholder-4.jpg";
import daySantaBarbara from "@/assets/day-santa-barbara.jpg";
import dayCouros from "@/assets/day-cataratas-couros.jpg";
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
