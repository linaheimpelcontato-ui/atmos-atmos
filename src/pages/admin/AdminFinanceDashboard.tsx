import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, TrendingUp, AlertTriangle, Percent, Users, Target, 
  Download, XCircle, ArrowRight, Wallet, PieChart, Activity,
  ArrowUpRight, ArrowDownRight, Calendar, Filter, Receipt, AlertCircle
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { Link } from "react-router-dom";
import { useFinanceData } from "./finance/useFinanceData";
import { 
  filterProposals, calcOverviewKPIs, calcMonthlyEvolution,
  fmt, fmtPct,
} from "./finance/financeCalcs";
import { exportOverview } from "./finance/financeExport";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminFinanceDashboard() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(startOfMonth(now), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [segment, setSegment] = useState("all");

  const { proposals, dayItems, proposalCosts, transactions, error: financeError } = useFinanceData();

  const fd = useMemo(() => filterProposals(proposals, dayItems, proposalCosts, dateFrom, dateTo, segment), [proposals, dayItems, proposalCosts, dateFrom, dateTo, segment]);
  const kpis = useMemo(() => calcOverviewKPIs(fd, proposalCosts), [fd, proposalCosts]);
  const monthlyData = useMemo(() => calcMonthlyEvolution(proposals, proposalCosts, dayItems, dateFrom, dateTo, segment), [proposals, proposalCosts, dayItems, dateFrom, dateTo, segment]);

  const hasIncompleteResults = kpis.resultIncomplete || monthlyData.some(m => m.resultIncomplete);

  // Alerts
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-admin-border/40 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          {payload.some((p: any) => p.payload?.resultIncomplete) && (
            <p className="mb-2 text-xs font-bold text-amber-800">Resultado incompleto: comissão de hospedagem sem dado.</p>
          )}
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <span className="text-[11px] font-bold text-admin-primary/60">{p.name}:</span>
                <span className="text-sm font-black tabular-nums" style={{ color: p.color || p.fill }}>
                  {typeof p.value === 'number' ? (p.name.includes('Clientes') ? p.value : fmt(p.value)) : p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const KPICard = ({ icon: Icon, label, value, sub, color = "text-admin-primary", trend }: any) => (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
        <Icon className="h-24 w-24" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-')}/10`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
        {trend && (
          <div className={`flex items-center text-[10px] font-bold ${trend > 0 ? "text-green-600" : "text-destructive"}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
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
              <PieChart className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Dashboard Financeiro</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Visão consolidada e inteligência de performance</p>
        </div>
        <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2" disabled={hasIncompleteResults} title={hasIncompleteResults ? "Complete as comissões de hospedagem antes de exportar o resultado consolidado." : undefined} onClick={() => exportOverview(kpis, monthlyData)}>
          <Download className="h-4 w-4" /> Exportar Relatórios
        </Button>
      </div>

      {hasIncompleteResults && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Resultado incompleto</strong> — Há comissões de hospedagem sem dado nas propostas ou no histórico exibido.
          Lucro, custos derivados, margem e ROI são parciais; os valores não comprovam o lucro final.
        </div>
      )}

      {financeError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Dados financeiros incompletos:</strong> {financeError instanceof Error ? financeError.message : String(financeError)}</span>
        </div>
      )}

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
          <div className="h-6 w-[1px] bg-admin-border/40 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Segmento:</span>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="h-10 border-none bg-admin-muted/40 hover:bg-admin-muted/60 rounded-xl transition-colors min-w-[120px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard icon={DollarSign} label="Valor aprovado" value={fmt(kpis.revenue)} sub="Propostas aprovadas; não indica recebimento" />
        <KPICard icon={TrendingUp} label="Custo Total" value={fmt(kpis.totalCost)} color="text-destructive" sub="Operacional + Comissões" />
        <KPICard icon={Activity} label={kpis.resultIncomplete ? "Lucro parcial" : "Lucro Líquido"} value={fmt(kpis.profit)} color={kpis.profit >= 0 ? "text-green-600" : "text-destructive"} sub={kpis.resultIncomplete ? "Resultado incompleto" : "EBITDA Ajustado"} />
        <KPICard icon={Percent} label="Margem" value={fmtPct(kpis.margin)} color={kpis.margin >= 0 ? "text-green-600" : "text-destructive"} sub="Eficiência Operacional" />
        <KPICard icon={Target} label="ROI" value={fmtPct(kpis.roi)} color={kpis.roi >= 0 ? "text-green-600" : "text-destructive"} sub="Retorno sobre Custo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard icon={Users} label="Nº Clientes" value={kpis.clients} sub="Base Ativa no Período" />
        <KPICard icon={DollarSign} label="Ticket Médio" value={fmt(kpis.avgTicket)} sub="Valor Médio por Cliente" />
        <KPICard icon={Wallet} label="Ticket B2C" value={fmt(kpis.ticketB2C)} sub="Performance Varejo" />
        <KPICard icon={Target} label="Ticket B2B" value={fmt(kpis.ticketB2B)} sub="Performance Corporativo" />
        <KPICard icon={XCircle} label="Cancelamentos" value={fmtPct(kpis.cancelRate)} color={kpis.cancelRate > 20 ? "text-destructive" : "text-admin-primary"} sub="Taxa de Churn Financeiro" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link to="/admin/financeiro/contas-receber" className="group">
          <motion.div whileHover={{ scale: 1.01 }} className="bg-white border border-admin-border/60 rounded-[2rem] p-8 shadow-sm transition-all hover:shadow-lg relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <TrendingUp className="h-32 w-32 text-green-600" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Previsão Caixa (30d)</p>
                <div className="flex items-baseline gap-3">
                  <p className={`text-4xl font-black tracking-tighter ${pendingIn30.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {fmt(pendingIn30.net)}
                  </p>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Entradas</p>
                <p className="text-sm font-black text-green-600">+{fmt(pendingIn30.in)}</p>
              </div>
              <div className="h-8 w-[1px] bg-admin-border/40" />
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Saídas</p>
                <p className="text-sm font-black text-destructive">-{fmt(pendingIn30.out)}</p>
              </div>
            </div>
          </motion.div>
        </Link>

        <Link to="/admin/financeiro/contas-pagar" className="group">
          <motion.div whileHover={{ scale: 1.01 }} className="bg-white border border-destructive/10 rounded-[2rem] p-8 shadow-sm transition-all hover:shadow-lg relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <AlertTriangle className="h-32 w-32 text-destructive" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/60 flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" /> Contas Vencidas
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-black tracking-tighter text-destructive">
                    {overdue.length} <span className="text-lg text-destructive/40 font-bold uppercase ml-1">Lançamentos</span>
                  </p>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Total em atraso</p>
              <p className="text-lg font-black text-destructive/80">
                {fmt(overdue.reduce((s: number, t: any) => s + Number(t.amount), 0))}
              </p>
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Evolução Mensal</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Receita vs Custos vs Lucro</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-admin-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Custos</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--admin-primary))" radius={[10, 10, 10, 10]} barSize={24} />
                <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" radius={[10, 10, 10, 10]} barSize={24} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Fluxo de Clientes</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Aquisição e Retenção Mensal</p>
            </div>
            <div className="p-2 rounded-xl bg-admin-primary/10">
              <Users className="h-4 w-4 text-admin-primary" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--admin-primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="clientes" name="Clientes" stroke="hsl(var(--admin-primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorClients)" dot={{ r: 4, fill: "white", stroke: "hsl(var(--admin-primary))", strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Receitas", path: "/admin/financeiro/receitas", icon: Wallet, color: "text-green-600" },
          { label: "Despesas", path: "/admin/financeiro/despesas", icon: Receipt, color: "text-destructive" },
          { label: "Lucro & Margem", path: "/admin/financeiro/lucro-margem", icon: Activity, color: "text-admin-primary" },
          { label: "Fluxo de Caixa", path: "/admin/financeiro/fluxo-caixa", icon: Calendar, color: "text-admin-primary" },
        ].map(link => (
          <Link key={link.path} to={link.path} className="group">
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white border border-admin-border/60 rounded-3xl p-6 shadow-sm transition-all hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-2xl ${link.color.replace('text-', 'bg-')}/10`}>
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-admin-primary/80">{link.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
