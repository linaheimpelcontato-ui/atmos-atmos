import { supabase } from "@/integrations/supabase/client";

/**
 * Utility for Cloudflare R2 operations via the r2-storage Edge Function.
 * This keeps S3 credentials secure on the server side.
 */
export const r2 = {
  /**
   * Uploads a file to R2 using a presigned URL
   */
  async upload(folder: string, fileName: string, file: File): Promise<void> {
    // 1. Get presigned URL from Edge Function
    const { data, error: functionError } = await supabase.functions.invoke('r2-storage', {
      body: { 
        action: 'get-upload-url', 
        folder, 
        fileName 
      },
      headers: {
        'x-content-type': file.type
      }
    });

    if (functionError || !data?.url) {
      throw new Error(functionError?.message || 'Failed to get upload URL');
    }

    // 2. Upload directly to R2
    const uploadResponse = await fetch(data.url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to Cloudflare R2');
    }
  },

  /**
   * Lists files in an R2 folder
   */
  async list(folder: string): Promise<any[]> {
    const { data, error } = await supabase.functions.invoke('r2-storage', {
      body: { action: 'list', folder }
    });

    if (error) throw error;
    return data || [];
  },

  /**
   * Deletes a file from R2
   */
  async delete(folder: string, fileName: string): Promise<void> {
    const { error } = await supabase.functions.invoke('r2-storage', {
      body: { action: 'delete', folder, fileName }
    });

    if (error) throw error;
  }
};
