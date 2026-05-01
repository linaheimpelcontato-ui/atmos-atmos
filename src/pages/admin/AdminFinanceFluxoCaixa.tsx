import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Download, Waves, TrendingUp, TrendingDown, Calendar, Filter, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from "recharts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFinanceData } from "./finance/useFinanceData";
import { calcCashFlow, calcCashForecast, fmt } from "./finance/financeCalcs";
import { exportCashFlow } from "./finance/financeExport";
import { motion, AnimatePresence } from "framer-motion";

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-admin-border/40 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <span className="text-[11px] font-bold text-admin-primary/60">{p.name}:</span>
                <span className="text-sm font-black tabular-nums" style={{ color: p.color || p.fill }}>
                  {fmt(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

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
              <Waves className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Fluxo de Caixa</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Monitoramento de liquidez e previsibilidade financeira</p>
        </div>
        <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2" onClick={() => exportCashFlow(cashFlowData)}>
          <Download className="h-4 w-4" /> Exportar Fluxo
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex items-center gap-3 px-4 border-r border-admin-border/40">
          <Filter className="h-4 w-4 text-admin-primary/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Período</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={dateFrom} onChange={setDateFrom} />
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase">Até</span>
            <DatePicker size="sm" className="h-10 rounded-xl border-none bg-admin-muted/40 font-bold text-xs" value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24 text-admin-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Previsão Caixa (30d)</p>
          <p className={`text-3xl font-black tracking-tighter ${pendingIn30.net >= 0 ? "text-green-600" : "text-destructive"}`}>
            {fmt(pendingIn30.net)}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">+{fmt(pendingIn30.in)}</span>
            <div className="h-3 w-[1px] bg-admin-border/40" />
            <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">-{fmt(pendingIn30.out)}</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-destructive" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Contas Vencidas</p>
          <p className="text-3xl font-black text-destructive tracking-tight">{overdue.length}</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">
            Total em atraso: {fmt(overdue.reduce((s: number, t: any) => s + Number(t.amount), 0))}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24 text-green-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Saldo Acumulado</p>
          <p className={`text-3xl font-black tracking-tighter ${(cumulativeData[cumulativeData.length - 1]?.acumulado || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
            {fmt(cumulativeData[cumulativeData.length - 1]?.acumulado || 0)}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">Projeção final do período</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div className="bg-white rounded-[2.5rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Evolução Mensal (Realizado)</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Entradas vs Saídas</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--admin-primary))" radius={[10, 10, 10, 10]} barSize={24} />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[10, 10, 10, 10]} barSize={24} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-[2.5rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Saldo Acumulado</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Projeção de disponibilidade</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--admin-primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="acumulado" name="Saldo" stroke="hsl(var(--admin-primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorAcumulado)" dot={{ r: 4, fill: "white", stroke: "hsl(var(--admin-primary))", strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div className="bg-white rounded-[2.5rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Previsão de Caixa (4 semanas)</h3>
            <p className="text-xs text-muted-foreground font-medium italic">Fluxo projetado de curto prazo</p>
          </div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashForecast} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--admin-primary))" radius={[10, 10, 10, 10]} barSize={24} />
              <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[10, 10, 10, 10]} barSize={24} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <AnimatePresence>
        {overdue.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-destructive/20 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <AlertTriangle className="h-32 w-32 text-destructive" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2 mb-6">
              <AlertTriangle className="h-4 w-4" /> Alerta de Contas Vencidas ({overdue.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overdue.map((t: any) => (
                <motion.div 
                  key={t.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between gap-4 bg-admin-muted/30 hover:bg-admin-muted/60 p-4 rounded-2xl transition-all border border-admin-border/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-admin-primary/80 truncate uppercase tracking-tight">{t.description}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-0.5">
                      Venc: {format(new Date(t.due_date + "T12:00:00"), "dd/MM")} · {t.type.includes('receivable') ? 'Entrada' : 'Saída'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums text-destructive">{fmt(Number(t.amount))}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 mt-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all font-bold text-[8px] uppercase tracking-wider"
                      onClick={() => markPaid.mutate(t.id)}
                      disabled={markPaid.isPending}
                    >
                      Resolver
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
