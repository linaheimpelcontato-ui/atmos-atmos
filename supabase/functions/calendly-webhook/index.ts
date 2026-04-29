import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STAGE_REUNIAO_AGENDADA = "78b38240-d119-422c-afcb-12a32ffbedca";

/* ── Calendly signature validation ── */
async function verifyCalendlySignature(
  body: string,
  signatureHeader: string,
  signingKey: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    })
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const payload = `${t}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== v1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return mismatch === 0;
}

/* ── Enrich invitee via Calendly API ── */
async function fetchInviteeDetails(
  inviteeUri: string,
  apiToken: string
): Promise<{ name: string; email: string } | null> {
  try {
    const res = await fetch(inviteeUri, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.resource?.name || "",
      email: data.resource?.email || "",
    };
  } catch {
    return null;
  }
}

/* ── ManyChat setCustomField (by field_id) ── */
async function setManyChatCustomField(
  subscriberId: string,
  fieldId: string,
  fieldValue: string,
  apiKey: string
) {
  try {
    const res = await fetch(
      "https://api.manychat.com/fb/subscriber/setCustomField",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_id: Number(subscriberId) || subscriberId,
          field_id: Number(fieldId),
          field_value: fieldValue,
        }),
      }
    );
    console.log(`[MC] setCustomField field_id=${fieldId} | subscriber_id=${subscriberId} | status=${res.status}`);
    const data = await res.json();
    console.log(`[MC] setCustomField field_id=${fieldId} response:`, JSON.stringify(data));
    if (!res.ok) {
      console.error(`[MC] setCustomField field_id=${fieldId} FAILED | HTTP ${res.status} | body:`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    console.error(`ManyChat setCustomField field_id=${fieldId} error:`, err);
    return null;
  }
}

/* ── ManyChat sendFlow ── */
async function triggerManyChatFlow(
  contactId: string,
  apiKey: string,
  flowNs: string
) {
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
          subscriber_id: Number(contactId) || contactId,
          flow_ns: flowNs,
        }),
      }
    );
    console.log(`[MC] sendFlow | subscriber_id=${contactId} | flow_ns=${flowNs} | status=${res.status}`);
    const data = await res.json();
    console.log(`[MC] sendFlow response:`, JSON.stringify(data));
    if (!res.ok) {
      console.error(`[MC] sendFlow FAILED | HTTP ${res.status} | body:`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    console.error("ManyChat sendFlow error:", err);
    return null;
  }
}

/* ── Format helpers ── */
function formatDateBR(isoDate: string): string {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function formatTimeBR(isoDate: string): string {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/* ── Extract common invitee data ── */
interface InviteeData {
  name: string;
  email: string;
  startTime: string;
  endTime: string;
  utmContent: string;
  inviteeUri: string;
  eventUri: string;
  joinUrl: string;
  rescheduleUrl: string;
}

async function extractInviteeData(payload: any): Promise<InviteeData> {
  let name: string = payload?.name || "";
  let email: string = payload?.email || "";
  const startTime: string = payload?.scheduled_event?.start_time || "";
  const endTime: string = payload?.scheduled_event?.end_time || "";
  const utmContent: string = payload?.tracking?.utm_content || "";
  const inviteeUri: string = payload?.uri || "";
  const eventUri: string = payload?.scheduled_event?.uri || "";
  const joinUrl: string = payload?.scheduled_event?.location?.join_url || "";
  const rescheduleUrl: string = payload?.reschedule_url || "";

  // Enrich if email missing
  if (!email && inviteeUri) {
    const CALENDLY_TOKEN = Deno.env.get("CALENDLY_API_TOKEN");
    if (CALENDLY_TOKEN) {
      const details = await fetchInviteeDetails(inviteeUri, CALENDLY_TOKEN);
      if (details) {
        if (!email && details.email) email = details.email;
        if (!name && details.name) name = details.name;
      }
    }
  }

  // Fallback: try questions_and_answers for email
  if (!email && Array.isArray(payload?.questions_and_answers)) {
    for (const qa of payload.questions_and_answers) {
      const answer = String(qa.answer || "").trim();
      if (answer.includes("@")) {
        email = answer;
        break;
      }
    }
  }

  return { name, email, startTime, endTime, utmContent, inviteeUri, eventUri, joinUrl, rescheduleUrl };
}

/* ── Find B2B prospect by email ── */
async function findB2BProspect(supabase: any, email: string) {
  const { data } = await supabase
    .from("prospects")
    .select("id, stage_id, tags")
    .eq("email", email.toLowerCase().trim())
    .eq("segment", "b2b")
    .maybeSingle();
  return data;
}

/* ── HANDLER: invitee.created (new booking) ── */
async function handleCreatedNew(supabase: any, payload: any) {
  const inv = await extractInviteeData(payload);
  console.log(`[CREATED-NEW] email="${inv.email}" | utm_content="${inv.utmContent}"`);

  if (!inv.email) {
    console.error("No email found for invitee");
    return new Response(
      JSON.stringify({ error: "No email found for invitee" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── IDEMPOTENCY: Insert calendar_event FIRST as a lock ──
  if (!inv.eventUri) {
    console.error("No event URI in payload, cannot guarantee idempotency");
    return new Response(
      JSON.stringify({ error: "Missing event URI" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const calendarDesc = [
    inv.endTime ? `Início: ${inv.startTime} | Fim: ${inv.endTime}` : "",
    `ref:${inv.eventUri}`,
  ].filter(Boolean).join(" | ");

  const { error: calInsertError } = await supabase
    .from("calendar_events")
    .insert({
      title: `${inv.name || inv.email} - Reunião Calendly`,
      event_date: inv.startTime || new Date().toISOString(),
      event_type: "meeting",
      segment: "b2b",
      description: calendarDesc || undefined,
      calendly_event_uri: inv.eventUri,
      manychat_subscriber_id: inv.utmContent || null,
      meeting_url: inv.joinUrl || null,
    });

  if (calInsertError) {
    if (calInsertError.code === "23505") {
      console.log(`[IDEMP] Duplicate event detected (calendly_event_uri), skipping`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "duplicate" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("calendar_events insert error:", calInsertError);
    return new Response(
      JSON.stringify({ error: calInsertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Prospect logic ──
  const existingB2BProspect = await findB2BProspect(supabase, inv.email);

  let prospectId: string;
  let oldStageName = "?";

  if (existingB2BProspect) {
    prospectId = existingB2BProspect.id;

    if (existingB2BProspect.stage_id) {
      const { data: oldStage } = await supabase
        .from("pipeline_stages")
        .select("name")
        .eq("id", existingB2BProspect.stage_id)
        .maybeSingle();
      if (oldStage) oldStageName = oldStage.name;
    }

    const mergedTags = Array.from(
      new Set([...(existingB2BProspect.tags || []), "calendly"])
    );

    await supabase
      .from("prospects")
      .update({
        stage_id: STAGE_REUNIAO_AGENDADA,
        tags: mergedTags,
        last_interaction: new Date().toISOString(),
      })
      .eq("id", prospectId);
  } else {
    const { data: inserted, error } = await supabase
      .from("prospects")
      .insert({
        name: inv.name || inv.email,
        email: inv.email.toLowerCase().trim(),
        segment: "b2b",
        source: "whatsapp",
        tags: ["calendly"],
        stage_id: STAGE_REUNIAO_AGENDADA,
        first_contact: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Prospect insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    prospectId = inserted.id;
    oldStageName = "(novo)";
  }

  // Update calendar_event with prospect_id
  await supabase
    .from("calendar_events")
    .update({ prospect_id: prospectId })
    .eq("calendly_event_uri", inv.eventUri);

  // Log interaction
  await supabase.from("prospect_interactions").insert({
    prospect_id: prospectId,
    type: "stage_change",
    content: `${oldStageName} → Reunião Agendada (automático: Calendly)`,
  });

  // ── ManyChat integration (initial booking flow) ──
  let manychatFieldsSet = false;
  if (inv.utmContent) {
    const MANYCHAT_KEY = Deno.env.get("MANYCHAT_API_KEY");
    const FLOW_NS = Deno.env.get("MANYCHAT_FLOW_REUNIAO") || "";

    const FIELD_ID_DATA = Deno.env.get("MC_FIELD_REUNIAO_DATA") || "";
    const FIELD_ID_HORARIO = Deno.env.get("MC_FIELD_REUNIAO_HORARIO") || "";
    const FIELD_ID_LINK = Deno.env.get("MC_FIELD_REUNIAO_LINK") || "";
    const FIELD_ID_REAGENDAR = Deno.env.get("MC_FIELD_REAGENDAR_LINK") || "";

    if (MANYCHAT_KEY && FLOW_NS) {
      const reuniaoData = inv.startTime ? formatDateBR(inv.startTime) : "";
      const reuniaoHorario = inv.startTime ? formatTimeBR(inv.startTime) : "";

      if (FIELD_ID_DATA && FIELD_ID_HORARIO && FIELD_ID_LINK && FIELD_ID_REAGENDAR) {
        await Promise.all([
          setManyChatCustomField(inv.utmContent, FIELD_ID_DATA, reuniaoData, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_HORARIO, reuniaoHorario, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_LINK, inv.joinUrl, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_REAGENDAR, inv.rescheduleUrl, MANYCHAT_KEY),
        ]);
        manychatFieldsSet = true;
      }

      await triggerManyChatFlow(inv.utmContent, MANYCHAT_KEY, FLOW_NS);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      prospect_id: prospectId,
      is_reschedule: false,
      manychat_triggered: !!inv.utmContent,
      manychat_fields_set: manychatFieldsSet,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/* ── HANDLER: invitee.created (reschedule — old_invitee present) ── */
async function handleCreatedReschedule(supabase: any, payload: any) {
  const inv = await extractInviteeData(payload);
  const oldEventUri: string = payload?.old_invitee?.scheduled_event?.uri || "";
  console.log(`[CREATED-RESCHED] email="${inv.email}" | utm_content="${inv.utmContent}" | new_start="${inv.startTime}" | old_event_uri="${oldEventUri}"`);

  if (!inv.email) {
    console.error("[CREATED-RESCHED] No email found for invitee");
    return new Response(
      JSON.stringify({ error: "No email found for invitee" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Update existing calendar_event by old URI ──
  if (oldEventUri) {
    const updateData: any = {
      event_date: inv.startTime,
      reminder_24h_sent: false,
      reminder_1h_sent: false,
      title: `${inv.name || inv.email} - Reunião Calendly (reagendada)`,
      meeting_url: inv.joinUrl || null,
    };
    if (inv.eventUri) updateData.calendly_event_uri = inv.eventUri;
    if (inv.utmContent) updateData.manychat_subscriber_id = inv.utmContent;

    const calDesc = [
      inv.endTime ? `Início: ${inv.startTime} | Fim: ${inv.endTime}` : "",
      `ref:${inv.eventUri}`,
    ].filter(Boolean).join(" | ");
    updateData.description = calDesc;

    await supabase
      .from("calendar_events")
      .update(updateData)
      .eq("calendly_event_uri", oldEventUri);
  } else {
    // Fallback: find the most recent calendar_event for this prospect/email
    const prospect = await findB2BProspect(supabase, inv.email);
    let fallbackFound = false;

    if (prospect) {
      const { data: recentEvent } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("prospect_id", prospect.id)
        .eq("event_type", "meeting")
        .eq("segment", "b2b")
        .order("event_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentEvent) {
        const updateData: any = {
          event_date: inv.startTime,
          reminder_24h_sent: false,
          reminder_1h_sent: false,
          title: `${inv.name || inv.email} - Reunião Calendly (reagendada)`,
          meeting_url: inv.joinUrl || null,
          description: [
            inv.endTime ? `Início: ${inv.startTime} | Fim: ${inv.endTime}` : "",
            `ref:${inv.eventUri}`,
          ].filter(Boolean).join(" | "),
        };
        if (inv.eventUri) updateData.calendly_event_uri = inv.eventUri;
        if (inv.utmContent) updateData.manychat_subscriber_id = inv.utmContent;

        await supabase
          .from("calendar_events")
          .update(updateData)
          .eq("id", recentEvent.id);
        fallbackFound = true;
        console.log(`[CREATED-RESCHED] Fallback: updated calendar_event ${recentEvent.id} by prospect_id`);
      }
    }

    // Last resort: upsert with new URI
    if (!fallbackFound && inv.eventUri && inv.startTime) {
      await supabase.from("calendar_events").upsert({
        title: `${inv.name || inv.email} - Reunião Calendly (reagendada)`,
        event_date: inv.startTime,
        event_type: "meeting",
        segment: "b2b",
        calendly_event_uri: inv.eventUri,
        manychat_subscriber_id: inv.utmContent || null,
        reminder_24h_sent: false,
        reminder_1h_sent: false,
        meeting_url: inv.joinUrl || null,
      }, { onConflict: "calendly_event_uri" });
      console.log(`[CREATED-RESCHED] Fallback: upserted new calendar_event with URI`);
    }
  }

  // ── Prospect: update last_interaction only (keep stage) ──
  const prospect = await findB2BProspect(supabase, inv.email);
  if (prospect) {
    await supabase
      .from("prospects")
      .update({ last_interaction: new Date().toISOString() })
      .eq("id", prospect.id);

    // Update calendar_event with prospect_id
    if (inv.eventUri) {
      await supabase
        .from("calendar_events")
        .update({ prospect_id: prospect.id })
        .eq("calendly_event_uri", inv.eventUri);
    }

    // Log interaction as reschedule (NOT stage_change)
    const newDateStr = inv.startTime ? `${formatDateBR(inv.startTime)} às ${formatTimeBR(inv.startTime)}` : "data não informada";
    await supabase.from("prospect_interactions").insert({
      prospect_id: prospect.id,
      type: "reuniao_reagendada",
      content: `Reunião reagendada para ${newDateStr} (automático: Calendly)`,
    });
  }

  // ── ManyChat: update fields + trigger REAGENDAMENTO flow ──
  let manychatFieldsSet = false;
  let manychatTriggered = false;
  if (inv.utmContent) {
    const MANYCHAT_KEY = Deno.env.get("MANYCHAT_API_KEY");
    const FLOW_NS = Deno.env.get("MANYCHAT_FLOW_REAGENDAMENTO") || "";

    const FIELD_ID_DATA = Deno.env.get("MC_FIELD_REUNIAO_DATA") || "";
    const FIELD_ID_HORARIO = Deno.env.get("MC_FIELD_REUNIAO_HORARIO") || "";
    const FIELD_ID_LINK = Deno.env.get("MC_FIELD_REUNIAO_LINK") || "";
    const FIELD_ID_REAGENDAR = Deno.env.get("MC_FIELD_REAGENDAR_LINK") || "";

    console.log(`[MC-DIAG] RESCHED | subscriber_id="${inv.utmContent}" | flow_ns="${FLOW_NS}"`);

    if (MANYCHAT_KEY && FLOW_NS) {
      const reuniaoData = inv.startTime ? formatDateBR(inv.startTime) : "";
      const reuniaoHorario = inv.startTime ? formatTimeBR(inv.startTime) : "";

      if (FIELD_ID_DATA && FIELD_ID_HORARIO && FIELD_ID_LINK && FIELD_ID_REAGENDAR) {
        await Promise.all([
          setManyChatCustomField(inv.utmContent, FIELD_ID_DATA, reuniaoData, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_HORARIO, reuniaoHorario, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_LINK, inv.joinUrl, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_REAGENDAR, inv.rescheduleUrl, MANYCHAT_KEY),
        ]);
        manychatFieldsSet = true;
      }

      await triggerManyChatFlow(inv.utmContent, MANYCHAT_KEY, FLOW_NS);
      manychatTriggered = true;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      prospect_id: prospect?.id || null,
      is_reschedule: true,
      manychat_triggered: manychatTriggered,
      manychat_fields_set: manychatFieldsSet,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/* ── HANDLER: invitee.canceled ── */
async function handleCanceled(supabase: any, payload: any) {
  // ── Skip cancellations that are part of a reschedule ──
  const cancellation = payload?.cancellation || {};
  const cancelReason = String(cancellation.reason || "").toLowerCase();
  const rescheduled = payload?.rescheduled === true || cancelReason.includes("reschedul");
  if (rescheduled) {
    console.log(`[CANCELED] Skipping reschedule-triggered cancellation (reason="${cancellation.reason}", rescheduled=${payload?.rescheduled})`);
    return new Response(
      JSON.stringify({ ok: true, skipped: "reschedule_cancellation" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const inv = await extractInviteeData(payload);
  console.log(`[CANCELED] Processing cancellation | email="${inv.email}" | utm_content="${inv.utmContent}"`);

  if (!inv.email) {
    console.error("[CANCELED] No email found for invitee");
    return new Response(
      JSON.stringify({ error: "No email found for invitee" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const prospect = await findB2BProspect(supabase, inv.email);
  if (!prospect) {
    console.warn(`[CANCELED] No B2B prospect found for email: ${inv.email}`);
    return new Response(
      JSON.stringify({ ok: true, skipped: "no_prospect_found" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find "Reunião Cancelada" stage
  const { data: cancelStage } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("segment", "b2b")
    .ilike("name", "%Reunião Cancelada%")
    .maybeSingle();

  if (!cancelStage) {
    console.error("[CANCELED] Stage 'Reunião Cancelada' not found in B2B pipeline");
    return new Response(
      JSON.stringify({ error: "Cancel stage not found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get old stage name for interaction log
  let oldStageName = "?";
  if (prospect.stage_id) {
    const { data: oldStage } = await supabase
      .from("pipeline_stages")
      .select("name")
      .eq("id", prospect.stage_id)
      .maybeSingle();
    if (oldStage) oldStageName = oldStage.name;
  }

  // Update prospect stage
  await supabase
    .from("prospects")
    .update({
      stage_id: cancelStage.id,
      last_interaction: new Date().toISOString(),
    })
    .eq("id", prospect.id);

  // Log interaction
  await supabase.from("prospect_interactions").insert({
    prospect_id: prospect.id,
    type: "reuniao_cancelada",
    content: `${oldStageName} → ${cancelStage.name} (automático: Calendly cancelamento)`,
  });

  // ManyChat: trigger cancellation flow
  let manychatTriggered = false;
  if (inv.utmContent) {
    const MANYCHAT_KEY = Deno.env.get("MANYCHAT_API_KEY");
    const FLOW_NS = Deno.env.get("MANYCHAT_FLOW_CANCELAMENTO") || "";

    if (MANYCHAT_KEY && FLOW_NS) {
      await triggerManyChatFlow(inv.utmContent, MANYCHAT_KEY, FLOW_NS);
      manychatTriggered = true;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      prospect_id: prospect.id,
      new_stage: cancelStage.name,
      manychat_triggered: manychatTriggered,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/* ── HANDLER: invitee.rescheduled ── */
async function handleRescheduled(supabase: any, payload: any) {
  const inv = await extractInviteeData(payload);
  // The new event data comes from the rescheduled payload's scheduled_event
  const oldInviteeUri: string = payload?.old_invitee?.uri || "";
  const oldEventUri: string = payload?.old_invitee?.scheduled_event?.uri || "";
  console.log(`[RESCHEDULED] email="${inv.email}" | utm_content="${inv.utmContent}" | new_start="${inv.startTime}" | old_event_uri="${oldEventUri}"`);

  if (!inv.email) {
    console.error("[RESCHEDULED] No email found for invitee");
    return new Response(
      JSON.stringify({ error: "No email found for invitee" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const prospect = await findB2BProspect(supabase, inv.email);
  if (!prospect) {
    console.warn(`[RESCHEDULED] No B2B prospect found for email: ${inv.email}`);
    return new Response(
      JSON.stringify({ ok: true, skipped: "no_prospect_found" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update calendar_event: find by old event URI and update date + new URI
  if (oldEventUri) {
    const updateData: any = {
      event_date: inv.startTime,
      reminder_24h_sent: false,
      reminder_1h_sent: false,
      meeting_url: inv.joinUrl || null,
    };
    if (inv.eventUri) updateData.calendly_event_uri = inv.eventUri;
    if (inv.utmContent) updateData.manychat_subscriber_id = inv.utmContent;
    updateData.title = `${inv.name || inv.email} - Reunião Calendly (reagendada)`;

    const calDesc = [
      inv.endTime ? `Início: ${inv.startTime} | Fim: ${inv.endTime}` : "",
      `ref:${inv.eventUri}`,
    ].filter(Boolean).join(" | ");
    updateData.description = calDesc;

    await supabase
      .from("calendar_events")
      .update(updateData)
      .eq("calendly_event_uri", oldEventUri);
  } else if (inv.eventUri && inv.startTime) {
    // Fallback: insert new calendar event if no old URI
    await supabase.from("calendar_events").upsert({
      title: `${inv.name || inv.email} - Reunião Calendly (reagendada)`,
      event_date: inv.startTime,
      event_type: "meeting",
      segment: "b2b",
      calendly_event_uri: inv.eventUri,
      prospect_id: prospect.id,
      meeting_url: inv.joinUrl || null,
    }, { onConflict: "calendly_event_uri" });
  }

  // Update prospect last_interaction (keep stage as Reunião Agendada)
  await supabase
    .from("prospects")
    .update({ last_interaction: new Date().toISOString() })
    .eq("id", prospect.id);

  // Log interaction
  const newDateStr = inv.startTime ? `${formatDateBR(inv.startTime)} às ${formatTimeBR(inv.startTime)}` : "data não informada";
  await supabase.from("prospect_interactions").insert({
    prospect_id: prospect.id,
    type: "reuniao_reagendada",
    content: `Reunião reagendada para ${newDateStr} (automático: Calendly)`,
  });

  // ManyChat: update custom fields + trigger rescheduling flow
  let manychatFieldsSet = false;
  let manychatTriggered = false;
  if (inv.utmContent) {
    const MANYCHAT_KEY = Deno.env.get("MANYCHAT_API_KEY");
    const FLOW_NS = Deno.env.get("MANYCHAT_FLOW_REAGENDAMENTO") || "";

    const FIELD_ID_DATA = Deno.env.get("MC_FIELD_REUNIAO_DATA") || "";
    const FIELD_ID_HORARIO = Deno.env.get("MC_FIELD_REUNIAO_HORARIO") || "";
    const FIELD_ID_LINK = Deno.env.get("MC_FIELD_REUNIAO_LINK") || "";

    console.log(`[MC-DIAG] RESCHEDULED | subscriber_id="${inv.utmContent}" | flow_ns="${FLOW_NS}"`);

    if (MANYCHAT_KEY && FLOW_NS) {
      const reuniaoData = inv.startTime ? formatDateBR(inv.startTime) : "";
      const reuniaoHorario = inv.startTime ? formatTimeBR(inv.startTime) : "";

      // Update custom fields
      if (FIELD_ID_DATA && FIELD_ID_HORARIO && FIELD_ID_LINK) {
        await Promise.all([
          setManyChatCustomField(inv.utmContent, FIELD_ID_DATA, reuniaoData, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_HORARIO, reuniaoHorario, MANYCHAT_KEY),
          setManyChatCustomField(inv.utmContent, FIELD_ID_LINK, inv.joinUrl, MANYCHAT_KEY),
        ]);
        manychatFieldsSet = true;
      }

      // Trigger rescheduling flow
      await triggerManyChatFlow(inv.utmContent, MANYCHAT_KEY, FLOW_NS);
      manychatTriggered = true;
    } else {
      console.warn("[MC-DIAG] RESCHEDULED — ManyChat key ou flow não configurados");
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      prospect_id: prospect.id,
      manychat_triggered: manychatTriggered,
      manychat_fields_set: manychatFieldsSet,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/* ── Main handler ── */
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

  const SIGNING_KEY = Deno.env.get("CALENDLY_WEBHOOK_SIGNING_KEY");
  if (!SIGNING_KEY) {
    console.error("CALENDLY_WEBHOOK_SIGNING_KEY not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("Calendly-Webhook-Signature") || "";
  const valid = await verifyCalendlySignature(rawBody, sigHeader, SIGNING_KEY);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = JSON.parse(rawBody);
    const event = body.event;
    const payload = body.payload;

    console.log(`[CALENDLY-WH] Event received: ${event}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event) {
      case "invitee.created": {
        const isReschedule = !!payload?.old_invitee;
        console.log(`[CALENDLY-WH] invitee.created | is_reschedule=${isReschedule}`);
        if (isReschedule) {
          return await handleCreatedReschedule(supabase, payload);
        }
        return await handleCreatedNew(supabase, payload);
      }

      case "invitee.canceled":
        return await handleCanceled(supabase, payload);

      case "invitee.rescheduled":
        return await handleRescheduled(supabase, payload);

      default:
        console.log(`[CALENDLY-WH] Unhandled event: ${event}, skipping`);
        return new Response(JSON.stringify({ ok: true, skipped: event }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("Calendly webhook error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
