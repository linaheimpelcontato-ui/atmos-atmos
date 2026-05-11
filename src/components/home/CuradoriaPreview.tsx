import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Lock, Sparkles, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";

const CATEGORIES = [
  {
    id: "cachoeiras",
    title: "CACHOEIRAS",
    bigNumber: "+35",
    unit: "atrativos",
    description: "Curadoria das melhores cachoeiras da Chapada dos Veadeiros",
    images: [
      "destaques-categorias/Cachoeira-Destaque-1.jpg",
      "destaques-categorias/Cachoeira-Destaque-2.jpg",
      "destaques-categorias/Cachoeira-Destaque-3.jpg",
      "destaques-categorias/Cachoeira-Destaque-4.jpg",
      "destaques-categorias/Cachoeira-Destaque-5.jpg"
    ]
  },
  {
    id: "experiencias",
    title: "EXPERIÊNCIAS",
    bigNumber: "+15",
    unit: "experiências",
    description: "Curadoria de experiências para deixar sua viagem mais completa",
    images: [
      "destaques-categorias/Experiencias-Destaque-1.jpeg",
      "destaques-categorias/Experiencias-Destaque-2.jpeg",
      "destaques-categorias/Experiencias-Destaque-3.jpeg",
      "destaques-categorias/Experiencias-Destaque-4.jpeg",
      "destaques-categorias/Experiencias-Destaque-5.jpeg"
    ]
  },
  {
    id: "hospedagens",
    title: "HOSPEDAGENS",
    bigNumber: "+25",
    unit: "hospedagens",
    description: "Curadoria de Hospedagens da Chapada dos Veadeiros",
    images: [
      "destaques-categorias/Hospedagens-Destaque-1.jpeg",
      "destaques-categorias/Hospedagens-Destaque-2.avif",
      "destaques-categorias/Hospedagens-Destaque-3.jpeg",
      "destaques-categorias/Hospedagens-Destaque-4.jpg",
      "destaques-categorias/Hospedagens-Destaque-5.jpeg"
    ]
  },
  {
    id: "servicos",
    title: "SERVIÇOS",
    bigNumber: "+10",
    unit: "serviços curados",
    description: "A ATMOS oferece diversos serviços para facilitar sua viagem.",
    images: [
      "destaques-categorias/Serviços-Destaque-1.jpg",
      "destaques-categorias/Serviços-Destaque-2.jpg",
      "destaques-categorias/Serviços-Destaque-3.jpg",
      "destaques-categorias/Serviços-Destaque-4.jpg"
    ]
  }
];

const CategoryCard = ({ item, isLast, onClick }: { item: typeof CATEGORIES[0], isLast: boolean, onClick: () => void }) => {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    // Reduce number of images on mobile to save bandwidth
    const maxImages = typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : item.images.length;
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % maxImages);
    }, 2500); // Slower, more elegant transitions
    return () => clearInterval(timer);
  }, [item.images.length]);

  return (
    <div 
      onClick={onClick}
      className={`relative aspect-[4/5] md:aspect-[3/4] lg:aspect-[9/16] overflow-hidden bg-[#2C3E2D] cursor-pointer group ${!isLast ? 'border-r border-white/10' : ''}`}
    >
      {/* Image Slideshow using optimizedUrl helper */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={imgIndex}
            src={optimizedUrl(item.images[imgIndex], IMAGE_PRESETS.card)}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            loading="lazy"
            transition={{ 
              opacity: { duration: 1.5, ease: "easeInOut" },
              scale: { duration: 3, ease: "easeOut" }
            }}
          />
        </AnimatePresence>
        
        {/* Deep Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
      </div>

      {/* Content Aligned Bottom Center/Left */}
      <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 pb-16 flex flex-col justify-end items-center md:items-start text-center md:text-left translate-y-4 hover:translate-y-0 transition-transform duration-700">
        
        {/* BIG NUMBERS - High Contrast & Minimalist */}
        <div className="flex flex-col mb-1 items-center md:items-start">
          <span className="text-[42px] md:text-[54px] font-sans font-light text-white tracking-tighter leading-none">
            {item.bigNumber}
          </span>
        </div>

        <h3 className="text-[18px] md:text-[20px] font-sans font-bold tracking-[0.3em] text-white uppercase mb-4">
          {item.title}
        </h3>
        <p className="text-[14px] font-sans font-light leading-relaxed text-white/70 max-w-[240px] md:max-w-xs transition-opacity duration-700">
          {item.description}
        </p>

        {/* Minimal indicator line */}
        <div className="mt-6 w-8 h-px bg-white/30 group-hover:w-full transition-all duration-700" />
      </div>

      {/* Subtle border shine on hover */}
      <div className="absolute inset-0 border border-transparent hover:border-white/20 transition-colors pointer-events-none" />
    </div>
  );
};

