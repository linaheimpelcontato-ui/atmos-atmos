import { optimizedUrl, IMAGE_PRESETS, storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";
import type { ServiceCategory } from "@/data/services";

/** 
 * Map of service IDs or categories to their EXACT storage paths.
 * Ensures instant loading by bypassing bucket discovery.
 */
const serviceSpecifics: Record<string, string> = {
  "transfers": "produtos/servicos/transfer.jpg",
  "seguro-viagem": "produtos/servicos/seguro.jpg",
  "lanche-de-trilha": "produtos/servicos/lanche.jpg",
  "registro-drone": "produtos/servicos/drone.jpg"
};

export const serviceImages: Record<ServiceCategory, string[]> = {
  alimentacao: [
    optimizedUrl("produtos/servicos/lanche.jpg", IMAGE_PRESETS.gallery)
  ],
  registros: [
    optimizedUrl("produtos/servicos/drone.jpg", IMAGE_PRESETS.gallery)
  ],
  transfers: [
    optimizedUrl("produtos/servicos/transfer.jpg", IMAGE_PRESETS.gallery)
  ],
  especial: [
    optimizedUrl("produtos/servicos/especial.jpg", IMAGE_PRESETS.gallery)
  ],
};

export function useServiceImages(id: string, category: ServiceCategory, storageId?: string) {
  const query = useStorageImages("produtos/servicos", storageId || "");
  const idQuery = useStorageImages("produtos/servicos", id);

  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  const uniqueImages = Array.from(new Set(allImages));

  const primaryFallback = serviceSpecifics[id] || serviceSpecifics[category]
    ? [optimizedUrl(serviceSpecifics[id] || serviceSpecifics[category], IMAGE_PRESETS.gallery)]
    : [];

  const fallback = uniqueImages.length > 0 ? uniqueImages : (primaryFallback.length > 0 ? primaryFallback : serviceImages[category]);

  return {
    images: fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}
