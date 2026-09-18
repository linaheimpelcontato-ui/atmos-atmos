import { isApprovedProposalStatus } from "@/lib/proposalStatus";
import { accommodationAmounts, normalizeSavedRooms } from "@/lib/accommodationCalcs";
import { lineTotal, money, moneySum, moneyProduct, proposalDiscount, supplierCommission, operatingProfit } from "@/lib/proposalCalcs";
import type { Proposal, DayItem, ProposalCost, Guide, Product } from "./useFinanceData";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ---- Per-proposal profit using the same formula as ProposalFormDialog ---- */
export function calcProposalProfit(
  p: Proposal, items: DayItem[], costs: ProposalCost[]
) {
  const pItems = items.filter(i => i.proposal_id === p.id);

  const isGuide = (category: string) => ["Guia ATMOS", "Diária Guia ATMOS", "Guia"].includes(category);
  const billableItems = pItems.filter(i => i.category !== "Hospedagens");
  const itemProfit = (i: DayItem) => moneySum(lineTotal(Number(i.value), i.quantity ?? 1), -lineTotal(Number(i.cost_price), i.quantity ?? 1));
  const guideProfit = billableItems.filter(i => isGuide(i.category)).reduce((s, i) => moneySum(s, itemProfit(i)), 0);
  const markupProfit = billableItems.filter(i => !isGuide(i.category)).reduce((s, i) => moneySum(s, itemProfit(i)), 0);
  const commissionProfit = billableItems.reduce((s, i) => moneySum(s, supplierCommission(lineTotal(Number(i.cost_price), i.quantity ?? 1), Number(i.commission_percent || 0))), 0);
  const atmos = p.atmos_service || {};
  const atmosRevenue = moneyProduct(Number(atmos.price_per_person_day || 0), Number(p.num_people ?? 1), Number(p.num_days ?? 1));
  const atmosInternalCosts = moneySum(...(atmos.internal_costs || []).map((ic: any) => Number(ic.amount || 0)));
  const directCosts = moneySum(...costs.filter(c => c.proposal_id === p.id).map(c => Number(c.amount)));
  let accommodationProfit = 0;
  let missingAccommodationCommissions = 0;
  for (const acc of p.proposal_accommodations || []) {
    if (!acc.is_selected) continue;
    const amounts = accommodationAmounts(normalizeSavedRooms(acc.rooms), Number(acc.num_nights ?? 0));
    missingAccommodationCommissions += amounts.missingCommissions;
    accommodationProfit = moneySum(accommodationProfit, acc.payment_type === "atmos" ? amounts.revenue - amounts.cost : 0, amounts.commission);
  }

  const discount = proposalDiscount(Number(p.subtotal || 0), Number(p.discount_percent || 0), Number(p.discount_fixed || 0));
  // Seller commission is an outgoing commission, separate from supplier commission.
  const sellerCommission = supplierCommission(Number(p.total), Number(atmos.seller_commission_percent || 0));
  const profit = operatingProfit(moneySum(guideProfit, markupProfit, atmosRevenue, accommodationProfit), 0, commissionProfit,
    moneySum(atmosInternalCosts, directCosts, discount, sellerCommission));
  const revenue = Number(p.total);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, profit, margin, resultIncomplete: missingAccommodationCommissions > 0, missingAccommodationCommissions, guideProfit, markupProfit, commissionProfit, atmosRevenue, atmosInternalCosts, directCosts };
}

export function getProposalCost(p: Proposal, costs: ProposalCost[], items?: DayItem[]) {
  if (items) {
    const pf = calcProposalProfit(p, items, costs);
    return pf.revenue - pf.profit; // effective cost = revenue - profit
  }
  const directCosts = moneySum(...costs.filter(c => c.proposal_id === p.id).map(c => Number(c.amount)));
  const atmos = p.atmos_service || {};
  const internalCosts = moneySum(...(atmos.internal_costs || []).map((ic: any) => Number(ic.amount || 0)));
  return directCosts + internalCosts;
}

export type FilteredData = {
  accepted: Proposal[];
  rejected: Proposal[];
  all: Proposal[];
  dayItems: DayItem[];
  costs: ProposalCost[];
};

