import { useEffect } from "react";
import { trackDetailView } from "@/lib/analytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import {
  type Accommodation,
  accRegionLabels,
  amenityLabels,
} from "@/data/accommodations";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Users, DollarSign, ChevronLeft, Home, Instagram, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAccImages } from "./accImages";
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

const unitsLabels = {
  pt: { one: "unidade", other: "unidades" },
  en: { one: "unit", other: "units" },
  es: { one: "unidad", other: "unidades" },
};

const labels = {
  pt: {
    price: "Investimento",
    capacity: "Capacidade",
    units: "Acomodações",
    amenities: "Comodidades",
    guests: "hóspedes",
    addWishlist: "Adicionar na Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Hospedagem adicionada na wishlist!",
    removed: "Hospedagem removida da wishlist.",
    back: "Voltar",
    about: "Sobre a hospedagem",
    location: "Localização",
  },
  en: {
    price: "Investment",
    capacity: "Capacity",
    units: "Units",
    amenities: "Amenities",
    guests: "guests",
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Accommodation added to wishlist!",
    removed: "Accommodation removed from wishlist.",
    back: "Back",
    about: "About the property",
    location: "Location",
  },
  es: {
    price: "Inversión",
    capacity: "Capacidad",
    units: "Unidades",
    amenities: "Comodidades",
    guests: "huéspedes",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Hospedaje agregado a la wishlist!",
    removed: "Hospedaje quitado de la wishlist.",
    back: "Volver",
    about: "Sobre la propiedad",
    location: "Ubicación",
  },
};

interface AccommodationDetailDialogProps {
  accommodation: Accommodation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccommodationDetailDialog({
  accommodation,
  open,
  onOpenChange,
}: AccommodationDetailDialogProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const { images } = useAccImages(accommodation?.id || "", accommodation?.name || "");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (accommodation) trackDetailView("accommodation", accommodation.name);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!accommodation || !open) return null;

  const l = labels[language];
  const inWishlist = isInWishlist(accommodation.id);
  const descriptionText = accommodation.longDescription?.[language] || accommodation.description[language];

  const toggleWishlist = () => {
    if (inWishlist) {
      removeItem(accommodation.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: accommodation.id,
        type: "accommodation",
        name: accommodation.name,
        details: `${accommodation.priceRange} — ${accRegionLabels[accommodation.region][language]}`,
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
                {accRegionLabels[accommodation.region][language]}
              </span>
              <h1 className="text-4xl md:text-7xl font-display text-[#1A261B] leading-[1.1]">
                {accommodation.name}
              </h1>
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
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`${accommodation.name} ${index + 1}`} 
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
                <p className="text-lg md:text-xl text-[#2C3E2D]/80 font-light leading-relaxed whitespace-pre-line">
                  {descriptionText}
                </p>
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-6">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 border-b border-[#1A261B]/5 pb-4">
                {l.amenities}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {accommodation.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-3 bg-[#F8F9F8] p-4 rounded-[2px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A267]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B]">
                      {amenityLabels[a][language]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Links Section */}
            {(accommodation.website || accommodation.instagram) && (
              <div className="flex flex-wrap gap-4 pt-8">
                {accommodation.website && (
                  <a
                    href={accommodation.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1A261B] hover:text-[#C5A267] transition-colors bg-[#F8F9F8] px-6 py-4 rounded-[2px]"
                  >
                    <Globe className="w-4 h-4" />
                    Site oficial
                  </a>
                )}
                {accommodation.instagram && (
                  <a
                    href={`https://instagram.com/${accommodation.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1A261B] hover:text-[#C5A267] transition-colors bg-[#F8F9F8] px-6 py-4 rounded-[2px]"
                  >
                    <Instagram className="w-4 h-4" />
                    @{accommodation.instagram}
                  </a>
                )}
              </div>
            )}

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
            <div className="grid grid-cols-2 gap-y-8 gap-x-10 bg-[#F8F9F8] p-8 md:p-10 rounded-[2px] border border-[#1A261B]/5 mt-12">
              <div className="flex items-center gap-4">
                <DollarSign className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.price}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {accommodation.priceRange}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <MapPin className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.location}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {accRegionLabels[accommodation.region][language]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Home className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.units}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {accommodation.units} {accommodation.units === 1 ? unitsLabels[language].one : unitsLabels[language].other}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.capacity}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {accommodation.totalCapacity} {l.guests}
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
              <img 
                src={images[0]} 
                className="w-full h-full object-cover opacity-60 grayscale-[0.2]" 
                alt="Video thumbnail" 
              />
            </div>
          </div>

        </section>

        <GalleryGrid
          images={images}
          alt={accommodation.name}
        />
      </main>
    </div>
  );
}
