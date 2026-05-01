import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Zap, Landmark, TrendingUp, AlertCircle, CheckCircle2, Search, Filter } from "lucide-react";
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
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

const db = supabase as any;

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-muted text-muted-foreground border-border",
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

  const filteredTxs = smartFilters.applyFilters(transactions);
  const allIds = useMemo(() => filteredTxs.map((t: any) => t.id), [filteredTxs]);

  const totalRecebido = transactions.filter(t => t.status === "paid").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalPendente = transactions.filter(t => t.status === "pending").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalVencido = transactions.filter(t => t.status === "overdue").reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 min-w-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <Landmark className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Receitas</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Controle de entradas e comissões</p>
        </div>
        <Button 
          size="lg" 
          onClick={openNew}
          className="rounded-2xl shadow-lg shadow-admin-primary/20 bg-admin-primary hover:bg-admin-primary/90 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" /> 
          Nova Receita
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="h-24 w-24 text-green-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Recebido</p>
          <p className="text-3xl font-black text-green-600 tracking-tight">{fmt(totalRecebido)}</p>
          <div className="mt-4 h-1 w-full bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full w-full opacity-60" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24 text-yellow-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Pendente</p>
          <p className="text-3xl font-black text-yellow-600 tracking-tight">{fmt(totalPendente)}</p>
          <div className="mt-4 h-1 w-full bg-yellow-100 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full w-2/3 opacity-60" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="h-24 w-24 text-destructive" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Vencido</p>
          <p className="text-3xl font-black text-destructive tracking-tight">{fmt(totalVencido)}</p>
          <div className="mt-4 h-1 w-full bg-red-100 rounded-full overflow-hidden">
            <div className="h-full bg-destructive rounded-full w-1/3 opacity-60" />
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {unlinkedProposals.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-admin-primary/[0.03] border border-admin-primary/10 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-admin-primary/10">
                    <Zap className="h-5 w-5 text-admin-primary animate-pulse" />
                  </div>
                  <h3 className="font-black text-admin-primary uppercase tracking-wider text-sm">Propostas aceitas aguardando lançamento ({unlinkedProposals.length})</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unlinkedProposals.map((p: any) => (
                  <motion.div 
                    key={p.id} 
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-admin-border/40 group"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-admin-primary text-sm">{p.code || p.title}</p>
                      <p className="text-xs font-black text-muted-foreground/60">{fmt(Number(p.total))}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider"
                      onClick={() => handleGenerateFromProposal(p)}
                    >
                      Lançar
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-admin-border/40">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar lançamentos..." 
            className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-base" 
            value={smartFilters.search} 
            onChange={(e) => smartFilters.setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[120px] font-bold text-xs uppercase tracking-wider">
                <Filter className="h-3 w-3 mr-2 opacity-40" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-8 w-[1px] bg-admin-border/40 mx-2" />
          <div className="flex items-center gap-2">
            <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={filterFrom} onChange={setFilterFrom} />
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase">Até</span>
            <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={filterTo} onChange={setFilterTo} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm border-collapse">
            <TableHeader>
              <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                <th className="p-4 w-12 text-center">
                  <Checkbox
                    checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))}
                    onCheckedChange={() => selection.toggleAll(allIds)}
                    className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                  />
                </th>
                <SmartTh label="Vencimento" sortKey="due_date" filterState={smartFilters} data={transactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Tipo" sortKey="type" filterState={smartFilters} data={transactions} labelMap={typeLabels} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Descrição" sortKey="description" filterState={smartFilters} data={transactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Proposta" sortKey="proposal" filterState={smartFilters} data={transactions} valueExtractor={(r: any) => getProposalCode(r)} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Valor" sortKey="amount" filterState={smartFilters} data={transactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                <SmartTh label="Status" sortKey="status" filterState={smartFilters} data={transactions} labelMap={statusLabels} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <th className="p-4 w-28" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/40">
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Carregando...</TableCell></TableRow>
              ) : filteredTxs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhuma receita encontrada</TableCell></TableRow>
              ) : filteredTxs.map((tx: any) => {
                const prop = proposals.find((p: any) => p.id === tx.proposal_id);
                return (
                  <TableRow 
                    key={tx.id} 
                    className={`group transition-all duration-300 hover:bg-admin-muted/50 ${selection.isSelected(tx.id) ? "bg-admin-primary/[0.03]" : ""}`}
                  >
                    <TableCell className="p-4 text-center">
                      <Checkbox 
                        checked={selection.isSelected(tx.id)} 
                        onCheckedChange={() => selection.toggle(tx.id)}
                        className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                      />
                    </TableCell>
                    <TableCell className="p-4 font-bold text-admin-primary tabular-nums">{tx.due_date}</TableCell>
                    <TableCell className="p-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${tx.type === "commission_in" ? "text-purple-600" : "text-green-600"}`}>
                        {tx.type === "commission_in" ? "Comissão" : "Receita"}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 text-muted-foreground font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="p-4 text-[11px] font-mono text-muted-foreground/60">{prop?.code || "—"}</TableCell>
                    <TableCell className="p-4 text-right font-black text-admin-primary tabular-nums text-base">{fmt(Number(tx.amount))}</TableCell>
                    <TableCell className="p-4 text-center">
                      <Badge variant="outline" className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadge[tx.status]}`}>
                        {statusLabels[tx.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {tx.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all font-bold text-[9px] uppercase tracking-wider"
                            onClick={() => handleMarkPaid(tx.id)}
                          >
                            Receber
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-admin-primary/10 hover:text-admin-primary" onClick={() => openEdit(tx)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black text-admin-primary">Excluir Lançamento?</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                Esta ação excluirá permanentemente o lançamento <strong>{tx.description}</strong> de {fmt(tx.amount)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl border-none bg-admin-muted text-admin-primary font-bold">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(tx.id)}
                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold"
                              >
                                Confirmar Exclusão
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-admin-primary">
              <div className="p-2 rounded-xl bg-admin-primary/10">
                {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              {editingId ? "Editar Receita" : "Nova Receita"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Tipo de Lançamento</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-12 rounded-xl bg-admin-muted/50 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="receivable">A Receber</SelectItem>
                    <SelectItem value="commission_in">Comissão a Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Status Atual</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-12 rounded-xl bg-admin-muted/50 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Descrição do Lançamento *</Label>
              <Input 
                className="h-12 rounded-xl bg-admin-muted/50 border-none focus-visible:ring-admin-primary/20" 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Ex: Recebimento Pacote Chapada"
              />
            </div>

            <div className="bg-admin-muted/30 p-6 rounded-3xl space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40 ml-1">Valor (R$)</Label>
                  <Input 
                    className="h-11 rounded-xl bg-white border-none font-black text-admin-primary text-base tabular-nums" 
                    type="number" 
                    step="0.01" 
                    min={0} 
                    value={form.amount} 
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40 ml-1">Vencimento</Label>
                  <DatePicker size="sm" className="h-11 rounded-xl bg-white border-none text-xs font-bold" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40 ml-1">Data Pagto</Label>
                  <DatePicker size="sm" className="h-11 rounded-xl bg-white border-none text-xs font-bold" value={form.paid_date} onChange={v => setForm({ ...form, paid_date: v })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Conta Contábil</Label>
                <Select value={form.account_id || "none"} onValueChange={v => setForm({ ...form, account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-11 rounded-xl bg-admin-muted/50 border-none text-xs font-bold"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}<SelectItem value="none">Nenhuma</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Vincular Proposta</Label>
                <Select value={form.proposal_id || "none"} onValueChange={v => setForm({ ...form, proposal_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-11 rounded-xl bg-admin-muted/50 border-none text-xs font-bold"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">{proposals.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code || p.title}</SelectItem>)}<SelectItem value="none">Nenhuma</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Vendedor Responsável</Label>
              <Select value={form.seller_id || "none"} onValueChange={v => setForm({ ...form, seller_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-11 rounded-xl bg-admin-muted/50 border-none text-xs font-bold"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">{sellers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}<SelectItem value="none">Nenhum</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Observações Internas</Label>
              <Textarea 
                className="rounded-2xl bg-admin-muted/50 border-none focus-visible:ring-admin-primary/20 p-4 min-h-[80px]" 
                rows={2} 
                value={form.notes} 
                onChange={e => setForm({ ...form, notes: e.target.value })} 
                placeholder="Anotações sobre a transação..."
              />
            </div>

            <DialogFooter className="pt-4 border-t border-admin-border/40">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button 
                onClick={handleSave}
                className="rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 px-8 font-black shadow-lg shadow-admin-primary/20"
              >
                {editingId ? "Salvar Alterações" : "Criar Receita"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
