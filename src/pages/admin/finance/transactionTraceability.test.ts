import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readTraceability, traceabilityPayload, traceabilityExport } from "./transactionTraceability";

const proposals = [{ id: "p1", code: "ATMOS-0010", title: "Grupo Setembro" }];
const suppliers = [{ id: "s1", name: "Fornecedor histórico", is_active: false }];

describe("manual financial transaction traceability", () => {
  it("creates fields without deriving competence or invoice data", () => {
    expect(traceabilityPayload(readTraceability())).toEqual({ proposal_id: null, supplier_id: null, invoice_number: null, competence_date: null });
  });
  it("preserves an outgoing transaction through save, reload and edit", () => {
    const input = { ...readTraceability(), proposal_id: "p1", supplier_id: "s1", invoice_number: "000045-A", competence_date: "2026-08-31" };
    const saved = traceabilityPayload(input);
    const reloaded = readTraceability(JSON.parse(JSON.stringify(saved)));
    expect(reloaded).toEqual(input);
    expect(traceabilityPayload({ ...reloaded, invoice_number: "000046-B" })).toEqual({ ...saved, invoice_number: "000046-B" });
  });
  it("can explicitly clear an existing relationship, invoice and competence", () => {
    const reloaded = readTraceability({ proposal_id: "p1", supplier_id: "s1", invoice_number: "42", competence_date: "2026-09-01" });
    expect(traceabilityPayload({ ...reloaded, proposal_id: "", supplier_id: "", invoice_number: "  ", competence_date: "" })).toEqual({ proposal_id: null, supplier_id: null, invoice_number: null, competence_date: null });
  });
  it("exports labels and identifiers without losing invoice zeroes or dates in XLSX", () => {
    const row = traceabilityExport({ proposal_id: "p1", supplier_id: "s1", invoice_number: "000045", competence_date: "2026-08-31" }, proposals, suppliers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([row]), "Despesas");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const loaded = XLSX.read(bytes, { type: "array" });
    expect(XLSX.utils.sheet_to_json(loaded.Sheets.Despesas)).toEqual([{
      "ID da proposta": "p1", "Proposta / grupo": "ATMOS-0010 — Grupo Setembro",
      "ID do fornecedor": "s1", Fornecedor: "Fornecedor histórico", "Número da NF": "000045", "Data de competência": "2026-08-31",
    }]);
  });
  it("exports unlinked legacy revenue without invented references", () => {
    expect(traceabilityExport({}, proposals)).toEqual({ "ID da proposta": "", "Proposta / grupo": "", "ID do fornecedor": "", Fornecedor: "", "Número da NF": "", "Data de competência": "" });
  });
  it("retains raw identifiers when a linked entity is unavailable", () => {
    const exported = traceabilityExport({ proposal_id: "missing-p", supplier_id: "missing-s" }, [], []);
    expect(exported["Proposta / grupo"]).toBe("missing-p");
    expect(exported.Fornecedor).toBe("missing-s");
  });
});
