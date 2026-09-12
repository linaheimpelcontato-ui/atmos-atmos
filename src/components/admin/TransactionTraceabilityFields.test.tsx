import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TransactionTraceabilityFields from "./TransactionTraceabilityFields";
import { readTraceability } from "@/pages/admin/finance/transactionTraceability";

afterEach(cleanup);
describe("transaction traceability form", () => {
  it("loads stored document data and emits explicit changes/clears", () => {
    const onChange = vi.fn();
    render(<TransactionTraceabilityFields value={readTraceability({ invoice_number: "00001", competence_date: "2026-08-31" })} onChange={onChange} proposals={[]} suppliers={[]} />);
    expect(screen.getByLabelText("Número da NF")).toHaveValue("00001");
    expect(screen.getByLabelText("Data de competência")).toHaveValue("2026-08-31");
    expect(screen.getByLabelText("Fornecedor")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Número da NF"), { target: { value: "00002" } });
    expect(onChange).toHaveBeenLastCalledWith({ invoice_number: "00002" });
    fireEvent.change(screen.getByLabelText("Data de competência"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({ competence_date: "" });
  });
  it("shows the proposal relationship and leaves document fields blank on a new receipt", () => {
    render(<TransactionTraceabilityFields value={readTraceability()} onChange={() => {}} proposals={[]} />);
    expect(screen.getByLabelText("Proposta / grupo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fornecedor")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Número da NF")).toHaveValue("");
    expect(screen.getByLabelText("Data de competência")).toHaveValue("");
  });
});
