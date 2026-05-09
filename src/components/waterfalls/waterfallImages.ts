import { storageUrl } from "@/lib/storage";
import { useStorageImages } from "@/hooks/useStorageImages";

/** Map of waterfall IDs that use a different storage key than their data ID */
const storageKeyOverrides: Record<string, string> = {
  "canions-cariocas": "cariocas",
  "macacão": "macacao",
};

function getStorageKey(id: string): string {
  return storageKeyOverrides[id] ?? id;
}

export function useWaterfallImages(id: string, name: string) {
  // Use the full name and normalized ID for better matching with R2 folders
  const query = useStorageImages("produtos/cachoeiras", name);
  const idQuery = useStorageImages("produtos/cachoeiras", id);
  const capQuery = useStorageImages("produtos/Cachoeiras", name);
  const capIdQuery = useStorageImages("produtos/Cachoeiras", id);
  
  const allImages = [
    ...(query.data || []), 
    ...(idQuery.data || []),
    ...(capQuery.data || []),
    ...(capIdQuery.data || [])
  ];
  const uniqueImages = Array.from(new Set(allImages));

  // Fallback to optimized URLs using the new structure
  const fallback = [1, 2, 3].map((n) => storageUrl(`produtos/cachoeiras/${id}/${id}-${n}.jpg`));

  return {
    images: uniqueImages.length > 0 ? uniqueImages : fallback,
    isLoading: query.isLoading || idQuery.isLoading || capQuery.isLoading || capIdQuery.isLoading,
  };
}

/** Synchronous fallback — used for cards (always first image) */
export function getWaterfallCardImage(id: string, name: string): string {
  return storageUrl(`produtos/cachoeiras/${id}/${id}-1.jpg`);
}

/** Legacy sync function — kept for backward compatibility */
export function getWaterfallImages(id: string, name: string): string[] {
  return [1, 2, 3].map((n) => storageUrl(`produtos/cachoeiras/${id}/${id}-n.jpg`));
}
