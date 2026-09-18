import { describe, expect, it } from "vitest";
import { parseBrazilianAmount, parseStatementRows, suggestMatches } from "./bankReconciliation";

describe("bank reconciliation import", () => {
  it("reads Brazilian amounts and debit/credit columns", () => {
    expect(parseBrazilianAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseBrazilianAmount("(20,10)")).toBe(-20.1);
    expect(parseStatementRows([
      { Data: "13/09/2026", Histórico: "Recebimento ATM", Crédito: "1.234,56", ID: "abc" },
      { Data: "14/09/2026", Histórico: "Pix fornecedor", Débito: "20,10", ID: "def" },
      { Data: "não é data", Histórico: "Inválido", Valor: "10" },
    ])).toEqual({
      rows: [
        { rowNumber: 2, externalId: "abc", transactionDate: "2026-09-13", description: "Recebimento ATM", amount: 1234.56, direction: "credit" },
        { rowNumber: 3, externalId: "def", transactionDate: "2026-09-14", description: "Pix fornecedor", amount: 20.1, direction: "debit" },
      ],
      rejected: [{ rowNumber: 4, reason: "Data não reconhecida" }],
    });
  });

  it("suggests only compatible types with equal amount and ranks exact paid date/account first", () => {
    const candidates = suggestMatches({
      rowNumber: 2, externalId: null, transactionDate: "2026-09-13", description: "Recebimento ATM", amount: 100, direction: "credit",
    }, [
      { id: "late", type: "receivable", amount: 100, due_date: "2026-09-13", paid_date: null, bank_account_id: "other", description: "Recebimento" },
      { id: "exact", type: "receivable", amount: 100, due_date: "2026-09-10", paid_date: "2026-09-13", bank_account_id: "bank", description: "Recebimento ATM" },
      { id: "wrong-type", type: "payable", amount: 100, due_date: "2026-09-13", paid_date: null, bank_account_id: "bank" },
    ], "bank");
    expect(candidates.map(candidate => candidate.transaction.id)).toEqual(["exact", "late"]);
    expect(candidates[0]).toMatchObject({ score: 100, exact: true });
  });
});
