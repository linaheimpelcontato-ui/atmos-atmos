import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps the SQLSTATEs raised by approve_proposal_atomic (see migration
// 20260912210000_approve_proposal_atomic.sql) to the same HTTP status codes
// this endpoint returned before the validate-then-transition sequence was
// moved into that single, row-locked RPC. 22P02 is Postgres's own error
// for a share_token that PostgREST couldn't even parse as a uuid.
const STATUS_BY_SQLSTATE: Record<string, number> = {
  "P0002": 404, // not found
  "42501": 403, // invalid token
  "55000": 403, // not published
  "55001": 422, // expired
  "55002": 422, // wrong status
  "22P02": 400, // malformed proposal_id/share_token
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

  let proposal_id: unknown;
  let share_token: unknown;
  try {
    const body = await req.json();
    proposal_id = body?.proposal_id;
    share_token = body?.share_token;
  } catch {
    return new Response(JSON.stringify({ error: "Malformed JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!proposal_id || !share_token) {
      return new Response(
        JSON.stringify({ error: "proposal_id and share_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The full validate-and-transition sequence (token match, published,
    // not expired, current status, status update, interaction log) runs
    // atomically inside approve_proposal_atomic under a single row lock on
    // the proposal (FOR UPDATE). This closes the race the previous
    // implementation had: separate SELECT + UPDATE + INSERT let two
    // concurrent requests both read status='sent' and both "succeed",
    // duplicating the approval interaction (docs/PLANO-FUNCIONAL-2026-09-12.md,
    // FIN-02). Verified with 15 real concurrent calls against an isolated
    // database: exactly one success, exactly one interaction logged.
    const { data, error } = await supabase.rpc("approve_proposal_atomic", {
      p_proposal_id: proposal_id,
      p_share_token: share_token,
    });

    if (error) {
      const status = STATUS_BY_SQLSTATE[error.code ?? ""];
      // Only the mapped SQLSTATEs above carry a message written to be
      // shown to the end user (e.g. "Proposal has expired"). Anything
      // unmapped is unexpected: log the real database error server-side,
      // but never forward its message to the client — it can contain
      // internal details (table/constraint names, driver text) that have
      // no reason to be public.
      if (!status) {
        console.error("approve-proposal error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("approve-proposal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
