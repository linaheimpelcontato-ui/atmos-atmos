import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal_id, share_token } = await req.json();

    if (!proposal_id || !share_token) {
      return new Response(
        JSON.stringify({ error: "proposal_id and share_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate proposal exists and share_token matches
    const { data: proposal, error: fetchErr } = await supabase
      .from("proposals")
      .select("id, status, prospect_id, share_token, published_at, valid_until")
      .eq("id", proposal_id)
      .single();

    if (fetchErr || !proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (proposal.share_token !== share_token) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!proposal.published_at) {
      return new Response(
        JSON.stringify({ error: "Proposal is not published" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Proposal has expired" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["sent", "negotiating"].includes(proposal.status)) {
      return new Response(
        JSON.stringify({ error: "Proposal cannot be approved in current status", current_status: proposal.status }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to approved (trigger auto_pending_on_approval will set contract/payment to pending)
    const { error: updateErr } = await supabase
      .from("proposals")
      .update({ status: "approved" })
      .eq("id", proposal_id);

    if (updateErr) throw updateErr;

    // Register interaction
    if (proposal.prospect_id) {
      await supabase.from("prospect_interactions").insert({
        prospect_id: proposal.prospect_id,
        type: "approval",
        content: "Proposta aprovada pelo cliente",
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("approve-proposal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
