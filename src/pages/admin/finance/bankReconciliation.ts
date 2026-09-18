import * as XLSX from "xlsx";

export type StatementDirection = "credit" | "debit";

export type StatementRow = {
  rowNumber: number;
  externalId: string | null;
  transactionDate: string;
  description: string;
  amount: number;
  direction: StatementDirection;
};

export type StatementParseResult = {
  rows: StatementRow[];
  rejected: Array<{ rowNumber: number; reason: string }>;
};

export type ReconciliationTransaction = {
  id: string;
  type: string;
  amount: number | string;
  due_date: string | null;
  paid_date: string | null;
  bank_account_id: string | null;
  description?: string | null;
};

export type MatchCandidate = {
  transaction: ReconciliationTransaction;
  score: number;
  exact: boolean;
};

const normalizeHeader = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const aliases = {
  date: ["data", "date", "datatransacao", "datacredito", "datadebito", "transactiondate", "dt"],
  description: ["descricao", "historico", "historico", "description", "memo", "detalhe", "lancamento"],
  amount: ["valor", "amount", "value", "quantia", "montante"],
  credit: ["credito", "credit", "entrada", "receita"],
  debit: ["debito", "debit", "saida", "despesa"],
  externalId: ["id", "identificador", "documento", "document", "ndocumento", "numtransacao", "transactionid", "fitid"],
};

const findValue = (row: Record<string, unknown>, keys: string[]) => {
  const entries = Object.entries(row);
  const entry = entries.find(([key]) => keys.includes(normalizeHeader(key)));
  return entry?.[1];
};

export function parseBrazilianAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let text = String(value).trim().replace(/R\$|BRL/gi, "").replace(/\s/g, "");
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  text = text.replace(/[()\-+]/g, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

export function normalizeStatementDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
}

export function parseStatementRows(rows: Array<Record<string, unknown>>): StatementParseResult {
  const parsed: StatementRow[] = [];
  const rejected: StatementParseResult["rejected"] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const transactionDate = normalizeStatementDate(findValue(row, aliases.date));
    const description = String(findValue(row, aliases.description) ?? "").trim();
    const externalIdValue = findValue(row, aliases.externalId);
    const externalId = externalIdValue === undefined || externalIdValue === "" ? null : String(externalIdValue).trim();
    const credit = parseBrazilianAmount(findValue(row, aliases.credit));
    const debit = parseBrazilianAmount(findValue(row, aliases.debit));
    const rawAmount = parseBrazilianAmount(findValue(row, aliases.amount));
    const amount = credit !== null && credit !== 0
      ? credit
      : debit !== null && debit !== 0
        ? -Math.abs(debit)
        : rawAmount;
    if (!transactionDate) { rejected.push({ rowNumber, reason: "Data não reconhecida" }); return; }
    if (amount === null || amount === 0) { rejected.push({ rowNumber, reason: "Valor não reconhecido ou igual a zero" }); return; }
    parsed.push({ rowNumber, externalId, transactionDate, description, amount: Math.abs(amount), direction: amount < 0 ? "debit" : "credit" });
  });
  return { rows: parsed, rejected };
}

export async function parseStatementFile(file: File): Promise<StatementParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], rejected: [{ rowNumber: 0, reason: "Arquivo sem planilha" }] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return parseStatementRows(rows);
}

const compatibleType = (direction: StatementDirection, type: string) => direction === "credit"
  ? type === "receivable" || type === "commission_in"
  : type === "payable" || type === "commission_out";

const daysBetween = (left: string, right: string) => Math.abs(
  Math.round((new Date(`${left}T12:00:00`).getTime() - new Date(`${right}T12:00:00`).getTime()) / 86400000),
);

export function suggestMatches(
  statement: StatementRow,
  transactions: ReconciliationTransaction[],
  bankAccountId: string,
): MatchCandidate[] {
  return transactions
    .filter(transaction => compatibleType(statement.direction, transaction.type))
    .map(transaction => {
      const amountMatches = Math.abs(Number(transaction.amount) - statement.amount) <= 0.01;
      if (!amountMatches) return null;
      const paidDate = transaction.paid_date;
      const dueDate = transaction.due_date;
      const exactPaidDate = paidDate === statement.transactionDate;
      const exactDueDate = dueDate === statement.transactionDate;
      const nearDate = [paidDate, dueDate].some(date => date ? daysBetween(date, statement.transactionDate) <= 3 : false);
      const accountMatches = transaction.bank_account_id === bankAccountId;
      const textMatches = statement.description && transaction.description &&
        statement.description.toLowerCase().split(/\s+/).some(word => word.length > 3 && transaction.description!.toLowerCase().includes(word));
      const score = 50 + (exactPaidDate ? 35 : exactDueDate ? 25 : nearDate ? 10 : 0) + (accountMatches ? 10 : 0) + (textMatches ? 5 : 0);
      return { transaction, score, exact: exactPaidDate && accountMatches };
    })
    .filter((candidate): candidate is MatchCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score || a.transaction.id.localeCompare(b.transaction.id));
}
