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
            {service.transferTable && (
              <div className="space-y-6">
                <h3 className="text-xl font-display text-[#1A261B] border-l-2 border-[#C5A267] pl-4">
                  {service.transferTable.name[language]}
                </h3>
                <div className="bg-white border border-[#1A261B]/10 rounded-[2px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F8F9F8] border-b border-[#1A261B]/10">
                        {service.transferTable.columns.map((col, i) => (
                          <th key={i} className="text-left p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/40">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A261B]/5">
                      {service.transferTable.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#F8F9F8]/50 transition-colors">
                          <td className="p-4 text-sm font-medium text-[#2C3E2D]">{row.destination}</td>
                          {row.values.map((val, j) => (
                            <td key={j} className="p-4 text-sm font-bold text-[#C5A267]">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-8">
              <Button
                onClick={toggleWishlist}
                className="w-full md:w-auto rounded-full px-12 py-7 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl mt-8 flex items-center justify-center gap-4 transform hover:scale-105 border border-white/10 bg-[#1A261B] text-white hover:bg-black"
              >
                <Heart className={cn("w-4 h-4 transition-colors", (variations.length === 0 && inWishlist) ? "fill-rose-500 text-rose-500" : "text-white/40")} />
                {variations.length > 0 
                  ? (language === "pt" ? "Adicionar à Lista" : "Add to List") 
                  : (inWishlist ? l.removeWishlist : l.addWishlist)}
              </Button>
            </div>

            {/* Quick Info Grid moved here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-10 bg-[#F8F9F8] p-8 md:p-10 rounded-[2px] border border-[#1A261B]/5 mt-12">
              <div className="flex items-center gap-4">
                <DollarSign className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">{l.price}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {displayPrice}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Icon className="w-5 h-5 text-[#C5A267]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#1A261B]/40 mb-1">Categoria</span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#1A261B]">
                    {categoryLabels[service.category][language as keyof typeof labels]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Vertical Video & CTA info */}
          <div className="lg:col-span-5 space-y-12">
            <div className="aspect-[9/16] w-full max-w-[400px] mx-auto bg-[#F8F9F8] rounded-[2px] overflow-hidden relative group border border-[#1A261B]/5 shadow-sm">
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border border-[#1A261B]/20 flex items-center justify-center mx-auto bg-white/80 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-[#C5A267] border-b-[8px] border-b-transparent ml-1" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B] block drop-shadow-sm">Assista o vídeo</span>
                </div>
              </div>
              <OptimizedImage
                src={displayImages[0]} 
                className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-700 group-hover:scale-105" 
                alt="Video thumbnail" 
                containerClassName="w-full h-full"
              />
            </div>

            <div className="bg-[#1A261B] text-white rounded-[2px] p-8 space-y-6 shadow-2xl">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 border-b border-white/10 pb-2 block">
                {l.includes}
              </span>
              {service.tiers?.[0]?.includes?.[language]?.map((inc, idx) => (
                <div key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#C5A267] mt-1 shrink-0" />
                    <span className="text-sm font-light text-white/80">{inc}</span>
                </div>
              ))}
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] pt-4">
                Adicione este serviço à sua curadoria para que possamos integrá-lo à sua logística.
              </p>
            </div>
          </div>

        </section>

        {/* Cosmos-Style Grid Gallery */}
        <section className="max-w-[1400px] mx-auto px-6 mb-20">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 mb-8 px-2">Galeria de Fotos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
             <div className="col-span-2 row-span-2 relative overflow-hidden rounded-[2px] group">
                <OptimizedImage
                  src={displayImages[0]} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  alt={service.title[language]}
                  containerClassName="w-full h-full"
                />
             </div>
             <div className="col-span-1 row-span-1 relative overflow-hidden rounded-[2px] group bg-[#F8F9F8]">
                <img 
                  src={displayImages[1] || displayImages[0]} 
                  className="w-full h-full object-cover opacity-40 grayscale" 
                  alt="Placeholder 1"
                />
             </div>
             <div className="col-span-1 row-span-2 relative overflow-hidden rounded-[2px] group bg-[#F8F9F8]">
                <img 
                  src={displayImages[2] || displayImages[0]} 
                  className="w-full h-full object-cover opacity-40 grayscale" 
                  alt="Placeholder 2"
                />
             </div>
             <div className="col-span-1 row-span-1 relative overflow-hidden rounded-[2px] group bg-[#F8F9F8]">
                <img 
                  src={displayImages[0]} 
                  className="w-full h-full object-cover opacity-40 grayscale" 
                  alt="Placeholder 3"
                />
             </div>
          </div>
        </section>

      </main>

    </div>
  );
}
