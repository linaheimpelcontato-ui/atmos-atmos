import { describe, expect, it } from "vitest";
import { money, moneySum, moneyProduct, proposalDiscount, lineTotal, operatingProfit, proposalPriceTotals, resizeFixedPrice, splitGroupTotal, supplierCommission } from "./proposalCalcs";
import { calcProposalProfit, calcCategoryBreakdown, calcProductRanking, calcGuideRanking } from "@/pages/admin/finance/financeCalcs";
import type { Proposal, DayItem } from "@/pages/admin/finance/useFinanceData";

const proposal = (patch: Partial<Proposal> = {}): Proposal => ({ id: "p", title: "Grupo", code: null, total: 2000, subtotal: 2000, atmos_service: {}, created_at: "2026-01-01", num_people: 20, num_days: 1, segment: "b2c", status: "accepted", start_date: null, prospect_id: null, seller_id: null, ...patch });
const item = (patch: Partial<DayItem> = {}): DayItem => ({ id: "i", proposal_id: "p", category: "Passeio", catalog_item_id: null, item_name: "Passeio", value: 100, cost_price: 100, quantity: 20, day_number: 1, commission_percent: 0, ...patch });

describe("group pricing", () => {
  it("reproduces the observed Melhor aos 50 itinerary without removing courtesy revenue", () => {
    const price = proposalPriceTotals({ subtotal: 51000, serviceRevenue: 42000, accommodationRevenue: 0,
      discountPercent: 0, discountFixed: 0, taxPercent: 0 });
    expect(price.total).toBe(93000);
    const split = splitGroupTotal(price.total, 20, 2);
    expect(split).toMatchObject({ paying: 18, lowerAmount: 5166.66, lowerCount: 6, upperAmount: 5166.67, upperCount: 12 });
    expect(split.lowerAmount * split.lowerCount + split.upperAmount * split.upperCount).toBe(93000);
  });
  it("rounds discount and grossed-up tax before saving and allocating", () => {
    const price = proposalPriceTotals({ subtotal: 100.05, serviceRevenue: 20, accommodationRevenue: 30,
      discountPercent: 10, discountFixed: 0, taxPercent: 6 });
    expect(price).toEqual({ discountValue: 10.01, afterDiscount: 90.04, base: 140.04, total: 148.98, taxValue: 8.94 });
  });
  it.each([{taxPercent:100}, {taxPercent:101}, {taxPercent:-1}, {taxPercent:6.123},
    {discountPercent:101}, {discountFixed:101}, {subtotal:NaN}, {serviceRevenue:Infinity}])("rejects invalid monetary inputs %o", patch => {
    expect(() => proposalPriceTotals({ subtotal:100, serviceRevenue:0, accommodationRevenue:0,
      discountPercent:0, discountFixed:0, taxPercent:0, ...patch })).toThrow();
  });
  it("preserves all 20 travelers' costs when only 18 pay", () => {
    const total = lineTotal(100, 20);
    expect(splitGroupTotal(total, 20, 2)).toMatchObject({ total: 2000, paying: 18, perPerson: 2000 / 18 });
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
    const p = proposal({ subtotal: 0, proposal_accommodations: [{ is_selected: true, payment_type, num_nights: 2, products: { variables: { comissao: 10 } }, rooms: [{ rooms: [{ available: true, units: 1, capacity: 2, pricing_type: "per_person", cost: 100, price: 150, commission_percent: 10 }] }] }] });
    expect(calcProposalProfit(p, [], []).profit).toBe(payment_type === "atmos" ? 240 : 40);
  });
  it("guide ranking uses saved costs and the full proposal profit, including operational expenses", () => {
    const p = proposal({subtotal:600,total:600});
    const items = [item({category:"Guia ATMOS",catalog_item_id:"guide",quantity:2,value:150,cost_price:100}),
      item({id:"other",quantity:1,value:300,cost_price:200})];
    const costs = [{id:"c",proposal_id:"p",amount:50,description:"Operational"}];
    const ranking = calcGuideRanking({accepted:[p],rejected:[],all:[p],dayItems:items,costs},
      [{id:"guide",name:"Local guide"}] as any, costs);
    expect(ranking[0]).toMatchObject({guideCost:200,revenue:600,profit:150,margin:25,proposals:1});
  });
  it("counts quantity in category and product reports", () => {
    const fd = { accepted: [proposal()], rejected: [], all: [proposal()], dayItems: [item()], costs: [] };
    expect(calcCategoryBreakdown(fd)[0].revenue).toBe(2000);
    expect(calcProductRanking(fd, [], "all")[0].revenue).toBe(2000);
  });
});


