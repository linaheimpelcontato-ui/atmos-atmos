import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── ManyChat sendFlow ── */
async function triggerManyChatFlow(
  subscriberId: string,
  apiKey: string,
  flowNs: string
): Promise<boolean> {
  try {
    const res = await fetch(
      "https://api.manychat.com/fb/sending/sendFlow",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_id: Number(subscriberId) || subscriberId,
          flow_ns: flowNs,
        }),
      }
    );
    console.log(`[REMINDER] sendFlow | subscriber=${subscriberId} | flow=${flowNs} | status=${res.status}`);
    const data = await res.json();
    if (!res.ok) {
      console.error(`[REMINDER] sendFlow FAILED:`, JSON.stringify(data));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[REMINDER] sendFlow error:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const MANYCHAT_KEY = Deno.env.get("MANYCHAT_API_KEY");
  const FLOW_24H = Deno.env.get("MANYCHAT_FLOW_LEMBRETE_1DIA");
  const FLOW_1H = Deno.env.get("MANYCHAT_FLOW_LEMBRETE_1H");

  if (!MANYCHAT_KEY || !FLOW_24H || !FLOW_1H) {
    console.error("[REMINDER] Missing env vars");
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch upcoming B2B meetings with subscriber_id, not yet fully reminded
  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("id, event_date, manychat_subscriber_id, reminder_24h_sent, reminder_1h_sent, title")
    .eq("event_type", "meeting")
    .eq("segment", "b2b")
    .not("manychat_subscriber_id", "is", null)
    .gt("event_date", new Date().toISOString())
    .or("reminder_24h_sent.eq.false,reminder_1h_sent.eq.false");

  if (error) {
    console.error("[REMINDER] Query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  let sent24h = 0;
  let sent1h = 0;

  for (const ev of events) {
    // Skip canceled events
    if (ev.title?.toLowerCase().includes("cancelad")) continue;

    const eventTime = new Date(ev.event_date).getTime();
    const diffMs = eventTime - now;
    const diffMin = diffMs / 60000;

    // 24h window: 23h55min to 24h05min = 1435 to 1445 minutes
    if (!ev.reminder_24h_sent && diffMin >= 1435 && diffMin <= 1445) {
      const ok = await triggerManyChatFlow(ev.manychat_subscriber_id, MANYCHAT_KEY, FLOW_24H);
      if (ok) {
        await supabase
          .from("calendar_events")
          .update({ reminder_24h_sent: true })
          .eq("id", ev.id);
        sent24h++;
        console.log(`[REMINDER] 24h sent for event ${ev.id}`);
      }
    }

    // 1h window: 55min to 65min
    if (!ev.reminder_1h_sent && diffMin >= 55 && diffMin <= 65) {
      const ok = await triggerManyChatFlow(ev.manychat_subscriber_id, MANYCHAT_KEY, FLOW_1H);
      if (ok) {
        await supabase
          .from("calendar_events")
          .update({ reminder_1h_sent: true })
          .eq("id", ev.id);
        sent1h++;
        console.log(`[REMINDER] 1h sent for event ${ev.id}`);
      }
    }
  }

  console.log(`[REMINDER] Done | checked=${events.length} | sent_24h=${sent24h} | sent_1h=${sent1h}`);

  return new Response(
    JSON.stringify({ ok: true, checked: events.length, sent_24h: sent24h, sent_1h: sent1h }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
