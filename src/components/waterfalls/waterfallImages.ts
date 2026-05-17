import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** 
 * Map of waterfall IDs to their EXACT storage paths.
 * This ensures images load INSTANTLY without waiting for a bucket list command.
 */
const waterfallSpecifics: Record<string, string> = {
  "agua-fria": "produtos/cachoeiras/agua-fria/agua-fria-1.jpg",
  "almecegas-1-2-e-sao-bento": "produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg",
  "anjos-e-arcanjos": "produtos/cachoeiras/anjos-e-arcanjos/anjos-e-arcanjos-1.jpg",
  "bocaina-do-farias": "produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg",
  "boqueirao": "produtos/cachoeiras/boqueirao/boqueirao-1.jpg",
  "brancas": "produtos/cachoeiras/brancas/brancas-1.jpg",
  "capivara": "produtos/cachoeiras/capivara/capivara-1.jpg",
  "catuaba": "produtos/cachoeiras/catuaba/catuaba-1.jpg",
  "cavalcante": "produtos/cachoeiras/cavalcante/cavalcante-1.jpg",
  "couros": "produtos/cachoeiras/couros/couros-1.jpg",
  "cristais": "produtos/cachoeiras/cristais/cristais-1.jpg",
  "dragao": "produtos/cachoeiras/dragao/dragao-1.jpg",
  "loquinhas": "produtos/cachoeiras/loquinhas/loquinhas-1.jpg",
  "macacao": "produtos/cachoeiras/macacao/macacao-1.jpg",
  "macaquinhos": "produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg",
  "paraiso-dos-panderos": "produtos/cachoeiras/paraiso-dos-panderos/paraiso-dos-panderos-1.jpg",
  "ponte-de-pedra": "produtos/cachoeiras/ponte-de-pedra/ponte-de-pedra-1.jpg",
  "raizama": "produtos/cachoeiras/raizama/raizama-1.jpg",
  "santa-barbara": "produtos/cachoeiras/santa-barbara/santa-barbara-1.jpg",
  "segredo": "produtos/cachoeiras/segredo/segredo-1.jpg",
  "vale-da-lua": "produtos/cachoeiras/vale-da-lua/vale-da-lua-1.jpg"
};

export function useWaterfallImages(id: string, name: string) {
  const query = useStorageImages("produtos/cachoeiras", name);
  const idQuery = useStorageImages("produtos/cachoeiras", id);
  
  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  // Ensure all fetched images are optimized
  const uniqueImages = Array.from(new Set(allImages)).map(img => 
    optimizedUrl(img, IMAGE_PRESETS.card)
  );

  // If we have a specific mapping, use it as the first fallback for instant results
  const primaryFallback = waterfallSpecifics[id] 
    ? [optimizedUrl(waterfallSpecifics[id], IMAGE_PRESETS.card)]
    : [];

  const genericFallback = [1, 2, 3].map((n) => 
    optimizedUrl(`produtos/cachoeiras/${id}/${id}-${n}.jpg`, IMAGE_PRESETS.card)
  );

  const fallback = [...primaryFallback, ...genericFallback];

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}

/** Synchronous fallback — used for cards (always first image) */
export function getWaterfallCardImage(id: string, name: string): string {
  if (waterfallSpecifics[id]) {
    return optimizedUrl(waterfallSpecifics[id], IMAGE_PRESETS.card);
  }
  return optimizedUrl(`produtos/cachoeiras/${id}/${id}-1.jpg`, IMAGE_PRESETS.card);
}

/** Legacy sync function — kept for backward compatibility */
export function getWaterfallImages(id: string, name: string): string[] {
  if (waterfallSpecifics[id]) {
    return [optimizedUrl(waterfallSpecifics[id], IMAGE_PRESETS.card)];
  }
  return [1, 2, 3].map((n) => optimizedUrl(`produtos/cachoeiras/${id}/${id}-${n}.jpg`, IMAGE_PRESETS.card));
}
