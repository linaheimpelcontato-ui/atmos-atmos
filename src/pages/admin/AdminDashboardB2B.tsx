import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, TrendingUp, Clock, DollarSign, Target, ArrowRight,
  AlertCircle, BarChart3, Filter, Instagram, Globe, MessageCircle,
  UserPlus, Award, MapPin, Calendar as CalIcon, Users, Star,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHeader, TableRow
} from "@/components/ui/table";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";

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
  return new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL", 
    maximumFractionDigits: 0 
  }).format(v);
}

export default function AdminDashboardB2B() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const sourceTableFilter = useSmartFilters();
  const sellerTableFilter = useSmartFilters();

  // Filters
  const [period, setPeriod] = useState("30d");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const [prospRes, propRes, stagesRes, sellersRes, goalsRes] = await Promise.all([
      db.from("prospects").select("*").eq("segment", "b2b"),
      db.from("proposals").select("*").eq("segment", "b2b"),
      db.from("pipeline_stages").select("*").eq("segment", "b2b").order("position"),
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
    if (companyTypeFilter !== "all") {
      fp = fp.filter(p => (p.company_type as string)?.toLowerCase() === companyTypeFilter);
    }
    return { filteredProspects: fp, filteredProposals: fpr };
  }, [prospects, proposals, period, sourceFilter, sellerFilter, companyTypeFilter]);

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

  // Top partners/clients
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; company: string; country: string; count: number; revenue: number }>();
    filteredProposals.filter(p => (p.status as string) === "accepted").forEach(pr => {
      const prosp = prospects.find(p => p.id === pr.prospect_id);
      if (!prosp) return;
      const id = prosp.id as string;
      const cur = map.get(id) || { name: prosp.name as string, company: (prosp.company_name as string) || "", country: (prosp.country as string) || "", count: 0, revenue: 0 };
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

  // Unique sources & company types for filters
  const uniqueSources = useMemo(() => {
    const set = new Set(prospects.map(p => ((p.source as string) ?? "outro").toLowerCase()));
    return Array.from(set).sort();
  }, [prospects]);

  const uniqueCompanyTypes = useMemo(() => {
    const set = new Set(
      prospects
        .map(p => (p.company_type as string)?.toLowerCase())
        .filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [prospects]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-admin-primary/30 border-t-admin-primary rounded-full animate-spin" />
        <div className="text-muted-foreground font-black text-sm uppercase tracking-widest animate-pulse">
          Carregando Dashboard B2B...
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-admin-primary/10 rounded-xl">
              <Building2 className="h-6 w-6 text-admin-primary" />
            </div>
            <Badge variant="outline" className="rounded-full px-4 border-admin-primary/20 text-admin-primary font-black uppercase tracking-tighter text-[10px]">
              Admin Premium
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">
            Dashboard <span className="text-admin-primary">B2B</span>
          </h1>
          <p className="text-muted-foreground font-medium">Análise completa do pipeline de parcerias e imersões corporativas.</p>
        </div>
        
        {/* Quick Period Info */}
        <div className="bg-white/50 backdrop-blur-md border border-admin-border rounded-2xl p-4 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Período Ativo</p>
            <p className="text-sm font-bold">{PERIOD_PRESETS.find(p => p.value === period)?.label || "Personalizado"}</p>
          </div>
          <div className="h-8 w-px bg-admin-border" />
          <div className="p-2 bg-admin-primary/5 rounded-lg">
            <CalIcon className="h-5 w-5 text-admin-primary" />
          </div>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/40 backdrop-blur-xl border border-admin-border rounded-[2rem] p-4 flex flex-wrap items-center gap-4 sticky top-4 z-30 shadow-2xl shadow-admin-primary/5"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-admin-primary/5 rounded-2xl border border-admin-primary/10">
          <Filter className="h-4 w-4 text-admin-primary" />
          <span className="text-[10px] font-black text-admin-primary uppercase tracking-widest">Filtros Avançados</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-white/50 border-admin-border rounded-xl focus:ring-admin-primary/20 h-10 font-bold text-xs transition-all hover:bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
              {PERIOD_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value} className="font-bold text-xs focus:bg-admin-primary/10 focus:text-admin-primary rounded-lg mx-1">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] bg-white/50 border-admin-border rounded-xl focus:ring-admin-primary/20 h-10 font-bold text-xs transition-all hover:bg-white">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
              <SelectItem value="all" className="font-bold text-xs">Todas Origens</SelectItem>
              {uniqueSources.map(s => (
                <SelectItem key={s} value={s} className="font-bold text-xs uppercase tracking-tighter">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger className="w-[180px] bg-white/50 border-admin-border rounded-xl focus:ring-admin-primary/20 h-10 font-bold text-xs transition-all hover:bg-white">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
              <SelectItem value="all" className="font-bold text-xs">Todos Vendedores</SelectItem>
              {sellers.map((s: Seller) => (
                <SelectItem key={s.id as string} value={s.id as string} className="font-bold text-xs">
                  {s.name as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
            <SelectTrigger className="w-[180px] bg-white/50 border-admin-border rounded-xl focus:ring-admin-primary/20 h-10 font-bold text-xs transition-all hover:bg-white">
              <SelectValue placeholder="Tipo Empresa" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
              <SelectItem value="all" className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Todos Tipos</SelectItem>
              {uniqueCompanyTypes.map(t => (
                <SelectItem key={t} value={t} className="font-bold text-xs uppercase tracking-tighter">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { 
            title: "Prospects B2B", 
            value: kpis.total, 
            icon: Building2, 
            color: "text-blue-500", 
            bg: "bg-blue-500/10",
            desc: "Novos leads"
          },
          { 
            title: "Aguardando", 
            value: kpis.awaiting, 
            icon: Clock, 
            color: "text-orange-500", 
            bg: "bg-orange-500/10",
            desc: "Pendente ação"
          },
          { 
            title: "Taxa Conv.", 
            value: `${kpis.convRate}%`, 
            icon: Zap, 
            color: "text-admin-primary", 
            bg: "bg-admin-primary/10",
            desc: "Leads p/ Venda"
          },
          { 
            title: "Faturamento", 
            value: fmt(kpis.revenue), 
            icon: DollarSign, 
            color: "text-emerald-500", 
            bg: "bg-emerald-500/10",
            desc: "No período",
            compact: true
          },
          { 
            title: "Ticket Médio", 
            value: fmt(kpis.avgTicket), 
            icon: TrendingUp, 
            color: "text-indigo-500", 
            bg: "bg-indigo-500/10",
            desc: "Valor por parceria",
            compact: true
          },
          { 
            title: "Meta Mensal", 
            value: `${kpis.goalPct}%`, 
            icon: Target, 
            color: "text-rose-500", 
            bg: "bg-rose-500/10",
            desc: "Progresso atual",
            progress: kpis.goalPct
          },
        ].map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (idx * 0.05) }}
            className="group relative"
          >
            <Card className="rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-admin-primary/5 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${card.bg} group-hover:scale-110 transition-transform duration-500`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{card.title}</p>
                    <p className={`font-black text-foreground tracking-tighter mt-1 ${card.compact ? 'text-lg leading-tight' : 'text-3xl'}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  {card.progress !== undefined ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-muted-foreground">{card.desc}</span>
                        <span className="text-admin-primary">{card.value}</span>
                      </div>
                      <Progress value={card.progress} className="h-2 bg-admin-primary/10 rounded-full overflow-hidden">
                        <div className="h-full bg-admin-primary transition-all duration-1000" style={{ width: `${card.progress}%` }} />
                      </Progress>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                      {card.desc}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Evolution Chart */}
        <Card className="lg:col-span-8 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2 uppercase">
                  <TrendingUp className="h-5 w-5 text-admin-primary" />
                  Evolução do Funil
                </CardTitle>
                <CardDescription className="font-medium">Comparativo mensal de captação e fechamento.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-admin-primary/10 text-admin-primary border-none font-black text-[10px] uppercase">
                  Últimos 6 Meses
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="h-[350px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '20px', 
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '15px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.025em' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="prospects" 
                    name="Prospects" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorProspects)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="aceitas" 
                    name="Aceitas" 
                    stroke="#10B981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorAceitas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="lg:col-span-4 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
              <Filter className="h-5 w-5 text-admin-primary" />
              Funil Ativo
            </CardTitle>
            <CardDescription className="font-medium">Ocupação por etapa do CRM.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {pipelineData.map((stage, i) => {
                const max = Math.max(...pipelineData.map(d => d.count), 1);
                const pct = (stage.count / max) * 100;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.05) }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                      <span className="text-muted-foreground truncate w-2/3">{stage.name}</span>
                      <span className="text-foreground">{stage.count} leads</span>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-2xl overflow-hidden p-1 border border-white">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 5)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-xl shadow-inner flex items-center justify-end px-3"
                        style={{ backgroundColor: stage.color }}
                      >
                        <span className="text-[10px] font-black text-white drop-shadow-md">
                          {Math.round(pct)}%
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Source Table */}
        <Card className="lg:col-span-7 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2 uppercase">
                <Globe className="h-5 w-5 text-admin-primary" />
                Performance por Origem
              </CardTitle>
              <CardDescription className="font-medium">Canais mais eficientes na conversão B2B.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-admin-primary/5 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow className="border-b-admin-border hover:bg-transparent">
                    <SmartTableHead label="Canal" sortKey="name" filterState={sourceTableFilter} data={sourceData} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Leads" sortKey="prospects" filterState={sourceTableFilter} data={sourceData} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Vendas" sortKey="accepted" filterState={sourceTableFilter} data={sourceData} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Taxa" sortKey="convRate" filterState={sourceTableFilter} data={sourceData} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Receita" sortKey="revenue" filterState={sourceTableFilter} data={sourceData} className="text-right px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceTableFilter.applyFilters(sourceData).map((s) => {
                    const SrcIcon = SOURCE_ICONS[s.name] ?? Globe;
                    return (
                      <TableRow key={s.name} className="border-b-admin-border/50 hover:bg-admin-primary/5 transition-colors group">
                        <TableCell className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white shadow-sm border border-admin-border group-hover:scale-110 transition-transform">
                              <SrcIcon className="h-4 w-4" style={{ color: SOURCE_COLORS[s.name] ?? "#6B7280" }} />
                            </div>
                            <span className="font-black text-xs uppercase tracking-tighter text-foreground">
                              {s.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm">{s.prospects}</TableCell>
                        <TableCell className="text-center font-bold text-sm">{s.accepted}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`rounded-full border-none font-black text-[10px] ${s.convRate >= 25 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                            {s.convRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8 font-black text-admin-primary text-sm">
                          {fmt(s.revenue)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Source Donut */}
        <Card className="lg:col-span-5 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
              <Instagram className="h-5 w-5 text-admin-primary" />
              Mix de Aquisição
            </CardTitle>
            <CardDescription className="font-medium">Concentração de leads por canal.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceDonut.filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    strokeWidth={0}
                  >
                    {sourceDonut.map((d, i) => (
                      <Cell 
                        key={i} 
                        fill={d.color} 
                        className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(v) => <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Partners */}
        <Card className="lg:col-span-6 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
              <Award className="h-5 w-5 text-admin-primary" />
              Top Parceiros
            </CardTitle>
            <CardDescription className="font-medium">Maiores receitas acumuladas (Accepted).</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <div className="space-y-4">
              {topClients.map((c, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (i * 0.05) }}
                  className="flex items-center justify-between p-4 rounded-3xl bg-white border border-admin-border hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-admin-primary/10 flex items-center justify-center font-black text-admin-primary text-sm shadow-sm group-hover:scale-110 transition-transform">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="rounded-full px-2 py-0 border-admin-border text-[9px] font-black uppercase tracking-tighter text-muted-foreground bg-admin-primary/5">
                          {c.company || "Empresa"}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {c.count} Propostas
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-admin-primary tracking-tighter">{fmt(c.revenue)}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Receita Total</p>
                  </div>
                </motion.div>
              ))}
              {topClients.length === 0 && (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-flex p-4 rounded-full bg-muted/20">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">Sem dados registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seller Ranking */}
        <Card className="lg:col-span-6 rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
              <Target className="h-5 w-5 text-admin-primary" />
              Ranking de Vendedores
            </CardTitle>
            <CardDescription className="font-medium">Performance individual por captação e fechamento.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-admin-primary/5">
                  <TableRow className="border-b-admin-border hover:bg-transparent">
                    <SmartTableHead label="Vendedor" sortKey="name" filterState={sellerTableFilter} data={sellerRanking} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Prosp." sortKey="prospects" filterState={sellerTableFilter} data={sellerRanking} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Vendas" sortKey="accepted" filterState={sellerTableFilter} data={sellerRanking} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Conv." sortKey="convRate" filterState={sellerTableFilter} data={sellerRanking} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                    <SmartTableHead label="Receita" sortKey="revenue" filterState={sellerTableFilter} data={sellerRanking} className="text-right px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-none" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerTableFilter.applyFilters(sellerRanking).map((s) => (
                    <TableRow key={s.name} className="border-b-admin-border/50 hover:bg-admin-primary/5 transition-colors group">
                      <TableCell className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-admin-primary/10 flex items-center justify-center text-[10px] font-black text-admin-primary border border-admin-primary/20">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-black text-xs uppercase tracking-tighter text-foreground">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-sm">{s.prospects}</TableCell>
                      <TableCell className="text-center font-bold text-sm">{s.accepted}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="rounded-full bg-admin-primary/5 text-admin-primary font-black text-[10px] px-3 border-none">
                          {s.convRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8 font-black text-foreground text-sm">{fmt(s.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Multi-column Stats */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          
          {/* Country Distribution */}
          <Card className="rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
                <MapPin className="h-5 w-5 text-admin-primary" />
                Presença Global
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {countryData.map((c, i) => {
                  const max = countryData[0]?.count ?? 1;
                  const pct = (c.count / max) * 100;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-muted-foreground">{c.name}</span>
                        <span className="text-foreground">{c.count} leads</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.8 + (i * 0.05) }}
                          className="h-full bg-admin-primary rounded-full shadow-lg shadow-admin-primary/20"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Seasonality Area */}
          <Card className="rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black tracking-tighter uppercase flex items-center gap-2">
                <CalIcon className="h-5 w-5 text-admin-primary" />
                Sazonalidade
              </CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Meses de viagem (Accepted)</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex flex-col justify-end min-h-[220px]">
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonality}>
                    <XAxis dataKey="month" hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="viagens" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-6 gap-1 mt-4">
                {seasonality.map((m, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">{m.month.substring(0, 1)}</p>
                    <div className={`h-1 rounded-full mt-1 ${m.viagens > 0 ? 'bg-admin-primary' : 'bg-muted/30'}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Time KPI */}
          <Card className="rounded-[2rem] border-admin-border bg-admin-primary text-white shadow-2xl shadow-admin-primary/20 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Clock className="w-32 h-32" />
            </div>
            <CardHeader className="p-8 relative z-10">
              <CardTitle className="text-lg font-black tracking-tighter uppercase flex items-center gap-2 text-white/90">
                <Clock className="h-5 w-5 text-white" />
                Time to Close
              </CardTitle>
              <CardDescription className="text-white/60 font-medium">Ciclo médio de vendas B2B.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 relative z-10 flex flex-col items-center justify-center">
              <div className="text-7xl font-black tracking-tighter text-white drop-shadow-2xl">
                {avgConvDays}
              </div>
              <p className="text-sm font-black uppercase tracking-widest mt-2 text-white/80">Dias em média</p>
              <div className="mt-8 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Alta Eficiência</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups & Quick Access */}
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          
          {/* Upcoming Followups */}
          <Card className="rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter uppercase">Próximos Follow-ups</CardTitle>
                <CardDescription className="font-medium">Compromissos agendados para a semana.</CardDescription>
              </div>
              <Link to="/admin/calendario">
                <Button variant="ghost" className="rounded-full text-xs font-black uppercase tracking-widest hover:bg-admin-primary/10 hover:text-admin-primary px-4">
                  Calendário <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-8 pt-2">
              <div className="space-y-3">
                {upcomingFollowups.map((p: Prospect) => (
                  <Link 
                    key={p.id as string} 
                    to="/admin/b2b/prospects" 
                    className="flex items-center justify-between p-5 rounded-3xl bg-white border border-admin-border hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-admin-primary/5 group-hover:bg-admin-primary/10 transition-colors">
                        <Building2 className="h-5 w-5 text-admin-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tighter">{p.name as string}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {p.company_type as string} · {p.country as string}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full px-4 py-1.5 border-admin-border bg-admin-primary/5 font-black text-[10px] uppercase tracking-tighter text-admin-primary flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {format(new Date(p.next_followup_at as string), "dd/MM HH:mm", { locale: ptBR })}
                    </Badge>
                  </Link>
                ))}
                {upcomingFollowups.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-admin-border rounded-[2rem] bg-muted/5">
                    <CalIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">Sem tarefas pendentes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Grid */}
          <Card className="rounded-[2rem] border-admin-border bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black tracking-tighter uppercase">Acesso Rápido</CardTitle>
              <CardDescription className="font-medium">Navegue rapidamente pelos módulos B2B.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { to: "/admin/b2b/prospects", label: "Prospects", desc: "Leads B2B", icon: Building2, color: "bg-blue-500" },
                  { to: "/admin/b2b/pipeline", label: "Pipeline", desc: "Kanban", icon: TrendingUp, color: "bg-admin-primary" },
                  { to: "/admin/b2b/propostas", label: "Propostas", desc: "Orçamentos", icon: Star, color: "bg-amber-500" },
                ].map((item) => (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    className="flex flex-col p-6 rounded-[2rem] bg-white border border-admin-border hover:shadow-2xl transition-all group overflow-hidden relative"
                  >
                    <div className={`absolute top-0 right-0 w-16 h-16 ${item.color} opacity-5 rounded-bl-[3rem] group-hover:scale-150 transition-transform duration-700`} />
                    <div className={`w-12 h-12 rounded-2xl ${item.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                      <item.icon className={`h-6 w-6 text-foreground opacity-80`} />
                    </div>
                    <p className="font-black text-sm uppercase tracking-tighter text-foreground group-hover:text-admin-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {item.desc}
                    </p>
                    <div className="mt-6 flex items-center gap-1 text-admin-primary font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir módulo <ArrowRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Simple button component if missing from shadcn in this context
function Button({ children, variant, className, ...props }: any) {
  const variants: any = {
    ghost: "bg-transparent hover:bg-muted",
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${variants[variant || 'default']} ${className}`} {...props}>
      {children}
    </button>
  );
}
