import { describe, expect, it, vi } from "vitest";
import { createManageAdminHandler } from "../../supabase/functions/manage-admin/index";

const callerId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const env = { SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-service-key", SUPABASE_ANON_KEY: "test-anon-key" };
const target = { id: targetId, email: "member@example.invalid" };

function fixture() {
  const tables: Record<string, any[]> = { user_roles: [], profiles: [], admin_permissions: [] };
  const tableErrors: Record<string, { message: string }> = {};
  const ranges: Array<{ table: string; from: number; to: number }> = [];
  const from = vi.fn((table: string) => {
    const query: any = {
      select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query), order: vi.fn(() => query),
      range: vi.fn((start: number, end: number) => {
        ranges.push({ table, from: start, to: end });
        return Promise.resolve({ data: tables[table]?.slice(start, end + 1) ?? [], error: tableErrors[table] ?? null });
      }),
      then: (resolve: any, reject: any) => Promise.resolve({ data: tables[table] ?? [], error: tableErrors[table] ?? null }).then(resolve, reject),
    };
    return query;
  });
  const rpc = vi.fn(async (name: string, _args?: any): Promise<any> => ({ data: name === "is_full_admin" ? true : { ok: true }, error: null }));
  const user = { rpc, from };
  const listUsers = vi.fn(async (_options?: any): Promise<any> => ({ data: { users: [target] }, error: null }));
  const inviteUserByEmail = vi.fn(async (_email: string): Promise<any> => ({ data: { user: target }, error: null }));
  const getUser = vi.fn(async (_token: string): Promise<any> => ({ data: { user: { id: callerId } }, error: null }));
  const admin = { auth: { getUser, admin: { listUsers, inviteUserByEmail } } };
  const createClient = vi.fn().mockReturnValueOnce(admin).mockReturnValueOnce(user);
  const handler = createManageAdminHandler(createClient, env);
  const request = (body: unknown, authorization: string | null = "Bearer test-jwt", method = "POST") => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authorization !== null) headers.Authorization = authorization;
    return handler(new Request("https://example.invalid/manage-admin", {
      method, headers, ...(method === "GET" || method === "OPTIONS" ? {} : { body: JSON.stringify(body) }),
    }));
  };
  return { request, tables, tableErrors, ranges, rpc, from, createClient, getUser, listUsers, inviteUserByEmail };
}

describe("manage-admin authorization and validation", () => {
  it.each([null, "Basic test-jwt", "Bearer "])("rejects missing or invalid Bearer authorization: %s", async authorization => {
    const f = fixture();
    expect((await f.request({ action: "list" }, authorization)).status).toBe(401);
    expect(f.listUsers).not.toHaveBeenCalled();
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid users and non-POST requests without privileged work", async () => {
    const f = fixture();
    f.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await f.request({ action: "list" })).status).toBe(401);
    expect(f.rpc).not.toHaveBeenCalled();
    const other = fixture();
    expect((await other.request(null, "Bearer test-jwt", "GET")).status).toBe(405);
    expect(other.listUsers).not.toHaveBeenCalled();
  });

  it.each(["restricted administrator", "customer"])("denies every action to a %s", async () => {
    for (const action of ["list", "add", "remove"]) {
      const f = fixture();
      f.rpc.mockResolvedValue({ data: false, error: null });
      const result = await f.request({ action, email: target.email, user_id: targetId, allowed_modules: [] });
      expect(result.status).toBe(403);
      expect(f.rpc).toHaveBeenCalledWith("is_full_admin", { _user_id: callerId });
      expect(f.rpc).toHaveBeenCalledTimes(1);
      expect(f.listUsers).not.toHaveBeenCalled();
      expect(f.inviteUserByEmail).not.toHaveBeenCalled();
      expect(f.from).not.toHaveBeenCalled();
    }
  });

  it("fails closed if full-admin authorization cannot be checked", async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: null, error: { message: "authorization lookup failed" } });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(f.listUsers).not.toHaveBeenCalled();
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    { action: "add", allowed_modules: [] },
    { action: "add", email: 42, allowed_modules: [] },
    { action: "add", email: target.email },
    { action: "add", email: target.email, allowed_modules: "equipe" },
    { action: "add", email: target.email, allowed_modules: [42] },
    { action: "add", email: target.email, allowed_modules: ["all"] },
    { action: "add", email: target.email, allowed_modules: ["b2c", "unknown"] },
    { action: "remove", user_id: callerId },
    { action: "unknown" },
  ])("rejects invalid input before auth administration: %j", async body => {
    const f = fixture();
    expect((await f.request(body)).status).toBe(400);
    expect(f.listUsers).not.toHaveBeenCalled();
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.some(([name]) => name === "manage_admin_team")).toBe(false);
  });
});

