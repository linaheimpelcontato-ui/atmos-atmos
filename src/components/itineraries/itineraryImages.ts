import { optimizedUrl, storageUrl, IMAGE_PRESETS } from "@/lib/storage";

/** Card cover image for each itinerary (uses main waterfall's first photo) */
export const itineraryImages: Record<string, string> = {
  "2d-classico": storageUrl("cachoeiras/segredo-1.jpg"),
  "2d-jurassico": storageUrl("cachoeiras/macacao-1.jpg"),
  "3d-classico": storageUrl("cachoeiras/almecegas-sao-bento-1.jpg"),
  "3d-jurassico": storageUrl("cachoeiras/macaquinhos-1.jpg"),
  "4d-classico": storageUrl("cachoeiras/couros-1.jpg"),
  "4d-jurassico": storageUrl("cachoeiras/dragao-1.jpg"),
  "5d-classico": storageUrl("cachoeiras/couros-1.jpg"),
  "5d-jurassico": storageUrl("cachoeiras/dragao-1.jpg"),
};

const itinerarySpecifics: Record<string, string> = {
  "5d-jurassico": "roteiros/itin-jurassico-5d.jpg",
  "4d-jurassico": "roteiros/itin-jurassico-4d.jpg",
  "3d-jurassico": "roteiros/itin-jurassico-3d.jpg",
  "2d-jurassico": "roteiros/itin-jurassico-2d.jpg",
  "5d-classico": "roteiros/itin-classico-5d.jpg",
  "4d-classico": "roteiros/itin-classico-4d.jpg",
  "4093271f-029a-47bb-a774-f67e92714cb3": "roteiros/itin-jurassico-5d.jpg",
};

/** Resolves an itinerary ID, image key or path into a fully qualified optimized URL */
export function getItineraryImage(keyOrPath: string, name?: string): string {
  if (!keyOrPath) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80";
  
  if (itinerarySpecifics[keyOrPath]) {
    return storageUrl(itinerarySpecifics[keyOrPath]);
  }
  
  if (itineraryImages[keyOrPath]) return itineraryImages[keyOrPath];
  if (keyOrPath.startsWith('http')) return keyOrPath;
  
  if (keyOrPath.includes('/')) {
    return storageUrl(keyOrPath);
  }

  // Name-based fallback for dynamic itineraries (UUIDs)
  if (name) {
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (n.includes('jurassico')) return storageUrl("roteiros/itin-jurassico-5d.jpg");
    if (n.includes('classico')) return storageUrl("roteiros/itin-classico-5d.jpg");
  }

  // If it's a bare key/ID, it's likely a dynamic itinerary from the database
  return storageUrl(`roteiros/${keyOrPath}-1.jpg`);
}
