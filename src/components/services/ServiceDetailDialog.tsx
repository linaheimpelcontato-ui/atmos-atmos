import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Service, categoryLabels } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Heart, Camera, Utensils, Car, Sparkles, Check, ChevronLeft, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { serviceImages, useServiceImages } from "./serviceImages";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { OptimizedImage } from "../ui/OptimizedImage";
import { getStorageInfo } from "../admin/products/shared";
import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";

const iconMap = {
  registros: Camera,
  alimentacao: Utensils,
  transfers: Car,
  especial: Sparkles,
};

const labels = {
  pt: {
    addWishlist: "Adicionar na Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Serviço adicionado na wishlist!",
    removed: "Serviço removido da wishlist.",
    price: "Investimento",
    whatsapp: "Solicitar via WhatsApp",
    includes: "O que inclui",
    flavors: "Opções",
    back: "Voltar",
    about: "Sobre o serviço",
  },
  en: {
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Service added to wishlist!",
    removed: "Service removed from wishlist.",
    price: "Investment",
    whatsapp: "Request via WhatsApp",
    includes: "What's included",
    flavors: "Options",
    back: "Back",
    about: "About the service",
  },
  es: {
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Servicio agregado a la wishlist!",
    removed: "Servicio quitado de la wishlist.",
    price: "Inversión",
    whatsapp: "Solicitar vía WhatsApp",
    includes: "Incluye",
    flavors: "Opciones",
    back: "Volver",
    about: "Sobre el servicio",
  },
};

