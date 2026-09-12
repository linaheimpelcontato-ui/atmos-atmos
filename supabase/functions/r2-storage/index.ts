import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { authorizeAdminRequest } from "../_shared/adminModuleAuth.ts"
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "npm:@aws-sdk/client-s3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  try {
    const body = await req.json()
    const { action, folder, fileName, bucket, sourceKey, destinationKey, contentType } = body
    if (!['list', 'delete', 'copy', 'get-upload-url'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Lists serve the public catalog. Every mutation/presign shares the site
    // permission: folders are shared and do not isolate catalog from home media.
    if (action !== 'list') {
      const denied = await authorizeAdminRequest(req, {
        createClient,
        supabaseUrl: Deno.env.get('SUPABASE_URL'),
        anonKey: Deno.env.get('SUPABASE_ANON_KEY'),
        modules: ['site'],
      })
      if (denied) return denied
    }
    // Never let a public catalog request select another bucket reachable by
    // the server credentials. 'atmos' is the existing frontend bucket.
    const BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') || 'atmos'
    if (bucket !== undefined && bucket !== BUCKET_NAME) {
      return new Response(JSON.stringify({ error: 'Invalid bucket' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Credentials from environment variables
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
      throw new Error('R2 credentials not configured')
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    if (action === 'list') {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: folder ? `${folder}/` : '',
      })
      const response = await s3Client.send(command)
      return new Response(JSON.stringify(response.Contents || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${folder}/${fileName}`,
      })
      await s3Client.send(command)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get-upload-url') {
      // Import presigned URL generator
      const { getSignedUrl } = await import("npm:@aws-sdk/s3-request-presigner");
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${folder}/${fileName}`,
        ContentType: typeof contentType === 'string' && contentType ? contentType : 'application/octet-stream',
      })
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'copy') {
      const command = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `/${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
      })
      await s3Client.send(command)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Action ${action} not implemented`)

  } catch (error) {
    return new Response(JSON.stringify({ error: "Não foi possível concluir a operação de mídia" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
