import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl, optimizedUrl, isImageMatch, normalize } from "@/lib/storage";
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
  if (!prefix) return [];
  
  const normPrefix = normalize(prefix);
  
  // Try these specific folders first for maximum speed and accuracy
  const priorityFolders = [
    `${folder}/${prefix}`,
    `${folder}/${normPrefix}`,
  ];

  // Also try common variants if prefix is an ID
  if (prefix.length < 30) {
    priorityFolders.push(`${folder}/${prefix.toLowerCase()}`);
  }

  const fallbackFolders = [
    folder,
    `produtos/${folder}`,
    'produtos/EXPERIENCIAS',
    'produtos/experiencias',
    'produtos/CACHOEIRAS',
    'produtos/cachoeiras',
    'produtos/HOSPEDAGENS',
    'produtos/hospedagens',
    'produtos/SERVICOS',
    'produtos/servicos',
    'produtos/serviços',
    'EXPERIENCIAS',
    'experiencias',
    'CACHOEIRAS',
    'cachoeiras',
    'HOSPEDAGENS',
    'hospedagens',
    'SERVICOS',
    'servicos',
    'serviços',
  ];

  const allFolders = Array.from(new Set([...priorityFolders, ...fallbackFolders]));
  
  for (const f of allFolders) {
    try {
      if (!f || f === '/') continue;
      
      const files = await r2.list(f);
      if (!files || files.length === 0) continue;

      // Filter and sort
      const matching = files
        .filter((file: any) => isImageMatch(file.Key, prefix))
        .sort((a: any, b: any) => {
          const nameA = a.Key.toLowerCase();
          const nameB = b.Key.toLowerCase();
          
          // Capa always first
          if (nameA.includes('_capa') && !nameB.includes('_capa')) return -1;
          if (!nameA.includes('_capa') && nameB.includes('_capa')) return 1;
          
          // Numeric sort for gallery
          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        })
        .map((file: any) => {
          // If it's a video file, skip optimization
          if (file.Key.toLowerCase().endsWith('.mp4') || file.Key.toLowerCase().endsWith('.mov')) {
            return storageUrl(file.Key);
          }
          return optimizedUrl(file.Key, { width: 1000, quality: 80 });
        });

      if (matching.length > 0) return matching;
    } catch (err) {
      continue;
    }
  }

  return [];
}
