import type { Proposal, DayItem, ProposalCost, Guide, Product } from "./useFinanceData";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ---- Per-proposal profit using the same formula as ProposalFormDialog ---- */
export function calcProposalProfit(
  p: Proposal, items: DayItem[], costs: ProposalCost[]
) {
  const pItems = items.filter(i => i.proposal_id === p.id);

  // Guide profit: (value - cost) for guide items
  const guideProfit = pItems
    .filter(i => i.category === "Diária Guia ATMOS" || i.category === "Guia")
    .reduce((s, i) => s + (Number(i.value) - Number(i.cost_price)) * (i.quantity || 1), 0);

  // Markup profit: (value - cost) for non-guide, non-waterfall items
  const markupProfit = pItems
    .filter(i => i.category !== "Diária Guia ATMOS" && i.category !== "Guia" && i.category !== "Cachoeira / Ingresso" && Number(i.cost_price) > 0)
    .reduce((s, i) => s + (Number(i.value) - Number(i.cost_price)) * (i.quantity || 1), 0);

  // Commission profit: cost * commission% for non-guide, non-waterfall
  const commissionProfit = pItems
    .filter(i => i.category !== "Diária Guia ATMOS" && i.category !== "Guia" && i.category !== "Cachoeira / Ingresso" && Number(i.commission_percent) > 0)
    .reduce((s, i) => s + Number(i.cost_price) * (i.quantity || 1) * Number(i.commission_percent) / 100, 0);

  // ATMOS service revenue
  const atmos = p.atmos_service || {};
  const atmosRevenue = Number(atmos.price_per_person_day || 0) * Number(p.num_people || 1) * Number(p.num_days || 1);
  const atmosInternalCosts = (atmos.internal_costs || []).reduce((s: number, ic: any) => s + Number(ic.amount || 0), 0);

  // Direct costs from proposal_costs
  const directCosts = costs.filter(c => c.proposal_id === p.id).reduce((s, c) => s + Number(c.amount), 0);

  const profit = guideProfit + markupProfit + commissionProfit + atmosRevenue - atmosInternalCosts - directCosts;
  const revenue = Number(p.total);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, profit, margin, guideProfit, markupProfit, commissionProfit, atmosRevenue, atmosInternalCosts, directCosts };
}

export function getProposalCost(p: Proposal, costs: ProposalCost[], items?: DayItem[]) {
  if (items) {
    const pf = calcProposalProfit(p, items, costs);
    return pf.revenue - pf.profit; // effective cost = revenue - profit
  }
  const directCosts = costs.filter(c => c.proposal_id === p.id).reduce((s, c) => s + Number(c.amount), 0);
  const atmos = p.atmos_service || {};
  const internalCosts = (atmos.internal_costs || []).reduce((s: number, ic: any) => s + Number(ic.amount || 0), 0);
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
  const accepted = inRange.filter(p => p.status === "accepted");
  const rejected = inRange.filter(p => p.status === "rejected");
  const acceptedIds = new Set(accepted.map(p => p.id));
  const filteredItems = dayItems.filter(i => acceptedIds.has(i.proposal_id));
  return { accepted, rejected, all: inRange, dayItems: filteredItems, costs };
}

export function calcOverviewKPIs(fd: FilteredData, costs: ProposalCost[]) {
  let totalRevenue = 0, totalProfit = 0;
  for (const p of fd.accepted) {
    const pf = calcProposalProfit(p, fd.dayItems, costs);
    totalRevenue += pf.revenue;
    totalProfit += pf.profit;
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
  return { revenue: totalRevenue, totalCost, profit: totalProfit, margin, roi, clients, avgTicket, ticketB2C, ticketB2B, cancelRate };
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
      return p.status === "accepted";
    });
    let rev = 0, profit = 0;
    for (const p of mp) {
      const pf = calcProposalProfit(p, dayItems, costs);
      rev += pf.revenue;
      profit += pf.profit;
    }
    return {
      name: format(m, "MMM/yy", { locale: ptBR }),
      receita: rev,
      custos: rev - profit,
      lucro: profit,
      clientes: mp.length,
    };
  });
}

export function calcGuideRanking(
  fd: FilteredData, guides: Guide[], costs: ProposalCost[]
) {
  const guideMap = new Map<string, { name: string; revenue: number; cost: number; count: number; proposalIds: Set<string> }>();

  for (const item of fd.dayItems) {
    if (item.category !== "Guia" || !item.catalog_item_id) continue;
    const guide = guides.find(g => g.id === item.catalog_item_id);
    if (!guide) continue;
    const existing = guideMap.get(guide.id) || { name: guide.name, revenue: 0, cost: 0, count: 0, proposalIds: new Set<string>() };
    existing.revenue += Number(item.value);
    existing.proposalIds.add(item.proposal_id);
    guideMap.set(guide.id, existing);
  }

  // Calculate guide-specific costs from proposal_day_items value as cost proxy
  // The "value" in day items for guides IS the cost to the company
  const result = Array.from(guideMap.entries()).map(([id, g]) => {
    const proposalRevenues = fd.accepted
      .filter(p => g.proposalIds.has(p.id))
      .reduce((s, p) => s + Number(p.total), 0);
    const count = g.proposalIds.size;
    const avgTicket = count > 0 ? proposalRevenues / count : 0;
    const profit = proposalRevenues - g.revenue; // revenue to company minus guide cost
    const margin = proposalRevenues > 0 ? (profit / proposalRevenues) * 100 : 0;
    const roiVal = g.revenue > 0 ? (profit / g.revenue) * 100 : 0;
    return {
      id, name: g.name, proposals: count, revenue: proposalRevenues,
      guideCost: g.revenue, profit, margin, roi: roiVal, avgTicket,
    };
  });

  return result.sort((a, b) => b.revenue - a.revenue);
}

export function calcCategoryBreakdown(fd: FilteredData) {
  const catMap = new Map<string, { revenue: number; count: number }>();
  const totalRevenue = fd.dayItems.reduce((s, i) => s + Number(i.value), 0);

  for (const item of fd.dayItems) {
    const cat = item.category || "Outros";
    const existing = catMap.get(cat) || { revenue: 0, count: 0 };
    existing.revenue += Number(item.value);
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
    existing.revenue += Number(item.value);
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

export function calcCashForecast(transactions: any[]) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weeks: { name: string; entradas: number; saidas: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const ws = format(addDays(startOfWeek(now, { weekStartsOn: 1 }), i * 7), "yyyy-MM-dd");
    const we = format(addDays(startOfWeek(now, { weekStartsOn: 1 }), i * 7 + 6), "yyyy-MM-dd");
    const weekIn = transactions.filter((t: any) => (t.type === "receivable" || t.type === "commission_in") && t.status === "pending" && t.due_date >= ws && t.due_date <= we).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const weekOut = transactions.filter((t: any) => (t.type === "payable" || t.type === "commission_out") && t.status === "pending" && t.due_date >= ws && t.due_date <= we).reduce((s: number, t: any) => s + Number(t.amount), 0);
    weeks.push({ name: `Sem ${i + 1}`, entradas: weekIn, saidas: weekOut });
  }
  return weeks;
}

export const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtPct = (v: number) => v.toFixed(1) + "%";
