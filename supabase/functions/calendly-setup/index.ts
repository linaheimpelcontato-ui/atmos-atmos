const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TARGET_URL = `${SUPABASE_URL}/functions/v1/calendly-webhook`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TOKEN = Deno.env.get("CALENDLY_API_TOKEN");
  const SIGNING_KEY = Deno.env.get("CALENDLY_WEBHOOK_SIGNING_KEY");

  if (!TOKEN || !SIGNING_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing CALENDLY_API_TOKEN or CALENDLY_WEBHOOK_SIGNING_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Get organization URI
    const meRes = await fetch("https://api.calendly.com/users/me", { headers });
    const meData = await meRes.json();
    if (!meRes.ok) {
      return new Response(
        JSON.stringify({ status: "error", step: "get_user", calendly_response: meData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const orgUri = meData.resource?.current_organization;
    const userUri = meData.resource?.uri;

    // 2. Check existing subscriptions
    const listUrl = `https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=organization`;
    const listRes = await fetch(listUrl, { headers });
    const listData = await listRes.json();

    let existing = null;
    if (listRes.ok && Array.isArray(listData.collection)) {
      existing = listData.collection.find(
        (s: any) =>
          s.callback_url === TARGET_URL &&
          s.state === "active" &&
          Array.isArray(s.events) &&
          s.events.includes("invitee.created")
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          status: "already_active",
          organization_uri: orgUri,
          existing_subscription: existing,
          request_payload: null,
          calendly_response: null,
          webhook_uri: existing.uri,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create subscription
    const payload = {
      url: TARGET_URL,
      events: ["invitee.created"],
      organization: orgUri,
      user: userUri,
      scope: "organization",
      signing_key: SIGNING_KEY,
    };

    const createRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const createData = await createRes.json();

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({
          status: "error",
          organization_uri: orgUri,
          existing_subscription: null,
          request_payload: payload,
          calendly_response: createData,
          webhook_uri: null,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "created",
        organization_uri: orgUri,
        existing_subscription: null,
        request_payload: payload,
        calendly_response: createData,
        webhook_uri: createData.resource?.uri || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
