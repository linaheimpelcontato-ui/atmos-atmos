import { useEffect, useRef, useState } from "react";

interface ParallaxDividerProps {
  image: string;
  alt?: string;
  height?: string;
  overlay?: string;
  children?: React.ReactNode;
  speed?: number;
}

export default function ParallaxDivider({
  image,
  alt = "Chapada dos Veadeiros",
  height = "h-64 md:h-80",
  overlay = "bg-black/30",
  children,
  speed = 0.35,
}: ParallaxDividerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.bottom < -100 || rect.top > windowH + 100) return;
      const center = rect.top + rect.height / 2 - windowH / 2;
      // Clamp offset to prevent exposing background
      const maxOffset = rect.height * 0.25;
      const raw = center * speed;
      setOffset(Math.max(-maxOffset, Math.min(maxOffset, raw)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <section
      ref={sectionRef}
      className={`relative ${height} overflow-hidden`}
      aria-label={alt}
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-[160%] object-cover will-change-transform"
        style={{ transform: `translate3d(0, ${offset}px, 0)`, top: "-30%" }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
      {children && (
        <div className="relative z-10 h-full flex items-center justify-center">
          {children}
        </div>
      )}
    </section>
  );
}
