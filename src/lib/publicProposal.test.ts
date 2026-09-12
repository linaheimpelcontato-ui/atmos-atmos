import { describe, it, expect } from "vitest";
import { parsePublicProposal, canShowPriceBreakdown, type PublicProposal } from "./publicProposal";

function makeRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop-1",
    title: "Chapada 5 dias",
    status: "sent",
    published_at: "2026-01-01T00:00:00Z",
    share_token: "token-abc",
    show_price_breakdown: false,
    num_people: 4,
    num_courtesies: 0,
    num_paying: 4,
    items_subtotal: 4000,
    items_discount_amount: 0,
    net_per_person: 1000,
    atmos_service: { price_per_person_day: null, description: "Curadoria", num_courtesies: 0 },
    proposal_day_items: [{ day_number: 1, value: null, value_text: null, item_name: "Cachoeira" }],
    ...overrides,
  };
}

describe("parsePublicProposal", () => {
  it("returns null for SQL NULL (not found / not published)", () => {
    expect(parsePublicProposal(null)).toBeNull();
  });

  it("returns null for a payload with no id", () => {
    expect(parsePublicProposal({ title: "no id" })).toBeNull();
  });

  it("never surfaces cost/margin fields even if a caller smuggled them in", () => {
    const raw = makeRaw({ cost_price: 999, commission_percent: 10, supplier_id: "sup-1", sellers: { phone: "123" } });
    const parsed = parsePublicProposal(raw)!;
    expect(parsed).not.toHaveProperty("cost_price");
    expect(parsed).not.toHaveProperty("commission_percent");
    expect(parsed).not.toHaveProperty("supplier_id");
    expect(parsed).not.toHaveProperty("sellers");
  });

  it("carries the raw saved show_price_breakdown flag as-is (not OR'd with admin)", () => {
    // The admin toggle needs to see the real client-facing state; the RPC
    // must never fold `is_admin_view` into this field (regression: an
    // earlier version of get_public_proposal did exactly that, which made
    // the toggle appear permanently "on" for admins regardless of the saved value).
    const raw = makeRaw({ show_price_breakdown: false, is_admin_view: true });
    const parsed = parsePublicProposal(raw)!;
    expect(parsed.show_price_breakdown).toBe(false);
  });

  it("defaults arrays and aggregates when the RPC omits them", () => {
    const raw = makeRaw();
    delete (raw as any).proposal_day_items;
    const parsed = parsePublicProposal(raw)!;
    expect(parsed.proposal_day_items).toEqual([]);
    expect(parsed.num_paying).toBe(4); // still present from raw in this case
  });

  it("keeps net_per_person as null (never fabricates a 0/free price)", () => {
    // e.g. courtesies >= num_people: an inconsistent state that should read
    // as "price unavailable", not as a free trip.
    const raw = makeRaw({ net_per_person: null });
    const parsed = parsePublicProposal(raw)!;
    expect(parsed.net_per_person).toBeNull();
  });
});

describe("canShowPriceBreakdown", () => {
  it("is hidden by default for non-admins", () => {
    const proposal = { show_price_breakdown: false } as Pick<PublicProposal, "show_price_breakdown">;
    expect(canShowPriceBreakdown(proposal, false)).toBe(false);
  });

  it("is visible when staff turned the flag on", () => {
    const proposal = { show_price_breakdown: true } as Pick<PublicProposal, "show_price_breakdown">;
    expect(canShowPriceBreakdown(proposal, false)).toBe(true);
  });

  it("is always visible for admins, regardless of the flag", () => {
    const proposal = { show_price_breakdown: false } as Pick<PublicProposal, "show_price_breakdown">;
    expect(canShowPriceBreakdown(proposal, true)).toBe(true);
  });
});
