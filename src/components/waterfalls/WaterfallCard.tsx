import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Waterfall, difficultyLabels, seasonalityLabels } from "@/data/waterfalls";
import { Heart, Footprints, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWaterfallImages } from "@/components/waterfalls/waterfallImages";

interface WaterfallCardProps {
  waterfall: Waterfall;
  onClick?: () => void;
}

export default function WaterfallCard({ waterfall, onClick }: WaterfallCardProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  const inWishlist = isInWishlist(waterfall.id);
  const { images: cardImages } = useWaterfallImages(waterfall.id, waterfall.imageIndex);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (cardImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cardImages.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [cardImages.length]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeItem(waterfall.id);
      toast({ title: language === "pt" ? "Removido da wishlist" : "Removed from wishlist" });
    } else {
      addItem({
        id: waterfall.id,
        type: "waterfall",
        name: waterfall.name[language],
        details: `${waterfall.distanceKm}km — ${difficultyLabels[waterfall.difficulty][language]}`,
        imageUrl: cardImages[0],
      });
      toast({ title: language === "pt" ? "Adicionado na wishlist" : "Added to wishlist" });
    }
  };

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
            loading={idx === 0 ? "eager" : "lazy"}
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

      {/* Top Bar: Difficulty & Wishlist */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {difficultyLabels[waterfall.difficulty][language]}
        </span>

        <button
          onClick={toggleWishlist}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
        >
          <Heart className={`w-4 h-4 ${inWishlist ? "text-rose-500 fill-rose-500" : "text-white"}`} />
        </button>
      </div>

      {/* Bottom Content: Aligned bottom-left ALWAYS */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex flex-col justify-end min-h-[40%]">
        <div className="flex flex-col">
          <h3 className="font-display text-2xl text-white mb-2 leading-tight drop-shadow-md">
            {waterfall.name[language]}
          </h3>
          
          <div className="flex flex-wrap gap-3 items-center text-white/95 text-[10px] tracking-wider uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5" /> {waterfall.distanceKm}KM TRILHA
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="flex items-center gap-1.5">
              {seasonalityLabels[waterfall.seasonality][language]}
            </span>
          </div>
        </div>

        {/* Expandable Content Area */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden">
          <div className="min-h-0">
            <div className="pt-4 flex flex-col gap-3">
              <div className="h-[1px] w-full bg-white/20" />
              <p className="text-white/80 text-sm line-clamp-2 md:line-clamp-3 font-light leading-relaxed">
                {waterfall.description[language]}
              </p>
              {waterfall.requiresGuide && (
                <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-[#a4b595]">
                  <Shield className="w-3.5 h-3.5" /> Requer Guia
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
