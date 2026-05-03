import { storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** Hook: dynamically lists all images for an accommodation from Storage */
export function useAccImages(id: string, name?: string) {
  const query = useStorageImages("produtos/hospedagens", name || id);

  // Fallback using the new structure
  const fallback = Array.from({ length: 6 }, (_, i) =>
    storageUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`)
  );

  return {
    images: query.data && query.data.length > 0 ? query.data : fallback,
    isLoading: query.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getAccCardImage(id: string, name?: string): string {
  return storageUrl(`produtos/hospedagens/${id}/${id}-1.jpg`);
}

/** Legacy sync function */
export function getAccImages(id: string, name?: string): string[] {
  return Array.from({ length: 6 }, (_, i) =>
    storageUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`)
  );
}
