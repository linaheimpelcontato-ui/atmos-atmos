import { moneySum } from "@/lib/proposalCalcs";
import { eachMonthOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export type FinanceReportBasis = "competence" | "due" | "cash";

export const REPORT_BASIS_LABELS: Record<FinanceReportBasis, string> = {
  competence: "Competência",
  due: "Vencimento",
  cash: "Caixa",
};

export type FinanceReportTransaction = {
  id?: string;
  type?: string | null;
  amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  competence_date?: string | null;
  proposal_id?: string | null;
  account_id?: string | null;
  supplier_id?: string | null;
  invoice_number?: string | null;
};

export type ProposalDirectoryEntry = {
  id: string;
  code?: string | null;
  title?: string | null;
};

const INCOME_TYPES = new Set(["receivable", "commission_in"]);
const OUTCOME_TYPES = new Set(["payable", "commission_out"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
};

const normalizeDate = (value: unknown) => isIsoDate(value) ? value.slice(0, 10) : null;

const amountOf = (transaction: FinanceReportTransaction) => {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? amount : null;
};

export const isReportTransactionType = (type: unknown): type is string =>
  typeof type === "string" && (INCOME_TYPES.has(type) || OUTCOME_TYPES.has(type));

export const isCancelledTransaction = (transaction: FinanceReportTransaction) =>
  CANCELLED_STATUSES.has(String(transaction.status || "").toLowerCase());

export function transactionReportDate(
  transaction: FinanceReportTransaction,
  basis: FinanceReportBasis,
): string | null {
  if (basis === "competence") return normalizeDate(transaction.competence_date);
  if (basis === "cash") return normalizeDate(transaction.paid_date);
  return normalizeDate(transaction.due_date);
}

export function selectTransactionsForReport(
  transactions: FinanceReportTransaction[],
  dateFrom: string,
  dateTo: string,
  basis: FinanceReportBasis,
): FinanceReportTransaction[] {
  return transactions.filter(transaction => {
    if (isCancelledTransaction(transaction) || !isReportTransactionType(transaction.type)) return false;
    if (basis === "cash" && transaction.status !== "paid") return false;
    if (amountOf(transaction) === null) return false;
    const date = transactionReportDate(transaction, basis);
    return date !== null && date >= dateFrom && date <= dateTo;
  });
}

const monthBuckets = (dateFrom: string, dateTo: string) => {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  if (dateFrom > dateTo || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  return eachMonthOfInterval({ start: from, end: to });
};

export function calcTransactionDre(
  transactions: FinanceReportTransaction[],
  dateFrom: string,
  dateTo: string,
  basis: FinanceReportBasis = "competence",
) {
  const selected = selectTransactionsForReport(transactions, dateFrom, dateTo, basis);
  const revenue = moneySum(...selected
    .filter(transaction => INCOME_TYPES.has(transaction.type || ""))
    .map(transaction => amountOf(transaction) as number));
  const costs = moneySum(...selected
    .filter(transaction => transaction.type === "payable")
    .map(transaction => amountOf(transaction) as number));
  const commissions = moneySum(...selected
    .filter(transaction => transaction.type === "commission_out")
    .map(transaction => amountOf(transaction) as number));
  const profit = moneySum(revenue, -costs, -commissions);
  const missingDateCount = transactions.filter(transaction =>
    !isCancelledTransaction(transaction) &&
    isReportTransactionType(transaction.type) &&
    transactionReportDate(transaction, basis) === null,
  ).length;
  const invalidAmountCount = transactions.filter(transaction =>
    !isCancelledTransaction(transaction) &&
    isReportTransactionType(transaction.type) &&
    amountOf(transaction) === null,
  ).length;

  return {
    revenue,
    costs,
    commissions,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    transactionCount: selected.length,
    missingDateCount,
    invalidAmountCount,
  };
}

/** Actual cash: a transaction only enters the chart after it is marked paid
 * and uses paid_date, never due_date as a substitute. */
export function calcActualCashFlow(
  transactions: FinanceReportTransaction[],
  dateFrom: string,
  dateTo: string,
) {
  const selected = selectTransactionsForReport(transactions, dateFrom, dateTo, "cash");
  return monthBuckets(dateFrom, dateTo).map(month => {
    const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTransactions = selected.filter(transaction => {
      const date = transactionReportDate(transaction, "cash");
      return date !== null && date >= monthStart && date <= monthEnd;
    });
    const entradas = moneySum(...monthTransactions
      .filter(transaction => INCOME_TYPES.has(transaction.type || ""))
      .map(transaction => amountOf(transaction) as number));
    const saidas = moneySum(...monthTransactions
      .filter(transaction => OUTCOME_TYPES.has(transaction.type || ""))
      .map(transaction => amountOf(transaction) as number));
    return {
      month: format(month, "MMM/yy", { locale: ptBR }),
      entradas,
      saidas,
      saldo: moneySum(entradas, -saidas),
    };
  });
}

export function calcProposalClusters(
  transactions: FinanceReportTransaction[],
  proposals: ProposalDirectoryEntry[],
  dateFrom: string,
  dateTo: string,
  basis: FinanceReportBasis = "competence",
) {
  const directory = new Map(proposals.map(proposal => [proposal.id, proposal]));
  const clusters = new Map<string, {
    proposalId: string | null;
    label: string;
    entradas: number;
    saidas: number;
    transactionCount: number;
    pending: number;
    paid: number;
  }>();

  for (const transaction of selectTransactionsForReport(transactions, dateFrom, dateTo, basis)) {
    const proposalId = transaction.proposal_id || null;
    const key = proposalId || "__unlinked__";
    const proposal = proposalId ? directory.get(proposalId) : undefined;
    const label = proposal
      ? proposal.code || proposal.title || proposal.id
      : proposalId
        ? `Proposta ${proposalId.slice(0, 8)}`
        : "Sem proposta / grupo";
    const current = clusters.get(key) || {
      proposalId,
      label,
      entradas: 0,
      saidas: 0,
      transactionCount: 0,
      pending: 0,
      paid: 0,
    };
    const amount = amountOf(transaction) as number;
    if (INCOME_TYPES.has(transaction.type || "")) current.entradas = moneySum(current.entradas, amount);
    if (OUTCOME_TYPES.has(transaction.type || "")) current.saidas = moneySum(current.saidas, amount);
    if (transaction.status === "pending" || transaction.status === "overdue") current.pending = moneySum(current.pending, amount);
    if (transaction.status === "paid") current.paid = moneySum(current.paid, amount);
    current.transactionCount += 1;
    clusters.set(key, current);
  }

  return Array.from(clusters.values())
    .map(cluster => ({ ...cluster, saldo: moneySum(cluster.entradas, -cluster.saidas) }))
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo) || a.label.localeCompare(b.label));
}
