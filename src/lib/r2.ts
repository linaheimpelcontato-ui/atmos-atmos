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
    console.log('Invoking r2-storage function...');
    const { data, error: functionError } = await supabase.functions.invoke('r2-storage', {
      body: JSON.stringify({ 
        action: 'get-upload-url', 
        bucket: 'atmos',
        folder: mappedFolder, 
        fileName 
      }),
      headers: {
        'x-content-type': file.type,
        'Content-Type': 'application/json'
      }
    });

    if (functionError || !data?.url) {
      console.error('R2 Invoke Detailed Error:', functionError);
      let errorMsg = 'Failed to connect to the storage server.';
      
      if (functionError instanceof Error) {
        errorMsg = functionError.message;
      } else if (typeof functionError === 'object') {
        errorMsg = (functionError as any).message || JSON.stringify(functionError);
      }
      
      throw new Error(`[EdgeFunction Error] ${errorMsg}`);
    }

    // 2. Upload directly to R2
    console.log('Uploading to R2 via presigned URL...');
    const uploadResponse = await fetch(data.url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('R2 Direct Upload Error:', errorText);
      throw new Error(`[R2 Direct Error] ${errorText || uploadResponse.statusText}`);
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
