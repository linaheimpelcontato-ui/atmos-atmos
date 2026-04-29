import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const WEBHOOK_SECRET = Deno.env.get("CLICKSIGN_WEBHOOK_SECRET");
    const headerSecret = req.headers.get("x-webhook-secret");

    // Validate webhook (Clicksign sends HMAC or custom header)
    if (WEBHOOK_SECRET && headerSecret && headerSecret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    const doc = body.document;

    console.log("[CLICKSIGN-WH] Event received:", event?.name, "Document key:", doc?.key);

    // We care about document signed/closed events
    if (!event || !["closed", "auto_close", "deadline"].includes(event.name)) {
      // Check for individual signature events
      if (event?.name === "sign") {
        console.log("[CLICKSIGN-WH] Individual signature recorded");
      }
      return new Response(JSON.stringify({ ok: true, action: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const documentKey = doc?.key;
    if (!documentKey) {
      console.error("[CLICKSIGN-WH] No document key in payload");
      return new Response(JSON.stringify({ error: "No document key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find proposal by contract_url containing the document key or request_signature_key
    // contract_url is stored as "clicksign:<request_signature_key>"
    // We need to match by document key – search proposals with clicksign contracts
    const { data: proposals } = await supabase
      .from("proposals")
      .select("id, prospect_id, title, contract_url, contract_status")
      .like("contract_url", "clicksign:%");

    if (!proposals || proposals.length === 0) {
      console.log("[CLICKSIGN-WH] No proposals with clicksign contracts found");
      return new Response(JSON.stringify({ ok: true, action: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For closed/auto_close events, update all proposals linked to this document
    // Since we store request_signature_key, we check against the event's document
    // Clicksign webhook payload includes request_signature_key in the event
    const requestSignatureKey = body.request_signature_key || body.list?.request_signature_key;

    let matchedProposal = null;
    if (requestSignatureKey) {
      matchedProposal = proposals.find(
        (p: any) => p.contract_url === `clicksign:${requestSignatureKey}`
      );
    }

    // Fallback: try matching by document key in any format
    if (!matchedProposal) {
      matchedProposal = proposals.find(
        (p: any) => p.contract_url?.includes(documentKey)
      );
    }

    if (!matchedProposal) {
      console.log("[CLICKSIGN-WH] No matching proposal for document:", documentKey);
      return new Response(JSON.stringify({ ok: true, action: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (matchedProposal.contract_status === "signed") {
      console.log("[CLICKSIGN-WH] Already signed, skipping");
      return new Response(JSON.stringify({ ok: true, action: "already_signed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update contract_status to signed
    await supabase
      .from("proposals")
      .update({ contract_status: "signed" })
      .eq("id", matchedProposal.id);

    console.log("[CLICKSIGN-WH] Contract signed for proposal:", matchedProposal.id);

    // Log interaction
    if (matchedProposal.prospect_id) {
      await supabase.from("prospect_interactions").insert({
        prospect_id: matchedProposal.prospect_id,
        type: "note",
        content: "✅ Contrato assinado digitalmente via Clicksign",
      });

      // Advance pipeline to "Contrato Assinado" stage if exists
      const { data: signedStage } = await supabase
        .from("pipeline_stages")
        .select("id, name")
        .ilike("name", "%Contrato Assinado%")
        .limit(1)
        .maybeSingle();

      if (signedStage) {
        const { data: prospect } = await supabase
          .from("prospects")
          .select("stage_id")
          .eq("id", matchedProposal.prospect_id)
          .single();

        if (prospect) {
          const { data: oldStage } = await supabase
            .from("pipeline_stages")
            .select("name")
            .eq("id", prospect.stage_id)
            .maybeSingle();

          await supabase
            .from("prospects")
            .update({ stage_id: signedStage.id, updated_at: new Date().toISOString() })
            .eq("id", matchedProposal.prospect_id);

          await supabase.from("prospect_interactions").insert({
            prospect_id: matchedProposal.prospect_id,
            type: "stage_change",
            content: `${oldStage?.name || "?"} → ${signedStage.name} (automático: contrato assinado)`,
          });
        }
      }

      // Trigger ManyChat flow for post-signature
      const MANYCHAT_API_KEY = Deno.env.get("MANYCHAT_API_KEY");
      const MANYCHAT_FLOW = Deno.env.get("MANYCHAT_FLOW_CONTRATO_ASSINADO");

      if (MANYCHAT_API_KEY && MANYCHAT_FLOW) {
        // Get prospect phone for ManyChat subscriber lookup
        const { data: prospectData } = await supabase
          .from("prospects")
          .select("phone, name")
          .eq("id", matchedProposal.prospect_id)
          .single();

        if (prospectData?.phone) {
          const cleanPhone = prospectData.phone.replace(/[^\d+]/g, "");

          // Find subscriber by phone
          const findRes = await fetch(
            `https://api.manychat.com/fb/subscriber/findBySystemField`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${MANYCHAT_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ phone: cleanPhone }),
            }
          );

          if (findRes.ok) {
            const findData = await findRes.json();
            const subscriberId = findData?.data?.id;

            if (subscriberId) {
              // Send flow
              const flowRes = await fetch(
                `https://api.manychat.com/fb/sending/sendFlow`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${MANYCHAT_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    subscriber_id: subscriberId,
                    flow_ns: MANYCHAT_FLOW,
                  }),
                }
              );

              const flowData = await flowRes.json();
              console.log("[CLICKSIGN-WH] ManyChat flow triggered:", flowData?.status);
            } else {
              console.log("[CLICKSIGN-WH] ManyChat subscriber not found for phone:", cleanPhone);
            }
          } else {
            console.error("[CLICKSIGN-WH] ManyChat findBySystemField failed:", findRes.status);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, action: "signed", proposal_id: matchedProposal.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CLICKSIGN-WH] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
