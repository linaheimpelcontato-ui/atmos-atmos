const STORAGE_BASE = import.meta.env.VITE_R2_DOMAIN || "https://assets.atmos.tur.br";

/**
 * Legacy path mapping for R2. Kept as an identity function to prevent breaking 
 * imports in r2.ts and shared.tsx, since we've migrated back to Supabase.
 */
export const MAP_R2_PATH = (path: string): string => {
  return path;
};

export function getBaseStorageUrl(path: string): string {
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path;
  
  // Clean up leading slashes just in case
  const cleanPath = path.replace(/^\//, "");
  
  // Encode the path to handle spaces and special characters
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  // In development, prefer local assets if R2 domain is not set
  if (import.meta.env.DEV && !import.meta.env.VITE_R2_DOMAIN) {
    return `/assets/${encodedPath}`;
  }
  
  return `${STORAGE_BASE}/${encodedPath}`;
}

export function storageUrl(path: string): string {
  const rawUrl = getBaseStorageUrl(path);
  
  // If it's already an optimized wsrv.nl URL or a video, return as is
  if (rawUrl.includes('wsrv.nl') || rawUrl.match(/\.(mp4|mov|webm|svg|gif)$/i)) {
    return rawUrl;
  }

  // Auto-optimize all images (jpeg, jpg, png, webp) globally for hero banners/backgrounds
  if (rawUrl.match(/\.(jpeg|jpg|png|webp)$/i)) {
    const absoluteUrl = rawUrl.startsWith('http') 
      ? rawUrl 
      : `https://www.atmos.tur.br${rawUrl}`;
    // 1920px is safe for full screen backgrounds, compressed down to 80% quality webp
    return `https://wsrv.nl/?url=${encodeURIComponent(absoluteUrl)}&w=1920&q=80&output=webp`;
  }

  return rawUrl;
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
  large: { width: 1024, quality: 75, format: "webp" as const },
  hero: { width: 1920, quality: 80, format: "webp" as const },
  gallery: { width: 1200, quality: 75, format: "webp" as const },
};

/**
 * Returns an optimized image URL using wsrv.nl proxy.
 * This handles resizing, compression, and format conversion (WebP/AVIF) at the edge without extra costs.
 */
export function optimizedUrl(path: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}): string {
  if (!path || path.startsWith('http')) return path;

  const fullUrl = getBaseStorageUrl(path);
  
  // If no width is specified, we serve the original file for maximum reliability
  // This avoids any "middleman" issues for main assets.
  if (!options.width) return fullUrl;

  // Use wsrv.nl as an optional optimizer, but we'll wrap it in a way that
  // if it fails, the OptimizedImage component (already modified) catches it.
  const width = options.width;
  const quality = options.quality || 75;

  return `https://wsrv.nl/?url=${encodeURIComponent(fullUrl)}&w=${width}&q=${quality}&output=webp&il`;
}

/** 
 * Cleans a string for matching: no accents, lowercase, only letters/numbers 
 */
export const normalize = (str: string) => 
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .replace(/[^a-z0-9]+/g, "-")
     .replace(/(^-|-$)/g, "");

/**
 * Flexible matching for images.
 * Matches if the filename contains the product name OR vice-versa.
 */
export function isImageMatch(fullKey: string, prefix: string, rawName?: string): boolean {
  const fileName = fullKey.split('/').pop() || "";
  const nameWithoutExt = fileName.split('.').shift() || "";
  const normFile = normalize(nameWithoutExt).replace(/-\d+$/, ""); // remove trailing numbers
  const normPrefix = normalize(prefix);
  const normRaw = rawName ? normalize(rawName) : normPrefix;
  const normFullKey = normalize(fullKey);

  // 1. Check if filename matches exactly (ignoring trailing numbers)
  // Example: "registro-com-drone-1" matching "registro-com-drone"
  if (normFile === normPrefix || normFile === normRaw) return true;
  
  // 2. Check if filename starts with prefix followed by a dash (for numbered files)
  if (normFile.startsWith(normPrefix + "-") || normFile.startsWith(normRaw + "-")) return true;

  // 3. Fallback check for the full key (only if we are sure it's the right folder)
  // This is riskier but helps if the file was named differently
  if (normFullKey.endsWith(`/${normPrefix}/${fileName}`) || normFullKey.endsWith(`/${normRaw}/${fileName}`)) return true;

  return false;
}

