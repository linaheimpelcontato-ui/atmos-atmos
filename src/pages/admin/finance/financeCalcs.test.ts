import { describe, expect, it } from "vitest";
import { calcCashForecast, calcGuideRanking, calcProposalProfit, calcCashFlow, calcMonthlyEvolution, calcOverviewKPIs, filterProposals } from "./financeCalcs";
import type { Proposal, DayItem } from "./useFinanceData";

const proposal = (id: string, status: string, total: number, patch: Partial<Proposal> = {}): Proposal => ({
  id, status, total, subtotal: total, title: id, code: null, created_at: "2026-09-12", segment: "b2c",
  num_people: 1, num_days: 1, start_date: null, prospect_id: null, seller_id: null, atmos_service: {}, ...patch,
});
const item = (p: Proposal): DayItem => ({ id: `item-${p.id}`, proposal_id: p.id, category: "Passeio",
  value: p.total, cost_price: 0, quantity: 1, day_number: 1, commission_percent: 0, catalog_item_id: null, item_name: "Passeio" });

const proposals = [
  proposal("current", "approved", 100),
  proposal("legacy", "accepted", 200),
  ...["draft", "sent", "negotiating", "rejected", "expired", "paid", "signed", "closed", "cancelled"].map(status => proposal(status, status, 999)),
  proposal("other-segment", "approved", 400, { segment: "b2b" }),
  proposal("other-month", "approved", 500, { created_at: "2026-08-15" }),
];
const items = proposals.map(item);

describe("FIN-01 approved proposals in financial KPIs", () => {
  it("includes canonical and legacy approvals, respecting dates, segment and linked items", () => {
    const fd = filterProposals(proposals, items, [], "2026-09-01", "2026-09-30", "b2c");
    expect(fd.accepted.map(p => p.id)).toEqual(["current", "legacy"]);
    expect(fd.rejected.map(p => p.id)).toEqual(["rejected"]);
    expect(fd.dayItems.map(i => i.proposal_id)).toEqual(["current", "legacy"]);
    expect(calcOverviewKPIs(fd, [])).toMatchObject({ revenue: 300, profit: 300, clients: 2, avgTicket: 150 });
  });

  it("uses the same approval rule for monthly evolution and all segments", () => {
    expect(calcMonthlyEvolution(proposals, [], items, "2026-09-01", "2026-09-30", "b2c"))
      .toEqual([expect.objectContaining({ receita: 300, lucro: 300, clientes: 2 })]);
    const fd = filterProposals(proposals, items, [], "2026-09-01", "2026-09-30", "all");
    expect(calcOverviewKPIs(fd, [])).toMatchObject({ revenue: 700, clients: 3 });
  });

  it("keeps commercial approval separate from actual payment", () => {
    const unpaidApproval = { ...proposal("approved-unpaid", "approved", 100), payment_status: "pending" };
    const paidDraft = { ...proposal("draft-paid", "draft", 999), payment_status: "paid" };
    const fd = filterProposals([unpaidApproval, paidDraft], [], [], "2026-09-01", "2026-09-30", "all");
    expect(fd.accepted.map(p => p.id)).toEqual(["approved-unpaid"]);
    expect(calcOverviewKPIs(fd, []).revenue).toBe(100);
    const base = { due_date: "2026-09-12", type: "receivable", proposal_id: unpaidApproval.id };
    const flow = calcCashFlow([
      { ...base, amount: 100, status: "pending" },
      { ...base, amount: 900, status: "approved" },
      { ...base, amount: 800, status: "accepted" },
      { ...base, amount: 20, status: "paid" },
      { ...base, type: "payable", amount: 5, status: "paid" },
    ], "2026-09-01", "2026-09-30");
    expect(flow).toEqual([expect.objectContaining({ entradas: 20, saidas: 5, saldo: 15 })]);
  });
});


