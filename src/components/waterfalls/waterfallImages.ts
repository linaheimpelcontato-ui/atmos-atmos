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

/** Hook: dynamically lists all images for a waterfall from Storage */
export function useWaterfallImages(id: string, name: string) {
  // Use the full name for better matching with R2 folders
  const query = useStorageImages("produtos/cachoeiras", name);

  // Fallback to optimized URLs using the new structure
  const fallback = [1, 2, 3].map((n) => storageUrl(`produtos/cachoeiras/${id}/${id}-${n}.jpg`));

  return {
    images: query.data && query.data.length > 0 ? query.data : fallback,
    isLoading: query.isLoading,
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
