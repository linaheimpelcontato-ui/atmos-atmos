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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

const statusBadge: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-muted text-muted-foreground" };
const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", cancelled: "Cancelado" };
const typeLabels: Record<string, string> = { payable: "Despesa", commission_out: "Comissão" };

export default function AdminFinanceDespesas() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "payable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"),
    paid_date: "", status: "pending", account_id: "", seller_id: "", is_recurring: false, recurrence_day: 0, notes: "",
  });
  const smartFilters = useSmartFilters();
  const selection = useRowSelection();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = db.from("financial_transactions").select("*")
      .in("type", ["payable", "commission_out"])
      .gte("due_date", filterFrom).lte("due_date", filterTo)
      .order("due_date", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);

    const [{ data: txs }, { data: accs }, { data: sls }] = await Promise.all([
      q,
      db.from("chart_of_accounts").select("id, code, name, type").eq("is_active", true).order("code"),
      db.from("sellers").select("id, name").eq("is_active", true).order("name"),
    ]);
    setTransactions(txs || []);
    setAccounts(accs || []);
    setSellers(sls || []);
    setLoading(false);
  }, [filterStatus, filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => setForm({ type: "payable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"), paid_date: "", status: "pending", account_id: "", seller_id: "", is_recurring: false, recurrence_day: 0, notes: "" });
  const openNew = () => { resetForm(); setEditingId(null); setDialogOpen(true); };
  const openEdit = (tx: any) => {
    setEditingId(tx.id);
    setForm({ type: tx.type, description: tx.description, amount: tx.amount, due_date: tx.due_date, paid_date: tx.paid_date || "", status: tx.status, account_id: tx.account_id || "", seller_id: tx.seller_id || "", is_recurring: tx.is_recurring, recurrence_day: tx.recurrence_day || 0, notes: tx.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { type: form.type, description: form.description, amount: form.amount, due_date: form.due_date, paid_date: form.paid_date || null, status: form.status, account_id: form.account_id || null, seller_id: form.seller_id || null, is_recurring: form.is_recurring, recurrence_day: form.is_recurring ? form.recurrence_day : null, notes: form.notes || null };
    const { error } = editingId ? await db.from("financial_transactions").update(payload).eq("id", editingId) : await db.from("financial_transactions").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: editingId ? "Despesa atualizada" : "Despesa criada" });
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => { await db.from("financial_transactions").delete().eq("id", id); fetchAll(); };
  const handleMarkPaid = async (id: string) => { await db.from("financial_transactions").update({ status: "paid", paid_date: format(new Date(), "yyyy-MM-dd") }).eq("id", id); fetchAll(); };

  const getAccountLabel = (tx: any) => {
    const acc = accounts.find((a: any) => a.id === tx.account_id);
    return acc ? `${acc.code} ${acc.name}` : "—";
  };

  const filteredTxs = smartFilters.applyFilters(transactions, {
    type: (r: any) => r.type,
    description: (r: any) => r.description,
    account: (r: any) => getAccountLabel(r),
    status: (r: any) => r.status,
    due_date: (r: any) => r.due_date,
    amount: (r: any) => r.amount,
  });

  const totalPago = transactions.filter(t => t.status === "paid").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalPendente = transactions.filter(t => t.status === "pending").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const fixosMensais = transactions.filter(t => t.is_recurring).reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Despesas</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Despesa</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Pago</p><p className="text-lg font-bold text-destructive">{fmt(totalPago)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Pendente</p><p className="text-lg font-bold text-yellow-600">{fmt(totalPendente)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Fixos Mensais</p><p className="text-lg font-bold">{fmt(fixosMensais)}</p></div>
      </div>

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
            <SmartTableHead label="Conta" sortKey="account" filterState={smartFilters} data={transactions} valueExtractor={(r: any) => getAccountLabel(r)} className="text-xs" />
            <SmartTableHead label="Valor" sortKey="amount" filterState={smartFilters} data={transactions} className="text-xs text-right" />
            <SmartTableHead label="Status" sortKey="status" filterState={smartFilters} data={transactions} labelMap={statusLabels} className="text-xs" />
            <TableHead className="text-xs w-28"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            : filteredTxs.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada</TableCell></TableRow>
            : filteredTxs.map(tx => {
              const acc = accounts.find((a: any) => a.id === tx.account_id);
              return (
                <TableRow key={tx.id} className={selection.isSelected(tx.id) ? "bg-primary/5" : ""}>
                  <TableCell className="w-10">
                    <Checkbox checked={selection.isSelected(tx.id)} onCheckedChange={() => selection.toggle(tx.id)} />
                  </TableCell>
                  <TableCell className="text-xs">{tx.due_date}</TableCell>
                  <TableCell className="text-xs text-destructive">{tx.type === "commission_out" ? "Comissão" : "Despesa"}{tx.is_recurring && <Badge variant="outline" className="ml-1 text-[9px]">Fixo</Badge>}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{acc ? `${acc.code} ${acc.name}` : "—"}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{fmt(Number(tx.amount))}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${statusBadge[tx.status]}`}>{statusLabels[tx.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {tx.status === "pending" && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-green-600" onClick={() => handleMarkPaid(tx.id)}>Pagar</Button>}
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
          toast({ title: `${ids.length} despesa(s) excluída(s)` });
          selection.clear();
          fetchAll();
        }}
        onExport={() => {
          const rows = filteredTxs.filter((t: any) => selection.selectedIds.has(t.id));
          const ws = XLSX.utils.json_to_sheet(rows.map((t: any) => ({
            Vencimento: t.due_date, Tipo: typeLabels[t.type], Descrição: t.description, Valor: t.amount, Status: statusLabels[t.status],
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Despesas");
          XLSX.writeFile(wb, "despesas.xlsx");
        }}
        bulkFields={[
          { key: "due_date", label: "Vencimento (AAAA-MM-DD)", type: "text" },
          { key: "type", label: "Tipo", type: "select", options: [{ value: "payable", label: "Despesa" }, { value: "commission_out", label: "Comissão" }] },
          { key: "description", label: "Descrição", type: "text" },
          { key: "amount", label: "Valor (R$)", type: "number" },
          { key: "status", label: "Status", type: "select", options: [{ value: "paid", label: "Pago" }, { value: "pending", label: "Pendente" }, { value: "cancelled", label: "Cancelado" }] },
          { key: "payment_method", label: "Forma Pgto", type: "select", options: [{ value: "pix", label: "PIX" }, { value: "boleto", label: "Boleto" }, { value: "cartao", label: "Cartão" }, { value: "transferencia", label: "Transferência" }, { value: "dinheiro", label: "Dinheiro" }] },
          { key: "notes", label: "Observações", type: "text" },
          { key: "is_recurring", label: "Recorrente", type: "boolean" },
        ]}
        onBulkUpdate={async (field, value) => {
          const ids = [...selection.selectedIds];
          const parsed = field === "amount" ? (parseFloat(String(value)) || 0) : value;
          const update: any = { [field]: parsed };
          if (field === "status" && value === "paid") update.paid_date = format(new Date(), "yyyy-MM-dd");
          await db.from("financial_transactions").update(update).in("id", ids);
          toast({ title: `${ids.length} despesa(s) atualizada(s)` });
          selection.clear();
          fetchAll();
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="payable">A Pagar</SelectItem><SelectItem value="commission_out">Comissão a Pagar</SelectItem></SelectContent>
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
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Vendedor</Label>
                <Select value={form.seller_id || "none"} onValueChange={v => setForm({ ...form, seller_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhum</SelectItem>{sellers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
              <Label className="text-xs">Custo fixo mensal</Label>
              {form.is_recurring && <div className="flex items-center gap-1"><Label className="text-xs">Dia:</Label><Input className="h-7 text-xs w-16" type="number" min={1} max={31} value={form.recurrence_day} onChange={e => setForm({ ...form, recurrence_day: parseInt(e.target.value) || 0 })} /></div>}
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea className="text-xs" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full">{editingId ? "Atualizar" : "Criar Despesa"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
