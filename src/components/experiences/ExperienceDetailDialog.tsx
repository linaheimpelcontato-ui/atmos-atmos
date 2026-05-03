import { useState, useEffect, useRef } from "react";
import { trackDetailView } from "@/lib/analytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Experience, categoryLabels } from "@/data/experiences";
import { Button } from "@/components/ui/button";
import { Heart, DollarSign, Tag, ChevronLeft, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useExperienceGallery } from "./experienceImages";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import GalleryGrid from "@/components/shared/GalleryGrid";


const labels = {
  pt: {
    price: "Investimento",
    category: "Perfil",
    addWishlist: "Adicionar na Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Experiência adicionada na wishlist!",
    removed: "Experiência removida da wishlist.",
    back: "Voltar",
    about: "Sobre a experiência",
    location: "Localização",
  },
  en: {
    price: "Investment",
    category: "Profile",
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Experience added to wishlist!",
    removed: "Experience removed from wishlist.",
    back: "Back",
    about: "About the experience",
    location: "Location",
  },
  es: {
    price: "Inversión",
    category: "Perfil",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Experiencia agregada a la wishlist!",
    removed: "Experiencia quitada de la wishlist.",
    back: "Volver",
    about: "Sobre la experiencia",
    location: "Ubicación",
  },
};

interface ExperienceDetailDialogProps {
  experience: Experience | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExperienceDetailDialog({
  experience,
  open,
  onOpenChange,
}: ExperienceDetailDialogProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const { images } = useExperienceGallery(experience?.imageKey || "", experience?.name.pt, experience?.id);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (experience) trackDetailView("experience", experience.name.pt);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!experience || !open) return null;

  const l = labels[language as keyof typeof labels] || labels.pt;
  const inWishlist = isInWishlist(experience.id);

  const toggleWishlist = () => {
    if (inWishlist) {
      removeItem(experience.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: experience.id,
        type: "experience",
        name: experience.name[language],
        details: experience.priceRange,
      });
      toast({ title: l.added });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-y-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-[#1A261B]/5 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => onOpenChange(false)}
          className="group flex items-center gap-2 text-[#1A261B]/40 hover:text-[#1A261B] transition-all"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-[#1A261B]/10 group-hover:border-[#1A261B]/40 group-hover:bg-[#1A261B]/5 transition-all">
            <ChevronLeft className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{l?.back || "Voltar"}</span>
        </button>

        <div className="flex items-center gap-4">
          <Button
            onClick={toggleWishlist}
            className={cn(
              "rounded-full px-8 py-5 transition-all duration-500 text-[10px] font-bold uppercase tracking-[0.2em] gap-3 shadow-sm",
              inWishlist
                ? "bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100" 
                : "bg-[#1A261B] text-white hover:bg-black"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", inWishlist ? "fill-rose-500 text-rose-500" : "fill-white text-white")} />
            {inWishlist ? "Favoritado" : "Salvar"}
          </Button>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 pb-20">
        
        {/* Title & Info Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12"
          >
            <div className="text-left space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A267] block">
                {categoryLabels[experience.category]?.[language as keyof typeof labels] || categoryLabels[experience.category]?.pt || "Aventura"}
              </span>
              <h1 className="text-4xl md:text-7xl font-display text-[#1A261B] leading-[1.1]">
                {experience.name?.[language as keyof typeof labels] || experience.name?.pt || "Atmos Experience"}
              </h1>
            </div>

            </div>
          </motion.div>
        </section>

        {/* Carousel Section */}
        <section className="max-w-7xl mx-auto px-6 mb-20">
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((img, index) => (
                <CarouselItem key={index} className="basis-full md:basis-2/3 lg:basis-1/2">
                  <div className="aspect-[16/9] overflow-hidden rounded-[2px]">
                    <OptimizedImage 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`${experience.name[language]} ${index + 1}`} 
                      fallbackSrc="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-4">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </section>
        {/* Content Section: Description + Vertical Video */}
        <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20 mb-20">
          
          {/* Left: Description */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 border-b border-[#1A261B]/5 pb-4">
                {l.about}
              </h2>
              <div className="prose prose-stone max-w-none">
                <p className="text-lg md:text-xl text-[#2C3E2D]/80 font-light leading-relaxed">
                  {experience.description[language as keyof typeof labels] || experience.description.pt}
                </p>
              </div>
            </div>

            <Button
              onClick={toggleWishlist}
              className={cn(
                "w-full md:w-auto rounded-full px-12 py-8 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl mt-8 flex items-center justify-center gap-4 transform hover:scale-105 border border-white/10",
                "bg-[#1A261B] text-white hover:bg-black"
              )}
            >
              <Heart className={cn("h-4 w-4 fill-current", inWishlist ? "text-rose-500" : "text-rose-400")} />
              {inWishlist ? l.removeWishlist : l.addWishlist}
            </Button>

            {/* Quick Info Grid moved here */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-10 bg-[#F8F9F8] p-8 md:p-10 rounded-[2px] border border-[#1A261B]/5 mt-12">
              <div className="flex items-center gap-4">
                <DollarSign className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l?.price || "Preço"}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {experience.priceRange || "Sob consulta"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Tag className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l?.category || "Categoria"}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {categoryLabels[experience.category]?.[language as keyof typeof labels] || categoryLabels[experience.category]?.pt || "Atmos"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <MapPin className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l?.location || "Local"}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    Chapada dos Veadeiros
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vertical Video */}
          <div className="lg:col-span-5">
            <div className="aspect-[9/16] w-full max-w-[400px] mx-auto bg-[#F8F9F8] rounded-[2px] overflow-hidden relative group border border-[#1A261B]/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border border-[#1A261B]/10 flex items-center justify-center mx-auto bg-white/50 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-[#C5A267] border-b-[8px] border-b-transparent ml-1" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B]/40 block">Assista o vídeo</span>
                </div>
              </div>
              <OptimizedImage 
                src={images[0]} 
                className="w-full h-full object-cover opacity-60 grayscale-[0.2]" 
                alt="Video thumbnail" 
                fallbackSrc="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"
              />
            </div>
          </div>

        </section>

        <GalleryGrid
          images={images}
          alt={experience.name[language as keyof typeof labels] || experience.name.pt}
          fallbackSrc="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"
        />

      </main>

    </div>
  );
}
