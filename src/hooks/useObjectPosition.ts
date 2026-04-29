import { useFocalPoints } from "@/hooks/useFocalPoints";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Returns a function that gives CSS styles for an image based on focal points.
 * Note: For rotation to work correctly, the caller needs container dimensions.
 * For most cases, use useApplyFocalPoints() in Layout instead (DOM-based).
 * This hook is kept as a lightweight utility for non-rotated focal positioning.
 */
export function useObjectPosition() {
  const { data: focalPoints } = useFocalPoints();
  const isMobile = useIsMobile();

  return (imageUrl: string): React.CSSProperties => {
    if (!focalPoints || !imageUrl) return {};

    const match = imageUrl.match(
      /\/storage\/v1\/(?:object|render\/image)\/public\/assets\/(.+?)(?:\?|$)/
    );
    const path = match ? match[1] : imageUrl;

    const fp = focalPoints.find((f) => path.includes(f.image_path));
    if (!fp) return {};

    const x = isMobile ? (fp.focal_x_mobile ?? fp.focal_x) : fp.focal_x;
    const y = isMobile ? (fp.focal_y_mobile ?? fp.focal_y) : fp.focal_y;

    // Only return objectPosition — rotation is handled by useApplyFocalPoints DOM hook
    return { objectPosition: `${x}% ${y}%` };
  };
}
