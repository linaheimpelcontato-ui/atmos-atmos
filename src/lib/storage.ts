const BASE_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const STORAGE_BASE = `${BASE_URL}/storage/v1/object/public/assets`;
const RENDER_BASE = `${BASE_URL}/storage/v1/render/image/public/assets`;

// Cloudflare R2 Public Domain (configured in .env)
const R2_DOMAIN = import.meta.env.VITE_R2_DOMAIN || "";

const CATEGORY_MAPPINGS: Record<string, string> = {
  'experiencias/': 'produtos/EXPERIENCIAS/',
  'hospedagens/': 'produtos/HOSPEDAGENS/',
  'servicos/': 'produtos/SERVIÇOS/',
  'cachoeiras/': 'produtos/cachoeiras/',
  'roteiros/': 'produtos/ROTEIROS/',
  'lideranca/': 'home/lideranca/',
  'home/': 'home/',
  'duvidas/': 'duvidas/',
  'preferencias/': 'preferencias/',
  'monte-seu-roteiro/': 'monte-seu-roteiro/',
  'proposta-visual-cliente/': 'proposta-visual-cliente/'
};

/**
 * Maps legacy folder names to the new R2 structure.
 * Helps transition without changing every call in the codebase.
 */
export const MAP_R2_PATH = (path: string): string => {
  for (const [oldPrefix, newPrefix] of Object.entries(CATEGORY_MAPPINGS)) {
    if (path.startsWith(oldPrefix)) {
      const rest = path.slice(oldPrefix.length);
      return newPrefix + rest;
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
 * Returns an optimized image URL using Cloudflare Image Resizing.
 * This is the fastest way to serve images as it handles resizing, 
 * compression, and format conversion (WebP/AVIF) at the edge.
 */
export function optimizedUrl(path: string, opts?: OptimizedOptions): string {
  if (!path) return "";
  
  // 1. Get the base storage URL (Cloudflare R2)
  const rawUrl = storageUrl(path);
  
  // 2. If we don't have an R2 domain or it's a public R2.dev domain, we can't use Cloudflare Resizing
  // Cloudflare Image Resizing ONLY works on custom domains proxied by Cloudflare.
  if (!R2_DOMAIN || !opts || R2_DOMAIN.includes('r2.dev')) return rawUrl;

  const cleanDomain = R2_DOMAIN.replace(/\/$/, "");
  const domainWithProtocol = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`;
  
  // 3. Build Cloudflare Resizing parameters
  const params = [];
  if (opts.width) params.push(`width=${opts.width}`);
  if (opts.height) params.push(`height=${opts.height}`);
  if (opts.quality) params.push(`quality=${opts.quality}`);
  if (opts.resize) params.push(`fit=${opts.resize}`);
  if (opts.format && opts.format !== "origin") params.push(`format=${opts.format}`);
  else params.push("format=auto"); // Let Cloudflare decide (WebP/AVIF)

  // 4. Construct the transformation URL: https://domain.com/cdn-cgi/image/params/mappedPath
  const mappedPath = MAP_R2_PATH(path);
  return `${domainWithProtocol}/cdn-cgi/image/${params.join(",")}/${mappedPath}`;
}
