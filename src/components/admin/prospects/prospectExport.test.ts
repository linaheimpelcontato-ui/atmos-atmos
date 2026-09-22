import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { ALL_COLUMNS } from "./shared";
import { buildProspectWorkbook, importedBirthDate } from "./prospectExport";

const stageId = "00e66ca1-588f-41be-b851-9858ad1a7e52";
const stages = [{ id: stageId, name: "Aguardando Orçamento" }];
const row = {
  name: "Cliente de teste com nome completo e acentuação",
  company_name: "Agência de Viagens de Alto Paraíso", segment: "b2b",
  created_at: "2026-09-22T15:30:00Z", source: "manual", tags: ["imersão", "retorno"], stage_id: stageId,
  birth_date: "1990-01-01", next_followup_at: "2026-09-23T15:30:00Z",
  phone: "+55011999990000", _proposal_total: 1234.56, _proposal_count: 0,
  potential: "high", priority: "medium", sellers: { name: "João" },
};
const columns = (...keys: string[]) => keys.map(key => ALL_COLUMNS.find(c => c.key === key)!);
function roundTrip(wb: XLSX.WorkBook, cellDates = false) {
  return XLSX.read(XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true }), {
    type: "array", cellStyles: true, cellNF: true, cellDates,
  }).Sheets.Clientes;
}

describe("client Excel export", () => {
  it("uses stage names and labels instead of internal codes in the saved XLSX", () => {
    const ws = roundTrip(buildProspectWorkbook([row], columns("segment", "source", "stage_id", "potential", "priority", "tags", "seller_name"), stages));
    expect(XLSX.utils.sheet_to_json(ws, { header: 1 })[1]).toEqual([
      "B2B", "Manual", "Aguardando Orçamento", "Alto", "Média", "imersão, retorno", "João",
    ]);
  });

  it("persists readable widths, filters and the chosen column order", () => {
    const ws = roundTrip(buildProspectWorkbook([row], columns("name", "company_name", "stage_id"), stages));
    expect(XLSX.utils.sheet_to_json(ws, { header: 1 })[0]).toEqual(["Nome", "Empresa", "Etapa"]);
    expect(ws["!cols"]?.[0].wch).toBeGreaterThanOrEqual(row.name.length);
    expect(ws["!cols"]?.[1].wch).toBeGreaterThanOrEqual(row.company_name.length);
    expect(ws["!autofilter"]?.ref).toBe("A1:C2");
    expect(ws["!ref"]).toBe("A1:C2");
  });

  it("keeps dates and money typed and identifiers literal across write/read", () => {
    const ws = roundTrip(buildProspectWorkbook([row], columns("birth_date", "next_followup_at", "_proposal_total", "_proposal_count", "phone"), stages));
    expect(ws.A2.t).toBe("n");
    expect(XLSX.utils.format_cell(ws.A2)).toBe("01/01/1990");
    expect(ws.B2.z).toBe("dd/mm/yyyy hh:mm");
    expect(ws.C2).toMatchObject({ t: "n", v: 1234.56, z: '"R$" #,##0.00' });
    expect(ws.D2).toMatchObject({ t: "n", v: 0 });
    expect(ws.E2).toMatchObject({ t: "s", v: row.phone });
    expect(ws.E2.f).toBeUndefined();
  });

  it("handles empty results, absent stages and invalid dates without exporting UUIDs or invented dates", () => {
    const cols = columns("stage_id", "created_at");
    const empty = roundTrip(buildProspectWorkbook([], cols, stages));
    expect(XLSX.utils.sheet_to_json(empty, { header: 1 })).toEqual([["Etapa", "Entrada"]]);
    const ws = roundTrip(buildProspectWorkbook([{ stage_id: null }, { stage_id: "unknown", created_at: "data inválida" }], cols, stages));
    expect(ws.A2.v).toBe("Sem etapa");
    expect(ws.A3.v).toBe("Etapa não encontrada");
    expect(ws.B3.v).toBe("data inválida");
    expect(() => buildProspectWorkbook([], [], [])).toThrow("Selecione pelo menos uma coluna");
  });

  it("does not reinterpret user text as formulas or change the supplied subset", () => {
    const ws = roundTrip(buildProspectWorkbook([{ name: '=HYPERLINK("https://example.invalid")', phone: "0012345" }], columns("name", "phone"), []));
    expect(ws.A2.t).toBe("s");
    expect(ws.A2.f).toBeUndefined();
    expect(ws.B2.v).toBe("0012345");
    expect(ws["!ref"]).toBe("A1:B2");
  });

  it("allows exported birthday dates to be imported without shifting the day", () => {
    const ws = roundTrip(buildProspectWorkbook([row], columns("birth_date"), []), true);
    const imported = XLSX.utils.sheet_to_json<{ Nascimento: Date }>(ws)[0];
    expect(importedBirthDate(imported.Nascimento)).toBe("1990-01-01");
    expect(importedBirthDate("1990-01-01")).toBe("1990-01-01");
    expect(importedBirthDate(null)).toBeUndefined();
  });
});
