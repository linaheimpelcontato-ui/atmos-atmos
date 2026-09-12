import { describe, expect, it, vi } from "vitest";
import { findRequestProspect, type LinkedRequestProspect } from "./requestProspect";

const row = (id: string, segment = "b2c", email: string | null = " Person@Example.invalid ", phone: string | null = null): LinkedRequestProspect =>
  ({ id, segment, email, phone, stage_id: "manual-stage" });
function client(rows: LinkedRequestProspect[], error: unknown = null) {
  const calls: string[] = [];
  const db = { from: vi.fn((table: string) => {
    calls.push(table);
    let segment = "";
    const q: any = {
      select: vi.fn(() => q), eq: vi.fn((_key, value) => { segment = value; return q; }), order: vi.fn(() => q),
      range: vi.fn((start, end) => Promise.resolve({ data: rows.filter(p => p.segment === segment).slice(start, end + 1), error })),
    };
    return q;
  }) };
  return { db, calls };
}

describe("request CRM linkage without writes", () => {
  it.each([["turista", "b2c"], ["imersao", "b2b"]] as const)("only links %s to %s despite the same contact in the other segment", async (origin, segment) => {
    const rows = [row("b2b", "b2b"), row("b2c", "b2c")];
    const { db } = client(rows);
    expect(await findRequestProspect(db, { origin, email: "person@example.invalid" })).toEqual(rows.find(p => p.segment === segment));
  });
  it("matches phone-only requests with punctuation like the server trigger", async () => {
    const p = row("phone", "b2c", null, "+55 (62) 99999-1234");
    expect(await findRequestProspect(client([p]).db, { origin: "turista", phone: "5562999991234" })).toEqual(p);
  });
  it("reuses phone matches even if the request email differs", async () => {
    const p = row("phone", "b2b", "old@example.invalid", "(62) 1234-5678");
    expect(await findRequestProspect(client([p]).db, { origin: "imersao", email: "new@example.invalid", phone: "6212345678" })).toEqual(p);
  });
  it("does not treat wildcard characters as email patterns", async () => {
    expect(await findRequestProspect(client([row("wrong", "b2c", "person@example.invalid")]).db,
      { origin: "turista", email: "%@example.invalid" })).toBeNull();
  });
  it("rejects ambiguous contacts instead of choosing one or rewriting it", async () => {
    const { db } = client([row("email"), row("phone", "b2c", "different@example.invalid", "12345")]);
    await expect(findRequestProspect(db, { origin: "turista", email: "person@example.invalid", phone: "12345" })).rejects.toThrow("Mais de um cliente");
  });
  it("finds a match after the first result page", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => row(String(i), "b2c", `unrelated${i}@example.invalid`));
    rows.push(row("target"));
    const { db } = client(rows);
    expect((await findRequestProspect(db, { origin: "turista", email: "person@example.invalid" }))?.id).toBe("target");
    expect(db.from).toHaveBeenCalledTimes(2);
  });
  it("does not confuse missing contacts or a failed query with permission to insert", async () => {
    const noKey = client([]);
    expect(await findRequestProspect(noKey.db, { origin: "turista", email: " ", phone: "()" })).toBeNull();
    expect(noKey.db.from).not.toHaveBeenCalled();
    await expect(findRequestProspect(client([], { message: "Permission denied" }).db,
      { origin: "turista", email: "person@example.invalid" })).rejects.toThrow("Permission denied");
  });
});
