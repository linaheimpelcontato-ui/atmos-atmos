import { describe, expect, it } from "vitest";
import { calcActualCashFlow, calcProposalClusters, calcTransactionDre } from "./financeReporting";

const tx = (patch: Record<string, unknown> = {}) => ({
  type: "receivable",
  amount: 0,
  status: "pending",
  due_date: "2026-09-10",
  paid_date: null,
  competence_date: "2026-09-10",
  proposal_id: null,
  ...patch,
});

describe("finance transaction reports", () => {
  const transactions = [
    tx({ type: "receivable", amount: 100, proposal_id: "p1" }),
    tx({ type: "payable", amount: 30, proposal_id: "p1", due_date: "2026-09-11", competence_date: "2026-09-11" }),
    tx({ type: "commission_out", amount: 10, status: "paid", proposal_id: "p1", due_date: "2026-09-12", competence_date: "2026-09-12", paid_date: "2026-09-13" }),
    tx({ type: "receivable", amount: 50, status: "paid", proposal_id: "p2", due_date: "2026-09-13", competence_date: null, paid_date: "2026-09-14" }),
    tx({ type: "payable", amount: 999, status: "cancelled", proposal_id: "p1" }),
    tx({ type: "transfer", amount: 999, proposal_id: "p1" }),
  ];

  it("makes the selected date basis explicit and does not silently substitute dates", () => {
    expect(calcTransactionDre(transactions, "2026-09-01", "2026-09-30", "competence"))
      .toMatchObject({ revenue: 100, costs: 30, commissions: 10, profit: 60, transactionCount: 3, missingDateCount: 1 });
    expect(calcTransactionDre(transactions, "2026-09-01", "2026-09-30", "due"))
      .toMatchObject({ revenue: 150, costs: 30, commissions: 10, profit: 110, transactionCount: 4, missingDateCount: 0 });
  });

  it("uses only paid_date and paid status for actual cash", () => {
    expect(calcTransactionDre(transactions, "2026-09-01", "2026-09-30", "cash"))
      .toMatchObject({ revenue: 50, costs: 0, commissions: 10, profit: 40, transactionCount: 2 });
    expect(calcActualCashFlow(transactions, "2026-09-01", "2026-09-30"))
      .toEqual([{ month: "set/26", entradas: 50, saidas: 10, saldo: 40 }]);
  });

  it("clusters incoming and outgoing transactions by proposal and keeps unlinked rows visible", () => {
    const clusters = calcProposalClusters(transactions, [
      { id: "p1", code: "ATM-001", title: "Chapada" },
      { id: "p2", code: null, title: "Better aos 50" },
    ], "2026-09-01", "2026-09-30", "due");
    expect(clusters).toEqual([
      expect.objectContaining({ proposalId: "p1", label: "ATM-001", entradas: 100, saidas: 40, saldo: 60, transactionCount: 3 }),
      expect.objectContaining({ proposalId: "p2", label: "Better aos 50", entradas: 50, saidas: 0, saldo: 50, transactionCount: 1 }),
    ]);
  });
});
