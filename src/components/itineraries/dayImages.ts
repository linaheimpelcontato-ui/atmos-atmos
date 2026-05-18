import { cardUrl } from "@/lib/storage";
import { type DayImageKey } from "@/data/itineraries";
import { experienceSpecifics } from "../experiences/experienceImages";

/** Card-size image for each day waterfall — served from R2 CDN via wsrv.nl at 900px */
export const dayImages: Record<DayImageKey, string> = {
  "segredo": cardUrl("produtos/cachoeiras/segredo/segredo-1.jpg"),
  "vale-da-lua": cardUrl("produtos/cachoeiras/vale-da-lua/vale-da-lua-1.jpg"),
  "macacao": cardUrl("produtos/cachoeiras/macacao/macacao-1.jpg"),
  "dragao": cardUrl("produtos/cachoeiras/dragao/dragao-1.jpg"),
  "almecegas-sao-bento": cardUrl("produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg"),
  "macaquinhos": cardUrl("produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg"),
  "couros": cardUrl("produtos/cachoeiras/couros/couros-1.jpg"),
  "ponte-de-pedra": cardUrl("produtos/cachoeiras/ponte-de-pedra/ponte-de-pedra-1.jpg"),
};

/** Resolves an image key or path into a card-quality URL via R2 CDN */
export function getDayImage(keyOrPath: string, name?: string): string {
  if (!keyOrPath && !name) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80";
  
  const key = keyOrPath || "";

  // 1. Direct key match in the dayImages dictionary
  if (dayImages[key as DayImageKey]) return dayImages[key as DayImageKey];

  // 2. Experience-specific image
  if (experienceSpecifics[key]) return cardUrl(experienceSpecifics[key]);

  // 3. Full URLs pass through (Supabase, external CDN)
  if (key.startsWith('http')) return key;
  
  // 4. Path-based: already has a slash — route directly via R2
  if (key.includes('/')) {
    const path = key.startsWith('produtos') ? key : `produtos/${key}`;
    return cardUrl(path);
  }

  // 5. Resolve by itinerary/product name slug
  if (name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Waterfall mappings
    if (slug.includes('couros')) return cardUrl("produtos/cachoeiras/couros/couros-1.jpg");
    if (slug.includes('macaquinhos')) return cardUrl("produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg");
    if (slug.includes('dragao')) return cardUrl("produtos/cachoeiras/dragao/dragao-1.jpg");
    if (slug.includes('macacao')) return cardUrl("produtos/cachoeiras/macacao/macacao-1.jpg");
    if (slug.includes('ponte-de-pedra')) return cardUrl("produtos/cachoeiras/ponte-de-pedra/ponte-de-pedra-1.jpg");
    if (slug.includes('segredo')) return cardUrl("produtos/cachoeiras/segredo/segredo-1.jpg");
    if (slug.includes('vale-da-lua') || slug.includes('vale da lua')) return cardUrl("produtos/cachoeiras/vale-da-lua/vale-da-lua-1.jpg");
    if (slug.includes('almecegas')) return cardUrl("produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg");
    if (slug.includes('santa barbara')) return cardUrl("produtos/cachoeiras/santa-barbara/santa-barbara-1.jpg");
    
    // Experience mappings
    if (slug.includes('cavalo') || slug.includes('comitiva')) return cardUrl("produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg");
    if (slug.includes('balao')) return cardUrl("produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg");
    if (slug.includes('paramotor')) return cardUrl("produtos/experiencias/voo-de-paramotor/voo-de-paramotor-1.jpg");
    if (slug.includes('massagem') || slug.includes('bem-estar') || slug.includes('bem estar')) return cardUrl("produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.jpg");
    if (slug.includes('yoga') || slug.includes('meditacao')) return cardUrl("produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png");
    if (slug.includes('noturna')) return cardUrl("produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.jpg");
    if (slug.includes('astro')) return cardUrl("produtos/experiencias/astro-turismo/astro-turismo-1.jpg");
    if (slug.includes('forro')) return cardUrl("produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg");
    if (slug.includes('feira')) return cardUrl("produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.jpg");
  }

  // 6. Generic fallback by key slug
  const lowerKey = key.toLowerCase();
  return cardUrl(`produtos/cachoeiras/${lowerKey}/${lowerKey}-1.jpg`);
}

/** Returns multiple fallback R2 card URLs for a given key */
export function getDayImageFallbacks(key: string): string[] {
  if (!key || key.includes('/')) return [];
  return [
    cardUrl(`produtos/cachoeiras/${key}/${key}-1.jpg`),
    cardUrl(`produtos/experiencias/${key}/${key}-1.jpg`),
  ];
}
