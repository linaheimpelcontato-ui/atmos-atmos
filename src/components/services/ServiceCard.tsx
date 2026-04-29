import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { motion } from "framer-motion";
import { type Service, categoryLabels, type ServiceCategory } from "@/data/services";
import { Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useServiceImages } from "./serviceImages";

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
}

export default function ServiceCard({ service, onClick }: ServiceCardProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  const inWishlist = isInWishlist(service.id);
  const { images: cardImages } = useServiceImages(service.id, service.category);
  const imageSrc = cardImages[0];

  const variations = (service.variations || (service as any).variables?.variations || []) as any[];
  const minPrice = variations.length > 0 
    ? Math.min(...variations.map(v => parseFloat(v.unit_price) || 0))
    : null;

  const displayPrice = minPrice 
    ? (language === "pt" ? `A partir de R$ ${minPrice}` : `From R$ ${minPrice}`)
    : service.price;

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeItem(service.id);
      toast({ title: language === "pt" ? "Removido da wishlist" : "Removed from wishlist" });
    } else {
      addItem({
        id: service.id,
        type: "service",
        name: service.title[language],
        details: `${categoryLabels[service.category][language]}`,
        imageUrl: imageSrc,
      });
      toast({ title: language === "pt" ? "Adicionado na wishlist" : "Added to wishlist" });
    }
  };

  return (
    <div
      className="group relative overflow-hidden cursor-pointer w-full aspect-[3/4] rounded-[2px] bg-[#1A261B] shadow-lg"
      onClick={onClick}
    >
      {/* Background Image - Multi-layer for fluid transitions */}
      <div className="absolute inset-0 w-full h-full bg-[#1A261B]">
        <motion.img
          src={imageSrc}
          alt={service.title[language]}
          initial={false}
          animate={{ 
            scale: 1.1 
          }}
          whileHover={{ scale: 1.15 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
      </div>
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity duration-500" />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />

      {/* Top Bar: Category & Wishlist */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {categoryLabels[service.category][language]}
        </span>

        <button
          onClick={toggleWishlist}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all font-bold"
        >
          <Heart className={`w-4 h-4 ${inWishlist ? "text-rose-500 fill-rose-500" : "text-white"}`} />
        </button>
      </div>

      {/* Bottom Content: Aligned bottom-left ALWAYS */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex flex-col justify-end min-h-[40%]">
        <div className="flex flex-col">
          <h3 className="font-display text-2xl text-white mb-2 leading-tight drop-shadow-md">
            {service.title[language]}
          </h3>
          
          <div className="flex flex-wrap gap-3 items-center text-white/95 text-[10px] tracking-wider uppercase font-bold">
            <span className="flex items-center gap-1.5 text-[#a4b595] font-bold">
              {service.subtitle[language as keyof typeof service.subtitle]}
            </span>
            {displayPrice && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5 text-white decoration-[#a4b595]/50 underline underline-offset-4">
                  {displayPrice}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Expandable Content Area */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden">
          <div className="min-h-0">
            <div className="pt-4 flex flex-col gap-3">
              <div className="h-[1px] w-full bg-white/20" />
              <p className="text-white/80 text-sm line-clamp-2 md:line-clamp-3 font-light leading-relaxed">
                {service.description[language]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
