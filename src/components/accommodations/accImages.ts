import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** 
 * Map of accommodation IDs to their EXACT storage paths.
 * Ensures instant loading by bypassing bucket discovery.
 */
const accommodationSpecifics: Record<string, string> = {
  "alto-da-estancia": "produtos/hospedagens/alto-da-estancia/alto-da-estancia-1.jpg",
  "casa-da-lua": "produtos/hospedagens/casa-da-lua/casa-da-lua-1.jpg",
  "casa-das-aguas": "produtos/hospedagens/casa-das-aguas/casa-das-aguas-1.jpg",
  "glamping-oculto": "produtos/hospedagens/glamping-oculto/glamping-oculto-1.jpg",
  "pousada-do-capim": "produtos/hospedagens/pousada-do-capim/pousada-do-capim-1.jpg",
  "pousada-inacia": "produtos/hospedagens/pousada-inacia/pousada-inacia-1.jpg",
  "toca-da-coruja": "produtos/hospedagens/toca-da-coruja/toca-da-coruja-1.jpg",
  "vila-dos-saguis": "produtos/hospedagens/vila-dos-saguis/vila-dos-saguis-1.jpg"
};

export function useAccImages(id: string, name?: string) {
  const query = useStorageImages("produtos/hospedagens", name || "");
  const idQuery = useStorageImages("produtos/hospedagens", id);

  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  // Ensure all fetched images are optimized
  const uniqueImages = Array.from(new Set(allImages)).map(img => 
    optimizedUrl(img, IMAGE_PRESETS.card)
  );

  const primaryFallback = accommodationSpecifics[id]
    ? [optimizedUrl(accommodationSpecifics[id], IMAGE_PRESETS.card)]
    : [];

  const genericFallback = Array.from({ length: 6 }, (_, i) =>
    optimizedUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`, IMAGE_PRESETS.card)
  );

  const fallback = [...primaryFallback, ...genericFallback];

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getAccCardImage(id: string, name?: string): string {
  if (accommodationSpecifics[id]) {
    return optimizedUrl(accommodationSpecifics[id], IMAGE_PRESETS.card);
  }
  return optimizedUrl(`produtos/hospedagens/${id}/${id}-1.jpg`, IMAGE_PRESETS.card);
}

/** Legacy sync function */
export function getAccImages(id: string, name?: string): string[] {
  if (accommodationSpecifics[id]) {
    return [optimizedUrl(accommodationSpecifics[id], IMAGE_PRESETS.card)];
  }
  return Array.from({ length: 6 }, (_, i) =>
    optimizedUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`, IMAGE_PRESETS.card)
  );
}