describe("FIN-09 missing historical accommodation commissions", () => {
  const lodging = (commission?: number | null, patch: Record<string, unknown> = {}) => [{
    is_selected: true, payment_type: "hospedagem", num_nights: 1,
    rooms: [{ available: true, units: 1, capacity: 1, cost: 100, price: 150, commission_percent: commission, ...patch }],
  }];
  it.each([undefined, null])("marks absent commission %s as incomplete throughout aggregation", commission => {
    const p = proposal("incomplete", "approved", 100, { proposal_accommodations: lodging(commission) });
    const guideItem = { ...item(p), category: "Guia ATMOS", catalog_item_id: "guide" };
    const fd = filterProposals([p], [guideItem, { ...guideItem, id: "second-day" }], [], "2026-09-01", "2026-09-30", "all");
    expect(calcProposalProfit(p, [], [])).toMatchObject({ resultIncomplete: true, missingAccommodationCommissions: 1 });
    expect(calcOverviewKPIs(fd, [])).toMatchObject({ resultIncomplete: true, incompleteProposals: 1, missingAccommodationCommissions: 1 });
    expect(calcMonthlyEvolution([p], [], [], "2026-09-01", "2026-09-30", "all")[0])
      .toMatchObject({ resultIncomplete: true, incompleteProposals: 1 });
    expect(calcGuideRanking(fd, [{ id: "guide", name: "Guia", is_active: true }], [])[0])
      .toMatchObject({ resultIncomplete: true, incompleteProposals: 1, missingAccommodationCommissions: 1 });
  });

  it.each([0, 10])("treats explicitly recorded %s percent as known", commission => {
    const p = proposal("known", "approved", 100, { proposal_accommodations: lodging(commission) });
    expect(calcProposalProfit(p, [], [])).toMatchObject({ resultIncomplete: false, missingAccommodationCommissions: 0, profit: commission });
  });

  it("ignores unselected, unavailable and zero-unit lodging", () => {
    const p = proposal("ignored", "approved", 100, { proposal_accommodations: [
      { ...lodging()[0], is_selected: false }, ...lodging(undefined, { available: false }), ...lodging(undefined, { units: 0 }),
    ] });
    expect(calcProposalProfit(p, [], []).resultIncomplete).toBe(false);
  });

  it("keeps historical month warnings even when the KPI interval excludes that proposal", () => {
    const p = proposal("history", "approved", 100, { created_at: "2026-09-02", proposal_accommodations: lodging() });
    const fd = filterProposals([p], [], [], "2026-09-10", "2026-09-30", "all");
    expect(calcOverviewKPIs(fd, []).resultIncomplete).toBe(false);
    expect(calcMonthlyEvolution([p], [], [], "2026-09-10", "2026-09-30", "all")[0].resultIncomplete).toBe(true);
  });
});

describe("FIN-12 monetary cash forecast classification", () => {
  const now = new Date(2026, 8, 12, 12); // Saturday; weeks start on Monday.
  const tx = (type: string, status: string, due_date: string, amount: number) => ({ type, status, due_date, amount });

  it("brings old overdue/pending balances forward exactly once and keeps future due dates", () => {
    expect(calcCashForecast([
      tx("receivable", "overdue", "2025-01-01", 100.75),
      tx("commission_in", "pending", "2026-09-01", 0.1),
      tx("commission_in", "pending", "2026-09-11", 0.2),
      tx("payable", "pending", "2026-08-15", 20),
      tx("commission_out", "overdue", "2026-09-07", 2.05),
      tx("receivable", "pending", "2026-09-12", 10),
      tx("payable", "pending", "2026-09-13", 5),
      tx("receivable", "overdue", "2026-09-14", 30),
      tx("commission_out", "pending", "2026-09-20", 3),
      tx("commission_in", "pending", "2026-09-21", 4),
      tx("payable", "overdue", "2026-10-04", 6),
      tx("payable", "pending", "2026-10-05", 999),
    ], now)).toEqual([
      { name: "Sem 1", entradas: 111.05, saidas: 27.05 },
      { name: "Sem 2", entradas: 30, saidas: 3 },
      { name: "Sem 3", entradas: 4, saidas: 0 },
      { name: "Sem 4", entradas: 0, saidas: 6 },
    ]);
  });

  it.each(["paid", "cancelled", "canceled", "approved", "accepted", "unknown"])("excludes status %s, regardless of due date", status => {
    const entries = ["2020-01-01", "2026-09-12", "2026-09-20"].flatMap(date =>
      ["receivable", "commission_in", "payable", "commission_out"].map(type => tx(type, status, date, 99)));
    expect(calcCashForecast(entries, now).every(w => w.entradas === 0 && w.saidas === 0)).toBe(true);
  });

  it("ignores unknown transaction types and undated records", () => {
    expect(calcCashForecast([tx("transfer", "pending", "2026-09-12", 99),
      tx("receivable", "pending", "", 99), tx("payable", "overdue", null as any, 99)], now)[0])
      .toEqual({ name: "Sem 1", entradas: 0, saidas: 0 });
  });

  it("handles a Monday and a year boundary without losing the previous day's balance", () => {
    const monday = new Date(2026, 11, 28, 12);
    expect(calcCashForecast([tx("receivable", "pending", "2026-12-27", 1),
      tx("payable", "overdue", "2027-01-04", 2)], monday).slice(0, 2)).toEqual([
        { name: "Sem 1", entradas: 1, saidas: 0 }, { name: "Sem 2", entradas: 0, saidas: 2 },
      ]);
  });
});
