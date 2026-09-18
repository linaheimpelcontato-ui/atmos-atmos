import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Accommodation, accRegionLabels, amenityLabels } from "@/data/accommodations";
import { Heart, MapPin, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAccImages } from "./accImages";

interface AccommodationCardProps {
  accommodation: Accommodation;
  onClick?: () => void;
}

export default function AccommodationCard({ accommodation, onClick }: AccommodationCardProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  const inWishlist = isInWishlist(accommodation.id);
  const { images: cardImages } = useAccImages(accommodation.storageId || accommodation.id, accommodation.name);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (cardImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cardImages.length);
    }, 4000); // 4 seconds for a more editorial, calm pace
    
    return () => clearInterval(interval);
  }, [cardImages.length]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeItem(accommodation.id);
      toast({ title: language === "pt" ? "Removida da wishlist" : "Removed from wishlist" });
    } else {
      addItem({
        id: accommodation.id,
        type: "accommodation",
        name: accommodation.name,
        details: `${accommodation.priceRange} — ${accRegionLabels[accommodation.region][language]}`,
        imageUrl: cardImages[0],
      });
      toast({ title: language === "pt" ? "Adicionada na wishlist" : "Added to wishlist" });
    }
  };

  const topAmenities = accommodation.amenities.slice(0, 2);

  return (
    <div
      className="group relative overflow-hidden cursor-pointer w-full aspect-[3/4] rounded-[2px] bg-[#1A261B] shadow-lg"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Image Carousel - Multi-layer for fluid transitions */}
      <div className="absolute inset-0 w-full h-full bg-[#1A261B]">
        {cardImages.map((src, idx) => (
          <motion.img
            key={src}
            src={src}
            initial={false}
            animate={{ 
              opacity: idx === currentIndex ? 1 : 0,
              scale: isHovering ? 1.15 : 1.1 
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: idx === currentIndex ? 1 : 0 }}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity duration-500 z-[1]" />
      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500 z-[1]" />

      {/* Progress indicators for carousel */}
      {isHovering && cardImages.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {cardImages.map((_, idx) => (
            <div 
              key={idx}
              className={`h-[2px] w-4 transition-all duration-300 ${idx === currentIndex ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}

      {/* Top Bar: Region & Wishlist */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <MapPin className="w-3 h-3" />
          {accRegionLabels[accommodation.region][language]}
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
            {accommodation.name}
          </h3>
          
          <div className="flex flex-wrap gap-2 items-center text-white/95 text-[10px] tracking-wider uppercase font-bold">
            <span className="text-[#a4b595] font-bold">
              {accommodation.priceRange}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> ATÉ {accommodation.totalCapacity}
            </span>
          </div>
        </div>

        {/* Expandable Content Area */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden">
          <div className="min-h-0">
            <div className="pt-4 flex flex-col gap-3">
              <div className="h-[1px] w-full bg-white/20" />
              <p className="text-white/80 text-sm line-clamp-2 md:line-clamp-3 font-light leading-relaxed">
                {accommodation.description?.[language]}
              </p>
              <div className="flex flex-wrap gap-2">
                {topAmenities.map((a) => (
                  <span key={a} className="text-[9px] uppercase font-bold tracking-wider text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-sm">
                    {amenityLabels[a]?.[language] || String(a).replace(/-/g, " ")}
                  </span>
                ))}
                {accommodation.amenities.length > 2 && (
                  <span className="text-[9px] uppercase font-bold tracking-wider text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-sm">
                    +{accommodation.amenities.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
