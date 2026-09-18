import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** 
 * Map of experience IDs to their EXACT storage paths.
 * Ensures instant loading by bypassing bucket discovery.
 */
export const experienceSpecifics: Record<string, string> = {
  "astroturismo": "produtos/experiencias/astro-turismo/astro-turismo-1.jpg",
  "batismo-de-escalada": "produtos/experiencias/rapel/rapel-1.jpg",
  "bike-cerrado": "produtos/experiencias/canionismo/canionismo-1.jpg",
  "comitivas": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.png",
  "cozinha-de-origem": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
  "expedicao-4x4": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.png",
  "feira-do-produtor": "produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.png",
  "flutuacao-no-rio": "produtos/experiencias/rafting/rafting-1.jpeg",
  "forro-pe-de-serra": "produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg",
  "massagem-terapeutica": "produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.png",
  "observacao-de-aves": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
  "oficina-de-cerâmica": "produtos/experiencias/oficina-de-ceramica/oficina-de-ceramica-1.jpg",
  "panteao-da-chapada": "produtos/experiencias/panteao-da-chapada/panteao-da-chapada-1.jpg",
  "picnic-no-por-do-sol": "produtos/experiencias/picnic-no-por-do-sol/picnic-no-por-do-sol-1.jpg",
  "rapel-nas-cachoeiras": "produtos/experiencias/rapel/rapel-1.jpg",
  "registro-com-drone": "produtos/serviços/registro-com-drone-captacao-com-edicao/registro-com-drone-captacao-com-edicao-1.jpg",
  "ritual-do-fogo": "produtos/experiencias/danca-com-fogo/danca-com-fogo-1.jpeg",
  "tirolesa-vovo-a-jato": "produtos/experiencias/tirolesa-fazenda-sao-bento/tirolesa-fazenda-sao-bento-1.png",
  "trilha-noturna": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.png",
  "voo-de-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
  "noturna-imersiva": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.png",
  "voo-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
  "voo-paramotor": "produtos/experiencias/voo-de-paramotor/voo-de-paramotor-1.png",
  "massagem-bem-estar": "produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.png",
  "yoga-meditacao": "produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png",
  "passeio-cavalo": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.png",
  "passeio-a-cavalo": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.png",
  "astro-turismo": "produtos/experiencias/astro-turismo/astro-turismo-1.jpg",
  "aula-forro": "produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg",
  "feira-produtores": "produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.png"
};

export function useExperienceGallery(imageKey: string, namePt?: string, id?: string) {
  const query = useStorageImages("produtos/experiencias", imageKey);
  const nameQuery = useStorageImages("produtos/experiencias", namePt || "", !!namePt);

  const allImages = [...(query.data || []), ...(nameQuery.data || [])];
  // Ensure all fetched images are optimized
  const uniqueImages = Array.from(new Set(allImages)).map(img => 
    optimizedUrl(img, IMAGE_PRESETS.card)
  );

  const primaryFallback = experienceSpecifics[id || ""] 
    ? [optimizedUrl(experienceSpecifics[id || ""], IMAGE_PRESETS.card)]
    : [];

  const genericFallback = [optimizedUrl("home/cat-experiences.jpg", IMAGE_PRESETS.card)];

  // Generic guessed paths create a stream of guaranteed 404s when a product
  // has no bucket asset. Keep the finite, known fallback only.
  const fallback = primaryFallback.length > 0 ? primaryFallback : genericFallback;

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || nameQuery.isLoading,
  };
}

export function getCardImage(id: string, imageKey?: string): string {
  if (!id) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=500&q=75";
  
  if (experienceSpecifics[id]) {
    return optimizedUrl(experienceSpecifics[id], IMAGE_PRESETS.card);
  }
  
  const key = imageKey || id;
  if (key.startsWith('http')) return key;
  return optimizedUrl("home/cat-experiences.jpg", IMAGE_PRESETS.card);
}

export function getGalleryImages(key: string): string[] {
  return [getCardImage(key)];
}
