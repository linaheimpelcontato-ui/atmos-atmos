import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl } from "@/lib/storage";
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
  const folders = [folder, 'experiencias', 'cachoeiras', 'hospedagens', 'roteiros', 'servicos', 'home'];
  const uniqueFolders = Array.from(new Set(folders));
  
  for (const f of uniqueFolders) {
    try {
      const files = await r2.list(f);
      if (!files || files.length === 0) continue;

      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const normalizedPrefix = normalize(prefix);
      
      const matching = files
        .filter((file: any) => {
          const key = file.Key.toLowerCase();
          const fileName = key.split('/').pop() || "";
          const normalizedFileName = normalize(fileName);
          
          return normalizedFileName.startsWith(normalizedPrefix) || 
                 key.includes(`/${normalizedPrefix}/`);
        })
        .sort((a: any, b: any) => {
          const nameA = a.Key.toLowerCase();
          const nameB = b.Key.toLowerCase();
          
          // Priority 1: _capa files always first
          const isFavA = nameA.includes('_capa');
          const isFavB = nameB.includes('_capa');
          if (isFavA && !isFavB) return -1;
          if (!isFavA && isFavB) return 1;

          // Priority 2: Numerical order
          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        })
        .map((file: any) => storageUrl(file.Key));

      if (matching.length > 0) return matching;
    } catch (err) {
      console.error(`Error listing R2 for folder ${f}:`, err);
      continue;
    }
  }

  return [];
}
