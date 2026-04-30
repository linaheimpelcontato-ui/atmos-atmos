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

      const prefixRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-.*)?\\.(jpg|jpeg|png|webp|heic|mov|mp4|webm|avi|mkv)$`, 'i');
      
      const matching = files
        .filter((file: any) => prefixRegex.test(file.Key.split('/').pop()))
        .sort((a: any, b: any) => {
          const nameA = a.Key.split('/').pop();
          const nameB = b.Key.split('/').pop();
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
