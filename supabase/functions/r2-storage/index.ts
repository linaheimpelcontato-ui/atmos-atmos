import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "npm:@aws-sdk/client-s3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, folder, fileName, bucket } = await req.json()
    
    // Credentials from environment variables
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')
    const BUCKET_NAME = bucket || Deno.env.get('R2_BUCKET_NAME')

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
        ContentType: req.headers.get('x-content-type') || 'application/octet-stream',
      })
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Action ${action} not implemented`)

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
