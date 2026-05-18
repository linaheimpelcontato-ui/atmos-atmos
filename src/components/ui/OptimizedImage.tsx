import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { motion, HTMLMotionProps } from "framer-motion";

interface OptimizedImageProps extends HTMLMotionProps<"img"> {
  src: string;
  fallbackSrcs?: string[];
  fallbackSrc?: string;
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  fallbackSrcs = [],
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
  const [allSrcs, setAllSrcs] = useState<string[]>([]);
  const [srcIndex, setSrcIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (imgRef.current?.complete && currentSrc) {
      setLoaded(true);
    }
  }, [currentSrc]);

  // Reset load states only when the primary src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setSrcIndex(0);
    setCurrentSrc(src);
  }, [src]);

  // Synchronize candidate pool without resetting load states or index
  useEffect(() => {
    const list = [src];
    if (fallbackSrcs && fallbackSrcs.length > 0) {
      fallbackSrcs.forEach(s => {
        if (s && !list.includes(s)) list.push(s);
      });
    }
    setAllSrcs(list);
  }, [src, JSON.stringify(fallbackSrcs)]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.persist();
    
    // Defer state updates asynchronously to guarantee we never overflow the call stack
    setTimeout(() => {
      if (!isMountedRef.current) return;

      // Stage 0: Try next fallbackSrc in our list
      if (srcIndex < allSrcs.length - 1) {
        const nextIndex = srcIndex + 1;
        console.log(`[Atmos] Image load failed: ${currentSrc}. Trying next candidate (${nextIndex + 1}/${allSrcs.length}): ${allSrcs[nextIndex]}`);
        setSrcIndex(nextIndex);
        setCurrentSrc(allSrcs[nextIndex]);
        setLoaded(false);
        return;
      }
      
      // Stage 1: If optimized URL failed, try the original storage URL
      if (currentSrc.includes('wsrv.nl')) {
        try {
          const urlParam = new URL(currentSrc).searchParams.get('url');
          if (urlParam) {
            const original = decodeURIComponent(urlParam);
            console.log(`[Atmos] Wsrv.nl Resizing failed. Falling back to original: ${original}`);
            setCurrentSrc(original);
            setLoaded(false);
            return;
          }
        } catch (err) {
          console.error("Failed to parse wsrv.nl image URL fallback", err);
        }
      }

      // Legacy fallback for Supabase render service
      if (currentSrc.includes('/render/image/')) {
        const original = currentSrc.replace('/render/image/', '/object/').split('?')[0];
        setCurrentSrc(original);
        setLoaded(false);
        return;
      }

      // Stage 2: Try bare filename if indexed failed
      if (currentSrc.includes('/storage/v1/object/') && currentSrc.includes('-1.')) {
        const bare = currentSrc.replace('-1.', '.');
        setLoaded(false);
        setCurrentSrc(bare);
        return;
      }

      // Stage 3: Placeholder Fallback
      if (!error) {
        console.warn(`[Atmos] Image load failed: ${src}. Falling back to placeholder.`);
        setError(true);
        setLoaded(true);
        setCurrentSrc(fallbackSrc);
      }
      if (onError) onError(e);
    }, 0);
  };

  if (error) {
    return (
      <div className={cn("relative overflow-hidden bg-[#242f25] flex items-center justify-center", containerClassName)}>
        <img 
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=500&q=75" 
          className="w-full h-full object-cover opacity-40 grayscale"
          alt="Fallback"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#242f25]", containerClassName)}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A261B] to-[#2A362B] animate-pulse" />
      )}
      <motion.img
        ref={imgRef}
        src={currentSrc}
        alt={alt || "Atmos Expedition"}
        onLoad={(e) => {
          setLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={handleError}
        className={cn(
          "transition-opacity duration-500",
          !loaded ? "opacity-0" : "opacity-100",
          className
        )}
        loading={props.loading || "lazy"}
        {...(props as any)}
      />
    </div>
  );
}