describe("decimal parity with PostgreSQL numeric", () => {
  it("matches the review's SQL result for 100.75 with a 10% discount", () => {
    expect(proposalPriceTotals({ subtotal: 100.75, serviceRevenue: 0, accommodationRevenue: 0,
      discountPercent: 10, discountFixed: 0, taxPercent: 0 })).toEqual({
      discountValue: 10.08, afterDiscount: 90.67, base: 90.67, total: 90.67, taxValue: 0,
    });
    const result = calcProposalProfit(proposal({ subtotal: 100.75, total: 90.67, discount_percent: 10 }),
      [item({ value: 100.75, cost_price: 0, quantity: 1 })], []);
    expect(result.profit).toBe(90.67);
  });

  it.each([[1.005, 1.01], [10.075, 10.08], [-1.005, -1.01], [-10.075, -10.08],
    [0.005, 0.01], [-0.005, -0.01], [1.004999999999, 1], [1.005000000001, 1.01],
    [1e-7, 0], [99999999.99, 99999999.99]])("rounds %s to %s, with ties away from zero", (input, expected) => {
    expect(money(input)).toBe(expected);
  });

  it("retains sub-cent unit prices until the line boundary", () => {
    expect(lineTotal(0.335, 3)).toBe(1.01);
    expect(lineTotal(1.005, 3)).toBe(3.02);
    expect(lineTotal(-0.335, 3)).toBe(-1.01);
    expect(moneyProduct(1e-7, 100000)).toBe(0.01);
    expect(moneyProduct(1e21, 1e-21)).toBe(1);
    expect(moneyProduct(0.1005, 5, 2)).toBe(1.01);
  });

  it("adds fixed discounts before rounding and computes commissions exactly", () => {
    expect(proposalDiscount(100.75, 10, 0.01)).toBe(10.09);
    expect(supplierCommission(100.75, 10)).toBe(10.08);
    expect(moneySum(0.004, 0.004)).toBe(0.01);
    expect(operatingProfit(1.005, 0, 0, 0)).toBe(1.01);
    expect(operatingProfit(0, 1.005, 0, 0)).toBe(-1.01);
  });

  it("grosses up decimal tax without binary division at the rounding boundary", () => {
    expect(proposalPriceTotals({ subtotal: 1.03, serviceRevenue: 0, accommodationRevenue: 0,
      discountPercent: 0, discountFixed: 0, taxPercent: 60 })).toMatchObject({ total: 2.58, taxValue: 1.55 });
    expect(proposalPriceTotals({ subtotal: 0.01, serviceRevenue: 0, accommodationRevenue: 0,
      discountPercent: 0, discountFixed: 0, taxPercent: 99.99 }).total).toBe(100);
  });

  it("checks every cent in a range against integer tenths-of-a-cent discount rounding", () => {
    for (let cents = 1; cents <= 20000; cents++) {
      const discountCents = Math.floor((cents + 5) / 10);
      const result = proposalPriceTotals({ subtotal: cents / 100, serviceRevenue: 0, accommodationRevenue: 0,
        discountPercent: 10, discountFixed: 0, taxPercent: 0 });
      expect(result.discountValue).toBe(discountCents / 100);
      expect(result.total).toBe((cents - discountCents) / 100);
    }
  });

  it("allocates the rounded total, including its per-person average", () => {
    expect(splitGroupTotal(1.005, 2, 0)).toEqual({ total: 1.01, paying: 2, perPerson: 0.505,
      lowerAmount: 0.5, lowerCount: 1, upperAmount: 0.51, upperCount: 1 });
  });

  it.each([NaN, Infinity, -Infinity, 1e20])("rejects money outside the finite, safe cent range: %s", value => {
    expect(() => money(value)).toThrow();
  });

  it("rejects fractional discount/tax digits without an epsilon allowance", () => {
    expect(() => proposalPriceTotals({ subtotal: 100, serviceRevenue: 0, accommodationRevenue: 0,
      discountPercent: 10.0000000001, discountFixed: 0, taxPercent: 0 })).toThrow();
  });

  it("uses exact decimal stages for service revenue and seller commissions in finance", () => {
    const service = calcProposalProfit(proposal({ subtotal: 0, total: 1.01, num_people: 5, num_days: 2,
      atmos_service: { price_per_person_day: 0.1005 } }), [], []);
    expect(service.atmosRevenue).toBe(1.01);
    const seller = calcProposalProfit(proposal({ subtotal: 100.75, total: 100.75,
      atmos_service: { seller_commission_percent: 10 } }), [item({ value: 100.75, cost_price: 0, quantity: 1 })], []);
    expect(seller.profit).toBe(90.67);
  });
});
