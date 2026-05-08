import { optimizedUrl, IMAGE_PRESETS, storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";
import type { ServiceCategory } from "@/data/services";

export const serviceImages: Record<ServiceCategory, string[]> = {
  alimentacao: [
    optimizedUrl("servicos/lanche.jpg", IMAGE_PRESETS.gallery),
    "https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80",
    "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=800&q=80"
  ],
  registros: [
    optimizedUrl("servicos/drone.jpg", IMAGE_PRESETS.gallery),
    "https://images.unsplash.com/photo-1508674861872-a51e06c50c9b?w=800&q=80",
    "https://images.unsplash.com/photo-1473963342623-0ca006d29278?w=800&q=80"
  ],
  transfers: [
    optimizedUrl("servicos/transfer.jpg", IMAGE_PRESETS.gallery),
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80"
  ],
  especial: [
    optimizedUrl("servicos/especial.jpg", IMAGE_PRESETS.gallery),
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80",
    "https://images.unsplash.com/photo-1530103043960-ef38714abb15?w=800&q=80"
  ],
};

export function useServiceImages(id: string, category: ServiceCategory, storageId?: string) {
  const query = useStorageImages("produtos/serviços", storageId || "");
  const idQuery = useStorageImages("produtos/serviços", id);

  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  const uniqueImages = Array.from(new Set(allImages));

  // Fallback to category defaults while loading or if empty
  const fallback = serviceImages[category] || [storageUrl(`servicos/${category}.jpg`)];

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}
