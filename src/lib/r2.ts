import { supabase } from "@/integrations/supabase/client";
import { MAP_R2_PATH } from "./storage";

/**
 * Utility for Cloudflare R2 operations via the r2-storage Edge Function.
 * This keeps S3 credentials secure on the server side.
 */
export const r2 = {
  /**
   * Uploads a file to R2 using a presigned URL
   */
  async upload(folder: string, fileName: string, file: File): Promise<void> {
    const mappedFolder = MAP_R2_PATH(folder.endsWith('/') ? folder : `${folder}/`).replace(/\/$/, "");
    // 1. Get presigned URL from Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/r2-storage`;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) throw new Error('Entre com sua conta para enviar imagens.');
    
    let response;
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'get-upload-url', 
          bucket: 'atmos',
          folder: mappedFolder, 
          fileName,
          contentType: file.type
        })
      });
    } catch (e: any) {
      throw new Error(`Erro de rede: O site não conseguiu falar com o servidor. Verifique sua internet ou VPN. (${e.message})`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no servidor (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data?.url) {
      throw new Error('O servidor não devolveu o link de upload.');
    }

    // 2. Upload directly to R2
    console.log('Enviando para o Cloudflare...');
    const uploadResponse = await fetch(data.url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Erro no Cloudflare (${uploadResponse.status}): ${uploadResponse.statusText}`);
    }
  },

  /**
   * Lists files in an R2 folder
   */
  async list(folder: string): Promise<any[]> {
    const mappedFolder = MAP_R2_PATH(folder.endsWith('/') ? folder : `${folder}/`).replace(/\/$/, "");
    const { data, error } = await supabase.functions.invoke('r2-storage', {
      body: { action: 'list', bucket: 'atmos', folder: mappedFolder }
    });

    if (error) throw error;
    return data || [];
  },

  /**
   * Deletes a file from R2
   */
  async delete(folder: string, fileName: string): Promise<void> {
    const mappedFolder = MAP_R2_PATH(folder.endsWith('/') ? folder : `${folder}/`).replace(/\/$/, "");
    const { error } = await supabase.functions.invoke('r2-storage', {
      body: { action: 'delete', bucket: 'atmos', folder: mappedFolder, fileName }
    });

    if (error) throw error;
  },

  /**
   * Copies a file in R2 (useful for renaming)
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const { error } = await supabase.functions.invoke('r2-storage', {
      body: { action: 'copy', sourceKey, destinationKey }
    });

    if (error) throw error;
  }
};
