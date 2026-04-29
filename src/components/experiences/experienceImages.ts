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
  // Use both imageKey and slugified name as potential prefixes
  const slug = namePt ? namePt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]/g, '') : "";
  const query = useStorageImages("experiencias", imageKey);
  const slugQuery = useStorageImages("experiencias", slug, !!slug && slug !== imageKey);

  const fallbackPath = (id && experienceSpecifics[id]) || `experiencias/${imageKey}-1.jpg`;
  const fallback = [storageUrl(fallbackPath)];

  const images = (query.data && query.data.length > 0) 
    ? query.data 
    : (slugQuery.data && slugQuery.data.length > 0) 
    ? slugQuery.data 
    : fallback;

  return {
    images,
    isLoading: query.isLoading || slugQuery.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getCardImage(id: string, imageKey?: string): string {
  if (!id) return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80";
  
  if (experienceSpecifics[id]) {
    return storageUrl(experienceSpecifics[id]);
  }
  
  const key = imageKey || id;
  if (key.startsWith('http')) return key;
  if (key.includes('/')) return storageUrl(key);
  
  return storageUrl(`experiencias/${key}-1.jpg`);
}

/** Legacy sync function — kept for backward compatibility */
export function getGalleryImages(key: string): string[] {
  return [getCardImage(key)];
}
