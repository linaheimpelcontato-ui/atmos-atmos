import { describe, expect, it } from "vitest";
import { lineTotal, operatingProfit, resizeFixedPrice, splitGroupTotal, supplierCommission } from "./proposalCalcs";
import { calcProposalProfit, calcCategoryBreakdown, calcProductRanking } from "@/pages/admin/finance/financeCalcs";
import type { Proposal, DayItem } from "@/pages/admin/finance/useFinanceData";

const proposal = (patch: Partial<Proposal> = {}): Proposal => ({ id: "p", title: "Grupo", code: null, total: 2000, subtotal: 2000, atmos_service: {}, created_at: "2026-01-01", num_people: 20, num_days: 1, segment: "b2c", status: "accepted", start_date: null, prospect_id: null, seller_id: null, ...patch });
const item = (patch: Partial<DayItem> = {}): DayItem => ({ id: "i", proposal_id: "p", category: "Passeio", catalog_item_id: null, item_name: "Passeio", value: 100, cost_price: 100, quantity: 20, day_number: 1, commission_percent: 0, ...patch });

describe("group pricing", () => {
  it("preserves all 20 travelers' costs when only 18 pay", () => {
    const total = lineTotal(100, 20);
    expect(splitGroupTotal(total, 20, 2)).toEqual({ total: 2000, paying: 18, perPerson: 2000 / 18 });
    expect(splitGroupTotal(total, 20, 0).total).toBe(2000);
  });
  it.each([[20,20], [20,21], [0,0], [20,-1], [20,1.5]])("rejects invalid paying count %s/%s", (people, courtesies) => {
    expect(() => splitGroupTotal(2000, people, courtesies)).toThrow();
  });
  it("keeps fixed negotiated totals exact across group sizes", () => {
    const first = resizeFixedPrice(100, 70, 1, 3);
    expect(lineTotal(first.value, 3)).toBe(100);
    const second = resizeFixedPrice(first.value, first.cost, 3, 18);
    expect(lineTotal(second.value, 18)).toBe(100);
    expect(lineTotal(second.cost, 18)).toBe(70);
    expect(lineTotal(100, 18)).toBe(1800); // per-person remains quantity based
  });
  it("bases supplier commission on cost regardless of selling price", () => {
    expect(supplierCommission(100, 10)).toBe(10);
    expect(operatingProfit(150, 100, supplierCommission(100, 10), 0)).toBe(60);
    expect(operatingProfit(200, 100, supplierCommission(100, 10), 0)).toBe(110);
  });
});

describe("finance matches saved proposal components", () => {
  it("does not deduct courtesy costs again", () => {
    expect(calcProposalProfit(proposal({ atmos_service: { num_courtesies: 2 } }), [item()], []).profit).toBe(0);
  });
  it("includes zero-cost revenue, guide commissions, discounts, service and seller costs", () => {
    const p = proposal({ subtotal: 350, total: 375, discount_percent: 10, discount_fixed: 10,
      atmos_service: { price_per_person_day: 5, internal_costs: [{ amount: 20 }], seller_commission_percent: 4 } });
    const items = [item({ category: "Guia ATMOS", value: 150, cost_price: 100, quantity: 2, commission_percent: 10 }), item({ value: 50, cost_price: 0, quantity: 1 })];
    const costs = [{ id: "c", proposal_id: "p", amount: 30, description: "Fotógrafo" }];
    const expected = operatingProfit(350 + 100, 200, 20, 20 + 30 + 45 + 15);
    const actual = calcProposalProfit(p, items, costs);
    expect(actual.profit).toBe(expected);
    expect(actual.profit).toBe(160);
    expect(actual.guideProfit).toBe(100);
  });
  it.each(["atmos", "hospedagem"])("respects lodging payment mode %s", payment_type => {
    const p = proposal({ subtotal: 0, proposal_accommodations: [{ is_selected: true, payment_type, num_nights: 2, products: { variables: { comissao: 10 } }, rooms: [{ rooms: [{ available: true, units: 1, capacity: 2, pricing_type: "per_person", cost: 100, price: 150 }] }] }] });
    expect(calcProposalProfit(p, [], []).profit).toBe(payment_type === "atmos" ? 240 : 40);
  });
  it("counts quantity in category and product reports", () => {
    const fd = { accepted: [proposal()], rejected: [], all: [proposal()], dayItems: [item()], costs: [] };
    expect(calcCategoryBreakdown(fd)[0].revenue).toBe(2000);
    expect(calcProductRanking(fd, [], "all")[0].revenue).toBe(2000);
  });
});
