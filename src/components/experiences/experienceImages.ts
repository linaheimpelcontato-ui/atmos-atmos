import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** 
 * Map of experience IDs to their EXACT storage paths.
 * Ensures instant loading by bypassing bucket discovery.
 */
export const experienceSpecifics: Record<string, string> = {
  "astroturismo": "produtos/experiencias/astroturismo/astroturismo-1.jpg",
  "batismo-de-escalada": "produtos/experiencias/batismo-de-escalada/batismo-de-escalada-1.jpg",
  "bike-cerrado": "produtos/experiencias/bike-cerrado/bike-cerrado-1.jpg",
  "comitivas": "produtos/experiencias/comitivas/comitivas-1.jpg",
  "cozinha-de-origem": "produtos/experiencias/cozinha-de-origem/cozinha-de-origem-1.jpg",
  "expedicao-4x4": "produtos/experiencias/expedicao-4x4/expedicao-4x4-1.jpg",
  "feira-do-produtor": "produtos/experiencias/feira-do-produtor/feira-do-produtor-1.jpg",
  "flutuacao-no-rio": "produtos/experiencias/flutuacao-no-rio/flutuacao-no-rio-1.jpg",
  "forro-pe-de-serra": "produtos/experiencias/forro-pe-de-serra/forro-pe-de-serra-1.jpg",
  "massagem-terapeutica": "produtos/experiencias/massagem-terapeutica/massagem-terapeutica-1.jpg",
  "observacao-de-aves": "produtos/experiencias/observacao-de-aves/observacao-de-aves-1.jpg",
  "oficina-de-cerâmica": "produtos/experiencias/oficina-de-ceramica/oficina-de-ceramica-1.jpg",
  "panteao-da-chapada": "produtos/experiencias/panteao-da-chapada/panteao-da-chapada-1.jpg",
  "picnic-no-por-do-sol": "produtos/experiencias/picnic-no-por-do-sol/picnic-no-por-do-sol-1.jpg",
  "rapel-nas-cachoeiras": "produtos/experiencias/rapel-nas-cachoeiras/rapel-nas-cachoeiras-1.jpg",
  "registro-com-drone": "produtos/experiencias/registro-com-drone/registro-com-drone-1.jpg",
  "ritual-do-fogo": "produtos/experiencias/ritual-do-fogo/ritual-do-fogo-1.jpg",
  "tirolesa-vovo-a-jato": "produtos/experiencias/tirolesa-vovo-a-jato/tirolesa-vovo-a-jato-1.jpg",
  "trilha-noturna": "produtos/experiencias/trilha-noturna/trilha-noturna-1.jpg",
  "voo-de-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
  "noturna-imersiva": "produtos/experiencias/trilha-noturna/trilha-noturna-1.jpg",
  "voo-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
  "voo-paramotor": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
  "massagem-bem-estar": "produtos/experiencias/massagem-terapeutica/massagem-terapeutica-1.jpg",
  "yoga-meditacao": "produtos/experiencias/ritual-do-fogo/ritual-do-fogo-1.jpg",
  "passeio-cavalo": "produtos/experiencias/comitivas/comitivas-1.jpg",
  "passeio-a-cavalo": "produtos/experiencias/comitivas/comitivas-1.jpg",
  "astro-turismo": "produtos/experiencias/astroturismo/astroturismo-1.jpg",
  "aula-forro": "produtos/experiencias/forro-pe-de-serra/forro-pe-de-serra-1.jpg",
  "feira-produtores": "produtos/experiencias/feira-do-produtor/feira-do-produtor-1.jpg"
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

  const genericFallback = [1, 2, 3].map((n) =>
    optimizedUrl(`produtos/experiencias/${id}/${id}-${n}.jpg`, IMAGE_PRESETS.card)
  );

  const fallback = [...primaryFallback, ...genericFallback];

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
  return optimizedUrl(`produtos/experiencias/${key}/${key}-1.jpg`, IMAGE_PRESETS.card);
}

export function getGalleryImages(key: string): string[] {
  return [getCardImage(key)];
}
