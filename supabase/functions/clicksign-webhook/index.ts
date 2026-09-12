import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClicksignContentHmac } from "../_shared/webhookAuth.ts";
import { processClicksignEvent } from "../_shared/clicksignProcess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-hmac",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Read the raw body FIRST: the HMAC is computed over the exact bytes
  // Clicksign sent, and re-serializing parsed JSON would produce a
  // different string and break verification (the official docs explicitly
  // warn against reformatting the JSON before hashing).
  const rawBody = await req.text();

  const auth = await verifyClicksignContentHmac(
    req.headers.get("content-hmac"),
    Deno.env.get("CLICKSIGN_WEBHOOK_SECRET"),
    rawBody,
  );
  if (!auth.ok) {
    // Always answer 401 regardless of the specific reason (missing header,
    // missing secret, bad signature) so a caller can't use the response to
    // distinguish "misconfigured" from "wrong signature". The real reason
    // is only logged server-side.
    console.error("[CLICKSIGN-WH] Rejected: invalid Content-Hmac —", auth.reason);
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const result = await processClicksignEvent(body, {
      rpc: (name, args) => supabase.rpc(name, args),
      apiKey: Deno.env.get("CLICKSIGN_API_KEY"),
      apiBase: Deno.env.get("CLICKSIGN_API_BASE") || "https://app.clicksign.com",
      manychatKey: Deno.env.get("MANYCHAT_API_KEY"),
      manychatFlow: Deno.env.get("MANYCHAT_FLOW_CONTRATO_ASSINADO"),
    });
    if (result.status >= 400) console.error("[CLICKSIGN-WH] Processing incomplete:", result.body.action);
    return json(result.body, result.status);
  } catch {
    return json({ error: "Internal error" }, 500);
  }
});
