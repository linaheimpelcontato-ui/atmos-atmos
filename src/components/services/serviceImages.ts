import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
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
    optimizedUrl("produtos/servicos/lanche.jpg", IMAGE_PRESETS.card)
  ],
  registros: [
    optimizedUrl("produtos/servicos/drone.jpg", IMAGE_PRESETS.card)
  ],
  transfers: [
    optimizedUrl("produtos/servicos/transfer.jpg", IMAGE_PRESETS.card)
  ],
  especial: [
    optimizedUrl("produtos/servicos/especial.jpg", IMAGE_PRESETS.card)
  ],
};

export function useServiceImages(id: string, category: ServiceCategory, storageId?: string) {
  const query = useStorageImages("produtos/servicos", storageId || "");
  const idQuery = useStorageImages("produtos/servicos", id);

  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  // Ensure all fetched images are optimized
  const uniqueImages = Array.from(new Set(allImages)).map(img => 
    optimizedUrl(img, IMAGE_PRESETS.card)
  );

  const primaryFallback = serviceSpecifics[id] || serviceSpecifics[category]
    ? [optimizedUrl(serviceSpecifics[id] || serviceSpecifics[category], IMAGE_PRESETS.card)]
    : [];

  const fallback = uniqueImages.length > 0 ? uniqueImages : (primaryFallback.length > 0 ? primaryFallback : serviceImages[category]);

  return {
    images: fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}

export function getServiceCardImage(id: string, category: ServiceCategory): string {
  if (serviceSpecifics[id]) return optimizedUrl(serviceSpecifics[id], IMAGE_PRESETS.card);
  if (serviceSpecifics[category]) return optimizedUrl(serviceSpecifics[category], IMAGE_PRESETS.card);
  return serviceImages[category][0];
}