describe("manage-admin team operations", () => {
  it("finds an existing user on a later auth page and does not invite them", async () => {
    const f = fixture();
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: `other-${i}`, email: `other-${i}@example.invalid` }));
    f.listUsers.mockImplementation(async ({ page }) => ({ data: { users: page === 1 ? firstPage : [target] }, error: null }));
    const result = await f.request({ action: "add", email: " MEMBER@EXAMPLE.INVALID ", allowed_modules: ["b2c"] });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ ok: true, user_id: targetId, invited: false });
    expect(f.listUsers.mock.calls.map(([options]) => options)).toEqual([{ page: 1, perPage: 1000 }, { page: 2, perPage: 1000 }]);
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc).toHaveBeenCalledWith("manage_admin_team", { p_action: "add", p_user_id: targetId, p_allowed_modules: ["b2c"] });
    expect(f.getUser).toHaveBeenCalledWith("test-jwt");
    expect(f.createClient.mock.calls[1][1]).toBe(env.SUPABASE_ANON_KEY);
    expect(f.createClient.mock.calls[1][2]).toMatchObject({ global: { headers: { Authorization: "Bearer test-jwt" } } });
  });

  it("invites an absent user and reports invited only after a successful team RPC", async () => {
    const f = fixture();
    f.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, user_id: targetId, invited: true });
    expect(f.inviteUserByEmail).toHaveBeenCalledWith(target.email);
    expect(f.rpc).toHaveBeenCalledWith("manage_admin_team", { p_action: "add", p_user_id: targetId, p_allowed_modules: [] });
  });

  it("does not grant a role when the invitation fails", async () => {
    const f = fixture();
    f.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    f.inviteUserByEmail.mockResolvedValue({ data: { user: null }, error: { message: "invitation failed" } });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.json()).toHaveProperty("error");
    expect(f.rpc.mock.calls.some(([name]) => name === "manage_admin_team")).toBe(false);
  });

  it("does not invite if full-admin access was revoked during user lookup", async () => {
    const f = fixture();
    f.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    f.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValue({ data: false, error: null });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBe(403);
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.some(([name]) => name === "manage_admin_team")).toBe(false);
  });

  it("reports an already-issued invitation when the subsequent team RPC fails", async () => {
    const f = fixture();
    f.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    f.rpc.mockImplementation(async name => name === "is_full_admin" ? { data: true, error: null } : { data: null, error: { message: "role change rejected", code: "42501" } });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "role change rejected", invited: true, user_id: targetId });
  });

  it.each(["add", "remove"])("propagates the atomic team RPC failure for %s", async action => {
    const f = fixture();
    f.rpc.mockImplementation(async name => name === "is_full_admin" ? { data: true, error: null } : { data: null, error: { message: "database rejected team change" } });
    const response = await f.request({ action, email: target.email, user_id: targetId, allowed_modules: [] });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.json()).toHaveProperty("error");
  });

  it("removes through the caller-authorized atomic RPC", async () => {
    const f = fixture();
    const response = await f.request({ action: "remove", user_id: targetId });
    expect(response.status).toBe(200);
    expect(f.rpc).toHaveBeenCalledWith("manage_admin_team", { p_action: "remove", p_user_id: targetId, p_allowed_modules: null });
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("includes later auth and database pages in the team listing", async () => {
    const f = fixture();
    const users = Array.from({ length: 1001 }, (_, i) => ({ id: `member-${i}`, email: `member-${i}@example.invalid` }));
    f.tables.user_roles = users.map(u => ({ user_id: u.id }));
    f.tables.profiles = users.map(u => ({ id: u.id, full_name: `Name ${u.id}` }));
    f.tables.admin_permissions = users.map(u => ({ user_id: u.id, allowed_modules: ["b2c"] }));
    f.listUsers.mockImplementation(async ({ page, perPage }) => ({ data: { users: users.slice((page - 1) * perPage, page * perPage) }, error: null }));
    const response = await f.request({ action: "list" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.admins).toHaveLength(1001);
    expect(body.admins).toContainEqual({ user_id: "member-1000", email: "member-1000@example.invalid", full_name: "Name member-1000", allowed_modules: ["b2c"] });
    for (const table of Object.keys(f.tables)) expect(f.ranges).toContainEqual({ table, from: 1000, to: 1999 });
    expect(f.listUsers).toHaveBeenCalledWith({ page: 2, perPage: 1000 });
  });

  it("surfaces list query failures instead of returning an empty successful list", async () => {
    const f = fixture();
    f.tableErrors.user_roles = { message: "role query failed" };
    const response = await f.request({ action: "list" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.json()).toHaveProperty("error");
  });

  it("withholds directory details if full-admin access was revoked during listing", async () => {
    const f = fixture();
    f.tables.user_roles = [{ user_id: targetId }];
    f.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValue({ data: false, error: null });
    const response = await f.request({ action: "list" });
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("admins");
  });

  it("surfaces auth-directory failure without inviting or granting access", async () => {
    const f = fixture();
    f.listUsers.mockResolvedValue({ data: { users: [] }, error: { message: "auth directory unavailable" } });
    const response = await f.request({ action: "add", email: target.email, allowed_modules: [] });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(f.inviteUserByEmail).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.some(([name]) => name === "manage_admin_team")).toBe(false);
  });
});
