import { storageUrl, optimizedUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

export function useAccImages(id: string, name?: string) {
  const query = useStorageImages("produtos/hospedagens", name || "");
  const idQuery = useStorageImages("produtos/hospedagens", id);

  const allImages = [...(query.data || []), ...(idQuery.data || [])];
  const uniqueImages = Array.from(new Set(allImages));

  // Fallback using the new structure
  const fallback = Array.from({ length: 6 }, (_, i) =>
    optimizedUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`, { width: 1000, quality: 80 })
  );

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading,
  };
}

/** Synchronous — card thumbnail (always first image) */
export function getAccCardImage(id: string, name?: string): string {
  return optimizedUrl(`produtos/hospedagens/${id}/${id}-1.jpg`, { width: 1000, quality: 80 });
}

/** Legacy sync function */
export function getAccImages(id: string, name?: string): string[] {
  return Array.from({ length: 6 }, (_, i) =>
    optimizedUrl(`produtos/hospedagens/${id}/${id}-${i + 1}.jpg`, { width: 1000, quality: 80 })
  );
}
