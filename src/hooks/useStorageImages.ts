import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl, isImageMatch, normalize } from "@/lib/storage";
import { r2 } from "@/lib/r2";

/**
 * Lists real files from the assets bucket for a given folder+prefix,
 * returning sorted public URLs. Cached for 5 minutes.
 */
export function useStorageImages(folder: string, prefix: string, enabled = true) {
  return useQuery({
    queryKey: ["storage-images", folder, prefix],
    queryFn: () => fetchStorageImages(folder, prefix),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!prefix,
  });
}

/** Non-hook version for use outside React components */
export async function fetchStorageImages(folder: string, prefix: string): Promise<string[]> {
  const normPrefix = normalize(prefix);
  
  // Try these specific folders first for maximum speed
  const priorityFolders = [
    `${folder}/${prefix}`,
    `${folder}/${normPrefix}`,
    `${folder}/${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`, // Capitalized
  ];

  const fallbackFolders = [
    folder,
    'produtos/experiencias',
    'produtos/cachoeiras',
    'produtos/hospedagens',
    'produtos/servicos',
    'produtos/roteiros',
    'home'
  ];

  const allFolders = Array.from(new Set([...priorityFolders, ...fallbackFolders]));
  
  for (const f of allFolders) {
    try {
      // Don't try empty folders
      if (!f || f === '/') continue;
      
      const files = await r2.list(f);
      if (!files || files.length === 0) continue;

      const matching = files
        .filter((file: any) => isImageMatch(file.Key, prefix))
        .sort((a: any, b: any) => {
          const nameA = a.Key.toLowerCase();
          const nameB = b.Key.toLowerCase();
          if (nameA.includes('_capa') && !nameB.includes('_capa')) return -1;
          if (!nameA.includes('_capa') && nameB.includes('_capa')) return 1;
          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        })
        .map((file: any) => storageUrl(file.Key));

      if (matching.length > 0) return matching;
    } catch (err) {
      // Silently fail for specific folder tries, log only for category fallbacks
      continue;
    }
  }

  return [];
}
