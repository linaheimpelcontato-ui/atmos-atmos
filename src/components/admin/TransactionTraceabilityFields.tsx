import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { proposalLabel, type ProposalOption, type SupplierOption, type Traceability } from "@/pages/admin/finance/transactionTraceability";

type Props = {
  value: Traceability;
  onChange: (patch: Partial<Traceability>) => void;
  proposals: ProposalOption[];
  suppliers?: SupplierOption[];
};

export default function TransactionTraceabilityFields({ value, onChange, proposals, suppliers }: Props) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-admin-border/60 p-4">
      <legend className="px-1 font-bold text-admin-primary">Vínculos e documento</legend>
      <div className="space-y-2">
        <Label htmlFor="transaction-proposal">Proposta / grupo</Label>
        <Select value={value.proposal_id || "none"} onValueChange={id => onChange({ proposal_id: id === "none" ? "" : id })}>
          <SelectTrigger id="transaction-proposal"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem vínculo</SelectItem>
            {value.proposal_id && !proposals.some(p => p.id === value.proposal_id) && <SelectItem value={value.proposal_id}>Proposta indisponível ({value.proposal_id})</SelectItem>}
            {proposals.map(p => <SelectItem key={p.id} value={p.id}>{proposalLabel(p.id, proposals)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {suppliers && <div className="space-y-2">
        <Label htmlFor="transaction-supplier">Fornecedor</Label>
        <Select value={value.supplier_id || "none"} onValueChange={id => onChange({ supplier_id: id === "none" ? "" : id })}>
          <SelectTrigger id="transaction-supplier"><SelectValue placeholder="Não informado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não informado</SelectItem>
            {value.supplier_id && !suppliers.some(s => s.id === value.supplier_id) && <SelectItem value={value.supplier_id}>Fornecedor indisponível ({value.supplier_id})</SelectItem>}
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_active === false ? " (inativo)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transaction-invoice">Número da NF</Label>
          <Input id="transaction-invoice" value={value.invoice_number} onChange={e => onChange({ invoice_number: e.target.value })} placeholder="Não informado" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transaction-competence">Data de competência</Label>
          <Input id="transaction-competence" type="date" value={value.competence_date} onChange={e => onChange({ competence_date: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Preencha conforme o documento e a referência do lançamento. Campos não informados permanecem vazios.</p>
    </fieldset>
  );
}
