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
    modules: ["b2b"],
  });
  if (denied) return denied;

  try {
    const { query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a B2B business development researcher for ATMOS, a premium tourism operator in Chapada dos Veadeiros, Brazil. ATMOS specializes in corporate retreats, wellness immersions, and adventure experiences for international groups.

The user is searching for potential B2B partners with this query: "${query}"

STRICT RULES:
1. ONLY return companies from the TOURISM, TRAVEL, HOSPITALITY, WELLNESS, or EVENTS industries
2. NEVER include companies from construction, tech, manufacturing, finance, real estate, or any unrelated industry
3. Each company MUST be a real, verifiable business with an active website
4. Each company MUST have a clear connection to tourism, travel, or hospitality
5. If the query mentions a specific niche (e.g. "photography tourism"), only return companies that specifically operate in that niche
6. For each company, include a "relevance" field explaining WHY this company is a good match for the query

Return 10-15 companies. For each:
- name: Company name
- website: Company website URL (must be real and working)
- country: Country where they're based
- type: Type (DMC, Travel Agency, Tour Operator, Wellness Platform, Corporate Retreat Facilitator, Event Agency, etc.)
- description: 1-2 sentences about what they do and why they'd partner with a Brazil tourism operator
- relevance: 1 sentence explaining why this result matches the search query
- linkedin: Company LinkedIn URL if known (optional)
- instagram: Company Instagram handle if known (optional)
- email: General contact email if publicly available (optional)

Return ONLY valid JSON:
{
  "companies": [
    { "name": "", "website": "", "country": "", "type": "", "description": "", "relevance": "", "linkedin": "", "instagram": "", "email": "" }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a tourism industry research specialist. You ONLY return companies from the tourism, travel, hospitality, wellness, and events sectors. Never include companies from unrelated industries. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { companies: [] };
    }

    // Post-process: filter out any companies without tourism-related types
    const validTypes = ["dmc", "travel", "tour", "wellness", "retreat", "hospitality", "event", "agency", "operator", "adventure", "eco", "luxury", "photography", "safari", "cruise", "mice", "incentive", "destination"];
    if (parsed.companies && Array.isArray(parsed.companies)) {
      parsed.companies = parsed.companies.filter((c: any) => {
        const typeLC = (c.type || "").toLowerCase();
        const descLC = (c.description || "").toLowerCase();
        return validTypes.some(vt => typeLC.includes(vt) || descLC.includes(vt));
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-prospects error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
