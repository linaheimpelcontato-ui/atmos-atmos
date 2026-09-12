import { fetchClicksignDocumentStatus } from './clicksignVerify.ts';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>;
export interface ClicksignDependencies {
  rpc: Rpc;
  apiKey?: string;
  apiBase: string;
  manychatKey?: string;
  manychatFlow?: string;
  fetchImpl?: typeof fetch;
  token?: () => string;
}
const reply = (status: number, action: string, extra = {}) => ({ status, body: { action, ...extra } });

/** Authenticated payload only. No external side effect until the DB transaction commits. */
export async function processClicksignEvent(body: any, deps: ClicksignDependencies) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await deps.rpc(name, args);
    if (error || !data || typeof data !== 'object') throw new Error('Database operation failed');
    return data;
  };
  if (!['closed', 'auto_close', 'deadline'].includes(body?.event?.name)) return reply(200, 'ignored');
  const documentKey = body?.document?.key;
  const directKey = body?.request_signature_key;
  const listKey = body?.list?.request_signature_key;
  if (typeof documentKey !== 'string' || !documentKey.trim() ||
      [directKey, listKey].some(k => k != null && (typeof k !== 'string' || !k.trim())) ||
      (directKey != null && listKey != null && directKey !== listKey)) return reply(400, 'invalid_identity');
  if (!deps.apiKey) return reply(503, 'verification_unavailable');
  const verified = await fetchClicksignDocumentStatus(deps.apiBase, documentKey, deps.apiKey, fetchImpl);
  // A retry is necessary for transport failure AND eventual consistency after a close event.
  if (!verified.verified) return reply(503, 'document_not_verified');
  try {
    const result = await rpc('complete_clicksign_document', {
      p_document_key: documentKey, p_request_signature_key: directKey ?? listKey ?? null,
    });
    if (['identity_not_found', 'identity_mismatch', 'invalid_identity', 'state_conflict'].includes(result.action)) {
      return reply(409, result.action);
    }
    if (!['signed', 'already_signed'].includes(result.action) || !result.proposal_id) throw new Error('Invalid completion result');
    if (!result.outbox_id) {
      if (result.action !== 'already_signed') throw new Error('Missing notification intent');
      return reply(200, result.action); // Historical signed row: no speculative notification replay.
    }
    const token = (deps.token ?? (() => crypto.randomUUID()))();
    const transition = (action: string) => rpc('transition_clicksign_notification', {
      p_id: result.outbox_id, p_token: token, p_action: action,
    });
    const notification = await transition('claim');
    if (['sent', 'skipped'].includes(notification.state)) return reply(200, result.action);
    if (!notification.claimed) return reply(503, notification.state === 'sending' ? 'notification_requires_reconciliation' : 'notification_busy');
    // Nothing has been sent yet; lookup/config failures can safely return to pending.
    if (!deps.manychatKey || !deps.manychatFlow) {
      await transition('pending');
      return reply(503, 'notification_unconfigured');
    }
    const headers = { Authorization: `Bearer ${deps.manychatKey}`, 'Content-Type': 'application/json' };
    let subscriberId: string | number;
    try {
      const res = await fetchImpl('https://api.manychat.com/fb/subscriber/findBySystemField', {
        method: 'POST', headers, body: JSON.stringify({ phone: notification.phone.replace(/[^\d+]/g, '') }),
      });
      const data = res.ok ? await res.json() : null;
      subscriberId = data?.data?.id;
      if (data?.status !== 'success' || !subscriberId) throw new Error('Subscriber lookup failed');
    } catch {
      await transition('pending');
      return reply(503, 'notification_lookup_failed');
    }
    // Persist uncertainty BEFORE send. A failed/ambiguous send must never be retried blindly.
    await transition('sending');
    try {
      const res = await fetchImpl('https://api.manychat.com/fb/sending/sendFlow', {
        method: 'POST', headers, body: JSON.stringify({ subscriber_id: subscriberId, flow_ns: deps.manychatFlow }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.status !== 'success') return reply(503, 'notification_requires_reconciliation');
    } catch {
      return reply(503, 'notification_requires_reconciliation');
    }
    await transition('sent');
    return reply(200, result.action, { proposal_id: result.proposal_id });
  } catch {
    return reply(500, 'database_failure');
  }
}
