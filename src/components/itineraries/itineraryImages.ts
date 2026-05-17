import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** Card cover image for each itinerary (uses main waterfall's first photo) */
export const itineraryImages: Record<string, string> = {
  "2d-classico": optimizedUrl("produtos/cachoeiras/segredo/segredo-1.jpg", IMAGE_PRESETS.card),
  "2d-jurassico": optimizedUrl("produtos/cachoeiras/macacao/macacao-1.jpg", IMAGE_PRESETS.card),
  "3d-classico": optimizedUrl("produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg", IMAGE_PRESETS.card),
  "3d-jurassico": optimizedUrl("produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg", IMAGE_PRESETS.card),
  "4d-classico": optimizedUrl("produtos/cachoeiras/couros/couros-1.jpg", IMAGE_PRESETS.card),
  "4d-jurassico": optimizedUrl("produtos/cachoeiras/dragao/dragao-1.jpg", IMAGE_PRESETS.card),
  "5d-classico": optimizedUrl("produtos/cachoeiras/couros/couros-1.jpg", IMAGE_PRESETS.card),
  "5d-jurassico": optimizedUrl("produtos/cachoeiras/dragao/dragao-1.jpg", IMAGE_PRESETS.card),
};

const itinerarySpecifics: Record<string, string> = {
  "5d-jurassico": "produtos/roteiros/itin-jurassico-5d.jpg",
  "4d-jurassico": "produtos/roteiros/itin-jurassico-4d.jpg",
  "3d-jurassico": "produtos/roteiros/itin-jurassico-3d.jpg",
  "2d-jurassico": "produtos/roteiros/itin-jurassico-2d.jpg",
  "5d-classico": "produtos/roteiros/itin-classico-5d.jpg",
  "4d-classico": "produtos/roteiros/itin-classico-4d.jpg",
  "4093271f-029a-47bb-a774-f67e92714cb3": "produtos/roteiros/itin-jurassico-5d.jpg",
};

/** Resolves an itinerary ID, image key or path into a fully qualified optimized URL */
export function getItineraryImage(keyOrPath: string, name?: string): string {
  if (!keyOrPath) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80";
  
  if (itinerarySpecifics[keyOrPath]) {
    return optimizedUrl(itinerarySpecifics[keyOrPath], IMAGE_PRESETS.card);
  }
  
  if (itineraryImages[keyOrPath]) return itineraryImages[keyOrPath];
  if (keyOrPath.startsWith('http')) return keyOrPath;
  
  if (keyOrPath.includes('/')) {
    const path = keyOrPath.startsWith('produtos') ? keyOrPath : `produtos/${keyOrPath}`;
    return optimizedUrl(path, IMAGE_PRESETS.card);
  }

  // Name-based fallback for dynamic itineraries (UUIDs)
  if (name) {
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (n.includes('jurassico')) return optimizedUrl("produtos/roteiros/itin-jurassico-5d.jpg", IMAGE_PRESETS.card);
    if (n.includes('classico')) return optimizedUrl("produtos/roteiros/itin-classico-5d.jpg", IMAGE_PRESETS.card);
  }

  // If it's a bare key/ID, it's likely a dynamic itinerary from the database
  return optimizedUrl(`produtos/roteiros/${keyOrPath}/${keyOrPath}-1.jpg`, IMAGE_PRESETS.card);
}
