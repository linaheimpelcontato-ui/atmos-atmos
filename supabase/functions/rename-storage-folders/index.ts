import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "assets";
const FOLDER = "experiencias";

// Mapping: original display name → slug key
const MAPPING: Record<string, { key: string; count: number }> = {
  "Experiencia Noturna Imersiva": { key: "noturna", count: 5 },
  "Voo de Balao": { key: "balao", count: 5 },
  "Voo de Paramotor": { key: "paramotor", count: 6 },
  "Massagem e Bem Estar": { key: "massagem", count: 6 },
  "Yoga e Meditacao": { key: "yoga", count: 6 },
  "Passeio a Cavalo": { key: "cavalo", count: 6 },
  "Rapel": { key: "rapel", count: 5 },
  "Canionismo": { key: "canionismo", count: 6 },
  "Rafting": { key: "rafting", count: 6 },
  "Tirolesa Fazenda Sao Bento": { key: "tirolesa", count: 6 },
  "Astro Turismo": { key: "astro", count: 6 },
  "Gota Sat Som": { key: "gota-sat-som", count: 6 },
  "Mesa Lira": { key: "mesa-lira", count: 5 },
  "Aula de Forro": { key: "forro", count: 6 },
  "Danca com Fogo": { key: "danca-fogo", count: 6 },
  "Feira dos Produtores Locais": { key: "feira", count: 6 },
  "Celestial Garden": { key: "celestial-garden", count: 6 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const result = { copied: 0, skipped: 0, deleted: 0, errors: [] as string[] };

  for (const [displayName, { key, count }] of Object.entries(MAPPING)) {
    for (let i = 1; i <= count; i++) {
      // Original file name pattern: "Name.jpg", "Name (2).jpg", "Name (3).jpg", ...
      const oldFileName = i === 1
        ? `${displayName}.jpg`
        : `${displayName} (${i}).jpg`;
      const newFileName = `${key}-${i}.jpg`;

      const oldPath = `${FOLDER}/${oldFileName}`;
      const newPath = `${FOLDER}/${newFileName}`;

      // Copy to new name
      const { error: copyErr } = await supabase.storage
        .from(BUCKET)
        .copy(oldPath, newPath);

      if (copyErr) {
        if (copyErr.message?.includes("already exists")) {
          result.skipped++;
        } else if (copyErr.message?.includes("not found") || copyErr.message?.includes("Object not found")) {
          result.errors.push(`Not found: ${oldPath}`);
        } else {
          result.errors.push(`Copy ${oldPath}: ${copyErr.message}`);
        }
        continue;
      }

      result.copied++;

      // Delete original
      const { error: delErr } = await supabase.storage
        .from(BUCKET)
        .remove([oldPath]);

      if (delErr) {
        result.errors.push(`Delete ${oldPath}: ${delErr.message}`);
      } else {
        result.deleted++;
      }
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
