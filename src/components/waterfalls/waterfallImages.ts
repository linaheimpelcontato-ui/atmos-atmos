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
export function useWaterfallImages(id: string, imageIndex = 1) {
  const key = getStorageKey(id);
  const query = useStorageImages("cachoeiras", key);

  // Fallback to 3 hardcoded URLs while loading or if empty
  const fallback = [1, 2, 3].map((n) => storageUrl(`cachoeiras/${key}-${n}.jpg`));

  return {
    images: query.data && query.data.length > 0 ? query.data : fallback,
    isLoading: query.isLoading,
  };
}

/** Synchronous fallback — used for cards (always first image) */
export function getWaterfallCardImage(id: string, imageIndex = 1): string {
  const key = getStorageKey(id);
  return storageUrl(`cachoeiras/${key}-1.jpg`);
}

/** Legacy sync function — kept for backward compatibility */
export function getWaterfallImages(id: string, imageIndex: number): string[] {
  const key = getStorageKey(id);
  return [1, 2, 3].map((n) => storageUrl(`cachoeiras/${key}-${n}.jpg`));
}
