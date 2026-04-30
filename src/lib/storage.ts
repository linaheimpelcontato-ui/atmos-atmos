const BASE_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const STORAGE_BASE = `${BASE_URL}/storage/v1/object/public/assets`;
const RENDER_BASE = `${BASE_URL}/storage/v1/render/image/public/assets`;

// Cloudflare R2 Public Domain (configured in .env)
const R2_DOMAIN = import.meta.env.VITE_R2_DOMAIN || "";

/**
 * Maps legacy folder names to the new R2 structure.
 * Helps transition without changing every call in the codebase.
 */
export const MAP_R2_PATH = (path: string): string => {
  const mapping: Record<string, string> = {
    'cachoeiras/': 'produtos/CACHOEIRAS/',
    'experiencias/': 'produtos/EXPERIENCIAS/',
    'hospedagens/': 'produtos/HOSPEDAGENS/',
    'servicos/': 'produtos/SERVICOS/',
    'roteiros/': 'produtos/ROTEIROS/',
  };

  for (const [oldPrefix, newPrefix] of Object.entries(mapping)) {
    if (path.startsWith(oldPrefix)) {
      const rest = path.slice(oldPrefix.length);
      
      // If it matches "slug-1.jpg" or "slug.jpg" etc, insert the slug folder
      // This handles calls like storageUrl('cachoeiras/dragao-1.jpg')
      const productFileMatch = rest.match(/^([a-z0-9-]+)(?:-\d+)?\.(jpg|jpeg|png|webp|heic|mov|mp4|webm)$/i);
      
      if (productFileMatch && !rest.includes('/')) {
        const slug = productFileMatch[1];
        return `${newPrefix}${slug}/${rest}`;
      }
      
      return `${newPrefix}${rest}`;
    }
  }
  return path;
};

/** Returns the public URL for a storage asset */
export function storageUrl(path: string, provider: 'supabase' | 'r2' = 'r2'): string {
  // Respect user request: 100% Cloudflare R2
  if (R2_DOMAIN) {
    const cleanDomain = R2_DOMAIN.replace(/\/$/, ""); 
    const domainWithProtocol = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`;
    const mappedPath = MAP_R2_PATH(path);
    return `${domainWithProtocol}/${mappedPath}`;
  }
  
  // Fallback to Supabase ONLY if R2_DOMAIN is missing (safety)
  return `${STORAGE_BASE}/${path}`;
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
 * Returns an optimized image URL. 
 * Since we moved to R2, we use R2 for raw assets.
 * Note: Cloudflare Images or Workers can handle transformations if needed,
 * for now we just return the R2 URL to ensure 100% Cloudflare usage.
 */
export function optimizedUrl(path: string, opts?: OptimizedOptions): string {
  if (!path) return "";
  // Always use R2 as base
  return storageUrl(path);
}
