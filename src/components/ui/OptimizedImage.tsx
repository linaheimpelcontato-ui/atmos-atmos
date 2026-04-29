import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { motion, HTMLMotionProps } from "framer-motion";

interface OptimizedImageProps extends HTMLMotionProps<"img"> {
  src: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  fallbackSrc = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80",
  className,
  containerClassName,
  alt,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Stage 1: If optimized URL failed, try the original storage URL
    if (currentSrc.includes('/render/image/')) {
      const original = currentSrc.replace('/render/image/', '/object/').split('?')[0];
      setLoaded(false);
      setCurrentSrc(original);
      return;
    }

    // Stage 2: Try bare filename if indexed failed
    if (currentSrc.includes('/storage/v1/object/') && currentSrc.includes('-1.')) {
      const bare = currentSrc.replace('-1.', '.');
      setLoaded(false);
      setCurrentSrc(bare);
      return;
    }

    // Stage 3: Global Folder Fallback
    // If we've tried original and bare in the current folder and it still fails, 
    // try other common folders for the same filename
    const folders = ['experiencias', 'cachoeiras', 'hospedagens', 'roteiros', 'servicos'];
    const currentPath = currentSrc.split('/public/assets/')[1]?.split('?')[0];
    if (currentPath) {
      const currentFolder = currentPath.split('/')[0];
      const fileName = currentPath.split('/').pop();
      const nextFolderIdx = folders.indexOf(currentFolder) + 1;
      
      if (nextFolderIdx < folders.length) {
        const nextFolder = folders[nextFolderIdx];
        const nextSrc = currentSrc.replace(`/assets/${currentFolder}/`, `/assets/${nextFolder}/`);
        setLoaded(false); // Reset to re-trigger onLoad
        setCurrentSrc(nextSrc);
        return;
      }
    }

    // Stage 4: Final fallback to placeholder
    if (!error) {
      console.warn(`[Atmos] Image load failed: ${src}. Falling back to placeholder.`);
      setError(true);
      setLoaded(true); // Remove blur for the final fallback
      setCurrentSrc(fallbackSrc);
    }
    if (onError) onError(e);
  };

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {!loaded && !error && (
        <Skeleton className="absolute inset-0 w-full h-full bg-[#1A261B]/5 animate-pulse" />
      )}
      <motion.img
        src={currentSrc}
        alt={alt || "Atmos Expedition"}
        onLoad={(e) => {
          setLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={handleError}
        className={cn(
          "transition-opacity duration-700",
          !loaded ? "opacity-0" : "opacity-100",
          className
        )}
        loading="lazy"
        {...(props as any)}
      />
    </div>
  );
}
