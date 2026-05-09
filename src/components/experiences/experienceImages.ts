import { optimizedUrl, storageUrl, IMAGE_PRESETS } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

export const experienceSpecifics: Record<string, string> = {
  "noturna-imersiva": "experiencias/noturna-1.jpg",
  "voo-balao": "experiencias/balao-1.jpg",
  "voo-paramotor": "experiencias/paramotor-1.jpg",
  "massagem-bem-estar": "experiencias/massagem-1.jpg",
  "yoga-meditacao": "experiencias/yoga-1.jpg",
  "passeio-cavalo": "experiencias/cavalo-1.jpg",
  "passeio-a-cavalo": "experiencias/cavalo-1.jpg",
  "88e4e77a-485d-4529-a32b-bc03109b44c5": "experiencias/cavalo-1.jpg",
  "astro-turismo": "experiencias/astro-1.jpg",
  "aula-forro": "experiencias/forro-1.jpg",
  "feira-produtores": "experiencias/feira-1.jpg",
};

/** Hook: dynamically lists all images for an experience from Storage */
export function useExperienceGallery(imageKey: string, namePt?: string, id?: string) {
  // Use both imageKey and namePt as potential prefixes
  const query = useStorageImages("produtos/experiencias", imageKey);
  const nameQuery = useStorageImages("produtos/experiencias", namePt || "", !!namePt);

  const allImages = [...(query.data || []), ...(nameQuery.data || [])];
  const uniqueImages = Array.from(new Set(allImages));

  const fallbackPath = (id && experienceSpecifics[id]) 
    ? (experienceSpecifics[id].startsWith('produtos') ? experienceSpecifics[id] : `produtos/experiencias/${experienceSpecifics[id].split('/').pop()}`)
    : `produtos/experiencias/${imageKey}/${imageKey}-1.jpg`;
    
  const fallback = [optimizedUrl(fallbackPath, { width: 1000, quality: 80 })];

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || nameQuery.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getCardImage(id: string, imageKey?: string): string {
  if (!id) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80";
  
  if (experienceSpecifics[id]) {
    const path = experienceSpecifics[id];
    return optimizedUrl(path.startsWith('produtos') ? path : `produtos/experiencias/${path.split('/').pop()}`, { width: 1000, quality: 80 });
  }
  
  const key = imageKey || id;
  if (key.startsWith('http')) return key;
  if (key.includes('/')) return optimizedUrl(key, { width: 1000, quality: 80 });
  
  return optimizedUrl(`produtos/experiencias/${key}/${key}-1.jpg`, { width: 1000, quality: 80 });
}

/** Legacy sync function — kept for backward compatibility */
export function getGalleryImages(key: string): string[] {
  return [getCardImage(key)];
}
