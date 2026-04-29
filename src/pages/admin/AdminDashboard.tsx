import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Heart, FileText, TrendingUp, ArrowRight, Globe,
  ShoppingBag, BarChart3, Megaphone, ArrowUpRight, ArrowDownRight, AlertCircle,
  Eye, Clock, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { format, subMonths, subDays, startOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import DateRangePicker from "@/components/admin/dashboard/DateRangePicker";
import ExportButton from "@/components/admin/dashboard/ExportButton";

const db = supabase as any;

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(217 91% 60%)",
  "hsl(280 70% 55%)",
  "hsl(142 71% 45%)",
  "hsl(340 75% 55%)",
];

const B2C_COLOR = "hsl(142 71% 45%)"; // emerald
const B2B_COLOR = "hsl(217 91% 60%)"; // blue

type Period = "7" | "30" | "90" | "custom";
type SegmentFilter = "all" | "b2c" | "b2b";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [imersaoLeads, setImersaoLeads] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [dayItems, setDayItems] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [profilesRes, wishlistRes, quotesRes, imersaoRes, proposalsRes, dayItemsRes] = await Promise.all([
      db.from("profiles").select("id, created_at, language"),
      db.from("wishlist_items").select("id, item_name, item_type, created_at, user_id"),
      db.from("quote_requests").select("id, user_name, user_email, user_phone, status, created_at, language, items, user_id"),
      db.from("imersao_leads").select("id, nome, email, telefone, empresa, status, created_at"),
      db.from("proposals").select("id, total, status, created_at, segment"),
      db.from("proposal_day_items").select("id, item_name, category, value, proposal_id"),
    ]);
    setProfiles(profilesRes.data || []);
    setWishlistItems(wishlistRes.data || []);
    setQuoteRequests(quotesRes.data || []);
    setImersaoLeads(imersaoRes.data || []);
    setProposals(proposalsRes.data || []);
    setDayItems(dayItemsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const now = useMemo(() => new Date(), []);
  
  // Calculate period dates based on selection
  const { periodStart, prevPeriodStart } = useMemo(() => {
    if (period === "custom" && dateRange?.from && dateRange?.to) {
      const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
      return {
        periodStart: dateRange.from,
        prevPeriodStart: new Date(dateRange.from.getTime() - diffMs),
      };
    }
    const days = Number(period) || 30;
    return {
      periodStart: subDays(now, days),
      prevPeriodStart: subDays(now, days * 2),
    };
  }, [period, dateRange, now]);

  const periodEnd = period === "custom" && dateRange?.to ? dateRange.to : now;

  // Helper: count items in a date range
  const countInRange = (arr: any[], start: Date, end: Date) =>
    arr.filter(i => { const d = new Date(i.created_at); return d >= start && d < end; }).length;

  // Dynamic period comparison label
  const periodLabel = useMemo(() => {
    if (period === "custom") return "vs período equivalente";
    return `vs ${period} dias anteriores`;
  }, [period]);

  // KPI calculations with B2B/B2C segmentation + filter support
  const kpis = useMemo(() => {
    const currentUsersB2C = countInRange(profiles, periodStart, periodEnd);
    const prevUsersB2C = countInRange(profiles, prevPeriodStart, periodStart);
    
    const currentLeadsB2B = countInRange(imersaoLeads, periodStart, periodEnd);
    const prevLeadsB2B = countInRange(imersaoLeads, prevPeriodStart, periodStart);

    const currentWishlist = countInRange(wishlistItems, periodStart, periodEnd);
    const prevWishlist = countInRange(wishlistItems, prevPeriodStart, periodStart);

    const currentQuotesB2C = countInRange(quoteRequests, periodStart, periodEnd);
    const prevQuotesB2C = countInRange(quoteRequests, prevPeriodStart, periodStart);

    // B2C proposals
    const b2cProposals = proposals.filter(p => p.segment === "b2c");
    const b2bProposals = proposals.filter(p => p.segment === "b2b");
    const currentProposalsB2C = countInRange(b2cProposals, periodStart, periodEnd);
    const prevProposalsB2C = countInRange(b2cProposals, prevPeriodStart, periodStart);
    const currentProposalsB2B = countInRange(b2bProposals, periodStart, periodEnd);
    const prevProposalsB2B = countInRange(b2bProposals, prevPeriodStart, periodStart);

    // Unique users who added to wishlist
    const wishlistUserIds = new Set(wishlistItems.filter(w => new Date(w.created_at) >= periodStart).map(w => w.user_id));
    const totalUsersInPeriod = profiles.filter(p => new Date(p.created_at) < periodEnd).length;
    const wishlistRate = totalUsersInPeriod > 0 ? (wishlistUserIds.size / totalUsersInPeriod) * 100 : 0;

    const prevWishlistUserIds = new Set(wishlistItems.filter(w => { const d = new Date(w.created_at); return d >= prevPeriodStart && d < periodStart; }).map(w => w.user_id));
    const prevTotalUsers = profiles.filter(p => new Date(p.created_at) < periodStart).length;
    const prevWishlistRate = prevTotalUsers > 0 ? (prevWishlistUserIds.size / prevTotalUsers) * 100 : 0;

    const pct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    // Helper for percentage of total
    const pctOfTotal = (segment: number, total: number) => total > 0 ? Math.round((segment / total) * 100) : 0;

    // Apply segment filter to values
    const applyFilter = (b2cVal: number, b2bVal: number) => {
      if (segmentFilter === "b2c") return { val: b2cVal, b2c: b2cVal, b2b: 0 };
      if (segmentFilter === "b2b") return { val: b2bVal, b2c: 0, b2b: b2bVal };
      return { val: b2cVal + b2bVal, b2c: b2cVal, b2b: b2bVal };
    };

    // Build KPIs in customer flow order
    const leadsData = applyFilter(currentUsersB2C, currentLeadsB2B);
    const prevLeadsData = applyFilter(prevUsersB2C, prevLeadsB2B);

    const usersData = applyFilter(profiles.length, imersaoLeads.length);

    const solicitacoesData = applyFilter(quoteRequests.length, imersaoLeads.length);
    const solicitacoesCurrData = applyFilter(currentQuotesB2C, currentLeadsB2B);
    const solicitacoesPrevData = applyFilter(prevQuotesB2C, prevLeadsB2B);

    const wishlistData = applyFilter(wishlistItems.length, 0);
    const wishlistCurrData = applyFilter(currentWishlist, 0);
    const wishlistPrevData = applyFilter(prevWishlist, 0);

    const proposalsData = applyFilter(currentProposalsB2C, currentProposalsB2B);
    const proposalsPrevData = applyFilter(prevProposalsB2C, prevProposalsB2B);

    return [
      // 1. Novos Leads
      { 
        title: "Novos Leads", 
        value: leadsData.val, 
        icon: Users, 
        delta: pct(leadsData.val, prevLeadsData.val), 
        b2c: leadsData.b2c,
        b2b: leadsData.b2b,
        b2cPct: pctOfTotal(leadsData.b2c, leadsData.val),
        b2bPct: pctOfTotal(leadsData.b2b, leadsData.val),
        showSegments: segmentFilter === "all",
      },
      // 2. Usuários Cadastrados
      { 
        title: "Usuários Cadastrados", 
        value: usersData.val, 
        icon: Users, 
        delta: pct(segmentFilter === "b2b" ? currentLeadsB2B : currentUsersB2C, segmentFilter === "b2b" ? prevLeadsB2B : prevUsersB2C), 
        b2c: usersData.b2c,
        b2b: usersData.b2b,
        b2cPct: pctOfTotal(usersData.b2c, usersData.val),
        b2bPct: pctOfTotal(usersData.b2b, usersData.val),
        showSegments: segmentFilter === "all",
      },
      // 3. Solicitações
      { 
        title: "Solicitações", 
        value: solicitacoesData.val, 
        icon: FileText, 
        delta: pct(solicitacoesCurrData.val, solicitacoesPrevData.val), 
        b2c: solicitacoesData.b2c,
        b2b: solicitacoesData.b2b,
        b2cPct: pctOfTotal(solicitacoesData.b2c, solicitacoesData.val),
        b2bPct: pctOfTotal(solicitacoesData.b2b, solicitacoesData.val),
        showSegments: segmentFilter === "all",
      },
      // 4. Itens na Wishlist
      { 
        title: "Itens na Wishlist", 
        value: wishlistData.val, 
        icon: Heart, 
        delta: pct(wishlistCurrData.val, wishlistPrevData.val), 
        b2c: null,
        b2b: null,
        b2cPct: 0,
        b2bPct: 0,
        showSegments: false,
      },
      // 5. Taxa Wishlist
      { 
        title: "Taxa Wishlist", 
        value: `${wishlistRate.toFixed(1)}%`, 
        icon: ShoppingBag, 
        delta: wishlistRate - prevWishlistRate, 
        b2c: null,
        b2b: null,
        b2cPct: 0,
        b2bPct: 0,
        showSegments: false,
      },
      // 6. Propostas
      { 
        title: "Propostas", 
        value: proposalsData.val, 
        icon: TrendingUp, 
        delta: pct(proposalsData.val, proposalsPrevData.val), 
        b2c: proposalsData.b2c,
        b2b: proposalsData.b2b,
        b2cPct: pctOfTotal(proposalsData.b2c, proposalsData.val),
        b2bPct: pctOfTotal(proposalsData.b2b, proposalsData.val),
        showSegments: segmentFilter === "all",
      },
    ];
  }, [profiles, wishlistItems, quoteRequests, imersaoLeads, proposals, periodStart, prevPeriodStart, periodEnd, segmentFilter]);

  // Monthly line+area data (last 6 months)
  const monthlyTrend = useMemo(() => {
    const data: { month: string; usuarios: number; solicitacoes: number; b2b: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = i > 0 ? startOfMonth(subMonths(now, i - 1)) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const label = format(d, "MMM yy", { locale: ptBR });
      data.push({
        month: label,
        usuarios: countInRange(profiles, mStart, mEnd),
        solicitacoes: countInRange(quoteRequests, mStart, mEnd),
        b2b: countInRange(imersaoLeads, mStart, mEnd),
      });
    }
    return data;
  }, [profiles, quoteRequests, imersaoLeads, now]);

  // Conversion funnel - B2C
  const funnelB2C = useMemo(() => {
    const totalUsers = profiles.length;
    const usersWithWishlist = new Set(wishlistItems.map(w => w.user_id)).size;
    const usersWithQuote = new Set(quoteRequests.filter(q => q.user_id).map(q => q.user_id)).size;
    return [
      { step: "Cadastros", value: totalUsers, pct: 100 },
      { step: "Com Wishlist", value: usersWithWishlist, pct: totalUsers > 0 ? (usersWithWishlist / totalUsers) * 100 : 0 },
      { step: "Solicitou Orçamento", value: usersWithQuote, pct: totalUsers > 0 ? (usersWithQuote / totalUsers) * 100 : 0 },
    ];
  }, [profiles, wishlistItems, quoteRequests]);

  // Conversion funnel - B2B
  const funnelB2B = useMemo(() => {
    const totalLeads = imersaoLeads.length;
    const b2bProposalsCount = proposals.filter(p => p.segment === "b2b").length;
    const b2bClosed = proposals.filter(p => p.segment === "b2b" && ["accepted", "closed"].includes(p.status)).length;
    return [
      { step: "Leads Recebidos", value: totalLeads, pct: 100 },
      { step: "Propostas Enviadas", value: b2bProposalsCount, pct: totalLeads > 0 ? (b2bProposalsCount / totalLeads) * 100 : 0 },
      { step: "Fechados", value: b2bClosed, pct: totalLeads > 0 ? (b2bClosed / totalLeads) * 100 : 0 },
    ];
  }, [imersaoLeads, proposals]);

  // Top products by wishlist saves
  const topProducts = useMemo(() => {
    let filtered = wishlistItems;
    if (productTypeFilter !== "all") {
      filtered = wishlistItems.filter(w => w.item_type === productTypeFilter);
    }
    const map: Record<string, { saves: number; type: string }> = {};
    filtered.forEach(w => {
      if (!map[w.item_name]) map[w.item_name] = { saves: 0, type: w.item_type };
      map[w.item_name].saves++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].saves - a[1].saves)
      .slice(0, 15)
      .map(([name, data]) => ({ name, ...data }));
  }, [wishlistItems, productTypeFilter]);

  // Revenue by product (from accepted proposals) - FIX: Group guides as "Guia ATMOS"
  const revenueByProduct = useMemo(() => {
    let filteredProposals = proposals;
    if (segmentFilter !== "all") {
      filteredProposals = proposals.filter(p => p.segment === segmentFilter);
    }
    const acceptedIds = new Set(filteredProposals.filter(p => p.status === "accepted" || p.status === "closed").map(p => p.id));
    const map: Record<string, { revenue: number; bookings: number; category: string }> = {};
    dayItems.forEach(di => {
      if (!acceptedIds.has(di.proposal_id)) return;
      // GROUP ALL GUIDES UNDER "Guia ATMOS"
      const name = di.category === "Guia" ? "Guia ATMOS" : (di.item_name || di.category);
      if (!map[name]) map[name] = { revenue: 0, bookings: 0, category: di.category === "Guia" ? "Guia" : di.category };
      map[name].revenue += Number(di.value) || 0;
      map[name].bookings++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));
  }, [proposals, dayItems, segmentFilter]);

  // Language distribution
  const langData = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach(p => { const lang = p.language || "pt"; map[lang] = (map[lang] || 0) + 1; });
    const labels: Record<string, string> = { pt: "Português", en: "English", es: "Español" };
    return Object.entries(map).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [profiles]);

  // Quote status with B2B/B2C segmentation
  const quoteStatusData = useMemo(() => {
    const map: Record<string, { b2c: number; b2b: number }> = {};
    quoteRequests.forEach(q => { 
      if (!map[q.status]) map[q.status] = { b2c: 0, b2b: 0 };
      map[q.status].b2c++;
    });
    imersaoLeads.forEach(l => {
      if (!map[l.status]) map[l.status] = { b2c: 0, b2b: 0 };
      map[l.status].b2b++;
    });
    const labels: Record<string, string> = { pending: "Pendente", novo: "Novo", contacted: "Contatado", closed: "Fechado", atendido: "Atendido" };
    return Object.entries(map).map(([key, value]) => ({ 
      name: labels[key] || key, 
      value: value.b2c + value.b2b,
      b2c: value.b2c,
      b2b: value.b2b,
    }));
  }, [quoteRequests, imersaoLeads]);

  // Latest quotes
  const latestQuotes = useMemo(() =>
    [...quoteRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
  [quoteRequests]);

  const statusColor = (s: string) => {
    if (s === "pending" || s === "novo") return "bg-yellow-100 text-yellow-800";
    if (s === "contacted" || s === "atendido") return "bg-blue-100 text-blue-800";
    if (s === "closed") return "bg-green-100 text-green-800";
    return "bg-muted text-muted-foreground";
  };

  const typeLabel: Record<string, string> = {
    waterfall: "Cachoeira", experience: "Experiência", accommodation: "Hospedagem",
    service: "Serviço", itinerary: "Roteiro",
  };

  const handlePeriodChange = (v: string) => {
    if (v) {
      setPeriod(v as Period);
      if (v !== "custom") {
        setDateRange(undefined);
      }
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setPeriod("custom");
    }
  };

  // Export data preparation
  const exportWishlistData = topProducts.map(p => ({
    Produto: p.name,
    Tipo: typeLabel[p.type] || p.type,
    Salvos: p.saves,
  }));

  const exportRevenueData = revenueByProduct.map(r => ({
    Produto: r.name,
    Categoria: r.category,
    Bookings: r.bookings,
    "Receita (R$)": r.revenue.toFixed(2),
  }));

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel do Site</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Analytics do e-commerce ATMOS</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto overscroll-x-contain">
            {/* Segment Filter */}
            <Select value={segmentFilter} onValueChange={(v) => setSegmentFilter(v as SegmentFilter)}>
              <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-xs shrink-0">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Period Toggle */}
            <ToggleGroup 
              type="single" 
              value={period} 
              onValueChange={handlePeriodChange} 
              className="bg-muted rounded-lg p-0.5 shrink-0"
            >
              <ToggleGroupItem 
                value="7" 
                className="text-xs px-2 sm:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm rounded-md"
              >
                7d
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="30" 
                className="text-xs px-2 sm:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm rounded-md"
              >
                30d
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="90" 
                className="text-xs px-2 sm:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm rounded-md"
              >
                90d
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Custom Date Range */}
            <DateRangePicker dateRange={dateRange} onSelect={handleDateRangeChange} />
          </div>
        </div>
      </div>

      {/* KPI Cards with B2B/B2C breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="pt-5 pb-4 px-5">
                <Skeleton className="h-4 w-4 mb-3" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          kpis.map(k => {
            const Icon = k.icon;
            const delta = typeof k.delta === "number" ? k.delta : 0;
            const isPositive = delta >= 0;
            return (
              <Card key={k.title} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {delta !== 0 && (
                      <div className="flex flex-col items-end">
                        <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-green-600" : "text-red-500"}`}>
                          {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {Math.abs(delta).toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-muted-foreground">{periodLabel}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{k.title}</p>
                  
                  {/* B2B/B2C breakdown with actual numbers and percentages */}
                  {k.showSegments && k.b2c !== null && k.b2b !== null && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border/50">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: B2C_COLOR }}>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: B2C_COLOR }} />
                        B2C: {k.b2c} <span className="text-muted-foreground font-normal">({k.b2cPct}%)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: B2B_COLOR }}>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: B2B_COLOR }} />
                        B2B: {k.b2b} <span className="text-muted-foreground font-normal">({k.b2bPct}%)</span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
          <TabsTrigger value="produtos" className="text-xs">Produtos</TabsTrigger>
          <TabsTrigger value="aquisicao" className="text-xs">Aquisição</TabsTrigger>
        </TabsList>

        {/* === TAB: GERAL === */}
        <TabsContent value="geral" className="space-y-6">
          {/* Main chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crescimento ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrend} margin={{ left: -16, right: 8 }}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={B2C_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={B2C_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradB2B" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={B2B_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={B2B_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="usuarios" stroke={B2C_COLOR} fill="url(#gradUsers)" strokeWidth={2} name="B2C (Usuários)" />
                  <Area type="monotone" dataKey="b2b" stroke={B2B_COLOR} fill="url(#gradB2B)" strokeWidth={2} name="B2B (Imersões)" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Dual Funnel: B2C + B2B side by side */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* B2C Funnel */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: B2C_COLOR }} />
                    <span className="text-sm font-semibold text-foreground">B2C</span>
                  </div>
                  {funnelB2C.map((f, i) => (
                    <div key={f.step}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{f.step}</span>
                        <span className="text-muted-foreground">{f.value} ({f.pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-5 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.max(f.pct, 2)}%`,
                            backgroundColor: B2C_COLOR,
                            opacity: 1 - i * 0.2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    De cada 100 cadastros, {funnelB2C[1]?.pct.toFixed(0)} salvam itens e {funnelB2C[2]?.pct.toFixed(0)} solicitam orçamento.
                  </p>
                </div>

                {/* B2B Funnel */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: B2B_COLOR }} />
                    <span className="text-sm font-semibold text-foreground">B2B</span>
                  </div>
                  {funnelB2B.map((f, i) => (
                    <div key={f.step}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{f.step}</span>
                        <span className="text-muted-foreground">{f.value} ({f.pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-5 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.max(f.pct, 2)}%`,
                            backgroundColor: B2B_COLOR,
                            opacity: 1 - i * 0.2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    De cada 100 leads, {funnelB2B[1]?.pct.toFixed(0)} recebem proposta e {funnelB2B[2]?.pct.toFixed(0)} fecham.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Donuts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Languages */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Idiomas dos Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                {langData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={langData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                          {langData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {langData.map((l, i) => {
                        const total = langData.reduce((s, d) => s + d.value, 0);
                        return (
                          <div key={l.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-foreground">{l.name}</span>
                            </div>
                            <span className="text-muted-foreground font-medium">{l.value} ({((l.value / total) * 100).toFixed(0)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Status with B2B/B2C */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status das Solicitações</CardTitle>
              </CardHeader>
              <CardContent>
                {quoteStatusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={quoteStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                          {quoteStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {quoteStatusData.map((s, i) => {
                        const total = quoteStatusData.reduce((sum, d) => sum + d.value, 0);
                        return (
                          <div key={s.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-foreground">{s.name}</span>
                            </div>
                            <span className="text-muted-foreground font-medium">
                              {s.value} 
                              <span className="text-[9px] ml-1">
                                (B2C:{s.b2c} B2B:{s.b2b})
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Latest Quotes Table */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Últimas Solicitações (B2C)</CardTitle>
              <Link to="/admin/orcamentos" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {latestQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação ainda</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Email</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestQuotes.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium text-sm">{q.user_name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{q.user_email || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{q.user_phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[11px] ${statusColor(q.status)}`}>
                            {q.status === "pending" ? "Pendente" : q.status === "contacted" ? "Contatado" : q.status === "closed" ? "Fechado" : q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {format(new Date(q.created_at), "dd/MM/yy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: PRODUTOS === */}
        <TabsContent value="produtos" className="space-y-6">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Tipo de produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="waterfall">Cachoeiras</SelectItem>
                <SelectItem value="experience">Experiências</SelectItem>
                <SelectItem value="accommodation">Hospedagens</SelectItem>
                <SelectItem value="service">Serviços</SelectItem>
                <SelectItem value="itinerary">Roteiros</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={exportWishlistData} filename="wishlist_produtos" />
          </div>

          {/* Top wishlist products with chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Top Produtos na Wishlist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs text-right">Salvos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.slice(0, 10).map((p, i) => (
                        <TableRow key={p.name}>
                          <TableCell className="text-muted-foreground text-sm font-medium">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm max-w-[150px] truncate">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{typeLabel[p.type] || p.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{p.saves}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gráfico de Wishlist</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false} 
                        axisLine={false}
                        width={100}
                        tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + "..." : value}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [value, "Salvos"]}
                      />
                      <Bar dataKey="saves" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by product with chart */}
          <div className="flex items-center gap-3 mt-6">
            <ExportButton data={exportRevenueData} filename="receita_produtos" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Receita por Produto (Propostas Aceitas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByProduct.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhuma proposta aceita ainda</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Dados serão exibidos quando propostas forem aceitas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs text-right">Bookings</TableHead>
                        <TableHead className="text-xs text-right">Receita (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueByProduct.map(r => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium text-sm max-w-[150px] truncate">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{r.bookings}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gráfico de Receita</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByProduct.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByProduct.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false} 
                        axisLine={false}
                        width={100}
                        tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + "..." : value}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === TAB: AQUISIÇÃO === */}
        <TabsContent value="aquisicao" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Placeholder: Visitors */}
            <Card className="shadow-sm border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Visitantes do Site
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Integração Google Analytics</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                    O GA4 (ID: G-73ZWZ7GJN1) já está configurado. Os dados de visitantes podem ser consultados diretamente no painel do Google Analytics.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder: Time on page */}
            <Card className="shadow-sm border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Tempo Médio de Permanência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Disponível no Google Analytics</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                    Acesse analytics.google.com para métricas detalhadas de engajamento e tempo de permanência.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder: CAC by channel */}
            <Card className="shadow-sm border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Megaphone className="h-4 w-4" /> Canais de Aquisição & CAC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Configurar UTM Tracking</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                    Use parâmetros UTM nos links (Instagram, Google Ads, WhatsApp) para rastrear canais de aquisição automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder: Geographic map */}
            <Card className="shadow-sm border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Origem Geográfica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Disponível no Google Analytics</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                    Mapa de origem dos visitantes disponível em GA4 → Relatórios → Dados demográficos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
