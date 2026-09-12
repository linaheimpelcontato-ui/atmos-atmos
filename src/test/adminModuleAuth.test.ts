import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeAdminRequest, authorizeReminderRequest, type AdminAuthOptions } from '../../supabase/functions/_shared/adminModuleAuth';

const getUser = vi.fn();
const rpc = vi.fn();
const createClient = vi.fn(() => ({ auth: { getUser }, rpc }));
const options: AdminAuthOptions = { createClient, supabaseUrl: 'https://local.example.invalid', anonKey: 'public-test-key', modules: ['b2b'] };
const request = (headers: Record<string,string> = { Authorization: 'Bearer user-session' }, method = 'POST') =>
  new Request('https://local.example.invalid/functions/v1/test', { method, headers });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
  rpc.mockResolvedValue({ data: false, error: null });
});

describe('administrative edge authorization', () => {
  it('denies missing/invalid credentials before any integration client is created', async () => {
    for (const headers of [{}, { Authorization: 'Basic credentials' }]) {
      expect((await authorizeAdminRequest(request(headers), options))?.status).toBe(401);
    }
    expect(createClient).not.toHaveBeenCalled();
  });
  it('rejects non-POST mutations before authentication', async () => {
    expect((await authorizeAdminRequest(request({}, 'GET'), options))?.status).toBe(405);
    expect(createClient).not.toHaveBeenCalled();
  });
  it('fails closed with missing project config or failed Auth verification', async () => {
    expect((await authorizeAdminRequest(request(), { ...options, anonKey: undefined }))?.status).toBe(503);
    getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } });
    expect((await authorizeAdminRequest(request(), options))?.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('checks modules with the verified caller JWT, without accepting a supplied user id', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await authorizeAdminRequest(request(), options)).toBeNull();
    expect(getUser).toHaveBeenCalledWith('user-session');
    expect(createClient).toHaveBeenCalledWith(options.supabaseUrl, options.anonKey, expect.objectContaining({
      global: { headers: { Authorization: 'Bearer user-session' } },
    }));
    expect(rpc).toHaveBeenCalledWith('has_admin_module', { p_module: 'b2b' });
  });
  it('denies restricted admins and only accepts an explicit boolean grant', async () => {
    for (const data of [false, null, 'true', 1]) {
      rpc.mockResolvedValueOnce({ data, error: null });
      expect((await authorizeAdminRequest(request(), options))?.status).toBe(403);
    }
  });
  it('permits one of the explicitly allowed scopes, but never an empty scope list', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    expect(await authorizeAdminRequest(request(), { ...options, modules: ['financeiro','b2b'] })).toBeNull();
    expect((await authorizeAdminRequest(request(), { ...options, modules: [] }))?.status).toBe(403);
  });
  it('requires full administration for maintenance, even if a module check would pass', async () => {
    expect((await authorizeAdminRequest(request(), { ...options, fullAdmin: true }))?.status).toBe(403);
    expect(rpc).toHaveBeenCalledWith('is_full_admin', { _user_id: 'verified-user' });
    expect(rpc).not.toHaveBeenCalledWith('has_admin_module', expect.anything());
    rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await authorizeAdminRequest(request(), { ...options, fullAdmin: true })).toBeNull();
  });
  it('fails closed and hides underlying errors when permission RPC or network fails', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: { message: 'sensitive backend detail' } });
    const denied = await authorizeAdminRequest(request(), options);
    expect(denied?.status).toBe(503);
    expect(await denied?.text()).not.toContain('sensitive');
    getUser.mockRejectedValueOnce(new Error('private detail'));
    expect((await authorizeAdminRequest(request(), options))?.status).toBe(503);
  });
});

describe('meeting reminders scheduler authorization', () => {
  it('allows the configured scheduler secret without an Auth session', async () => {
    expect(await authorizeReminderRequest(request({ 'x-scheduler-secret': 'local-only-secret' }), options, 'local-only-secret')).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
  it('denies missing/unconfigured/incorrect secrets without a full-admin JWT', async () => {
    for (const [sent, configured] of [['', undefined], ['guess', undefined], ['guess', 'correct'], ['prefix', 'prefix-long']] as const) {
      expect((await authorizeReminderRequest(request({ 'x-scheduler-secret': sent }), options, configured))?.status).toBe(401);
    }
    expect(createClient).not.toHaveBeenCalled();
  });
  it('allows an authenticated full administrator, but not a module-only administrator', async () => {
    expect((await authorizeReminderRequest(request(), options))?.status).toBe(403);
    rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await authorizeReminderRequest(request(), options)).toBeNull();
    expect(rpc).toHaveBeenCalledWith('is_full_admin', { _user_id: 'verified-user' });
  });
  it('never permits GET with a valid scheduler secret', async () => {
    expect((await authorizeReminderRequest(request({ 'x-scheduler-secret': 'secret' }, 'GET'), options, 'secret'))?.status).toBe(405);
  });
});
