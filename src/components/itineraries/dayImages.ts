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
    // If it already has a path, use it as is (Atmos R2 is often case sensitive)
    const path = key.startsWith('produtos') ? key : `produtos/${key}`;
    return optimizedUrl(path, IMAGE_PRESETS.thumbnail);
  }

  // If we have a name, try to slugify it and find in cachoeiras/experiencias
  if (name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Waterfall mappings
    if (slug.includes('couros')) return optimizedUrl("produtos/cachoeiras/couros/couros-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('macaquinhos')) return optimizedUrl("produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('dragao')) return optimizedUrl("produtos/cachoeiras/dragao/dragao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('macacao')) return optimizedUrl("produtos/cachoeiras/macacao/macacao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('ponte-de-pedra')) return optimizedUrl("produtos/cachoeiras/ponte-de-pedra/ponte-de-pedra-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('segredo')) return optimizedUrl("produtos/cachoeiras/segredo/segredo-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('vale-da-lua')) return optimizedUrl("produtos/cachoeiras/vale-da-lua/vale-da-lua-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('almecegas')) return optimizedUrl("produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('santa barbara')) return optimizedUrl("produtos/cachoeiras/santa-barbara/santa-barbara-1.jpg", IMAGE_PRESETS.thumbnail);
    
    // Experience mappings (Portuguese keywords)
    if (slug.includes('cavalo') || slug.includes('comitiva')) return optimizedUrl("produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('balao')) return optimizedUrl("produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('paramotor')) return optimizedUrl("produtos/experiencias/voo-de-paramotor/voo-de-paramotor-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('massagem') || slug.includes('bem-estar') || slug.includes('bem estar')) return optimizedUrl("produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('yoga')) return optimizedUrl("produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png", IMAGE_PRESETS.thumbnail);
    if (slug.includes('meditacao')) return optimizedUrl("produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png", IMAGE_PRESETS.thumbnail);
    if (slug.includes('noturna')) return optimizedUrl("produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('astro')) return optimizedUrl("produtos/experiencias/astro-turismo/astro-turismo-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('forro')) return optimizedUrl("produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg", IMAGE_PRESETS.thumbnail);
    if (slug.includes('feira')) return optimizedUrl("produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.jpg", IMAGE_PRESETS.thumbnail);
  }

  // Fallback: try common folders with lowercase folder and lowercase file
  const lowerKey = key.toLowerCase();
  return optimizedUrl(`produtos/cachoeiras/${lowerKey}/${lowerKey}-1.jpg`, IMAGE_PRESETS.thumbnail);
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
