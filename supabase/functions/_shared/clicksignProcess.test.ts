import { describe, expect, it, vi } from 'vitest';
import { processClicksignEvent, type ClicksignDependencies } from './clicksignProcess';

const event = { event: { name: 'closed' }, document: { key: 'document-a' }, request_signature_key: 'request-a' };
function fixture() {
  let state = 'pending';
  let signed = false;
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'complete_clicksign_document') {
      const action = signed ? 'already_signed' : 'signed'; signed = true;
      return { data: { action, proposal_id: 'p', outbox_id: 'o' }, error: null };
    }
    const claimed = args.p_action === 'claim' && state === 'pending';
    if (claimed) state = 'processing';
    else if (args.p_action !== 'claim') state = String(args.p_action);
    return { data: { state, claimed, phone: '+5500000000000' }, error: null };
  });
  const fetchImpl = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(
    String(url).includes('/documents/') ? { document: { status: 'closed', finished_at: '2026-09-12' } } :
      { status: 'success', data: { id: 123 } },
  ), { status: 200 }));
  const deps: ClicksignDependencies = { rpc, fetchImpl, apiKey: 'fake', apiBase: 'https://clicksign.invalid', manychatKey: 'fake', manychatFlow: 'fake', token: () => 'token' };
  return { deps, rpc, fetchImpl, state: () => state };
}
const sendCount = (f: ReturnType<typeof fixture>) => f.fetchImpl.mock.calls.filter(([url]) => String(url).includes('/sendFlow')).length;

describe('authenticated Clicksign processing', () => {
  it('commits via RPC before sending and does not resend a duplicate', async () => {
    const f = fixture();
    expect((await processClicksignEvent(event, f.deps)).status).toBe(200);
    expect(f.state()).toBe('sent');
    expect((await processClicksignEvent(event, f.deps)).status).toBe(200);
    expect(sendCount(f)).toBe(1);
    expect(f.rpc).toHaveBeenCalledWith('complete_clicksign_document', { p_document_key: 'document-a', p_request_signature_key: 'request-a' });
    expect(f.rpc.mock.invocationCallOrder[0]).toBeLessThan(f.fetchImpl.mock.invocationCallOrder[2]);
  });
  it('parallel notifications have one sender (DB locking separately exercised in PostgreSQL)', async () => {
    const f = fixture();
    const results = await Promise.all([processClicksignEvent(event, f.deps), processClicksignEvent(event, f.deps)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 503]);
    expect(sendCount(f)).toBe(1);
  });
  it.each(['identity_mismatch', 'identity_not_found', 'state_conflict'])('rejects DB identity/state result %s without notification', async action => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { action } as any, error: null });
    expect((await processClicksignEvent(event, f.deps)).status).toBe(409);
    expect(sendCount(f)).toBe(0);
  });
  it.each([{}, { document: { key: 3 } }, { request_signature_key: 'a', list: { request_signature_key: 'b' } }])('rejects invalid/conflicting keys', async fields => {
    const f = fixture();
    const input = Object.keys(fields).length ? { ...event, ...fields } : { ...event, document: {} };
    expect((await processClicksignEvent(input, f.deps)).status).toBe(400);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('passes absent request key as null and lets DB require the document link', async () => {
    const f = fixture(); await processClicksignEvent({ ...event, request_signature_key: undefined }, f.deps);
    expect(f.rpc).toHaveBeenCalledWith('complete_clicksign_document', { p_document_key: 'document-a', p_request_signature_key: null });
  });
  it.each([null, { action: 'signed' }])('DB empty/invalid result never acknowledges completion', async data => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: data as any, error: null });
    expect((await processClicksignEvent(event, f.deps)).status).toBe(500);
    expect(sendCount(f)).toBe(0);
  });
  it('DB error returns 500 and never sends', async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: null as any, error: new Error('DB') as any });
    expect((await processClicksignEvent(event, f.deps)).status).toBe(500); expect(sendCount(f)).toBe(0);
  });
  it.each(['api-error', 'network', 'running', 'no-key'])('verification %s remains retryable', async mode => {
    const f = fixture();
    if (mode === 'no-key') f.deps.apiKey = undefined;
    else if (mode === 'network') f.fetchImpl.mockRejectedValueOnce(new Error('network'));
    else f.fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ document: { status: 'running' } }), { status: mode === 'api-error' ? 500 : 200 }));
    expect((await processClicksignEvent(event, f.deps)).status).toBe(503); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('missing ManyChat configuration preserves pending work', async () => {
    const f = fixture(); f.deps.manychatKey = undefined;
    expect((await processClicksignEvent(event, f.deps)).status).toBe(503); expect(f.state()).toBe('pending');
  });
  it('lookup failure can safely retry, with one eventual send', async () => {
    const f = fixture(); const original = f.fetchImpl.getMockImplementation()!;
    f.fetchImpl.mockImplementationOnce(original).mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect((await processClicksignEvent(event, f.deps)).status).toBe(503); expect(f.state()).toBe('pending');
    expect((await processClicksignEvent(event, f.deps)).status).toBe(200); expect(sendCount(f)).toBe(1);
  });
  it.each(['network', 'http', 'semantic'])('send %s failure stays uncertain and duplicates cannot resend', async mode => {
    const f = fixture(); const original = f.fetchImpl.getMockImplementation()!;
    f.fetchImpl.mockImplementationOnce(original).mockImplementationOnce(original);
    if (mode === 'network') f.fetchImpl.mockRejectedValueOnce(new Error('timeout'));
    else f.fetchImpl.mockResolvedValueOnce(new Response('{"status":"error"}', { status: mode === 'http' ? 500 : 200 }));
    expect((await processClicksignEvent(event, f.deps)).status).toBe(503); expect(f.state()).toBe('sending');
    expect((await processClicksignEvent(event, f.deps)).body.action).toBe('notification_requires_reconciliation');
    expect(sendCount(f)).toBe(1);
  });
  it('failure recording delivery never triggers a second send', async () => {
    const f = fixture(); const original = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (name, args) => args.p_action === 'sent' ? { data: null as any, error: 'DB' as any } : original(name, args));
    expect((await processClicksignEvent(event, f.deps)).status).toBe(500);
    expect((await processClicksignEvent(event, f.deps)).status).toBe(503); expect(sendCount(f)).toBe(1);
  });
  it('failure persisting sending guard prevents external send', async () => {
    const f = fixture(); const original = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (name, args) => args.p_action === 'sending' ? { data: null as any, error: 'DB' as any } : original(name, args));
    expect((await processClicksignEvent(event, f.deps)).status).toBe(500); expect(sendCount(f)).toBe(0);
  });
  it('historical signed row has no speculative notification', async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: { action: 'already_signed', proposal_id: 'p', outbox_id: null } as any, error: null });
    expect((await processClicksignEvent(event, f.deps)).status).toBe(200); expect(sendCount(f)).toBe(0);
  });
});
