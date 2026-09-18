import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** 
 * Map of accommodation IDs to their EXACT storage paths.
 * Ensures instant loading by bypassing bucket discovery.
 */
const accommodationSpecifics: Record<string, string> = {
  "a-nossa-casa-da-arvore": "produtos/hospedagens/a-nossa-casa-da-arvore/a-nossa-casa-da-arvore-1.avif",
  "amana-hotel": "produtos/hospedagens/amana-hotel/amana-hotel-1.avif",
  "bagua-bangalos": "produtos/hospedagens/bagua-bangalos/bagua-bangalos-1.avif",
  "casa-alta": "produtos/hospedagens/casa-alta/casa-alta-1.jpeg",
  "casa-horizonte": "produtos/hospedagens/casa-horizonte/casa-horizonte-1.jpeg",
  "casa-kanaro": "produtos/hospedagens/casa-kanaro/casa-kanaro-1.jpeg",
  "casa-poema": "produtos/hospedagens/casa-poema/casa-poema-1.jpeg",
  "espaco-horus": "produtos/hospedagens/espaco-horus/espaco-horus-1.jpeg",
  "mariri-jungle-lodge": "produtos/hospedagens/mariri-jungle-lodge/mariri-jungle-lodge-1.jpeg",
  "marley-s-house": "produtos/hospedagens/marley-s-house/marley-s-house-1.jpeg",
  "pousada-casa-de-shiva": "produtos/hospedagens/pousada-casa-de-shiva/pousada-casa-de-shiva-1.jpg",
  "pousada-maya": "produtos/hospedagens/pousada-maya/pousada-maya-1.jpg",
  "refugio-veadeiros": "produtos/hospedagens/refugio-veadeiros/refugio-veadeiros-1.jpeg",
  "rustik-chapada": "produtos/hospedagens/rustik-chapada/rustik-chapada-1.jpeg",
  "terra-gaia": "produtos/hospedagens/terra-gaia/terra-gaia-1.jpg",
  "vila-abaton": "produtos/hospedagens/vila-abaton/vila-abaton-1.jpeg",
  "vila-baru": "produtos/hospedagens/vila-baru/vila-baru-1.jpg",
  "vila-cerrado": "produtos/hospedagens/vila-cerrado/vila-cerrado-1.jpg",
  "vila-chapada": "produtos/hospedagens/vila-chapada/vila-chapada-1.jpg",
  "vila-komorebi": "produtos/hospedagens/vila-komorebi/vila-komorebi-1.jpeg",
  "vila-libelula": "produtos/hospedagens/vila-libelula/vila-libelula-1.jpg",
  "vila-suindara": "produtos/hospedagens/vila-suindara/vila-suindara-1.jpg",
  "vila-toa": "produtos/hospedagens/vila-toa/vila-toa-1.jpg",
  "villa-eya": "produtos/hospedagens/villa-eya/villa-eya-1.jpg"
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

  const genericFallback = [optimizedUrl("home/cat-accommodations.jpg", IMAGE_PRESETS.card)];

  const fallback = primaryFallback.length > 0 ? primaryFallback : genericFallback;

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
  return optimizedUrl("home/cat-accommodations.jpg", IMAGE_PRESETS.card);
}

/** Legacy sync function */
export function getAccImages(id: string, name?: string): string[] {
  if (accommodationSpecifics[id]) {
    return [optimizedUrl(accommodationSpecifics[id], IMAGE_PRESETS.card)];
  }
  return [optimizedUrl("home/cat-accommodations.jpg", IMAGE_PRESETS.card)];
}
