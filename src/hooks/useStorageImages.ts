import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl } from "@/lib/storage";

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
    const { data: files, error } = await supabase.storage.from("assets").list(f);
    if (error || !files || files.length === 0) continue;

    const prefixRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-.*)?\\.(jpg|jpeg|png|webp|mov|mp4)$`, 'i');
    
    const matching = files
      .filter((file) => prefixRegex.test(file.name))
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/-(\d+)\./)?.[1] || "0");
        const numB = parseInt(b.name.match(/-(\d+)\./)?.[1] || "0");
        return numA - numB;
      })
      .map((file) => storageUrl(`${f}/${file.name}`));

    if (matching.length > 0) return matching;
  }

  return [];
}
