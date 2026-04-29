import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFinanceData } from "./finance/useFinanceData";
import { calcCashFlow, calcCashForecast, fmt } from "./finance/financeCalcs";
import { exportCashFlow } from "./finance/financeExport";

const db = supabase as any;

export default function AdminFinanceFluxoCaixa() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(startOfMonth(now), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));

  const { transactions } = useFinanceData();

  const cashFlowData = useMemo(() => calcCashFlow(transactions, dateFrom, dateTo), [transactions, dateFrom, dateTo]);
  const cashForecast = useMemo(() => calcCashForecast(transactions), [transactions]);

  const today = format(now, "yyyy-MM-dd");
  const overdue = useMemo(() =>
    transactions.filter((t: any) => (t.status === "pending" || t.status === "overdue") && t.due_date < today),
  [transactions, today]);

  const pendingIn30 = useMemo(() => {
    const in30 = format(addDays(now, 30), "yyyy-MM-dd");
    const pIn = transactions.filter((t: any) => (t.type === "receivable" || t.type === "commission_in") && t.status === "pending" && t.due_date >= today && t.due_date <= in30).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pOut = transactions.filter((t: any) => (t.type === "payable" || t.type === "commission_out") && t.status === "pending" && t.due_date >= today && t.due_date <= in30).reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { in: pIn, out: pOut, net: pIn - pOut };
  }, [transactions, today]);

  // Cumulative projected balance
  const cumulativeData = useMemo(() => {
    let balance = 0;
    return cashFlowData.map(m => {
      balance += m.saldo;
      return { ...m, acumulado: balance };
    });
  }, [cashFlowData]);

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      await db.from("financial_transactions").update({ status: "paid", paid_date: format(now, "yyyy-MM-dd") }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-all-transactions"] });
      toast({ title: "Marcado como pago" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => exportCashFlow(cashFlowData)}>
          <Download className="h-3 w-3" /> Exportar
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-4">
        <div className="space-y-1"><Label className="text-xs">De</Label><DatePicker size="sm" className="w-36" value={dateFrom} onChange={setDateFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><DatePicker size="sm" className="w-36" value={dateTo} onChange={setDateTo} /></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Previsão Caixa (30d)</p>
          <p className={`text-lg font-bold ${pendingIn30.net >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(pendingIn30.net)}</p>
          <p className="text-[10px] text-muted-foreground">+{fmt(pendingIn30.in)} / -{fmt(pendingIn30.out)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Contas Vencidas</p>
          <p className="text-lg font-bold text-destructive">{overdue.length}</p>
          <p className="text-[10px] text-muted-foreground">{fmt(overdue.reduce((s: number, t: any) => s + Number(t.amount), 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Saldo Acumulado</p>
          <p className={`text-lg font-bold ${(cumulativeData[cumulativeData.length - 1]?.acumulado || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
            {fmt(cumulativeData[cumulativeData.length - 1]?.acumulado || 0)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Evolução Mensal (Realizado)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Saldo Acumulado</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="acumulado" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Previsão de Caixa (4 semanas)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cashForecast}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="bg-card border border-destructive/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Contas Vencidas ({overdue.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-auto">
            {overdue.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR")} · {t.type === "receivable" || t.type === "commission_in" ? "A receber" : "A pagar"}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">{fmt(Number(t.amount))}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markPaid.mutate(t.id)} disabled={markPaid.isPending}>
                  <CheckCircle2 className="h-3 w-3" /> Pago
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