export default function CuradoriaPreview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const handleCardClick = (categoryId: string) => {
    if (user) {
      navigate(`/catalogo/${categoryId}`);
    } else {
      setIsPromptOpen(true);
    }
  };

  const handleStartLogin = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsPromptOpen(false);
    setIsAuthModalOpen(true);
  };

  return (
    <section className="bg-[#FAF9F6] pt-32">
      {/* Narrative Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-24">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[#566952] uppercase tracking-[0.4em] text-xs font-sans font-bold mb-6 block"
        >
          Curadoria Atmos
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-[#2C3E2D] font-display text-4xl md:text-5xl leading-tight mb-8"
        >
          A <span className="italic font-extralight">Atmos</span> organiza toda sua viagem.
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[#2C3E2D]/70 font-sans font-light text-lg md:text-xl leading-relaxed max-w-4xl mx-auto"
        >
          O acesso à curadoria da ATMOS é exclusivo para usuários cadastrados. <br className="hidden md:block" /> Crie sua conta gratuita e comece a salvar suas preferências para montarmos um roteiro personalizado para você.
        </motion.p>
      </div>

      {/* Edge-to-edge Grid */}
      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 w-full h-fit border-y border-[#2C3E2D]/5">
        {CATEGORIES.map((item, index) => (
          <CategoryCard 
            key={index} 
            item={item} 
            isLast={index === CATEGORIES.length - 1} 
            onClick={() => handleCardClick(item.id)}
          />
        ))}
      </div>


      {/* Login Prompt Dialog - Premium Design */}
      <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-white rounded-3xl shadow-2xl">
          <div className="relative">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-32 bg-[#2C3E2D]" />
            
            <div className="relative pt-12 px-8 pb-10 text-center">
              {/* Icon Circle */}
              <div className="mx-auto w-16 h-16 bg-[#FAF9F6] rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-white">
                <Lock className="w-6 h-6 text-[#2C3E2D]" />
              </div>

              <h3 className="text-2xl font-display text-[#1A1A1A] mb-4">
                Acesso à Curadoria <span className="italic font-light">Atmos</span>
              </h3>
              
              <p className="text-[#4A4A4A] font-sans font-light leading-relaxed mb-8">
                Para explorar nosso catálogo de cachoeiras, hospedagens e experiências exclusivas, é necessário possuir uma conta Atmos.
              </p>

              <div className="bg-[#F3F4F1] p-4 rounded-2xl mb-8 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#566952]" />
                <span className="text-[12px] font-bold text-[#566952] uppercase tracking-wider">Cadastro totalmente gratuito</span>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => handleStartLogin("signup")}
                  className="w-full h-14 bg-[#2C3E2D] hover:bg-[#1A261B] text-white rounded-xl font-bold uppercase tracking-widest text-[11px]"
                >
                  Criar Conta Gratuita
                </Button>
                
                <button 
                  onClick={() => handleStartLogin("login")}
                  className="py-3 text-[11px] uppercase tracking-widest font-bold text-[#2C3E2D]/50 hover:text-[#2C3E2D] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Já tenho uma conta
                </button>
              </div>
            </div>

            {/* Close trigger is handled by DialogContent, but we can add a custom X if needed */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual Auth Flow */}
      <AuthModal 
        open={isAuthModalOpen}
        defaultMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          // Optional: redirect or just stay
        }}
      />
    </section>
  );
}
