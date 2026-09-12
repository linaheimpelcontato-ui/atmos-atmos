export type BundleCommission = { source_key: string; amount: number; description: string; due_date: string };
export type CommissionAccommodation = { id: string; is_selected: boolean; payment_type: string };
export type BundleResult = {
  id: string;
  legacy_commissions: boolean;
  /** IDs correspond to the input array order; they contain no supplier or pricing data. */
  child_ids: { items: string[]; costs: string[]; days: string[]; accommodations: string[] };
};

const sourcePattern = /^accommodation:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Absent leaves the persisted setting untouched; false is an intentional value. */
export function requestedPriceBreakdown(proposal: Record<string, unknown>): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(proposal, "show_price_breakdown")) return undefined;
  if (typeof proposal.show_price_breakdown !== "boolean") throw new Error("show_price_breakdown deve ser booleano.");
  return proposal.show_price_breakdown;
}

/** Local feedback only: the RPC repeats these checks before any writes. */
export function validateBundleCommissions(value: unknown, accommodations: CommissionAccommodation[]): asserts value is BundleCommission[] {
  if (!Array.isArray(value)) throw new Error("A lista de comissões é obrigatória.");
  const sources = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Comissão inválida.");
    const { source_key, amount, description, due_date } = entry;
    if (typeof source_key !== "string" || !sourcePattern.test(source_key)) throw new Error("Origem da comissão inválida.");
    if (sources.has(source_key)) throw new Error("Origem de comissão duplicada.");
    sources.add(source_key);
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) throw new Error("Valor da comissão deve ser positivo e informado.");
    if (typeof description !== "string" || !description.trim()) throw new Error("Descrição da comissão é obrigatória.");
    if (typeof due_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due_date) ||
      !Number.isFinite(Date.parse(due_date)) || new Date(due_date).toISOString().slice(0, 10) !== due_date) {
      throw new Error("Vencimento da comissão inválido.");
    }
    const accommodation = accommodations.find(a => a.id === source_key.slice("accommodation:".length));
    if (!accommodation?.is_selected || accommodation.payment_type !== "hospedagem") throw new Error("Comissão sem hospedagem selecionada com pagamento direto ao fornecedor.");
  }
}
