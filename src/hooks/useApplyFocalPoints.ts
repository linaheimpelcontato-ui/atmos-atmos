import { useEffect } from "react";
import { useFocalPoints, type FocalPoint } from "@/hooks/useFocalPoints";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * DOM-based hook that finds all <img> elements matching stored focal points
 * and applies objectPosition + scale + rotation transforms directly.
 * Called once in Layout.tsx.
 */
export function useApplyFocalPoints() {
  const { data: focalPoints } = useFocalPoints();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!focalPoints || focalPoints.length === 0) return;

    const applied = new WeakSet<HTMLImageElement>();

    function applyToImage(img: HTMLImageElement) {
      const src = img.src || img.getAttribute("src") || "";
      if (!src) return;

      const match = src.match(
        /\/storage\/v1\/(?:object|render\/image)\/public\/assets\/(.+?)(?:\?|$)/
      );
      const path = match ? match[1] : src;

      const fp = focalPoints!.find((f) => path.includes(f.image_path));
      if (!fp) return;

      const x = isMobile ? (fp.focal_x_mobile ?? fp.focal_x) : fp.focal_x;
      const y = isMobile ? (fp.focal_y_mobile ?? fp.focal_y) : fp.focal_y;
      const sc = isMobile ? (fp.scale_mobile ?? 1) : (fp.scale ?? 1);
      const rot = isMobile ? (fp.rotation ?? 0) : 0;

      const computed = window.getComputedStyle(img);
      if (computed.objectFit !== "cover") return;

      img.style.objectPosition = `${x}% ${y}%`;

      // Ensure parent clips overflow for scale/rotation
      const parent = img.parentElement;
      if (parent) {
        const parentOverflow = window.getComputedStyle(parent).overflow;
        if (parentOverflow === "visible" && (sc > 1 || rot === 90 || rot === 270)) {
          parent.style.overflow = "hidden";
        }
      }

      if ((rot === 90 || rot === 270) && isMobile) {
        // Coverage scale approach: rotate + scale to fill container
        if (!parent) return;
        const cW = parent.offsetWidth || parent.clientWidth;
        const cH = parent.offsetHeight || parent.clientHeight;
        if (cW <= 0 || cH <= 0) return;

        const deg = rot === 90 ? 90 : -90;
        const coverScale = Math.max(cW / cH, cH / cW);
        const finalScale = coverScale * sc;

        img.style.transform = `rotate(${deg}deg) scale(${finalScale})`;
        img.style.transformOrigin = "center center";
      } else if (sc > 1) {
        // Scale only (no rotation)
        img.style.transform = `scale(${sc})`;
        img.style.transformOrigin = `${x}% ${y}%`;
      } else {
        // Reset any transform styles
        img.style.position = "";
        img.style.left = "";
        img.style.top = "";
        img.style.width = "";
        img.style.height = "";
        img.style.transform = "";
        img.style.transformOrigin = "";
      }

      applied.add(img);
    }

    function processAll() {
      const imgs = document.querySelectorAll<HTMLImageElement>("img");
      imgs.forEach((img) => {
        if (!applied.has(img)) {
          if (img.complete) {
            applyToImage(img);
          } else {
            img.addEventListener("load", () => applyToImage(img), { once: true });
          }
        }
      });
    }

    processAll();

    const observer = new MutationObserver((mutations) => {
      let hasNewImages = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLImageElement) hasNewImages = true;
          if (node instanceof HTMLElement && node.querySelector("img")) hasNewImages = true;
        }
      }
      if (hasNewImages) processAll();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [focalPoints, isMobile]);
}
