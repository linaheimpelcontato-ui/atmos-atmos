import { optimizedUrl, storageUrl, IMAGE_PRESETS } from "@/lib/storage";
import { type DayImageKey } from "@/data/itineraries";
import { experienceSpecifics } from "../experiences/experienceImages";

/** Thumbnail image for each day (first photo of the waterfall) */
export const dayImages: Record<DayImageKey, string> = {
  "segredo": storageUrl("cachoeiras/segredo-1.jpg"),
  "vale-da-lua": storageUrl("cachoeiras/vale-da-lua-1.jpg"),
  "macacao": storageUrl("cachoeiras/macacao-1.jpg"),
  "dragao": storageUrl("cachoeiras/dragao-1.jpg"),
  "almecegas-sao-bento": storageUrl("cachoeiras/almecegas-sao-bento-1.jpg"),
  "macaquinhos": storageUrl("cachoeiras/macaquinhos-1.jpg"),
  "couros": storageUrl("cachoeiras/couros-1.jpg"),
  "ponte-de-pedra": storageUrl("cachoeiras/ponte-de-pedra-1.jpg"),
};

/** Resolves an image key or path into a fully qualified optimized URL */
export function getDayImage(keyOrPath: string, name?: string): string {
  if (!keyOrPath && !name) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80";
  
  const key = keyOrPath || "";

  if (dayImages[key as DayImageKey]) return dayImages[key as DayImageKey];
  if (experienceSpecifics[key]) return storageUrl(experienceSpecifics[key]);
  if (key.startsWith('http')) return key;
  
  if (key.includes('/')) {
    return storageUrl(key);
  }

  // If we have a name, try to slugify it and find in cachoeiras
  if (name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Waterfall mappings
    if (slug.includes('couros')) return storageUrl("cachoeiras/couros-1.jpg");
    if (slug.includes('macaquinhos')) return storageUrl("cachoeiras/macaquinhos-1.jpg");
    if (slug.includes('dragao')) return storageUrl("cachoeiras/dragao-1.jpg");
    if (slug.includes('macacao')) return storageUrl("cachoeiras/macacao-1.jpg");
    if (slug.includes('ponte-de-pedra')) return storageUrl("cachoeiras/ponte-de-pedra-1.jpg");
    if (slug.includes('segredo')) return storageUrl("cachoeiras/segredo-1.jpg");
    if (slug.includes('vale-da-lua')) return storageUrl("cachoeiras/vale-da-lua-1.jpg");
    if (slug.includes('almecegas')) return storageUrl("cachoeiras/almecegas-sao-bento-1.jpg");
    if (slug.includes('santa barbara')) return storageUrl("cachoeiras/santa-barbara-1.jpg");
    
    // Experience mappings (Portuguese keywords)
    if (slug.includes('cavalo')) return storageUrl("experiencias/cavalo-1.jpg");
    if (slug.includes('balao')) return storageUrl("experiencias/balao-1.jpg");
    if (slug.includes('paramotor')) return storageUrl("experiencias/paramotor-1.jpg");
    if (slug.includes('massagem') || slug.includes('bem-estar') || slug.includes('bem estar')) return storageUrl("experiencias/massagem-1.jpg");
    if (slug.includes('yoga') || slug.includes('meditacao')) return storageUrl("experiencias/yoga-1.jpg");
    if (slug.includes('noturna')) return storageUrl("experiencias/noturna-1.jpg");
    if (slug.includes('astro')) return storageUrl("experiencias/astro-1.jpg");
    if (slug.includes('forro')) return storageUrl("experiencias/forro-1.jpg");
    if (slug.includes('feira')) return storageUrl("experiencias/feira-1.jpg");
  }

  // Fallback: try common folders if it's a bare key/UUID
  return storageUrl(`cachoeiras/${key}-1.jpg`);
}

/** Resolves an image key to multiple potential paths for OptimizedImage fallback */
export function getDayImageFallbacks(key: string): string[] {
  if (!key || key.includes('/')) return [];
  return [
    storageUrl(`cachoeiras/${key}-1.jpg`),
    storageUrl(`experiencias/${key}-1.jpg`),
    storageUrl(`hospedagens/${key}-1.jpg`),
    storageUrl(`roteiros/${key}-1.jpg`),
  ];
}
