import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Experience, categoryLabels } from "@/data/experiences";
import { Heart, Clock, Footprints } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useExperienceGallery, getCardImage } from "./experienceImages";
import { OptimizedImage } from "../ui/OptimizedImage";

interface ExperienceCardProps {
  experience: Experience;
  onClick?: () => void;
}

export default function ExperienceCard({ experience, onClick }: ExperienceCardProps) {
  const { language } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  const inWishlist = isInWishlist(experience.id);
  // 1. Storage query for dynamic images (UUID or specific key)
  const { images: storageImages } = useExperienceGallery(experience.imageKey, experience.name.pt, experience.id);
  
  // 2. Static fallback for predefined items if storage is empty
  const staticFallback = getCardImage(experience.id, experience.imageKey);
  
  const cardImages = storageImages.length > 0 ? storageImages : [staticFallback];

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
      removeItem(experience.id);
      toast({ title: language === "pt" ? "Removida da wishlist" : "Removed from wishlist" });
    } else {
      addItem({
        id: experience.id,
        type: "experience",
        name: experience.name[language],
        details: `${categoryLabels[experience.category][language]}`,
        imageUrl: cardImages[0],
      });
      toast({ title: language === "pt" ? "Adicionada na wishlist" : "Added to wishlist" });
    }
  };

  return (
    <div
      className="group relative overflow-hidden cursor-pointer w-full aspect-[3/4] rounded-[2px] bg-[#1A261B] shadow-lg"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Image Carousel */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="popLayout">
          <OptimizedImage
            key={cardImages[currentIndex]}
            src={cardImages[currentIndex]}
            alt={experience.name[language]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: isHovering ? 1.15 : 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            containerClassName="w-full h-full"
            fallbackSrc="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"
          />
        </AnimatePresence>
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

      {/* Top Bar: Category & Wishlist */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {categoryLabels[experience.category][language]}
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
            {experience.name[language]}
          </h3>
          
          {/* Price: visible by default, hidden on hover */}
          <div className="flex flex-wrap gap-3 items-center text-white/95 text-[10px] tracking-wider uppercase font-bold group-hover:opacity-0 group-hover:h-0 group-hover:mb-0 mb-0 transition-all duration-300 overflow-hidden">
            <span className="flex items-center gap-1.5 text-[#a4b595] font-bold">
              {experience.priceRange}
            </span>
          </div>
        </div>

        {/* Expandable Content Area — shows description + price on hover */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden">
          <div className="min-h-0">
            <div className="pt-3 flex flex-col gap-3">
              <div className="h-[1px] w-full bg-white/20" />
              <p className="text-white/85 text-sm line-clamp-3 font-light leading-relaxed">
                {experience.description[language] || ""}
              </p>
              <span className="text-[#a4b595] text-[10px] font-bold tracking-wider uppercase">
                {experience.priceRange}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
