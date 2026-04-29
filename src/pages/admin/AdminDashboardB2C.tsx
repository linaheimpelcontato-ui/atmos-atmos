import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, Clock, DollarSign, Target, ArrowRight,
  AlertCircle, BarChart3, Filter, Instagram, Globe, MessageCircle,
  UserPlus, Award, MapPin, Calendar as CalIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, addDays, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Prospect = Record<string, unknown>;
type Proposal = Record<string, unknown>;
type Stage = Record<string, unknown>;
type Seller = Record<string, unknown>;
type Goal = Record<string, unknown>;

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  site: "#3B82F6",
  whatsapp: "#25D366",
  manual: "#8B5CF6",
  indicacao: "#F59E0B",
  outro: "#6B7280",
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  site: Globe,
  whatsapp: MessageCircle,
  manual: UserPlus,
  indicacao: Users,
};

const PERIOD_PRESETS = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "12 meses", value: "12m" },
  { label: "Tudo", value: "all" },
];

function getDateRange(preset: string): { from: Date | null; to: Date } {
  const to = new Date();
  switch (preset) {
    case "7d": return { from: subDays(to, 7), to };
    case "30d": return { from: subDays(to, 30), to };
    case "90d": return { from: subDays(to, 90), to };
    case "12m": return { from: subMonths(to, 12), to };
    default: return { from: null, to };
  }
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export default function AdminDashboardB2C() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState("30d");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const [prospRes, propRes, stagesRes, sellersRes, goalsRes] = await Promise.all([
      db.from("prospects").select("*").eq("segment", "b2c"),
      db.from("proposals").select("*").eq("segment", "b2c"),
      db.from("pipeline_stages").select("*").eq("segment", "b2c").order("position"),
      db.from("sellers").select("*").eq("is_active", true),
      db.from("sales_goals").select("*"),
    ]);
    setProspects(prospRes.data ?? []);
    setProposals(propRes.data ?? []);
    setStages(stagesRes.data ?? []);
    setSellers(sellersRes.data ?? []);
    setGoals(goalsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered data
  const { filteredProspects, filteredProposals } = useMemo(() => {
    const { from } = getDateRange(period);
    let fp = prospects;
    let fpr = proposals;

    if (from) {
      fp = fp.filter(p => isAfter(new Date(p.created_at as string), from));
      fpr = fpr.filter(p => isAfter(new Date(p.created_at as string), from));
    }
    if (sourceFilter !== "all") {
      fp = fp.filter(p => (p.source as string)?.toLowerCase() === sourceFilter);
    }
    if (sellerFilter !== "all") {
      fp = fp.filter(p => p.seller_id === sellerFilter);
      fpr = fpr.filter(p => p.seller_id === sellerFilter);
    }
    return { filteredProspects: fp, filteredProposals: fpr };
  }, [prospects, proposals, period, sourceFilter, sellerFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredProspects.length;
    const awaitingStage = stages.find((s: Stage) => (s.name as string)?.toLowerCase().includes("aguardando"));
    const awaiting = awaitingStage ? filteredProspects.filter(p => p.stage_id === awaitingStage.id).length : 0;

    const closedStage = stages.find((s: Stage) => {
      const n = (s.name as string)?.toLowerCase() ?? "";
      return n.includes("fechado") || n.includes("confirmad");
    });
    const closed = closedStage ? filteredProspects.filter(p => p.stage_id === closedStage.id).length : 0;
    const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const acceptedProposals = filteredProposals.filter(p => (p.status as string) === "accepted");
    const revenue = acceptedProposals.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const avgTicket = acceptedProposals.length > 0 ? revenue / acceptedProposals.length : 0;

    // Goal progress
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthGoals = goals.filter(g =>
      g.period_type === "monthly" &&
      (g.seller_id == null || sellerFilter === "all" || g.seller_id === sellerFilter) &&
      new Date(g.period_start as string) >= monthStart &&
      new Date(g.period_start as string) <= monthEnd
    );
    const goalTotal = monthGoals.reduce((s, g) => s + Number(g.goal_amount ?? 0), 0);
    const monthRevenue = proposals
      .filter(p => (p.status as string) === "accepted" && isAfter(new Date(p.created_at as string), monthStart))
      .reduce((s, p) => s + Number(p.total ?? 0), 0);
    const goalPct = goalTotal > 0 ? Math.min(100, Math.round((monthRevenue / goalTotal) * 100)) : 0;

    return { total, awaiting, convRate, revenue, avgTicket, goalPct, goalTotal, monthRevenue, closed };
  }, [filteredProspects, filteredProposals, stages, goals, sellerFilter, proposals]);

  // Monthly evolution (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; prospects: number; propostas: number; aceitas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const label = format(d, "MMM", { locale: ptBR });
      months.push({
        month: label.charAt(0).toUpperCase() + label.slice(1),
        prospects: prospects.filter(p => {
          const c = new Date(p.created_at as string);
          return c >= ms && c <= me;
        }).length,
        propostas: proposals.filter(p => {
          const c = new Date(p.created_at as string);
          return c >= ms && c <= me;
        }).length,
        aceitas: proposals.filter(p => {
          const c = new Date(p.created_at as string);
          return c >= ms && c <= me && (p.status as string) === "accepted";
        }).length,
      });
    }
    return months;
  }, [prospects, proposals]);

  // Pipeline funnel
  const pipelineData = useMemo(() => {
    return stages.map((s: Stage) => ({
      name: s.name as string,
      count: filteredProspects.filter(p => p.stage_id === s.id).length,
      color: s.color as string,
    }));
  }, [stages, filteredProspects]);

  // Source analysis
  const sourceData = useMemo(() => {
    const map = new Map<string, { prospects: number; proposals: number; accepted: number; revenue: number }>();
    filteredProspects.forEach(p => {
      const src = ((p.source as string) ?? "outro").toLowerCase();
      const cur = map.get(src) || { prospects: 0, proposals: 0, accepted: 0, revenue: 0 };
      cur.prospects++;
      map.set(src, cur);
    });
    // Map proposals to prospects
    filteredProposals.forEach(pr => {
      const prosp = prospects.find(p => p.id === pr.prospect_id);
      if (!prosp) return;
      const src = ((prosp.source as string) ?? "outro").toLowerCase();
      const cur = map.get(src) || { prospects: 0, proposals: 0, accepted: 0, revenue: 0 };
      cur.proposals++;
      if ((pr.status as string) === "accepted") {
        cur.accepted++;
        cur.revenue += Number(pr.total ?? 0);
      }
      map.set(src, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name, ...data,
      convRate: data.prospects > 0 ? Math.round((data.accepted / data.prospects) * 100) : 0,
    })).sort((a, b) => b.prospects - a.prospects);
  }, [filteredProspects, filteredProposals, prospects]);

  const sourceDonut = useMemo(() =>
    sourceData.map(s => ({ name: s.name, value: s.prospects, color: SOURCE_COLORS[s.name] ?? "#6B7280" })),
    [sourceData]
  );

  // Top clients
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    filteredProposals.filter(p => (p.status as string) === "accepted").forEach(pr => {
      const prosp = prospects.find(p => p.id === pr.prospect_id);
      if (!prosp) return;
      const id = prosp.id as string;
      const cur = map.get(id) || { name: prosp.name as string, count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += Number(pr.total ?? 0);
      map.set(id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredProposals, prospects]);

  // Seller ranking
  const sellerRanking = useMemo(() => {
    return sellers.map((s: Seller) => {
      const sp = filteredProspects.filter(p => p.seller_id === s.id);
      const spr = filteredProposals.filter(p => p.seller_id === s.id);
      const accepted = spr.filter(p => (p.status as string) === "accepted");
      const revenue = accepted.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
      return {
        name: s.name as string,
        prospects: sp.length,
        proposals: spr.length,
        accepted: accepted.length,
        revenue,
        convRate: sp.length > 0 ? Math.round((accepted.length / sp.length) * 100) : 0,
      };
    }).filter(s => s.prospects > 0 || s.proposals > 0).sort((a, b) => b.revenue - a.revenue);
  }, [sellers, filteredProspects, filteredProposals]);

  // Country data
  const countryData = useMemo(() => {
    const map = new Map<string, number>();
    filteredProspects.forEach(p => {
      const c = (p.country as string) || "Não informado";
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredProspects]);

  // Seasonality — travel months from accepted proposals
  const seasonality = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(2024, i, 1), "MMM", { locale: ptBR }),
      viagens: 0,
    }));
    proposals.filter(p => (p.status as string) === "accepted" && p.start_date).forEach(p => {
      const m = new Date(p.start_date as string).getMonth();
      months[m].viagens++;
    });
    return months.map(m => ({ ...m, month: m.month.charAt(0).toUpperCase() + m.month.slice(1) }));
  }, [proposals]);

  // Avg conversion time
  const avgConvDays = useMemo(() => {
    const accepted = proposals.filter(p => (p.status as string) === "accepted" && p.prospect_id);
    if (accepted.length === 0) return 0;
    let totalDays = 0;
    let count = 0;
    accepted.forEach(pr => {
      const prosp = prospects.find(p => p.id === pr.prospect_id);
      if (prosp) {
        totalDays += differenceInDays(new Date(pr.created_at as string), new Date(prosp.created_at as string));
        count++;
      }
    });
    return count > 0 ? Math.round(totalDays / count) : 0;
  }, [proposals, prospects]);

  // Upcoming followups
  const upcomingFollowups = useMemo(() => {
    const soon = addDays(new Date(), 7);
    return filteredProspects
      .filter(p => p.next_followup_at && isBefore(new Date(p.next_followup_at as string), soon))
      .sort((a, b) => new Date(a.next_followup_at as string).getTime() - new Date(b.next_followup_at as string).getTime())
      .slice(0, 5);
  }, [filteredProspects]);

  // Unique sources for filter
  const uniqueSources = useMemo(() => {
    const set = new Set(prospects.map(p => ((p.source as string) ?? "outro").toLowerCase()));
    return Array.from(set).sort();
  }, [prospects]);

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1"];

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard B2C</h1>
          <p className="text-muted-foreground mt-1">Análise completa do pipeline de turistas</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros:
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                {uniqueSources.map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {sellers.map((s: Seller) => (
                  <SelectItem key={s.id as string} value={s.id as string}>{s.name as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: "Total Prospects", value: kpis.total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { title: "Aguardando", value: kpis.awaiting, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
          { title: "Conversão", value: `${kpis.convRate}%`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
          { title: "Receita", value: fmt(kpis.revenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-600/10", small: true },
          { title: "Ticket Médio", value: fmt(kpis.avgTicket), icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10", small: true },
          { title: "Meta Mensal", value: `${kpis.goalPct}%`, icon: Target, color: "text-orange-500", bg: "bg-orange-500/10", progress: kpis.goalPct },
        ].map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="shadow-sm">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${card.bg} shrink-0`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                    <p className={`font-bold text-foreground ${card.small ? 'text-base' : 'text-xl'}`}>{card.value}</p>
                    {card.progress !== undefined && (
                      <Progress value={card.progress} className="h-1.5 mt-1.5" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1: Evolution + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
            <CardDescription>Últimos 6 meses — prospects, propostas e aceitas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="prospects" name="Prospects" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="propostas" name="Propostas" fill="#F59E0B" radius={[4,4,0,0]} />
                <Bar dataKey="aceitas" name="Aceitas" fill="#10B981" radius={[4,4,0,0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline (Funil)</CardTitle>
            <CardDescription>Distribuição de prospects por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineData.map((stage, i) => {
                const max = Math.max(...pipelineData.map(d => d.count), 1);
                const pct = (stage.count / max) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-[120px] truncate text-right">{stage.name}</span>
                    <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                        style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Source donut + Source table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem dos Prospects</CardTitle>
            <CardDescription>De onde vêm os leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sourceDonut.filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {sourceDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversão por Origem</CardTitle>
            <CardDescription>Performance de cada canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Origem</TableHead>
                  <TableHead className="text-xs text-center">Prospects</TableHead>
                  <TableHead className="text-xs text-center">Propostas</TableHead>
                  <TableHead className="text-xs text-center">Aceitas</TableHead>
                  <TableHead className="text-xs text-center">Conv.</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Sem dados no período</TableCell></TableRow>
                ) : sourceData.map(s => {
                  const SrcIcon = SOURCE_ICONS[s.name] ?? Globe;
                  return (
                    <TableRow key={s.name}>
                      <TableCell className="text-sm font-medium flex items-center gap-2">
                        <SrcIcon className="h-3.5 w-3.5" style={{ color: SOURCE_COLORS[s.name] ?? "#6B7280" }} />
                        {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                      </TableCell>
                      <TableCell className="text-center text-sm">{s.prospects}</TableCell>
                      <TableCell className="text-center text-sm">{s.proposals}</TableCell>
                      <TableCell className="text-center text-sm">{s.accepted}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.convRate >= 30 ? "default" : "secondary"} className="text-xs">
                          {s.convRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(s.revenue)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top Clients + Seller Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Top 10 Clientes
            </CardTitle>
            <CardDescription>Por receita acumulada (propostas aceitas)</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.count} proposta{c.count > 1 ? "s" : ""} · Ticket {fmt(c.revenue / c.count)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">{fmt(c.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking Vendedores</CardTitle>
            <CardDescription>Performance por vendedor no período</CardDescription>
          </CardHeader>
          <CardContent>
            {sellerRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs text-center">Prosp.</TableHead>
                    <TableHead className="text-xs text-center">Prop.</TableHead>
                    <TableHead className="text-xs text-center">Conv.</TableHead>
                    <TableHead className="text-xs text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerRanking.map(s => (
                    <TableRow key={s.name}>
                      <TableCell className="text-sm font-medium">{s.name}</TableCell>
                      <TableCell className="text-center text-sm">{s.prospects}</TableCell>
                      <TableCell className="text-center text-sm">{s.proposals}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.convRate >= 30 ? "default" : "secondary"} className="text-xs">{s.convRate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(s.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Country + Seasonality + Conversion Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Origem por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            {countryData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {countryData.map((c, i) => {
                  const max = countryData[0]?.count ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-[90px] truncate text-right">{c.name}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded transition-all"
                          style={{ width: `${(c.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalIcon className="h-4 w-4 text-primary" /> Sazonalidade
            </CardTitle>
            <CardDescription>Meses de viagem (propostas aceitas)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={seasonality}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="viagens" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Tempo de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-4xl font-bold text-foreground">{avgConvDays}</p>
            <p className="text-sm text-muted-foreground mt-1">dias em média</p>
            <p className="text-xs text-muted-foreground mt-3">Do primeiro contato à proposta aceita</p>
          </CardContent>
        </Card>
      </div>

      {/* Followups + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Próximos Follow-ups</CardTitle>
            <Link to="/admin/calendario" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver calendário <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingFollowups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum follow-up agendado.</p>
            ) : (
              <div className="space-y-2">
                {upcomingFollowups.map((p: Prospect) => (
                  <Link key={p.id as string} to="/admin/b2c/prospects" className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{p.name as string}</p>
                        <p className="text-xs text-muted-foreground">{p.source as string}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(p.next_followup_at as string), "dd/MM HH:mm", { locale: ptBR })}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { to: "/admin/b2c/prospects", label: "Prospects", desc: "Lista completa", icon: Users },
                { to: "/admin/b2c/pipeline", label: "Pipeline", desc: "Kanban visual", icon: TrendingUp },
                { to: "/admin/b2c/propostas", label: "Propostas", desc: "Orçamentos", icon: DollarSign },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center justify-between p-3.5 rounded-lg bg-muted/50 border border-border hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-2.5">
                    <item.icon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
