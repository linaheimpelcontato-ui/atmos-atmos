import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { CheckCircle2, Clock, Search, Filter, AlertTriangle, Wallet, ArrowUpCircle, Calendar, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { fmt } from "./finance/financeCalcs";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

const db = supabase as any;

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX", boleto: "Boleto", cartao: "Cartão", transferencia: "Transferência", dinheiro: "Dinheiro", outro: "Outro",
};

export default function AdminFinanceContasReceber() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [prospectFilter, setProspectFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");

  const filterState = useSmartFilters();
  const selection = useRowSelection();
  useEffect(() => { filterState.handleSort("due_date", "asc"); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      db.from("financial_transactions").select("*").in("type", ["receivable", "commission_in"]).in("status", ["pending", "overdue"]).order("due_date"),
      db.from("proposals").select("id, title, code, prospect_id, seller_id"),
      db.from("prospects").select("id, name"),
      db.from("sellers").select("id, name"),
      db.from("bank_accounts").select("id, name").eq("is_active", true),
    ]);
    const error = results.find(result => result.error)?.error;
    if (error) {
      setLoadError(error.message || "Não foi possível carregar as contas a receber.");
      setTransactions([]); setProposals([]); setProspects([]); setSellers([]); setBankAccounts([]);
      toast({ title: "Falha ao carregar contas a receber", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const [{ data: txs }, { data: props }, { data: prosp }, { data: sell }, { data: banks }] = results;
    setLoadError(null);
    setTransactions(txs || []);
    setProposals(props || []);
    setProspects(prosp || []);
    setSellers(sell || []);
    setBankAccounts(banks || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleMarkPaid = async (id: string) => {
    const { error } = await db.from("financial_transactions").update({ status: "paid", paid_date: format(new Date(), "yyyy-MM-dd") }).eq("id", id);
    if (error) { toast({ title: "Não foi possível marcar como recebido", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Marcado como recebido" });
    fetchAll();
  };

  const today = format(new Date(), "yyyy-MM-dd");

  const enriched = useMemo(() => {
    return transactions.map((tx: any) => {
      const prop = proposals.find((p: any) => p.id === tx.proposal_id);
      const prospectId = tx.prospect_id || prop?.prospect_id;
      const sellerId = tx.seller_id || prop?.seller_id;
      const prospect = prospects.find((p: any) => p.id === prospectId);
      const seller = sellers.find((s: any) => s.id === sellerId);
      const bank = bankAccounts.find((b: any) => b.id === tx.bank_account_id);
      return {
        ...tx,
        _prospect_name: prospect?.name || "",
        _seller_name: seller?.name || "",
        _proposal_code: prop?.code || "",
        _bank_label: bank?.name || "Não informada",
        _isOverdue: tx.due_date < today,
      };
    });
  }, [transactions, proposals, prospects, sellers, bankAccounts, today]);

  const filtered = useMemo(() => {
    return enriched.filter(tx => {
      if (search) {
        const s = search.toLowerCase();
        if (!tx.description?.toLowerCase().includes(s) && !tx._prospect_name.toLowerCase().includes(s) && !tx._proposal_code?.toLowerCase().includes(s)) return false;
      }
      if (statusFilter === "overdue" && !tx._isOverdue) return false;
      if (statusFilter === "pending" && tx._isOverdue) return false;
      if (dateFrom && tx.due_date < dateFrom) return false;
      if (dateTo && tx.due_date > dateTo) return false;
      if (prospectFilter !== "all") {
        const prop = proposals.find((p: any) => p.id === tx.proposal_id);
        const pId = tx.prospect_id || prop?.prospect_id;
        if (pId !== prospectFilter) return false;
      }
      if (sellerFilter !== "all") {
        const prop = proposals.find((p: any) => p.id === tx.proposal_id);
        const sId = tx.seller_id || prop?.seller_id;
        if (sId !== sellerFilter) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, dateFrom, dateTo, prospectFilter, sellerFilter, proposals]);

  const sorted = filterState.applyFilters(filtered);
  const allIds = useMemo(() => sorted.map((t: any) => t.id), [sorted]);

  const aging = useMemo(() => {
    const buckets = { current: [] as any[], d30: [] as any[], d60: [] as any[], d90: [] as any[], d90plus: [] as any[] };
    transactions.forEach((t: any) => {
      const days = differenceInDays(new Date(), new Date(t.due_date + "T12:00:00"));
      if (days <= 0) buckets.current.push(t);
      else if (days <= 30) buckets.d30.push(t);
      else if (days <= 60) buckets.d60.push(t);
      else if (days <= 90) buckets.d90.push(t);
      else buckets.d90plus.push(t);
    });
    return buckets;
  }, [transactions]);

  const sumArr = (arr: any[]) => arr.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalReceber = sumArr(transactions);
  const totalVencido = sumArr(transactions.filter((t: any) => t.due_date < today));
  const totalAVencer = sumArr(transactions.filter((t: any) => t.due_date >= today));
  const inadimplencia = totalReceber > 0 ? (totalVencido / totalReceber * 100) : 0;

  const AgingCard = ({ label, items, color, bg }: { label: string; items: any[]; color: string; bg: string }) => (
    <motion.div whileHover={{ y: -2 }} className={`flex-1 min-w-[120px] ${bg} rounded-2xl p-4 border border-admin-border/40 shadow-sm transition-all`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
      <p className={`text-lg font-black ${color} tracking-tight`}>{fmt(sumArr(items))}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase">{items.length} itens</p>
        <div className={`h-1.5 w-1.5 rounded-full ${color.replace('text-', 'bg-')} animate-pulse`} />
      </div>
    </motion.div>
  );

  const prospectOptions = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach((tx: any) => {
      const prop = proposals.find((p: any) => p.id === tx.proposal_id);
      const pId = tx.prospect_id || prop?.prospect_id;
      if (pId) ids.add(pId);
    });
    return prospects.filter((p: any) => ids.has(p.id));
  }, [transactions, proposals, prospects]);

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
              <Wallet className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Contas a Receber</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Gestão de pendências e aging financeiro</p>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Dados incompletos:</strong> {loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="h-24 w-24 text-admin-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total a Receber</p>
          <p className="text-3xl font-black text-admin-primary tracking-tight">{fmt(totalReceber)}</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">{transactions.length} lançamentos ativos</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-destructive" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Vencidos</p>
          <p className="text-3xl font-black text-destructive tracking-tight">{fmt(totalVencido)}</p>
          <div className="mt-4 h-1 w-full bg-red-100 rounded-full overflow-hidden">
            <div className="h-full bg-destructive rounded-full w-1/3 opacity-60" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ArrowUpCircle className="h-24 w-24 text-green-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">A Vencer</p>
          <p className="text-3xl font-black text-green-600 tracking-tight">{fmt(totalAVencer)}</p>
          <div className="mt-4 h-1 w-full bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full w-2/3 opacity-60" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="h-24 w-24 text-orange-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Inadimplência</p>
          <p className={`text-3xl font-black tracking-tight ${inadimplencia > 20 ? "text-destructive" : inadimplencia > 10 ? "text-yellow-600" : "text-green-600"}`}>
            {inadimplencia.toFixed(1)}%
          </p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">Sobre o total pendente</p>
        </motion.div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 ml-2">
          <div className="p-1.5 rounded-xl bg-admin-primary/10">
            <Clock className="h-4 w-4 text-admin-primary" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary/60">Aging Report</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <AgingCard label="A vencer" items={aging.current} color="text-green-600" bg="bg-green-50/30" />
          <AgingCard label="1-30 dias" items={aging.d30} color="text-yellow-600" bg="bg-yellow-50/30" />
          <AgingCard label="31-60 dias" items={aging.d60} color="text-orange-600" bg="bg-orange-50/30" />
          <AgingCard label="61-90 dias" items={aging.d90} color="text-destructive" bg="bg-red-50/30" />
          <AgingCard label="90+ dias" items={aging.d90plus} color="text-destructive" bg="bg-destructive/5" />
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar descrição, cliente, proposta..." 
              className="pl-11 h-12 bg-admin-muted/40 border-none rounded-2xl text-base focus-visible:ring-admin-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[140px] font-bold text-xs uppercase tracking-wider">
                  <Filter className="h-3 w-3 mr-2 opacity-40" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
              <Select value={prospectFilter} onValueChange={setProspectFilter}>
                <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[160px] font-bold text-xs uppercase tracking-wider">
                  <User className="h-3 w-3 mr-2 opacity-40" />
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  <SelectItem value="all">Todos clientes</SelectItem>
                  {prospectOptions.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="h-8 w-[1px] bg-admin-border/40 mx-2 hidden lg:block" />
            <div className="flex items-center gap-2">
              <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={dateFrom} onChange={setDateFrom} placeholder="De" />
              <span className="text-[10px] font-black text-muted-foreground/40 uppercase">Até</span>
              <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={dateTo} onChange={setDateTo} placeholder="Até" />
            </div>
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
                <SmartTh label="Vencimento" sortKey="due_date" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Descrição" sortKey="description" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Cliente" sortKey="_prospect_name" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Proposta" sortKey="_proposal_code" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Parcela" sortKey="installment_number" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <SmartTh label="Valor" sortKey="amount" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                <SmartTh label="Status" sortKey="_isOverdue" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <th className="p-4 w-28" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/40">
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Carregando...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhuma conta encontrada</TableCell></TableRow>
              ) : sorted.map((tx: any) => (
                <TableRow 
                  key={tx.id} 
                  className={`group transition-all duration-300 hover:bg-admin-muted/50 ${tx._isOverdue ? "bg-destructive/[0.02]" : ""} ${selection.isSelected(tx.id) ? "bg-admin-primary/[0.03]" : ""}`}
                >
                  <TableCell className="p-4 text-center">
                    <Checkbox 
                      checked={selection.isSelected(tx.id)} 
                      onCheckedChange={() => selection.toggle(tx.id)}
                      className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                    />
                  </TableCell>
                  <TableCell className="p-4 font-bold text-admin-primary tabular-nums">{tx.due_date}</TableCell>
                  <TableCell className="p-4 text-muted-foreground font-medium max-w-[180px]">
                    <div className="truncate">{tx.description}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground/60">{tx._bank_label} · {paymentMethodLabels[tx.payment_method] || tx.payment_method || "Forma não informada"}</div>
                  </TableCell>
                  <TableCell className="p-4 font-bold text-admin-primary/80">{tx._prospect_name || "—"}</TableCell>
                  <TableCell className="p-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/60">
                      <FileText className="h-3 w-3" />
                      {tx._proposal_code || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    {tx.installment_number && tx.installment_total ? (
                      <Badge variant="secondary" className="rounded-lg bg-admin-muted/60 text-[10px] font-black text-admin-primary/60 px-2">
                        {tx.installment_number}/{tx.installment_total}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="p-4 text-right font-black text-admin-primary tabular-nums text-base">{fmt(Number(tx.amount))}</TableCell>
                  <TableCell className="p-4 text-center">
                    {tx._isOverdue ? (
                      <Badge variant="outline" className="rounded-lg border-red-200 bg-red-50 text-red-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        Vencido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-lg border-yellow-200 bg-yellow-50 text-yellow-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all font-bold text-[9px] uppercase tracking-wider flex items-center gap-2"
                        onClick={() => handleMarkPaid(tx.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Receber
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="bg-admin-muted/20 px-8 py-4 flex justify-between items-center border-t border-admin-border/40">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{sorted.length} registros</span>
              <div className="h-4 w-[1px] bg-admin-border/40" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Total Selecionado: {selection.count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-2">Subtotal Filtrado</span>
              <span className="text-xl font-black text-admin-primary tracking-tight">{fmt(sumArr(sorted))}</span>
            </div>
          </div>
        )}
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          const ids = [...selection.selectedIds];
          const { error } = await db.from("financial_transactions").delete().in("id", ids);
          if (error) { toast({ title: "Falha ao excluir lançamentos", description: error.message, variant: "destructive" }); return; }
          toast({ title: `${ids.length} lançamento(s) excluído(s)` });
          selection.clear();
          fetchAll();
        }}
        onExport={() => {
          const rows = sorted.filter((t: any) => selection.selectedIds.has(t.id));
          const ws = XLSX.utils.json_to_sheet(rows.map((t: any) => ({
            Vencimento: t.due_date, Descrição: t.description, Cliente: t._prospect_name, Valor: t.amount, Status: t._isOverdue ? "Vencido" : "Pendente",
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Contas a Receber");
          XLSX.writeFile(wb, "contas-receber.xlsx");
        }}
        bulkFields={[
          { key: "due_date", label: "Vencimento (AAAA-MM-DD)", type: "text" },
          { key: "description", label: "Descrição", type: "text" },
          { key: "amount", label: "Valor (R$)", type: "number" },
          { key: "status", label: "Status", type: "select", options: [{ value: "paid", label: "Recebido" }, { value: "pending", label: "Pendente" }, { value: "cancelled", label: "Cancelado" }] },
          { key: "type", label: "Tipo", type: "select", options: [{ value: "receivable", label: "A Receber" }, { value: "commission_in", label: "Comissão a Receber" }] },
          { key: "payment_method", label: "Forma Pgto", type: "select", options: [{ value: "pix", label: "PIX" }, { value: "boleto", label: "Boleto" }, { value: "cartao", label: "Cartão" }, { value: "transferencia", label: "Transferência" }, { value: "dinheiro", label: "Dinheiro" }] },
          { key: "notes", label: "Observações", type: "text" },
        ]}
        onBulkUpdate={async (field, value) => {
          const ids = [...selection.selectedIds];
          const parsed = field === "amount" ? (parseFloat(String(value)) || 0) : value;
          const update: any = { [field]: parsed };
          if (field === "status" && value === "paid") update.paid_date = format(new Date(), "yyyy-MM-dd");
          const { error } = await db.from("financial_transactions").update(update).in("id", ids);
          if (error) { toast({ title: "Falha ao atualizar lançamentos", description: error.message, variant: "destructive" }); return; }
          toast({ title: `${ids.length} lançamento(s) atualizado(s)` });
          selection.clear();
          fetchAll();
        }}
      />
    </motion.div>
  );
}
