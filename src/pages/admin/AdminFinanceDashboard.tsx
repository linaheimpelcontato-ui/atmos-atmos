import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, AlertTriangle, Percent, Users, Target,
  Download, XCircle, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import { useFinanceData } from "./finance/useFinanceData";
import {
  filterProposals, calcOverviewKPIs, calcMonthlyEvolution,
  fmt, fmtPct,
} from "./finance/financeCalcs";
import { exportOverview } from "./finance/financeExport";

export default function AdminFinanceDashboard() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(startOfMonth(now), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [segment, setSegment] = useState("all");

  const { proposals, dayItems, proposalCosts, transactions } = useFinanceData();

  const fd = useMemo(() => filterProposals(proposals, dayItems, proposalCosts, dateFrom, dateTo, segment), [proposals, dayItems, proposalCosts, dateFrom, dateTo, segment]);
  const kpis = useMemo(() => calcOverviewKPIs(fd, proposalCosts), [fd, proposalCosts]);
  const monthlyData = useMemo(() => calcMonthlyEvolution(proposals, proposalCosts, dayItems, dateFrom, dateTo, segment), [proposals, proposalCosts, dayItems, dateFrom, dateTo, segment]);

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

  const KPICard = ({ icon: Icon, label, value, sub, color = "text-foreground" }: any) => (
    <div className="bg-card border border-border rounded-xl p-4 min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span></div>
      <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => exportOverview(kpis, monthlyData)}>
          <Download className="h-3 w-3" /> Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-4">
        <div className="space-y-1"><Label className="text-xs">De</Label><DatePicker size="sm" className="w-36" value={dateFrom} onChange={setDateFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><DatePicker size="sm" className="w-36" value={dateTo} onChange={setDateTo} /></div>
        <div className="space-y-1"><Label className="text-xs">Segmento</Label>
          <Select value={segment} onValueChange={setSegment}><SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard icon={DollarSign} label="Faturamento" value={fmt(kpis.revenue)} />
        <KPICard icon={TrendingUp} label="Custo Total" value={fmt(kpis.totalCost)} color="text-destructive" />
        <KPICard icon={DollarSign} label="Lucro Líquido" value={fmt(kpis.profit)} color={kpis.profit >= 0 ? "text-green-600" : "text-destructive"} />
        <KPICard icon={Percent} label="Margem" value={fmtPct(kpis.margin)} color={kpis.margin >= 0 ? "text-green-600" : "text-destructive"} />
        <KPICard icon={Target} label="ROI" value={fmtPct(kpis.roi)} color={kpis.roi >= 0 ? "text-green-600" : "text-destructive"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard icon={Users} label="Nº Clientes" value={kpis.clients} />
        <KPICard icon={DollarSign} label="Ticket Médio" value={fmt(kpis.avgTicket)} />
        <KPICard icon={DollarSign} label="Ticket B2C" value={fmt(kpis.ticketB2C)} />
        <KPICard icon={DollarSign} label="Ticket B2B" value={fmt(kpis.ticketB2B)} />
        <KPICard icon={XCircle} label="Taxa Cancelamento" value={fmtPct(kpis.cancelRate)} color={kpis.cancelRate > 20 ? "text-destructive" : "text-foreground"} />
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/financeiro/contas-receber" className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Previsão Caixa (30d)</p>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className={`text-lg font-bold ${pendingIn30.net >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(pendingIn30.net)}</p>
          <p className="text-[10px] text-muted-foreground">+{fmt(pendingIn30.in)} / -{fmt(pendingIn30.out)}</p>
        </Link>
        <Link to="/admin/financeiro/contas-pagar" className="bg-card border border-destructive/20 rounded-xl p-4 hover:border-destructive/40 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Contas Vencidas</p>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-destructive">{overdue.length}</p>
          <p className="text-[10px] text-muted-foreground">{fmt(overdue.reduce((s: number, t: any) => s + Number(t.amount), 0))}</p>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Clientes por Mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="clientes" name="Clientes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Receitas", path: "/admin/financeiro/receitas" },
          { label: "Despesas", path: "/admin/financeiro/despesas" },
          { label: "Lucro & Margem", path: "/admin/financeiro/lucro-margem" },
          { label: "Fluxo de Caixa", path: "/admin/financeiro/fluxo-caixa" },
        ].map(link => (
          <Link key={link.path} to={link.path} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors flex items-center justify-between">
            <span className="text-sm font-medium">{link.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
