import { authorizeAdminRequest } from "../_shared/adminModuleAuth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await authorizeAdminRequest(req, {
    createClient,
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    anonKey: Deno.env.get("SUPABASE_ANON_KEY"),
    modules: ["cadastros", "b2b", "b2c"],
  });
  if (denied) return denied;

  try {
    const { name, company_name, website, country } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Você é um assistente de inteligência comercial para uma agência de turismo (ATMOS) na Chapada dos Veadeiros, Brasil.

Dados do prospect:
- Nome: ${name || "Desconhecido"}
- Empresa: ${company_name || "Desconhecida"}
- Website: ${website || "Desconhecido"}
- País: ${country || "Desconhecido"}

Pesquise e forneça as seguintes informações em formato JSON. Inclua apenas campos onde você tem confiança razoável. RESPONDA EM PORTUGUÊS (pt-BR):
{
  "description": "Uma breve descrição de 2-3 frases da empresa/pessoa e seu potencial interesse em serviços de turismo",
  "country": "País de origem se identificável",
  "target_market": "Seu segmento de mercado alvo (ex: Aventura, Wellness, Corporativo, Luxo)",
  "linkedin": "URL do perfil do LinkedIn se encontrado",
  "instagram": "Handle do Instagram se encontrado",
  "website": "URL do website se encontrado e não fornecido anteriormente"
}

Retorne APENAS JSON válido, sem markdown ou texto extra.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assistente de pesquisa de inteligência comercial. Retorne apenas JSON válido em português." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response, handling markdown code blocks
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-prospect error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
