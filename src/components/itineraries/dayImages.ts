import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { type DayImageKey } from "@/data/itineraries";
import { experienceSpecifics } from "../experiences/experienceImages";

/** Thumbnail image for each day (first photo of the waterfall) */
export const dayImages: Record<DayImageKey, string> = {
  "segredo": optimizedUrl("cachoeiras/segredo-1.jpg", IMAGE_PRESETS.thumbnail),
  "vale-da-lua": optimizedUrl("cachoeiras/vale-da-lua-1.jpg", IMAGE_PRESETS.thumbnail),
  "macacao": optimizedUrl("cachoeiras/macacao-1.jpg", IMAGE_PRESETS.thumbnail),
  "dragao": optimizedUrl("cachoeiras/dragao-1.jpg", IMAGE_PRESETS.thumbnail),
  "almecegas-sao-bento": optimizedUrl("cachoeiras/almecegas-sao-bento-1.jpg", IMAGE_PRESETS.thumbnail),
  "macaquinhos": optimizedUrl("cachoeiras/macaquinhos-1.jpg", IMAGE_PRESETS.thumbnail),
  "couros": optimizedUrl("cachoeiras/couros-1.jpg", IMAGE_PRESETS.thumbnail),
  "ponte-de-pedra": optimizedUrl("cachoeiras/ponte-de-pedra-1.jpg", IMAGE_PRESETS.thumbnail),
};

/** Resolves an image key or path into a fully qualified optimized URL */
export function getDayImage(keyOrPath: string, name?: string): string {
  if (!keyOrPath && !name) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80";
  
  const key = keyOrPath || "";

  if (dayImages[key as DayImageKey]) return dayImages[key as DayImageKey];
  if (experienceSpecifics[key]) return optimizedUrl(experienceSpecifics[key], IMAGE_PRESETS.thumbnail);
  if (key.startsWith('http')) return key;
  
  if (key.includes('/')) {
    return optimizedUrl(key, IMAGE_PRESETS.thumbnail);
  }

  // If we have a name, try to slugify it and find in cachoeiras
  if (name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Waterfall mappings
    if (slug.includes('couros')) return optimizedUrl("cachoeiras/couros-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('macaquinhos')) return optimizedUrl("cachoeiras/macaquinhos-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('dragao')) return optimizedUrl("cachoeiras/dragao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('macacao')) return optimizedUrl("cachoeiras/macacao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('ponte-de-pedra')) return optimizedUrl("cachoeiras/ponte-de-pedra-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('segredo')) return optimizedUrl("cachoeiras/segredo-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('vale-da-lua')) return optimizedUrl("cachoeiras/vale-da-lua-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('almecegas')) return optimizedUrl("cachoeiras/almecegas-sao-bento-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('santa barbara')) return optimizedUrl("cachoeiras/santa-barbara-1.jpg", IMAGE_PRESETS.thumbnail);
    
    // Experience mappings (Portuguese keywords)
    if (slug.includes('cavalo')) return optimizedUrl("experiencias/cavalo-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('balao')) return optimizedUrl("experiencias/balao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('paramotor')) return optimizedUrl("experiencias/paramotor-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('massagem') || slug.includes('bem-estar') || slug.includes('bem estar')) return optimizedUrl("experiencias/massagem-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('yoga') || slug.includes('meditacao')) return optimizedUrl("experiencias/yoga-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('noturna')) return optimizedUrl("experiencias/noturna-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('astro')) return optimizedUrl("experiencias/astro-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('forro')) return optimizedUrl("experiencias/forro-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('feira')) return optimizedUrl("experiencias/feira-1.jpg", IMAGE_PRESETS.thumbnail);
  }

  // Fallback: try common folders if it's a bare key/UUID
  return optimizedUrl(`cachoeiras/${key}-1.jpg`, IMAGE_PRESETS.thumbnail);
}

/** Resolves an image key to multiple potential paths for OptimizedImage fallback */
export function getDayImageFallbacks(key: string): string[] {
  if (!key || key.includes('/')) return [];
  return [
    optimizedUrl(`cachoeiras/${key}-1.jpg`, IMAGE_PRESETS.thumbnail),
    optimizedUrl(`experiencias/${key}-1.jpg`, IMAGE_PRESETS.thumbnail),
    optimizedUrl(`hospedagens/${key}-1.jpg`, IMAGE_PRESETS.thumbnail),
    optimizedUrl(`roteiros/${key}-1.jpg`, IMAGE_PRESETS.thumbnail),
  ];
}
