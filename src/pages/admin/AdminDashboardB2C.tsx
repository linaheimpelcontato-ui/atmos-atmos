import { isApprovedProposalStatus } from "@/lib/proposalStatus";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { isBefore, isAfter, subDays, subMonths, startOfMonth, endOfMonth, format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Instagram, Globe, MessageCircle, UserPlus, Users, RotateCcw, BarChart3, Filter, AlertCircle, TrendingUp, DollarSign, Target, Clock, ArrowRight, CalendarIcon as CalIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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

    const acceptedProposals = filteredProposals.filter(p => isApprovedProposalStatus(p.status));
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
      .filter(p => isApprovedProposalStatus(p.status) && isAfter(new Date(p.created_at as string), monthStart))
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
          return c >= ms && c <= me && isApprovedProposalStatus(p.status);
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
      if (isApprovedProposalStatus(pr.status)) {
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
    filteredProposals.filter(p => isApprovedProposalStatus(p.status)).forEach(pr => {
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
      const accepted = spr.filter(p => isApprovedProposalStatus(p.status));
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
    proposals.filter(p => isApprovedProposalStatus(p.status) && p.start_date).forEach(p => {
      const m = new Date(p.start_date as string).getMonth();
      months[m].viagens++;
    });
    return months.map(m => ({ ...m, month: m.month.charAt(0).toUpperCase() + m.month.slice(1) }));
  }, [proposals]);

  // Avg conversion time
  const avgConvDays = useMemo(() => {
    const accepted = proposals.filter(p => isApprovedProposalStatus(p.status) && p.prospect_id);
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

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <RotateCcw className="h-8 w-8 text-admin-primary/20 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <BarChart3 className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Dashboard B2C</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Análise completa do pipeline de turistas e performance comercial</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/50 backdrop-blur-sm p-3 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex items-center gap-2 px-3 border-r border-admin-border/20 mr-2 h-10">
          <Filter className="h-4 w-4 text-admin-primary/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Filtros</span>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px] h-10 rounded-xl border-admin-border/40 bg-white/50 font-bold text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-admin-border/40 shadow-xl">
            {PERIOD_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value} className="rounded-xl font-bold text-xs">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl border-admin-border/40 bg-white/50 font-bold text-xs">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-admin-border/40 shadow-xl">
            <SelectItem value="all" className="rounded-xl font-bold text-xs">Todas origens</SelectItem>
            {uniqueSources.map(s => (
              <SelectItem key={s} value={s} className="rounded-xl font-bold text-xs">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl border-admin-border/40 bg-white/50 font-bold text-xs">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-admin-border/40 shadow-xl">
            <SelectItem value="all" className="rounded-xl font-bold text-xs">Todos vendedores</SelectItem>
            {sellers.map((s: Seller) => (
              <SelectItem key={s.id as string} value={s.id as string} className="rounded-xl font-bold text-xs">{s.name as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: "Total Prospects", value: kpis.total, icon: Users, color: "text-admin-primary", bg: "bg-admin-primary/10" },
          { title: "Aguardando", value: kpis.awaiting, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
          { title: "Conversão", value: `${kpis.convRate}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-600/10" },
          { title: "Valor aprovado", value: fmt(kpis.revenue), icon: DollarSign, color: "text-admin-primary", bg: "bg-admin-primary/10", small: true },
          { title: "Ticket Médio", value: fmt(kpis.avgTicket), icon: BarChart3, color: "text-blue-600", bg: "bg-blue-600/10", small: true },
          { title: "Meta Mensal", value: `${kpis.goalPct}%`, icon: Target, color: "text-orange-600", bg: "bg-orange-600/10", progress: kpis.goalPct },
        ].map(card => {
          const Icon = card.icon;
          return (
            <motion.div key={card.title} whileHover={{ y: -4 }}>
              <Card className="rounded-[2rem] border-admin-border/60 shadow-sm relative overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-2xl ${card.bg} shrink-0`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-0.5">{card.title}</p>
                      <p className={`font-black text-admin-primary tracking-tight ${card.small ? 'text-sm' : 'text-xl'}`}>{card.value}</p>
                      {card.progress !== undefined && (
                        <div className="mt-2.5 space-y-1">
                          <Progress value={card.progress} className="h-1.5 bg-admin-muted rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1: Evolution + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Evolução Mensal
            </CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Últimos 6 meses — prospects e propostas</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-admin-border/20" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} className="fill-muted-foreground/40" />
                <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} className="fill-muted-foreground/40" />
                <Tooltip
                  cursor={{ fill: 'rgba(var(--admin-primary), 0.03)' }}
                  contentStyle={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(var(--admin-border), 0.4)", borderRadius: 16, fontSize: 11, fontWeight: 'bold' }}
                />
                <Bar dataKey="prospects" name="Prospects" fill="hsl(var(--admin-primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="propostas" name="Propostas" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="aceitas" name="Aceitas" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <Target className="h-3.5 w-3.5" />
              Pipeline (Funil)
            </CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Distribuição de prospects por etapa estratégica</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {pipelineData.map((stage, i) => {
                const max = Math.max(...pipelineData.map(d => d.count), 1);
                const pct = (stage.count / max) * 100;
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-[10px] font-black text-admin-primary uppercase tracking-wider">{stage.name}</span>
                      <span className="text-[10px] font-black text-muted-foreground/40">{stage.count} leads</span>
                    </div>
                    <div className="h-8 bg-admin-muted/40 rounded-2xl overflow-hidden relative border border-admin-border/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 5)}%` }}
                        className="h-full rounded-2xl transition-all duration-500 shadow-sm"
                        style={{ backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Source analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-2 rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Origem dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceDonut.filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={6}
                  stroke="none"
                >
                  {sourceDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(var(--admin-border), 0.4)", borderRadius: 16, fontSize: 11, fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 px-2">
              {sourceDonut.filter(d => d.value > 0).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{s.name}</span>
                  <span className="text-[10px] font-black text-admin-primary ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary">Performance por Canal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-admin-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-8">Canal</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-center">Prospects</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-center">Aceitas</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-center">Conv.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-right px-8">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceData.map((s, idx) => {
                    const SrcIcon = SOURCE_ICONS[s.name] ?? Globe;
                    return (
                      <TableRow key={s.name} className="group border-admin-border/10">
                        <TableCell className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white shadow-sm border border-admin-border/20 group-hover:scale-110 transition-transform">
                              <SrcIcon className="h-3.5 w-3.5" style={{ color: SOURCE_COLORS[s.name] ?? "#6B7280" }} />
                            </div>
                            <span className="text-xs font-black text-admin-primary uppercase tracking-tight">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">{s.prospects}</TableCell>
                        <TableCell className="text-center font-bold text-xs">{s.accepted}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${s.convRate >= 30 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-admin-muted text-muted-foreground/60 border-admin-border/40"}`}>
                            {s.convRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8 font-black text-xs text-admin-primary">{fmt(s.revenue)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Metrics + Followups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Tempo de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4 text-center">
            <div className="relative inline-block">
              <div className="text-6xl font-black text-admin-primary tracking-tighter">{avgConvDays}</div>
              <div className="absolute -top-1 -right-4 h-2 w-2 rounded-full bg-orange-500 animate-ping" />
            </div>
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-2">Dias em média</p>
            <div className="mt-8 pt-8 border-t border-admin-border/20 text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Sazonalidade</span>
                <CalIcon className="h-3.5 w-3.5 text-admin-primary/20" />
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={seasonality}>
                  <defs>
                    <linearGradient id="colorViagens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--admin-primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="viagens" stroke="hsl(var(--admin-primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorViagens)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary">Próximos Follow-ups</CardTitle>
              <CardDescription className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Lembretes para os próximos 7 dias</CardDescription>
            </div>
            <Button asChild variant="ghost" className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all px-4">
              <Link to="/admin/calendario">
                Ver Agenda <ArrowRight className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {upcomingFollowups.map((p: Prospect) => (
                <Link 
                  key={p.id as string} 
                  to="/admin/b2c/prospects" 
                  className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white border border-admin-border/10 hover:border-admin-primary/40 hover:shadow-lg hover:shadow-admin-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-admin-muted/40 group-hover:bg-admin-primary/10 transition-colors">
                      <Users className="h-4 w-4 text-admin-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-admin-primary uppercase tracking-tight">{p.name as string}</p>
                      <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{p.source as string}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 rounded-xl bg-admin-primary/5 text-admin-primary border-admin-primary/10 flex items-center gap-2">
                    <Clock className="h-3 w-3 opacity-40" />
                    {format(new Date(p.next_followup_at as string), "dd/MM HH:mm", { locale: ptBR })}
                  </Badge>
                </Link>
              ))}
              {upcomingFollowups.length === 0 && (
                <div className="py-12 text-center">
                  <CalIcon className="h-8 w-8 text-admin-primary/20 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Nenhum follow-up agendado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { to: "/admin/b2c/prospects", label: "Prospects", desc: "Gestão de leads", icon: Users },
          { to: "/admin/b2c/pipeline", label: "Pipeline", desc: "Gestão visual", icon: TrendingUp },
          { to: "/admin/b2c/propostas", label: "Propostas", desc: "Vendas enviadas", icon: DollarSign },
        ].map(item => (
          <Link 
            key={item.to} 
            to={item.to} 
            className="flex items-center justify-between p-6 rounded-[2rem] bg-admin-primary text-white shadow-xl shadow-admin-primary/20 hover:scale-[1.02] transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 -mr-4 -mt-4 group-hover:scale-110 transition-transform">
              <item.icon className="h-24 w-24" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">{item.desc}</p>
              <h3 className="text-xl font-black tracking-tight">{item.label}</h3>
            </div>
            <ArrowRight className="h-5 w-5 relative z-10 opacity-60 group-hover:translate-x-2 transition-transform" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
