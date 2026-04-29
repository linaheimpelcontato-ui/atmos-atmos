import { createClient } from "@supabase/supabase-js";

const OLD_URL = "https://ptxvfmxnajqdsohuugbv.supabase.co";
const OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eHZmbXhuYWpxZHNvaHV1Z2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzMxODUsImV4cCI6MjA4NzEwOTE4NX0.0oHuNmOQEQXaZ_k5sTvNt8ubL6DVkFpntHRi0Iiok1c";

const DEV_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const DEV_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYXZ4aG14cmJwaWR2c3NyYmNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNDAyMCwiZXhwIjoyMDkxMzgwMDIwfQ.lQ__eTMaUE5z2GDkAAtngjtITVK51tuM1__7_WAcGw8";

const PRD_URL = "https://ekbsqckzelabjabuodmo.supabase.co";
const PRD_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYnNxY2t6ZWxhYmphYnVvZG1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc5MTcwNywiZXhwIjoyMDkxMzY3NzA3fQ.ACzYKq_egezUinkW9rwFkQKdvH8wA8SD0EJNMsH4OZk";

async function syncStorage(bucketName, path = "") {
  const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
  const devClient = createClient(DEV_URL, DEV_SERVICE_KEY);
  const prdClient = createClient(PRD_URL, PRD_SERVICE_KEY);

  console.log(`[+] Lendo diretório: /${bucketName}/${path}`);
  const { data: items, error } = await oldClient.storage.from(bucketName).list(path, { limit: 1000 });
  
  if (error || !items) {
    console.error(`Erro ao listar pasta /${path}:`, error?.message);
    return;
  }

  for (const item of items) {
    if (item.name === '.emptyFolderPlaceholder') continue;
    const fullPath = path ? `${path}/${item.name}` : item.name;

    if (!item.id || !item.metadata) {
      await syncStorage(bucketName, fullPath);
    } else {
      console.log(`  -> Baixando arquivo: ${fullPath}`);
      try {
        const { data: fileData, error: downloadError } = await oldClient.storage.from(bucketName).download(fullPath);
        if (downloadError) {
          console.error(`Falha no download de ${fullPath}`, downloadError);
          continue;
        }
        const buffer = await fileData.arrayBuffer();

        try { await devClient.storage.from(bucketName).upload(fullPath, buffer, { upsert: true, contentType: item.metadata.mimetype }); } catch(err) { console.error("DEV Error:", err.message) }
        try { await prdClient.storage.from(bucketName).upload(fullPath, buffer, { upsert: true, contentType: item.metadata.mimetype }); } catch(err) { console.error("PRD Error:", err.message) }
      } catch(e) {
        console.error(`Network err on ${fullPath}:`, e.message);
      }
    }
  }
}

async function run() {
  const folders = [
    'cachoeiras', 'duvidas', 'experiencias', 'home', 
    'hospedagens', 'imersoes', 'monte-seu-roteiro', 
    'roteiros', 'servicos'
  ];

  console.log("Iniciando cópia das Imagens do bucket 'assets'...");
  for (const folder of folders) {
      await syncStorage('assets', folder);
  }
  console.log("✅ Concluído! Todas as imagens foram copiadas com sucesso.");
}
run();
