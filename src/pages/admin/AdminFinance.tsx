import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
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

const db = supabase as any;

type Transaction = {
  id: string;
  account_id: string | null;
  proposal_id: string | null;
  seller_id: string | null;
  type: string;
  description: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_day: number | null;
  notes: string | null;
  created_at: string;
};

type Account = { id: string; code: string; name: string; type: string };

const typeOptions = [
  { value: "receivable", label: "A Receber", color: "text-green-600" },
  { value: "payable", label: "A Pagar", color: "text-destructive" },
  { value: "commission_in", label: "Comissão a Receber", color: "text-green-600" },
  { value: "commission_out", label: "Comissão a Pagar", color: "text-destructive" },
];

const statusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
];

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-muted text-muted-foreground",
  };
  return map[s] || "";
};

export default function AdminFinance() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [proposals, setProposals] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(new Date(), "yyyy-MM-dd"));

  // Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "payable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"),
    paid_date: "", status: "pending", account_id: "", proposal_id: "", seller_id: "",
    is_recurring: false, recurrence_day: 0, notes: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = db.from("financial_transactions").select("*").gte("due_date", filterFrom).lte("due_date", filterTo).order("due_date", { ascending: false });
    if (filterType !== "all") q = q.eq("type", filterType);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);

    const [{ data: txs }, { data: accs }, { data: sls }, { data: props }] = await Promise.all([
      q,
      db.from("chart_of_accounts").select("id, code, name, type").eq("is_active", true).order("code"),
      db.from("sellers").select("id, name").eq("is_active", true).order("name"),
      db.from("proposals").select("id, title").order("created_at", { ascending: false }).limit(100),
    ]);
    setTransactions(txs || []);
    setAccounts(accs || []);
    setSellers(sls || []);
    setProposals(props || []);
    setLoading(false);
  }, [filterType, filterStatus, filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => setForm({
    type: "payable", description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd"),
    paid_date: "", status: "pending", account_id: "", proposal_id: "", seller_id: "",
    is_recurring: false, recurrence_day: 0, notes: "",
  });

  const openNew = () => { resetForm(); setEditingId(null); setDialogOpen(true); };
  const openEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({
      type: tx.type, description: tx.description, amount: tx.amount,
      due_date: tx.due_date, paid_date: tx.paid_date || "", status: tx.status,
      account_id: tx.account_id || "", proposal_id: tx.proposal_id || "",
      seller_id: tx.seller_id || "", is_recurring: tx.is_recurring,
      recurrence_day: tx.recurrence_day || 0, notes: tx.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      type: form.type, description: form.description, amount: form.amount,
      due_date: form.due_date, paid_date: form.paid_date || null, status: form.status,
      account_id: form.account_id || null, proposal_id: form.proposal_id || null,
      seller_id: form.seller_id || null, is_recurring: form.is_recurring,
      recurrence_day: form.is_recurring ? form.recurrence_day : null, notes: form.notes || null,
    };
    const { error } = editingId
      ? await db.from("financial_transactions").update(payload).eq("id", editingId)
      : await db.from("financial_transactions").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: editingId ? "Lançamento atualizado" : "Lançamento criado" });
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await db.from("financial_transactions").delete().eq("id", id);
    fetchAll();
  };

  const handleMarkPaid = async (id: string) => {
    await db.from("financial_transactions").update({ status: "paid", paid_date: format(new Date(), "yyyy-MM-dd") }).eq("id", id);
    fetchAll();
  };

  // Summary
  const receivable = transactions.filter(t => (t.type === "receivable" || t.type === "commission_in") && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const payable = transactions.filter(t => (t.type === "payable" || t.type === "commission_out") && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const overdue = transactions.filter(t => t.status === "overdue").length;
  const paidTotal = transactions.filter(t => t.status === "paid" && (t.type === "receivable" || t.type === "commission_in")).reduce((s, t) => s + Number(t.amount), 0);

  const financeFilterState = useSmartFilters();
  const sortedTransactions = financeFilterState.applyFilters(transactions);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Lançamento</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">A Receber</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-bold text-green-600 flex items-center gap-1"><ArrowDownLeft className="h-4 w-4" />R$ {receivable.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">A Pagar</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-bold text-destructive flex items-center gap-1"><ArrowUpRight className="h-4 w-4" />R$ {payable.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Recebido</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-bold flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-600" />R$ {paidTotal.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Vencidos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-bold text-destructive flex items-center gap-1"><TrendingDown className="h-4 w-4" />{overdue}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <DatePicker size="sm" className="w-36" value={filterFrom} onChange={setFilterFrom} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <DatePicker size="sm" className="w-36" value={filterTo} onChange={setFilterTo} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SmartTableHead label="Vencimento" sortKey="due_date" filterState={financeFilterState} data={sortedTransactions} className="text-xs" />
                <SmartTableHead label="Tipo" sortKey="type" filterState={financeFilterState} data={sortedTransactions} className="text-xs" valueExtractor={(r: any) => r.type} labelMap={Object.fromEntries(typeOptions.map(t => [t.value, t.label]))} />
                <SmartTableHead label="Descrição" sortKey="description" filterState={financeFilterState} data={sortedTransactions} className="text-xs" />
                <SmartTableHead label="Conta" sortKey="_account" filterState={financeFilterState} data={sortedTransactions} className="text-xs" valueExtractor={(r: any) => { const a = accounts.find((a: any) => a.id === r.account_id); return a ? `${a.code} ${a.name}` : "—"; }} />
                <SmartTableHead label="Valor" sortKey="amount" filterState={financeFilterState} data={sortedTransactions} className="text-xs text-right" />
                <SmartTableHead label="Status" sortKey="status" filterState={financeFilterState} data={sortedTransactions} className="text-xs" labelMap={Object.fromEntries(statusOptions.map(s => [s.value, s.label]))} />
                <SmartTableHead label="" sortKey="_actions" filterState={financeFilterState} data={[]} className="text-xs w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : sortedTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</TableCell></TableRow>
              ) : sortedTransactions.map(tx => {
                const acc = accounts.find(a => a.id === tx.account_id);
                const typeOpt = typeOptions.find(t => t.value === tx.type);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs">{tx.due_date}</TableCell>
                    <TableCell className="text-xs"><span className={typeOpt?.color}>{typeOpt?.label}</span></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{tx.description}{tx.is_recurring && <Badge variant="outline" className="ml-1 text-[9px]">Recorrente</Badge>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{acc ? `${acc.code} ${acc.name}` : "—"}</TableCell>
                    <TableCell className="text-xs text-right font-medium">R$ {Number(tx.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${statusBadge(tx.status)}`}>{statusOptions.find(s => s.value === tx.status)?.label}</Badge></TableCell>
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
                                Tem certeza que deseja excluir o lançamento <strong>{tx.description}</strong>? Esta ação não pode ser desfeita.
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
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input className="h-8 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento *</Label>
                <DatePicker size="sm" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data pagamento</Label>
                <DatePicker size="sm" value={form.paid_date} onChange={v => setForm({ ...form, paid_date: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Conta contábil</Label>
                <Select value={form.account_id || "none"} onValueChange={v => setForm({ ...form, account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Proposta</Label>
                <Select value={form.proposal_id || "none"} onValueChange={v => setForm({ ...form, proposal_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {proposals.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendedor</Label>
              <Select value={form.seller_id || "none"} onValueChange={v => setForm({ ...form, seller_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
              <Label className="text-xs">Conta fixa mensal</Label>
              {form.is_recurring && (
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Dia:</Label>
                  <Input className="h-7 text-xs w-16" type="number" min={1} max={31} value={form.recurrence_day} onChange={e => setForm({ ...form, recurrence_day: parseInt(e.target.value) || 0 })} />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea className="text-xs" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full">{editingId ? "Atualizar" : "Criar Lançamento"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
