import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { imageSources } from "@/lib/imageSources";
import { motion, type HTMLMotionProps } from "framer-motion";

interface OptimizedImageProps extends HTMLMotionProps<"img"> {
  src: string;
  fallbackSrcs?: string[];
  fallbackSrc?: string;
  containerClassName?: string;
}

export function OptimizedImage({ src, fallbackSrcs, fallbackSrc, ...props }: OptimizedImageProps) {
  const sources = imageSources(src, fallbackSrcs, fallbackSrc);
  // A new source starts a new lifecycle; late events cannot advance the new image.
  return <ImageAttempt key={JSON.stringify(sources)} sources={sources} {...props} />;
}

function ImageAttempt({ sources, className, containerClassName, alt, onLoad, onError, ...props }:
  Omit<OptimizedImageProps, "src" | "fallbackSrcs" | "fallbackSrc"> & { sources: string[] }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const currentSrc = sources[index];

  useEffect(() => {
    setLoaded(!!imgRef.current?.complete && imgRef.current.naturalWidth > 0);
  }, [currentSrc]);

  if (!currentSrc) {
    return (
      <div className={cn("relative overflow-hidden bg-[#242f25] flex items-center justify-center", containerClassName)}
        role={alt ? "img" : undefined} aria-label={alt ? `${alt} — imagem indisponível` : undefined}>
        <span className="text-xs text-white/70 p-4">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#242f25]", containerClassName)}>
      {!loaded && <div className="absolute inset-0 bg-gradient-to-br from-[#1A261B] to-[#2A362B] animate-pulse" />}
      <motion.img
        {...props}
        key={currentSrc}
        ref={imgRef}
        src={currentSrc}
        alt={alt ?? ""}
        loading={props.loading ?? "lazy"}
        className={cn("transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)}
        onLoad={(event) => { setLoaded(true); onLoad?.(event); }}
        onError={(event) => {
          setLoaded(false);
          setIndex(previous => previous === index ? previous + 1 : previous);
          if (index === sources.length - 1) onError?.(event);
        }}
      />
    </div>
  );
}
