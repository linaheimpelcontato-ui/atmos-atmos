const BASE_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const STORAGE_BASE = `${BASE_URL}/storage/v1/object/public/assets`;

/**
 * Legacy path mapping for R2. Kept as an identity function to prevent breaking 
 * imports in r2.ts and shared.tsx, since we've migrated back to Supabase.
 */
export const MAP_R2_PATH = (path: string): string => {
  return path;
};

/** Returns the public URL for a storage asset directly from Supabase */
export function storageUrl(path: string): string {
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path;
  
  // Clean up leading slashes just in case
  const cleanPath = path.replace(/^\//, "");
  
  return `${STORAGE_BASE}/${cleanPath}`;
}

interface OptimizedOptions {
  width?: number;
  height?: number;
  quality?: number;
  /** default "cover" */
  resize?: "cover" | "contain" | "fill";
  format?: "origin" | "avif" | "webp";
}

export const IMAGE_PRESETS = {
  thumbnail: { width: 400, quality: 70, format: "webp" as const },
  card: { width: 800, quality: 75, format: "webp" as const },
  hero: { width: 1920, quality: 80, format: "webp" as const },
  gallery: { width: 1200, quality: 75, format: "webp" as const },
};

/**
 * Returns an optimized image URL using Vercel Image Optimization.
 * This handles resizing, compression, and format conversion (WebP/AVIF) at the edge without extra costs.
 */
export function optimizedUrl(path: string, opts?: OptimizedOptions): string {
  if (!path) return "";
  
  // 1. Get the base storage URL (Cloudflare R2 or Supabase)
  const rawUrl = storageUrl(path);
  
  // 2. Build wsrv.nl optimization parameters
  // wsrv.nl caches and compresses images perfectly for free
  const width = opts?.width || 800;
  const quality = opts?.quality || 75;

  // We must ensure the URL is absolute for wsrv.nl
  const absoluteUrl = rawUrl.startsWith('http') 
    ? rawUrl 
    : `https://www.atmos.tur.br${rawUrl}`;

  return `https://wsrv.nl/?url=${encodeURIComponent(absoluteUrl)}&w=${width}&q=${quality}&output=webp`;
}