export function filterProposals(
  proposals: Proposal[], dayItems: DayItem[], costs: ProposalCost[],
  dateFrom: string, dateTo: string, segment: string
): FilteredData {
  const inRange = proposals.filter(p => {
    const d = p.created_at.slice(0, 10);
    if (d < dateFrom || d > dateTo) return false;
    if (segment !== "all" && p.segment !== segment) return false;
    return true;
  });
  const accepted = inRange.filter(p => isApprovedProposalStatus(p.status));
  const rejected = inRange.filter(p => p.status === "rejected");
  const acceptedIds = new Set(accepted.map(p => p.id));
  const filteredItems = dayItems.filter(i => acceptedIds.has(i.proposal_id));
  return { accepted, rejected, all: inRange, dayItems: filteredItems, costs };
}

export function calcOverviewKPIs(fd: FilteredData, costs: ProposalCost[]) {
  let totalRevenue = 0, totalProfit = 0, incompleteProposals = 0, missingAccommodationCommissions = 0;
  for (const p of fd.accepted) {
    const pf = calcProposalProfit(p, fd.dayItems, costs);
    totalRevenue = moneySum(totalRevenue, pf.revenue);
    totalProfit = moneySum(totalProfit, pf.profit);
    if (pf.resultIncomplete) incompleteProposals++;
    missingAccommodationCommissions += pf.missingAccommodationCommissions;
  }
  const totalCost = totalRevenue - totalProfit;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const clients = fd.accepted.length;
  const avgTicket = clients > 0 ? totalRevenue / clients : 0;
  const b2c = fd.accepted.filter(p => p.segment === "b2c");
  const b2b = fd.accepted.filter(p => p.segment === "b2b");
  const ticketB2C = b2c.length > 0 ? b2c.reduce((s, p) => s + Number(p.total), 0) / b2c.length : 0;
  const ticketB2B = b2b.length > 0 ? b2b.reduce((s, p) => s + Number(p.total), 0) / b2b.length : 0;
  const closed = fd.accepted.length + fd.rejected.length;
  const cancelRate = closed > 0 ? (fd.rejected.length / closed) * 100 : 0;
  return { resultIncomplete: incompleteProposals > 0, incompleteProposals, missingAccommodationCommissions, revenue: totalRevenue, totalCost, profit: totalProfit, margin, roi, clients, avgTicket, ticketB2C, ticketB2B, cancelRate };
}

export function calcMonthlyEvolution(
  proposals: Proposal[], costs: ProposalCost[], dayItems: DayItem[],
  dateFrom: string, dateTo: string, segment: string
) {
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  const months = eachMonthOfInterval({ start: from, end: to });

  return months.map(m => {
    const ms = format(startOfMonth(m), "yyyy-MM-dd");
    const me = format(endOfMonth(m), "yyyy-MM-dd");
    const mp = proposals.filter(p => {
      const d = p.created_at.slice(0, 10);
      if (d < ms || d > me) return false;
      if (segment !== "all" && p.segment !== segment) return false;
      return isApprovedProposalStatus(p.status);
    });
    let rev = 0, profit = 0, incompleteProposals = 0;
    for (const p of mp) {
      const pf = calcProposalProfit(p, dayItems, costs);
      rev = moneySum(rev, pf.revenue);
      profit = moneySum(profit, pf.profit);
      if (pf.resultIncomplete) incompleteProposals++;
    }
    return {
      name: format(m, "MMM/yy", { locale: ptBR }),
      receita: rev,
      custos: rev - profit,
      lucro: profit,
      clientes: mp.length,
      resultIncomplete: incompleteProposals > 0, incompleteProposals,
    };
  });
}

export function calcGuideRanking(
  fd: FilteredData, guides: Guide[], costs: ProposalCost[]
) {
  const guideMap = new Map<string, { name: string; revenue: number; cost: number; count: number; proposalIds: Set<string> }>();

  for (const item of fd.dayItems) {
    if (!["Guia", "Guia ATMOS", "Diária Guia ATMOS"].includes(item.category) || !item.catalog_item_id) continue;
    const guide = guides.find(g => g.id === item.catalog_item_id);
    if (!guide) continue;
    const existing = guideMap.get(guide.id) || { name: guide.name, revenue: 0, cost: 0, count: 0, proposalIds: new Set<string>() };
    existing.cost += lineTotal(Number(item.cost_price), item.quantity ?? 1);
    existing.proposalIds.add(item.proposal_id);
    guideMap.set(guide.id, existing);
  }

  // Attribute each associated proposal once per guide, with its full cost model.
  // A proposal with multiple guides appears in each row; rows are not additive.
  const result = Array.from(guideMap.entries()).map(([id, g]) => {
    const proposalRevenues = fd.accepted
      .filter(p => g.proposalIds.has(p.id))
      .reduce((s, p) => s + Number(p.total), 0);
    const count = g.proposalIds.size;
    const avgTicket = count > 0 ? proposalRevenues / count : 0;
    const results = fd.accepted.filter(p => g.proposalIds.has(p.id))
      .map(p => calcProposalProfit(p, fd.dayItems, costs));
    const profit = moneySum(...results.map(p => p.profit));
    const incompleteProposals = results.filter(p => p.resultIncomplete).length;
    const missingAccommodationCommissions = results.reduce((sum, p) => sum + p.missingAccommodationCommissions, 0);
    const margin = proposalRevenues > 0 ? (profit / proposalRevenues) * 100 : 0;
    const proposalCost = money(proposalRevenues - profit);
    const roiVal = proposalCost > 0 ? (profit / proposalCost) * 100 : 0;
    return {
      id, name: g.name, proposals: count, revenue: proposalRevenues,
      guideCost: money(g.cost), profit, margin, roi: roiVal, avgTicket,
      resultIncomplete: incompleteProposals > 0, incompleteProposals, missingAccommodationCommissions,
    };
  });

  return result.sort((a, b) => b.revenue - a.revenue);
}