interface ServiceDetailDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ServiceDetailDialog({
  service,
  open,
  onOpenChange,
}: ServiceDetailDialogProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const [selectedVarIds, setSelectedVarIds] = useState<string[]>([]);

  // Sync selected variation when service changes
  useEffect(() => {
    const variations = (service?.variations || (service as any)?.variables?.variations || []) as any[];
    if (variations.length > 0 && selectedVarIds.length === 0) {
      setSelectedVarIds([variations[0].id]);
    } else if (variations.length === 0) {
      setSelectedVarIds([]);
    }
  }, [service?.id]);

  const toggleVariation = (id: string) => {
    setSelectedVarIds(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id) 
        : [...prev, id]
    );
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const variations = (service?.variations || (service as any)?.variables?.variations || []) as any[];
  const selectedVar = useMemo(() => 
    variations.find(v => v.id === selectedVarIds[selectedVarIds.length - 1]) || (variations.length > 0 ? variations[0] : null)
  , [variations, selectedVarIds]);

  const { images: allProductImages } = useServiceImages(service?.id || "", service?.category || "especial");

  const displayImages = useMemo(() => {
    if (selectedVar && selectedVar.media && selectedVar.media.length > 0) {
      const info = getStorageInfo(service as any);
      if (info) {
        return selectedVar.media.map((m: string) => optimizedUrl(`${info.folder}/${m}`, IMAGE_PRESETS.gallery));
      }
    }
    return allProductImages;
  }, [selectedVar, allProductImages, service]);

  if (!service || !open) return null;

  const l = labels[language as keyof typeof labels];
  const inWishlist = isInWishlist(service.id);
  const Icon = iconMap[service.category as keyof typeof iconMap] || Sparkles;

  const toggleWishlist = () => {
    if (variations.length > 0) {
      if (selectedVarIds.length === 0) {
        toast({ title: language === "pt" ? "Selecione pelo menos uma opção" : "Select at least one option", variant: "destructive" });
        return;
      }
      
      selectedVarIds.forEach(vid => {
        const v = variations.find(v => v.id === vid);
        if (v) {
          addItem({
            id: v.id,
            type: "service",
            name: `${service.title[language as keyof typeof service.title]} - ${v.name}`,
            details: categoryLabels[service.category][language as keyof typeof labels],
            imageUrl: (v.media && v.media.length > 0) ? optimizedUrl(`${getStorageInfo(service as any)?.folder}/${v.media[0]}`, IMAGE_PRESETS.gallery) : allProductImages[0]
          });
        }
      });
      toast({ title: language === "pt" ? "Opções adicionadas!" : "Options added!" });
      return;
    }

    if (inWishlist) {
      removeItem(service.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: service.id,
        type: "service",
        name: service.title[language as keyof typeof service.title],
        details: categoryLabels[service.category][language as keyof typeof labels],
      });
      toast({ title: l.added });
    }
  };

  const displayPrice = selectedVar 
    ? `R$ ${selectedVar.unit_price}` 
    : (service.price || "Sob consulta");

  const displayDescription = service.description[language as keyof typeof service.description];

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
              (variations.length === 0 && inWishlist)
                ? "bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100" 
                : "bg-[#1A261B] text-white hover:bg-black"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", (variations.length === 0 && inWishlist) ? "fill-rose-500 text-rose-500" : (variations.length > 0 ? "fill-rose-400 text-rose-400" : "fill-white text-white"))} />
            {variations.length > 0 ? (language === "pt" ? "Adicionar Selecionadas" : "Add Selected") : (inWishlist ? (language === "pt" ? "Favoritado" : "Wishlisted") : (language === "pt" ? "Salvar" : "Save"))}
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
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A267] flex items-center gap-2">
                <Icon className="w-3 h-3" />
                {categoryLabels[service.category][language]}
              </span>
              <h1 className="text-4xl md:text-7xl font-display text-[#1A261B] leading-[1.1]">
                {service.title[language]}
              </h1>
              <p className="text-lg md:text-xl text-[#1A261B]/60 font-light italic">
                {service.subtitle[language]}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto px-6 mb-16">
          <Carousel className="w-full">
            <CarouselContent>
              {displayImages.map((img, idx) => (
                <CarouselItem key={idx} className="basis-full md:basis-1/2">
                  <div className="aspect-[16/9] overflow-hidden rounded-[2px]">
                    <OptimizedImage
                      src={img} 
                      alt={`${service.title[language as keyof typeof service.title]} ${idx + 1}`}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
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
          
          {/* Left: Description & Options */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 border-b border-[#1A261B]/5 pb-4">
                {l.about}
              </h2>
              <div className="prose prose-stone max-w-none">
                <p className="text-lg md:text-xl text-[#2C3E2D]/80 font-light leading-relaxed">
                  {displayDescription}
                </p>
              </div>
            </div>

            {/* Variations Selector */}
            {variations.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-display text-[#1A261B] border-l-2 border-[#C5A267] pl-4 uppercase tracking-widest">
                  {l.flavors}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variations.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => toggleVariation(v.id)}
                      className={cn(
                        "group relative flex flex-col items-start p-6 rounded-[2px] border transition-all text-left",
                        selectedVarIds.includes(v.id) 
                          ? "bg-[#1A261B] border-[#1A261B] text-white shadow-xl scale-[1.02]" 
                          : "bg-[#F8F9F8] border-[#1A261B]/5 text-[#1A261B] hover:bg-white hover:border-[#1A261B]/20"
                      )}
                    >
                      <div className="flex justify-between items-center w-full mb-2">
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-widest",
                          selectedVarIds.includes(v.id) ? "text-white/60" : "text-[#1A261B]/40"
                        )}>
                          Variação
                        </span>
                        <span className={cn(
                          "text-xs font-mono font-bold",
                          selectedVarIds.includes(v.id) ? "text-[#C5A267]" : "text-[#C5A267]"
                        )}>
                          R$ {v.unit_price}
                        </span>
                      </div>
                      <h4 className="text-lg font-display mb-2">{v.name}</h4>
                      {v.description && (
                        <p className={cn(
                          "text-xs font-light leading-relaxed",
                          selectedVarIds.includes(v.id) ? "text-white/70" : "text-[#1A261B]/60"
                        )}>
                          {v.description}
                        </p>
                      )}
                      {selectedVarIds.includes(v.id) && (
                        <motion.div 
                          className="absolute top-4 right-4"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="bg-[#C5A267] rounded-full p-1">
                            <Check className="h-3 w-3 text-white" strokeWidth={4} />
                          </div>
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu / Items Section */}
            {service.items && (
              <div className="space-y-8">
                <h3 className="text-xl font-display text-[#1A261B] border-l-2 border-[#C5A267] pl-4">Opções Disponíveis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {service.items.map((item) => (
                    <div key={item.id} className="group p-6 bg-[#F8F9F8] rounded-[2px] hover:bg-[#F0F1F0] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-[#1A261B] text-sm tracking-wide">{item.name[language]}</h4>
                        {item.price && <span className="text-[#C5A267] text-[10px] font-bold tracking-widest">{item.price}</span>}
                      </div>
                      {item.flavors && (
                        <div className="mt-4 space-y-2">
                          {item.flavors[language].map((flavor, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-[#1A261B]/60 uppercase tracking-widest">
                               <div className="w-1 h-1 rounded-full bg-[#C5A267]" />
                               {flavor}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transfer Table */}

              {variations.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A267] mb-6">Variações</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#1A261B]/10">
                          {headers.map((h, i) => (
                            <th key={i} className="py-4 text-[10px] font-bold uppercase tracking-wider text-[#1A261B]/40">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-[#1A261B]/5 hover:bg-[#F8F9F8] transition-colors">
                            {row.map((val, j) => (
                              <td key={j} className="p-4 text-sm font-bold text-[#C5A267]">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button
                onClick={toggleWishlist}
                className="w-full md:w-auto rounded-full px-12 py-7 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl flex items-center justify-center gap-4 transform hover:scale-105 border border-white/10 bg-[#1A261B] text-white hover:bg-black"
              >
                <Heart className={cn("h-4 w-4 transition-colors", (variations.length === 0 && inWishlist) ? "fill-rose-500 text-rose-500" : "text-white/40")} />
                {variations.length > 0 
                  ? (language === "pt" ? "Adicionar à Lista" : "Add to List") 
                  : (inWishlist ? l.removeWishlist : l.addWishlist)}
              </Button>
            </div>

            {/* Right Column: Vertical Video */}
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
                    src={displayImages[3] || displayImages[0]} 
                    className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-1000 group-hover:scale-105" 
                    alt="Video thumbnail" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Photos Gallery (Pinterest/Cosmos Masonry) */}
        <section className="max-w-[1600px] mx-auto px-6 mb-32">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 mb-12 px-2">Galeria de Fotos</h2>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {displayImages.map((img, index) => (
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
                  alt={`${service.title[language]} gallery ${index + 1}`}
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
