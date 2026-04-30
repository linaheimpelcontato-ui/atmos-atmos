const BASE_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const STORAGE_BASE = `${BASE_URL}/storage/v1/object/public/assets`;
const RENDER_BASE = `${BASE_URL}/storage/v1/render/image/public/assets`;

// Cloudflare R2 Public Domain (to be configured in Vercel/Supabase Env)
const R2_DOMAIN = import.meta.env.VITE_R2_DOMAIN || "";

/** Returns the public URL for a storage asset */
export function storageUrl(path: string, provider: 'supabase' | 'r2' = 'r2'): string {
  if (provider === 'r2' && R2_DOMAIN) {
    const cleanDomain = R2_DOMAIN.replace(/\/$/, ""); // Remove trailing slash
    const domainWithProtocol = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`;
    return `${domainWithProtocol}/${path}`;
  }
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
 * Returns an optimised/resized image URL via Supabase Storage Image Transformations.
 * Falls back to the raw URL when no options are given.
 */
export function optimizedUrl(path: string, opts?: OptimizedOptions): string {
  if (!path) return "";
  if (!opts) return storageUrl(path);
  
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  params.set("quality", String(opts.quality ?? 75));
  if (opts.resize) params.set("resize", opts.resize);
  params.set("format", opts.format ?? "webp");
  
  return `${RENDER_BASE}/${path}?${params.toString()}`;
}
