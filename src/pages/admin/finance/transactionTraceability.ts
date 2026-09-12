export type Traceability = {
  proposal_id: string;
  supplier_id: string;
  invoice_number: string;
  competence_date: string;
};
export type TraceabilityRecord = Partial<Record<keyof Traceability, string | null>>;
export type ProposalOption = { id: string; code?: string | null; title: string };
export type SupplierOption = { id: string; name: string; is_active?: boolean };

/** Missing historical data remains empty; competence is never inferred from due/payment dates. */
export function readTraceability(record: TraceabilityRecord = {}): Traceability {
  return {
    proposal_id: record.proposal_id ?? "",
    supplier_id: record.supplier_id ?? "",
    invoice_number: record.invoice_number ?? "",
    competence_date: record.competence_date ?? "",
  };
}

export function traceabilityPayload(form: Traceability) {
  return {
    proposal_id: form.proposal_id || null,
    supplier_id: form.supplier_id || null,
    invoice_number: form.invoice_number.trim() || null,
    competence_date: form.competence_date || null,
  };
}

export function proposalLabel(id: string | null | undefined, proposals: ProposalOption[]) {
  const proposal = proposals.find(p => p.id === id);
  return proposal ? [proposal.code, proposal.title].filter(Boolean).join(" — ") : (id || "");
}

export function supplierLabel(id: string | null | undefined, suppliers: SupplierOption[]) {
  return suppliers.find(s => s.id === id)?.name || id || "";
}

export function traceabilityExport(record: TraceabilityRecord, proposals: ProposalOption[], suppliers: SupplierOption[] = []) {
  return {
    "ID da proposta": record.proposal_id || "",
    "Proposta / grupo": proposalLabel(record.proposal_id, proposals),
    "ID do fornecedor": record.supplier_id || "",
    Fornecedor: supplierLabel(record.supplier_id, suppliers),
    "Número da NF": record.invoice_number || "",
    "Data de competência": record.competence_date || "",
  };
}
