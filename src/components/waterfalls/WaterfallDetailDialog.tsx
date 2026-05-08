import { useEffect } from "react";
import { trackDetailView } from "@/lib/analytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import {
  type Waterfall,
  difficultyLabels,
  seasonalityLabels,
  regionLabels,
} from "@/data/waterfalls";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Car,
  Footprints,
  Shield,
  Mountain,
  Droplets,
  Sun,
  Calendar,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWaterfallImages } from "@/components/waterfalls/waterfallImages";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import GalleryGrid from "@/components/shared/GalleryGrid";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const seasonalityIcons: Record<string, typeof Droplets> = {
  chuva: Droplets,
  seca: Sun,
  anual: Calendar,
};

const labels = {
  pt: {
    trail: "Trilha",
    car: "Acesso",
    guide: "Guia obrigatório",
    noGuide: "Sem guia",
    region: "Região",
    difficulty: "Dificuldade",
    season: "Sazonalidade",
    guideLabel: "Guia",
    addWishlist: "Adicionar na Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Cachoeira adicionada na wishlist!",
    removed: "Cachoeira removida da wishlist.",
    back: "Voltar",
    about: "Sobre a cachoeira",
    location: "Localização",
    requires4x4: "Necessário 4x4",
  },
  en: {
    trail: "Trail",
    car: "Access",
    guide: "Guide required",
    noGuide: "No guide needed",
    region: "Region",
    difficulty: "Difficulty",
    season: "Seasonality",
    guideLabel: "Guide",
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Waterfall added to wishlist!",
    removed: "Waterfall removed from wishlist.",
    back: "Back",
    about: "About the waterfall",
    location: "Location",
    requires4x4: "4x4 Required",
  },
  es: {
    trail: "Sendero",
    car: "Acceso",
    guide: "Guía obligatorio",
    noGuide: "Sin guía",
    region: "Región",
    difficulty: "Dificultad",
    season: "Temporada",
    guideLabel: "Guía",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Cascada agregada a la wishlist!",
    removed: "Cascada quitada de la wishlist.",
    back: "Volver",
    about: "Sobre la cascada",
    location: "Ubicación",
    requires4x4: "Necesario 4x4",
  },
};

interface WaterfallDetailDialogProps {
  waterfall: Waterfall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WaterfallDetailDialog({
  waterfall,
  open,
  onOpenChange,
}: WaterfallDetailDialogProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const { images } = useWaterfallImages(waterfall?.storageId || waterfall?.id || "", waterfall?.name.pt || "");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (waterfall) trackDetailView("waterfall", waterfall.name.pt);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!waterfall || !open) return null;

  const l = labels[language];
  const inWishlist = isInWishlist(waterfall.id);
  const SeasonIcon = seasonalityIcons[waterfall.seasonality];

  const toggleWishlist = () => {
    if (inWishlist) {
      removeItem(waterfall.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: waterfall.id,
        type: "waterfall",
        name: waterfall.name[language],
        details: `${waterfall.distanceKm}km — ${difficultyLabels[waterfall.difficulty][language]}`,
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
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{l.back}</span>
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
                {regionLabels[waterfall.region][language]}
              </span>
              <h1 className="text-4xl md:text-7xl font-display text-[#1A261B] leading-[1.1]">
                {waterfall.name[language]}
              </h1>
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto px-6 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {images.slice(0, 3).map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="aspect-[4/5] overflow-hidden rounded-[2px] border border-[#1A261B]/5"
              >
                <img 
                  src={img} 
                  className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700 hover:scale-110" 
                  alt={`${waterfall.name[language]} ${index + 1}`} 
                />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="grid lg:grid-cols-12 gap-16 md:gap-24">
            <div className="lg:col-span-7">
              <div className="prose prose-stone max-w-none">
                <p className="text-xl md:text-2xl text-[#1A261B]/80 leading-relaxed font-light mb-12">
                  {waterfall.description[language]}
                </p>
              </div>

              <Button
                onClick={toggleWishlist}
                className="w-full md:w-auto rounded-full px-12 py-7 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl flex items-center justify-center gap-4 transform hover:scale-105 border border-white/10 bg-[#1A261B] text-white hover:bg-black"
              >
                <Heart className={cn("h-4 w-4 fill-current", inWishlist ? "text-rose-500" : "text-rose-400")} />
                {inWishlist ? l.removeWishlist : l.addWishlist}
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-12 bg-[#F8F9F8] p-8 md:p-10 rounded-[2px] border border-[#1A261B]/5 mt-12">
                <div className="flex items-center gap-4">
                  <Mountain className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">Dificuldade</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {difficultyLabels[waterfall.difficulty][language]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">Localização</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {regionLabels[waterfall.region][language]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Shield className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">Guia</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {waterfall.requiresGuide ? l.guide : l.noGuide}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Footprints className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.trail}</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {waterfall.distanceKm}KM
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Car className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.car}</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {waterfall.distanceCarKm}KM
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <SeasonIcon className="w-5 h-5 text-[#C5A267]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.season}</span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                      {seasonalityLabels[waterfall.seasonality][language]}
                    </span>
                  </div>
                </div>

                {waterfall.requires4x4 && (
                  <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                    <Car className="w-5 h-5 text-[#C5A267] fill-[#C5A267]/20" />
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">Tração</span>
                      <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                        {l.requires4x4}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-24">
                <div className="aspect-[9/16] bg-[#F8F9F8] rounded-[2px] overflow-hidden relative group border border-[#1A261B]/5 shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center mx-auto bg-white/10 backdrop-blur-md group-hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[15px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white block drop-shadow-lg">Assista o vídeo</span>
                    </div>
                  </div>
                  <img 
                    src={images[3] || images[0]} 
                    className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-1000 group-hover:scale-105" 
                    alt="Video thumbnail" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1600px] mx-auto px-6 mb-32">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 mb-12 px-2">{l.gallery}</h2>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {images.map((img, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="break-inside-avoid relative overflow-hidden rounded-[2px] group cursor-pointer border border-[#1A261B]/5"
              >
                <img 
                  src={img} 
                  className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105" 
                  alt={`${waterfall.name[language]} gallery ${index + 1}`}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
