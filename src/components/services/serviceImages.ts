import { optimizedUrl, IMAGE_PRESETS, storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";
import type { ServiceCategory } from "@/data/services";

export const serviceImages: Record<ServiceCategory, string[]> = {
  alimentacao: [
    optimizedUrl("servicos/lanche.jpg", IMAGE_PRESETS.gallery)
  ],
  registros: [
    optimizedUrl("servicos/drone.jpg", IMAGE_PRESETS.gallery)
  ],
  transfers: [
    optimizedUrl("servicos/transfer.jpg", IMAGE_PRESETS.gallery)
  ],
  especial: [
    optimizedUrl("servicos/especial.jpg", IMAGE_PRESETS.gallery)
  ],
};

export function useServiceImages(id: string, category: ServiceCategory, storageId?: string) {
  const query = useStorageImages("produtos/servicos", storageId || "");
  const idQuery = useStorageImages("produtos/servicos", id);
  const accentQuery = useStorageImages("produtos/serviços", storageId || "");
  const accentIdQuery = useStorageImages("produtos/serviços", id);

  const allImages = [
    ...(query.data || []), 
    ...(idQuery.data || []),
    ...(accentQuery.data || []),
    ...(accentIdQuery.data || [])
  ];
  const uniqueImages = Array.from(new Set(allImages));

  // Fallback to category defaults while loading or if empty
  const fallback = serviceImages[category] || [storageUrl(`servicos/${category}.jpg`)];

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}
