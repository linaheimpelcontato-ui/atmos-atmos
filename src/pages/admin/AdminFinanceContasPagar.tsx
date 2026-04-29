import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { CheckCircle2, Clock, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { fmt } from "./finance/financeCalcs";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

const db = supabase as any;

export default function AdminFinanceContasPagar() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState("all");

  const filterState = useSmartFilters();
  const selection = useRowSelection();
  useEffect(() => { filterState.handleSort("due_date", "asc"); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: txs }, { data: accs }, { data: banks }, { data: sell }] = await Promise.all([
      db.from("financial_transactions").select("*").in("type", ["payable", "commission_out"]).in("status", ["pending", "overdue"]).order("due_date"),
      db.from("chart_of_accounts").select("id, code, name").eq("is_active", true),
      db.from("bank_accounts").select("id, name").eq("is_active", true),
      db.from("sellers").select("id, name"),
    ]);
    setTransactions(txs || []);
    setChartAccounts(accs || []);
    setBankAccounts(banks || []);
    setSellers(sell || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleMarkPaid = async (id: string) => {
    await db.from("financial_transactions").update({ status: "paid", paid_date: format(new Date(), "yyyy-MM-dd") }).eq("id", id);
    toast({ title: "Marcado como pago" });
    fetchAll();
  };

  const today = format(new Date(), "yyyy-MM-dd");

  // Enrich
  const enriched = useMemo(() => {
    return transactions.map((tx: any) => {
      const acc = chartAccounts.find((a: any) => a.id === tx.account_id);
      return {
        ...tx,
        _account_label: acc ? `${acc.code} ${acc.name}` : "",
        _isOverdue: tx.due_date < today,
      };
    });
  }, [transactions, chartAccounts, today]);

  // Filter
  const filtered = useMemo(() => {
    return enriched.filter(tx => {
      if (search) {
        const s = search.toLowerCase();
        if (!tx.description?.toLowerCase().includes(s) && !tx._account_label.toLowerCase().includes(s)) return false;
      }
      if (statusFilter === "overdue" && !tx._isOverdue) return false;
      if (statusFilter === "pending" && tx._isOverdue) return false;
      if (dateFrom && tx.due_date < dateFrom) return false;
      if (dateTo && tx.due_date > dateTo) return false;
      if (accountFilter !== "all" && tx.account_id !== accountFilter) return false;
      if (recurringFilter === "recurring" && !tx.is_recurring) return false;
      if (recurringFilter === "one-time" && tx.is_recurring) return false;
      return true;
    });
  }, [enriched, search, statusFilter, dateFrom, dateTo, accountFilter, recurringFilter]);

  const sorted = filterState.applyFilters(filtered);

  // Aging
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
  const totalPagar = sumArr(transactions);
  const totalVencido = sumArr(transactions.filter((t: any) => t.due_date < today));
  const proximos7 = sumArr(transactions.filter((t: any) => {
    const in7 = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");
    return t.due_date >= today && t.due_date <= in7;
  }));
  const totalFixo = sumArr(transactions.filter((t: any) => t.is_recurring));

  const AgingCard = ({ label, items, color }: { label: string; items: any[]; color: string }) => (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{fmt(sumArr(items))}</p>
      <p className="text-[10px] text-muted-foreground">{items.length} itens</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-2xl font-bold">Contas a Pagar</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total a Pagar</p>
          <p className="text-lg font-bold">{fmt(totalPagar)}</p>
          <p className="text-[10px] text-muted-foreground">{transactions.length} lançamentos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalVencido)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          <p className="text-lg font-bold text-yellow-600">{fmt(proximos7)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Custos Fixos</p>
          <p className="text-lg font-bold text-muted-foreground">{fmt(totalFixo)}</p>
        </div>
      </div>

      {/* Aging */}
      <div>
        <h2 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Aging Report</h2>
        <div className="grid grid-cols-5 gap-2">
          <AgingCard label="A vencer" items={aging.current} color="text-green-600" />
          <AgingCard label="1-30 dias" items={aging.d30} color="text-yellow-600" />
          <AgingCard label="31-60 dias" items={aging.d60} color="text-orange-600" />
          <AgingCard label="61-90 dias" items={aging.d90} color="text-destructive" />
          <AgingCard label="90+ dias" items={aging.d90plus} color="text-destructive" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Filtros</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="relative col-span-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 text-xs pl-8" placeholder="Buscar descrição, conta..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Vencidos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recurringFilter} onValueChange={setRecurringFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="recurring">Custos Fixos</SelectItem>
              <SelectItem value="one-time">Avulsos</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker size="sm" value={dateFrom} onChange={setDateFrom} />
          <DatePicker size="sm" value={dateTo} onChange={setDateTo} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <th className="p-2 w-10">
                <Checkbox
                  checked={sorted.length > 0 && sorted.every((t: any) => selection.isSelected(t.id))}
                  onCheckedChange={() => selection.toggleAll(sorted.map((t: any) => t.id))}
                />
              </th>
              <SmartTableHead label="Vencimento" sortKey="due_date" filterState={filterState} data={filtered} className="text-xs" />
              <SmartTableHead label="Descrição" sortKey="description" filterState={filterState} data={filtered} className="text-xs" />
              <SmartTableHead label="Conta Contábil" sortKey="_account_label" filterState={filterState} data={filtered} className="text-xs" />
              <SmartTableHead label="Parcela" sortKey="installment_number" filterState={filterState} data={filtered} className="text-xs" />
              <SmartTableHead label="Valor" sortKey="amount" filterState={filterState} data={filtered} className="text-xs text-right" />
              <SmartTableHead label="Status" sortKey="_isOverdue" filterState={filterState} data={filtered} className="text-xs" />
              <SmartTableHead label="" sortKey="_actions" filterState={filterState} data={[]} className="text-xs w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
            ) : sorted.map((tx: any) => (
              <TableRow key={tx.id} className={`${tx._isOverdue ? "bg-destructive/5" : ""} ${selection.isSelected(tx.id) ? "bg-primary/5" : ""}`}>
                <TableCell className="w-10">
                  <Checkbox checked={selection.isSelected(tx.id)} onCheckedChange={() => selection.toggle(tx.id)} />
                </TableCell>
                <TableCell className="text-xs">{tx.due_date}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">
                  {tx.description}
                  {tx.is_recurring && <Badge variant="outline" className="ml-1 text-[9px]">Fixo</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{tx._account_label || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{tx.installment_number && tx.installment_total ? `${tx.installment_number}/${tx.installment_total}` : "—"}</TableCell>
                <TableCell className="text-xs text-right font-medium">{fmt(Number(tx.amount))}</TableCell>
                <TableCell>
                  {tx._isOverdue
                    ? <Badge className="text-[10px] bg-red-100 text-red-800">Vencido</Badge>
                    : <Badge className="text-[10px] bg-yellow-100 text-yellow-800">Pendente</Badge>
                  }
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMarkPaid(tx.id)}>
                    <CheckCircle2 className="h-3 w-3" /> Pagar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length > 0 && (
          <div className="border-t border-border px-4 py-2 flex justify-between text-xs text-muted-foreground">
            <span>{sorted.length} registro(s)</span>
            <span className="font-medium">Total filtrado: {fmt(sumArr(sorted))}</span>
          </div>
        )}
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          const ids = [...selection.selectedIds];
          await db.from("financial_transactions").delete().in("id", ids);
          toast({ title: `${ids.length} lançamento(s) excluído(s)` });
          selection.clear();
          fetchAll();
        }}
        onExport={() => {
          const rows = sorted.filter((t: any) => selection.selectedIds.has(t.id));
          const ws = XLSX.utils.json_to_sheet(rows.map((t: any) => ({
            Vencimento: t.due_date, Descrição: t.description, Conta: t._account_label, Valor: t.amount, Status: t._isOverdue ? "Vencido" : "Pendente",
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
          XLSX.writeFile(wb, "contas-pagar.xlsx");
        }}
        bulkFields={[
          { key: "due_date", label: "Vencimento (AAAA-MM-DD)", type: "text" },
          { key: "description", label: "Descrição", type: "text" },
          { key: "amount", label: "Valor (R$)", type: "number" },
          { key: "status", label: "Status", type: "select", options: [{ value: "paid", label: "Pago" }, { value: "pending", label: "Pendente" }, { value: "cancelled", label: "Cancelado" }] },
          { key: "type", label: "Tipo", type: "select", options: [{ value: "payable", label: "A Pagar" }, { value: "commission_out", label: "Comissão a Pagar" }] },
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
          toast({ title: `${ids.length} lançamento(s) atualizado(s)` });
          selection.clear();
          fetchAll();
        }}
      />
    </div>
  );
}