export function calcCategoryBreakdown(fd: FilteredData) {
  const catMap = new Map<string, { revenue: number; count: number }>();
  const totalRevenue = fd.dayItems.reduce((s, i) => s + lineTotal(Number(i.value), i.quantity ?? 1), 0);

  for (const item of fd.dayItems) {
    const cat = item.category || "Outros";
    const existing = catMap.get(cat) || { revenue: 0, count: 0 };
    existing.revenue += lineTotal(Number(item.value), item.quantity ?? 1);
    existing.count += 1;
    catMap.set(cat, existing);
  }

  return Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      revenue: data.revenue,
      count: data.count,
      percent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function calcProductRanking(fd: FilteredData, products: Product[], typeFilter: string) {
  const prodMap = new Map<string, { name: string; category: string; revenue: number; count: number }>();

  for (const item of fd.dayItems) {
    const key = item.catalog_item_id || item.item_name || "Desconhecido";
    const product = item.catalog_item_id ? products.find(p => p.id === item.catalog_item_id) : null;
    const name = product?.name || item.item_name || "Desconhecido";
    const cat = product?.type || item.category || "Outros";

    if (typeFilter !== "all" && cat !== typeFilter && item.category !== typeFilter) continue;

    const existing = prodMap.get(key) || { name, category: cat, revenue: 0, count: 0 };
    existing.revenue += lineTotal(Number(item.value), item.quantity ?? 1);
    existing.count += 1;
    prodMap.set(key, existing);
  }

  return Array.from(prodMap.values())
    .map(p => ({ ...p, avgTicket: p.count > 0 ? p.revenue / p.count : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function calcCashFlow(transactions: any[], dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  const months = eachMonthOfInterval({ start: from, end: to });

  return months.map(m => {
    const ms = format(startOfMonth(m), "yyyy-MM-dd");
    const me = format(endOfMonth(m), "yyyy-MM-dd");
    const monthTx = transactions.filter((t: any) => t.due_date >= ms && t.due_date <= me);
    const entradas = monthTx
      .filter((t: any) => (t.type === "receivable" || t.type === "commission_in") && t.status === "paid")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const saidas = monthTx
      .filter((t: any) => (t.type === "payable" || t.type === "commission_out") && t.status === "paid")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { name: format(m, "MMM/yy", { locale: ptBR }), entradas, saidas, saldo: entradas - saidas };
  });
}

/** Open obligations only. Past-due balances are actionable now (week one),
 * including old pending rows. Future pending/overdue rows retain their due date.
 * Approval of a proposal is neither a cash transaction nor proof of payment.
 */
export function calcCashForecast(transactions: any[], now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 4 }, (_, i) => {
    const ws = format(addDays(start, i * 7), "yyyy-MM-dd");
    const we = format(addDays(start, i * 7 + 6), "yyyy-MM-dd");
    const due = transactions.filter(t => {
      if (t.status !== "pending" && t.status !== "overdue") return false;
      if (typeof t.due_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.due_date)) return false;
      if (t.due_date < today) return i === 0;
      return t.due_date >= ws && t.due_date <= we;
    });
    const entradas = moneySum(...due.filter(t => t.type === "receivable" || t.type === "commission_in").map(t => Number(t.amount)));
    const saidas = moneySum(...due.filter(t => t.type === "payable" || t.type === "commission_out").map(t => Number(t.amount)));
    return { name: `Sem ${i + 1}`, entradas, saidas };
  });
}

export const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtPct = (v: number) => v.toFixed(1) + "%";
