import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2, 
  ArrowDownLeft, ArrowUpRight, Search, Filter, Calendar, 
  Wallet, FileText, User, Receipt, CreditCard, Banknote, HelpCircle,
  MoreHorizontal, CheckCircle2, AlertCircle, Activity
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { fmt } from "./finance/financeCalcs";

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
  { value: "receivable", label: "A Receber", color: "text-green-600", bg: "bg-green-50", icon: ArrowDownLeft },
  { value: "payable", label: "A Pagar", color: "text-destructive", bg: "bg-red-50", icon: ArrowUpRight },
  { value: "commission_in", label: "Comissão a Receber", color: "text-green-600", bg: "bg-green-50", icon: ArrowDownLeft },
  { value: "commission_out", label: "Comissão a Pagar", color: "text-destructive", bg: "bg-red-50", icon: ArrowUpRight },
];

const statusOptions = [
  { value: "pending", label: "Pendente", color: "text-yellow-600", bg: "bg-yellow-50" },
  { value: "paid", label: "Pago", color: "text-green-600", bg: "bg-green-50" },
  { value: "overdue", label: "Vencido", color: "text-destructive", bg: "bg-red-50" },
  { value: "cancelled", label: "Cancelado", color: "text-muted-foreground", bg: "bg-muted" },
];

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
  const [search, setSearch] = useState("");

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

  const financeFilterState = useSmartFilters();
  
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(tx => 
      tx.description?.toLowerCase().includes(s) || 
      accounts.find(a => a.id === tx.account_id)?.name.toLowerCase().includes(s)
    );
  }, [transactions, search, accounts]);

  const sortedTransactions = financeFilterState.applyFilters(filteredTransactions);

  // Summary
  const receivable = transactions.filter(t => (t.type === "receivable" || t.type === "commission_in") && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const payable = transactions.filter(t => (t.type === "payable" || t.type === "commission_out") && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const overdueCount = transactions.filter(t => t.status === "overdue").length;
  const paidTotal = transactions.filter(t => t.status === "paid" && (t.type === "receivable" || t.type === "commission_in")).reduce((s, t) => s + Number(t.amount), 0);

  const KPICard = ({ icon: Icon, label, value, sub, color = "text-admin-primary" }: any) => (
    <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
        <Icon className="h-24 w-24" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
      {sub && <p className="text-[10px] font-bold text-muted-foreground/40 uppercase mt-2">{sub}</p>}
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <Wallet className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Livro Caixa</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Registro geral de movimentações financeiras</p>
        </div>
        <Button 
          onClick={openNew} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <Plus className="h-5 w-5" /> Novo Lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard icon={ArrowDownLeft} label="A Receber" value={fmt(receivable)} color="text-green-600" sub="Pendentes em aberto" />
        <KPICard icon={ArrowUpRight} label="A Pagar" value={fmt(payable)} color="text-destructive" sub="Pendentes em aberto" />
        <KPICard icon={TrendingUp} label="Recebido" value={fmt(paidTotal)} color="text-admin-primary" sub="Total no período" />
        <KPICard icon={AlertCircle} label="Vencidos" value={overdueCount} color="text-destructive" sub="Lançamentos em atraso" />
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar descrição, conta contábil..." 
              className="pl-11 h-12 bg-admin-muted/40 border-none rounded-2xl text-base focus-visible:ring-admin-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[140px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                  <Filter className="h-3 w-3 mr-2 opacity-40" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[140px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                  <Activity className="h-3 w-3 mr-2 opacity-40" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  <SelectItem value="all">Todos Status</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="h-8 w-[1px] bg-admin-border/40 mx-2 hidden lg:block" />
            <div className="flex items-center gap-2">
              <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={filterFrom} onChange={setFilterFrom} />
              <span className="text-[10px] font-black text-muted-foreground/40 uppercase">Até</span>
              <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={filterTo} onChange={setFilterTo} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm border-collapse">
            <TableHeader>
              <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                <SmartTh label="Vencimento" sortKey="due_date" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Tipo" sortKey="type" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Descrição" sortKey="description" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Conta" sortKey="_account" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Valor" sortKey="amount" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                <SmartTh label="Status" sortKey="status" filterState={financeFilterState} data={sortedTransactions} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <th className="p-4 w-32" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/40">
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Carregando...</TableCell></TableRow>
              ) : sortedTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhum lançamento encontrado</TableCell></TableRow>
              ) : sortedTransactions.map(tx => {
                const acc = accounts.find(a => a.id === tx.account_id);
                const typeOpt = typeOptions.find(t => t.value === tx.type);
                const statusOpt = statusOptions.find(s => s.value === tx.status);
                const Icon = typeOpt?.icon || HelpCircle;

                return (
                  <TableRow key={tx.id} className="group transition-all duration-300 hover:bg-admin-muted/50">
                    <TableCell className="p-4 font-bold text-admin-primary tabular-nums">{tx.due_date}</TableCell>
                    <TableCell className="p-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg w-fit ${typeOpt?.bg} ${typeOpt?.color}`}>
                        <Icon className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase tracking-tight">{typeOpt?.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-admin-primary/80 truncate max-w-[200px]">{tx.description}</span>
                        {tx.is_recurring && (
                          <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-tight py-0 px-1 border-admin-primary/20 text-admin-primary/60">
                            Recorrente (Dia {tx.recurrence_day})
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-[11px] font-mono text-muted-foreground/60">{acc ? `${acc.code} ${acc.name}` : "—"}</TableCell>
                    <TableCell className={`p-4 text-right font-black tabular-nums text-base ${typeOpt?.color.includes('green') ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(Number(tx.amount))}
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusOpt?.bg} ${statusOpt?.color} border-current/20`}>
                        {statusOpt?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        {tx.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all font-bold text-[9px] uppercase tracking-wider"
                            onClick={() => handleMarkPaid(tx.id)}
                          >
                            Baixar
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-xl bg-admin-muted/40 text-admin-primary hover:bg-admin-primary hover:text-white transition-all"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Excluir Lançamento?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground font-medium">
                                Tem certeza que deseja excluir <strong>{tx.description}</strong>? Esta ação é irreversível e afetará os balanços financeiros.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(tx.id)}
                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]"
                              >
                                Excluir Permanentemente
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
        {sortedTransactions.length > 0 && (
          <div className="bg-admin-muted/20 px-8 py-4 flex justify-between items-center border-t border-admin-border/40">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{sortedTransactions.length} registros</span>
              <div className="h-4 w-[1px] bg-admin-border/40" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-green-600">Sum Entradas: {fmt(sortedTransactions.filter(t => t.type.includes('receivable') || t.type === 'commission_in').reduce((s,t) => s + Number(t.amount), 0))}</span>
              <div className="h-4 w-[1px] bg-admin-border/40" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-destructive">Sum Saídas: {fmt(sortedTransactions.filter(t => t.type.includes('payable') || t.type === 'commission_out').reduce((s,t) => s + Number(t.amount), 0))}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-2">Saldo Total Filtrado</span>
              <span className="text-xl font-black text-admin-primary tracking-tight">
                {fmt(sortedTransactions.reduce((s, t) => {
                  const isEntry = t.type.includes('receivable') || t.type === 'commission_in';
                  return s + (isEntry ? Number(t.amount) : -Number(t.amount));
                }, 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Plus className="h-32 w-32" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                {editingId ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
              </DialogTitle>
              <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Preencha os detalhes da transação</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Lançamento</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold focus:ring-2 focus:ring-admin-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status Atual</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold focus:ring-2 focus:ring-admin-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição do Lançamento</Label>
              <Input 
                className="h-12 bg-admin-muted/40 border-none rounded-2xl text-base font-bold focus-visible:ring-admin-primary/20" 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Ex: Pagamento Fornecedor X"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 text-base font-black tabular-nums focus-visible:ring-admin-primary/20" 
                    type="number" step="0.01" min={0} 
                    value={form.amount} 
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vencimento</Label>
                <DatePicker className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Pagamento</Label>
                <DatePicker className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" value={form.paid_date} onChange={v => setForm({ ...form, paid_date: v })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conta Contábil</Label>
                <Select value={form.account_id || "none"} onValueChange={v => setForm({ ...form, account_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue placeholder="Vincular Conta..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl max-h-[300px]">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vendedor / Responsável</Label>
                <Select value={form.seller_id || "none"} onValueChange={v => setForm({ ...form, seller_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-admin-muted/20 p-4 rounded-2xl border border-admin-border/10">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
              <div className="flex-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary/80">Lançamento Recorrente</Label>
                <p className="text-[8px] font-bold text-muted-foreground/60 uppercase">Fixar este custo mensalmente</p>
              </div>
              {form.is_recurring && (
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Dia Venc:</Label>
                  <Input 
                    className="h-10 text-center font-black bg-white border-none rounded-xl w-16 focus-visible:ring-admin-primary/20" 
                    type="number" min={1} max={31} 
                    value={form.recurrence_day} 
                    onChange={e => setForm({ ...form, recurrence_day: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notas Internas</Label>
              <Textarea 
                className="bg-admin-muted/40 border-none rounded-2xl text-sm font-medium focus-visible:ring-admin-primary/20 min-h-[100px]" 
                value={form.notes} 
                onChange={e => setForm({ ...form, notes: e.target.value })} 
                placeholder="Observações importantes..."
              />
            </div>
          </div>

          <div className="p-8 bg-admin-muted/20 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              className="px-8 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-admin-primary/20"
            >
              {editingId ? "Salvar Alterações" : "Criar Lançamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
