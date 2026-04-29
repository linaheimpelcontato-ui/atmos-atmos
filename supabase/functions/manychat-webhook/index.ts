import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Stage IDs mapped from pipeline_stages table
const STAGE_MAP = {
  b2c: {
    atendimento: "2df590c6-1d72-4f0b-ab0e-0556cc9db2ed",
    orcamento: "0cd5f8ed-9864-4d10-bd93-21c5dbcddee1",
  },
  b2b: {
    atendimento: "d15121f9-f4c7-40db-a329-24cbcd31d77b",
    orcamento: "31915620-6b6d-4b3d-891a-197f17603b3d",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate webhook secret
  const secret = Deno.env.get("MANYCHAT_WEBHOOK_SECRET");
  const headerSecret = req.headers.get("x-webhook-secret");
  if (!secret || headerSecret !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { name, phone, email, tags: rawTags } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.map((t: unknown) => String(t).toLowerCase().trim()).filter(Boolean)
      : [];

    // Determine segment from tags
    const isB2B = tags.some((t) => t === "imersao" || t === "imersão");
    const segment = isB2B ? "b2b" : "b2c";

    // Determine stage from tags
    const hasWishlist = tags.includes("wishlist");
    const stageKey = hasWishlist ? "orcamento" : "atendimento";
    const stage_id = STAGE_MAP[segment][stageKey];

    // Build prospect tags: always include "manychat" + original tags
    const prospectTags = ["manychat", ...tags.filter((t) => t !== "manychat")];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean phone for matching (remove spaces, keep + and digits)
    const cleanPhone = phone.trim().replace(/[^\\d+]/g, "");

    // Check if prospect with same phone already exists
    const { data: existing } = await supabase
      .from("prospects")
      .select("id, tags")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existing) {
      // Update existing prospect: merge tags, update stage if advancing
      const mergedTags = Array.from(
        new Set([...(existing.tags || []), ...prospectTags])
      );
      await supabase
        .from("prospects")
        .update({
          tags: mergedTags,
          stage_id,
          last_interaction: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return new Response(
        JSON.stringify({ ok: true, action: "updated", id: existing.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert new prospect
    const { data: inserted, error } = await supabase
      .from("prospects")
      .insert({
        name: name.trim().slice(0, 200),
        phone: cleanPhone,
        email: email && typeof email === "string" ? email.trim().slice(0, 255) : null,
        segment,
        source: "whatsapp",
        tags: prospectTags,
        stage_id,
        first_contact: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, action: "created", id: inserted.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
