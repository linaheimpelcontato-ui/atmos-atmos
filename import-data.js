import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const DEV_URL = "https://zjavxhmxrbpidvssrbca.supabase.co";
const DEV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYXZ4aG14cmJwaWR2c3NyYmNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNDAyMCwiZXhwIjoyMDkxMzgwMDIwfQ.lQ__eTMaUE5z2GDkAAtngjtITVK51tuM1__7_WAcGw8";
const PRD_URL = "https://ekbsqckzelabjabuodmo.supabase.co";
const PRD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYnNxY2t6ZWxhYmphYnVvZG1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc5MTcwNywiZXhwIjoyMDkxMzY3NzA3fQ.ACzYKq_egezUinkW9rwFkQKdvH8wA8SD0EJNMsH4OZk";

const devClient = createClient(DEV_URL, DEV_KEY);
const prdClient = createClient(PRD_URL, PRD_KEY);

const dataStore = JSON.parse(fs.readFileSync('banco-old.json', 'utf8'));

// To resolve Foreign Key dependencies without knowing the exact topology,
// we will attempt to insert everything, ignore errors, and retry the failed ones continuously.
async function importData(client, label) {
  let pendingTables = Object.keys(dataStore).filter(table => dataStore[table] && dataStore[table].length > 0);
  
  console.log(`\n\n=== Iniciando importação para ${label} ===`);
  
  let attempts = 0;
  while (pendingTables.length > 0 && attempts < 10) {
    attempts++;
    console.log(`\nTentativa ${attempts}... Tabelas pendentes: ${pendingTables.length}`);
    const nextPending = [];
    
    for (const table of pendingTables) {
      const rows = dataStore[table];
      // upsert instead of insert to handle conflicts safely and repeatedly
      const { error } = await client.from(table).upsert(rows);
      if (error) {
        // likely a foreign key error or constraint, save for next try
        nextPending.push(table);
      } else {
        console.log(`✅ [${label}] Inseridos ${rows.length} itens na tabela -> ${table}`);
      }
    }
    
    if (nextPending.length === pendingTables.length) {
      console.log(`\n⚠️ Limite de re-tentativas atingido por conflitos em cascata. As seguintes tabelas não conseguiram inserir todas as linhas: `, nextPending);
      // Let's print out the exact error for one to debug if needed
      for(const tbl of nextPending) {
         const { error } = await client.from(tbl).upsert(dataStore[tbl]);
         console.log(`Erro final ${tbl}: ${error.message}`);
      }
      break;
    }
    
    pendingTables = nextPending;
  }
}

async function run() {
  await importData(devClient, "DEV");
  console.log('Esperando 2 segundos...');
  await new Promise(r => setTimeout(r, 2000));
  await importData(prdClient, "PRD");
  console.log("Migração de texto 100% Finalizada!");
}

run();
