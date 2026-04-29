import { storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** Hook: dynamically lists all images for an accommodation from Storage */
export function useAccImages(id: string) {
  const query = useStorageImages("hospedagens", id);

  // Fallback to 6 hardcoded URLs while loading
  const fallback = Array.from({ length: 6 }, (_, i) =>
    storageUrl(`hospedagens/${id}-${i + 1}.jpg`)
  );

  return {
    images: query.data && query.data.length > 0 ? query.data : fallback,
    isLoading: query.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getAccCardImage(id: string): string {
  return storageUrl(`hospedagens/${id}-1.jpg`);
}

/** Legacy sync function */
export function getAccImages(id: string): string[] {
  return Array.from({ length: 6 }, (_, i) =>
    storageUrl(`hospedagens/${id}-${i + 1}.jpg`)
  );
}
