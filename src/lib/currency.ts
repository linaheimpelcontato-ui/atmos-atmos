// Display only: keep numeric amounts unchanged in calculations and database payloads.
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  return brl.format(value);
}

// Decimal-point input remains supported; a comma explicitly selects Brazilian notation.
// Validate the whole input so parseFloat never silently truncates "1.470,00" to 1.47.
export function parseAmountInput(text: string): number | null {
  const input = text.trim().replace(/^R\$\s*/, "");
  if (!input) return 0;
  const brazilian = /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d*$/;
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!(input.includes(",") ? brazilian : decimal).test(input)) return null;
  const value = Number(input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input);
  return Number.isFinite(value) ? value : null;
}
