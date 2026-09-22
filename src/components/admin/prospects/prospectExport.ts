import { isValid, parseISO, format } from "date-fns";
import * as XLSX from "xlsx";
import type { ColumnDef, ColumnKey } from "./shared";

type ExportColumn = Pick<ColumnDef, "key" | "label" | "labelMap" | "valueExtractor">;
type ExportValue = string | number | boolean | Date;
type Stage = { id: string; name: string };

const DATE_FORMATS: Partial<Record<ColumnKey, string>> = {
  created_at: "dd/mm/yyyy",
  birth_date: "dd/mm/yyyy",
  last_interaction: "dd/mm/yyyy hh:mm",
  next_followup_at: "dd/mm/yyyy hh:mm",
};
const MIN_WIDTHS: Partial<Record<ColumnKey, number>> = {
  name: 32, company_name: 32, stage_id: 24, tags: 22, phone: 22,
  seller_name: 24, city: 26, country: 18,
};

function exportValue(row: Record<string, unknown>, col: ExportColumn, stages: Map<string, string>): ExportValue {
  const value = col.valueExtractor ? col.valueExtractor(row) : row[col.key];
  if (col.key === "stage_id") {
    return value ? stages.get(String(value)) ?? "Etapa não encontrada" : "Sem etapa";
  }
  if (value === null || value === undefined) return "";
  if (col.key === "segment") return String(value).toUpperCase();
  if (col.labelMap) return col.labelMap[String(value)] ?? String(value);
  if (DATE_FORMATS[col.key] && value) {
    // parseISO keeps date-only birthdays on the same calendar day, unlike
    // new Date('YYYY-MM-DD'), which can shift them in negative UTC offsets.
    const date = value instanceof Date ? value : parseISO(String(value));
    return isValid(date) ? date : String(value);
  }
  // Identifiers stay text: Excel must not remove a leading zero or treat a
  // phone starting with '+' as a calculation. aoa_to_sheet writes strings, not formulas.
  if (col.key === "phone") return String(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** The caller supplies the already filtered rows and the visible column order. */
export function buildProspectWorkbook(
  rows: Record<string, unknown>[], columns: ExportColumn[], stages: Stage[],
): XLSX.WorkBook {
  if (!columns.length) throw new Error("Selecione pelo menos uma coluna para exportar.");
  const stageNames = new Map(stages.map(stage => [stage.id, stage.name]));
  const data = rows.map(row => columns.map(col => exportValue(row, col, stageNames)));
  const ws = XLSX.utils.aoa_to_sheet([columns.map(col => col.label), ...data], { dateNF: "dd/mm/yyyy" });

  columns.forEach((col, c) => {
    for (let r = 1; r <= data.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      if (data[r - 1][c] instanceof Date) cell.z = DATE_FORMATS[col.key];
      else if (col.key === "_proposal_total" && cell.t === "n") cell.z = '"R$" #,##0.00';
      else if (col.key === "_proposal_count" && cell.t === "n") cell.z = "0";
      else if (col.key === "phone") cell.z = "@";
      delete cell.w; // Recompute display text after assigning the number format.
    }
  });

  ws["!cols"] = columns.map((col, c) => {
    let width = Math.max(MIN_WIDTHS[col.key] ?? 12, col.label.length + 4);
    for (let r = 1; r <= data.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) width = Math.max(width, XLSX.utils.format_cell(cell).length + 3);
    }
    return { wch: Math.min(255, width) };
  });
  ws["!autofilter"] = { ref: ws["!ref"]! };
  ws["!rows"] = [{ hpt: 24 }, ...data.map(() => ({ hpt: 20 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  wb.Props = { Title: "Clientes Atmos", Subject: "Clientes conforme filtros e colunas selecionados" };
  return wb;
}

// The export now contains typed Excel dates. Keep the existing import compatible
// with both that representation and older ISO date strings.
export function importedBirthDate(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return isValid(value) ? format(value, "yyyy-MM-dd") : undefined;
  return String(value);
}
