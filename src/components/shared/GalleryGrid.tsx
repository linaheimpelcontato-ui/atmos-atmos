import React from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface GalleryGridProps {
  images: string[];
  alt: string;
  fallbackSrc?: string;
}

/**
 * Shared gallery grid used by Waterfall, Experience and Accommodation detail dialogs.
 * 3 columns on desktop (2 on mobile), uniform 4:3 aspect ratio, consistent 8px gap.
 */
export default function GalleryGrid({ images, alt, fallbackSrc }: GalleryGridProps) {
  if (!images || images.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-6 mb-20">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/30 mb-6 px-2">
        Galeria de Fotos
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden group aspect-[4/3] bg-[#f4f3f0]"
          >
            <OptimizedImage
              src={img}
              fallbackSrc={fallbackSrc}
              containerClassName="w-full h-full"
              alt={`${alt} ${idx + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
