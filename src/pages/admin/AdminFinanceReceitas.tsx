import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fmt } from "./finance/financeCalcs";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

const db = supabase as any;

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", cancelled: "Cancelado" };
const typeLabels: Record<string, string> = { receivable: "Receita", commission_in: "Comissão" };

export default function AdminFinanceReceitas() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [unlinkedProposals, setUnlinkedProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "receivable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"),
    paid_date: "", status: "pending", account_id: "", proposal_id: "", seller_id: "", notes: "",
  });
  const smartFilters = useSmartFilters();
  const selection = useRowSelection();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = db.from("financial_transactions").select("*")
      .in("type", ["receivable", "commission_in"])
      .gte("due_date", filterFrom).lte("due_date", filterTo)
      .order("due_date", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);

    const [{ data: txs }, { data: accs }, { data: sls }, { data: props }] = await Promise.all([
      q,
      db.from("chart_of_accounts").select("id, code, name, type").eq("is_active", true).order("code"),
      db.from("sellers").select("id, name").eq("is_active", true).order("name"),
      db.from("proposals").select("id, title, code, total, status, prospect_id").order("created_at", { ascending: false }),
    ]);
    setTransactions(txs || []);
    setAccounts(accs || []);
    setSellers(sls || []);
    setProposals(props || []);

    const linkedIds = new Set((txs || []).map((t: any) => t.proposal_id).filter(Boolean));
    setUnlinkedProposals((props || []).filter((p: any) => p.status === "accepted" && !linkedIds.has(p.id)));
    setLoading(false);
  }, [filterStatus, filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => setForm({ type: "receivable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"), paid_date: "", status: "pending", account_id: "", proposal_id: "", seller_id: "", notes: "" });
  const openNew = () => { resetForm(); setEditingId(null); setDialogOpen(true); };
  const openEdit = (tx: any) => {
    setEditingId(tx.id);
    setForm({ type: tx.type, description: tx.description, amount: tx.amount, due_date: tx.due_date, paid_date: tx.paid_date || "", status: tx.status, account_id: tx.account_id || "", proposal_id: tx.proposal_id || "", seller_id: tx.seller_id || "", notes: tx.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { type: form.type, description: form.description, amount: form.amount, due_date: form.due_date, paid_date: form.paid_date || null, status: form.status, account_id: form.account_id || null, proposal_id: form.proposal_id || null, seller_id: form.seller_id || null, notes: form.notes || null };
    const { error } = editingId ? await db.from("financial_transactions").update(payload).eq("id", editingId) : await db.from("financial_transactions").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: editingId ? "Receita atualizada" : "Receita criada" });
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => { await db.from("financial_transactions").delete().eq("id", id); fetchAll(); };
  const handleMarkPaid = async (id: string) => { await db.from("financial_transactions").update({ status: "paid", paid_date: format(new Date(), "yyyy-MM-dd") }).eq("id", id); fetchAll(); };

  const handleGenerateFromProposal = async (p: any) => {
    const { error } = await db.from("financial_transactions").insert({
      type: "receivable", description: `Proposta ${p.code || p.title}`, amount: Number(p.total),
      due_date: format(new Date(), "yyyy-MM-dd"), status: "pending", proposal_id: p.id,
    });
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: "Receita gerada", description: `Lançamento criado para ${p.code || p.title}` });
    fetchAll();
  };

  const getProposalCode = (tx: any) => {
    const prop = proposals.find((p: any) => p.id === tx.proposal_id);
    return prop?.code || "—";
  };

  const filteredTxs = smartFilters.applyFilters(transactions, {
    type: (r: any) => r.type,
    description: (r: any) => r.description,
    proposal: (r: any) => getProposalCode(r),
    status: (r: any) => r.status,
    due_date: (r: any) => r.due_date,
    amount: (r: any) => r.amount,
  });

  const totalRecebido = transactions.filter(t => t.status === "paid").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalPendente = transactions.filter(t => t.status === "pending").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalVencido = transactions.filter(t => t.status === "overdue").reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Receitas</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Receita</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalRecebido)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-lg font-bold text-yellow-600">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Vencido</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalVencido)}</p>
        </div>
      </div>

      {unlinkedProposals.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Propostas aceitas sem lançamento ({unlinkedProposals.length})</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {unlinkedProposals.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 text-sm">
                <span>{p.code || p.title} — {fmt(Number(p.total))}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleGenerateFromProposal(p)}>Gerar Receita</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Vencido</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">De</Label><DatePicker size="sm" className="w-36" value={filterFrom} onChange={setFilterFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><DatePicker size="sm" className="w-36" value={filterTo} onChange={setFilterTo} /></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader><TableRow>
            <th className="p-2 w-10">
              <Checkbox
                checked={filteredTxs.length > 0 && filteredTxs.every((t: any) => selection.isSelected(t.id))}
                onCheckedChange={() => selection.toggleAll(filteredTxs.map((t: any) => t.id))}
              />
            </th>
            <SmartTableHead label="Vencimento" sortKey="due_date" filterState={smartFilters} data={transactions} className="text-xs" />
            <SmartTableHead label="Tipo" sortKey="type" filterState={smartFilters} data={transactions} labelMap={typeLabels} className="text-xs" />
            <SmartTableHead label="Descrição" sortKey="description" filterState={smartFilters} data={transactions} className="text-xs" />
            <SmartTableHead label="Proposta" sortKey="proposal" filterState={smartFilters} data={transactions} valueExtractor={(r: any) => getProposalCode(r)} className="text-xs" />
            <SmartTableHead label="Valor" sortKey="amount" filterState={smartFilters} data={transactions} className="text-xs text-right" />
            <SmartTableHead label="Status" sortKey="status" filterState={smartFilters} data={transactions} labelMap={statusLabels} className="text-xs" />
            <TableHead className="text-xs w-28"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            : filteredTxs.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma receita encontrada</TableCell></TableRow>
            : filteredTxs.map(tx => {
              const prop = proposals.find((p: any) => p.id === tx.proposal_id);
              return (
                <TableRow key={tx.id} className={selection.isSelected(tx.id) ? "bg-primary/5" : ""}>
                  <TableCell className="w-10">
                    <Checkbox checked={selection.isSelected(tx.id)} onCheckedChange={() => selection.toggle(tx.id)} />
                  </TableCell>
                  <TableCell className="text-xs">{tx.due_date}</TableCell>
                  <TableCell className="text-xs text-green-600">{tx.type === "commission_in" ? "Comissão" : "Receita"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{prop?.code || "—"}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{fmt(Number(tx.amount))}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${statusBadge[tx.status]}`}>{statusLabels[tx.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {tx.status === "pending" && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-green-600" onClick={() => handleMarkPaid(tx.id)}>Receber</Button>}
                      <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => openEdit(tx)}><Pencil className="h-3 w-3" /></Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação excluirá permanentemente o lançamento <strong>{tx.description}</strong> de {fmt(tx.amount)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(tx.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          const ids = [...selection.selectedIds];
          await db.from("financial_transactions").delete().in("id", ids);
          toast({ title: `${ids.length} receita(s) excluída(s)` });
          selection.clear();
          fetchAll();
        }}
        onExport={() => {
          const rows = filteredTxs.filter((t: any) => selection.selectedIds.has(t.id));
          const ws = XLSX.utils.json_to_sheet(rows.map((t: any) => ({
            Vencimento: t.due_date, Tipo: typeLabels[t.type], Descrição: t.description, Valor: t.amount, Status: statusLabels[t.status],
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Receitas");
          XLSX.writeFile(wb, "receitas.xlsx");
        }}
        bulkFields={[
          { key: "due_date", label: "Vencimento (AAAA-MM-DD)", type: "text" },
          { key: "type", label: "Tipo", type: "select", options: [{ value: "receivable", label: "Receita" }, { value: "commission_in", label: "Comissão" }] },
          { key: "description", label: "Descrição", type: "text" },
          { key: "amount", label: "Valor (R$)", type: "number" },
          { key: "status", label: "Status", type: "select", options: [{ value: "paid", label: "Recebido" }, { value: "pending", label: "Pendente" }, { value: "cancelled", label: "Cancelado" }] },
          { key: "payment_method", label: "Forma Pgto", type: "select", options: [{ value: "pix", label: "PIX" }, { value: "boleto", label: "Boleto" }, { value: "cartao", label: "Cartão" }, { value: "transferencia", label: "Transferência" }, { value: "dinheiro", label: "Dinheiro" }] },
          { key: "notes", label: "Observações", type: "text" },
        ]}
        onBulkUpdate={async (field, value) => {
          const ids = [...selection.selectedIds];
          const parsed = field === "amount" ? (parseFloat(String(value)) || 0) : value;
          const update: any = { [field]: parsed };
          if (field === "status" && value === "paid") update.paid_date = format(new Date(), "yyyy-MM-dd");
          await db.from("financial_transactions").update(update).in("id", ids);
          toast({ title: `${ids.length} receita(s) atualizada(s)` });
          selection.clear();
          fetchAll();
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Receita" : "Nova Receita"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="receivable">A Receber</SelectItem><SelectItem value="commission_in">Comissão a Receber</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Vencido</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Descrição *</Label><Input className="h-8 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Valor (R$)</Label><Input className="h-8 text-xs" type="number" step="0.01" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-1"><Label className="text-xs">Vencimento</Label><DatePicker size="sm" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} /></div>
              <div className="space-y-1"><Label className="text-xs">Data pgto</Label><DatePicker size="sm" value={form.paid_date} onChange={v => setForm({ ...form, paid_date: v })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Conta contábil</Label>
                <Select value={form.account_id || "none"} onValueChange={v => setForm({ ...form, account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Proposta</Label>
                <Select value={form.proposal_id || "none"} onValueChange={v => setForm({ ...form, proposal_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{proposals.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code || p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Vendedor</Label>
              <Select value={form.seller_id || "none"} onValueChange={v => setForm({ ...form, seller_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{sellers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea className="text-xs" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full">{editingId ? "Atualizar" : "Criar Receita"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
