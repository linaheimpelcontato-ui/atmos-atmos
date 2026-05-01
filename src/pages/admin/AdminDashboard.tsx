import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Heart, FileText, TrendingUp, ShoppingBag 
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { subDays, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { DashboardKPIs } from "@/components/admin/dashboard/DashboardKPIs";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { DashboardTables } from "@/components/admin/dashboard/DashboardTables";
import { DashboardFilters } from "@/components/admin/dashboard/DashboardFilters";
import ExportButton from "@/components/admin/dashboard/ExportButton";

const db = supabase as any;

const COLORS = [
  "hsl(var(--admin-primary))",
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

  const countInRange = (arr: any[], start: Date, end: Date) =>
    arr.filter(i => { const d = new Date(i.created_at); return d >= start && d < end; }).length;

  const periodLabel = useMemo(() => {
    if (period === "custom") return "vs período equivalente";
    return `vs ${period} dias anteriores`;
  }, [period]);

  const kpis = useMemo(() => {
    const currentUsersB2C = countInRange(profiles, periodStart, periodEnd);
    const prevUsersB2C = countInRange(profiles, prevPeriodStart, periodStart);
    const currentLeadsB2B = countInRange(imersaoLeads, periodStart, periodEnd);
    const prevLeadsB2B = countInRange(imersaoLeads, prevPeriodStart, periodStart);
    const currentWishlist = countInRange(wishlistItems, periodStart, periodEnd);
    const prevWishlist = countInRange(wishlistItems, prevPeriodStart, periodStart);
    const currentQuotesB2C = countInRange(quoteRequests, periodStart, periodEnd);
    const prevQuotesB2C = countInRange(quoteRequests, prevPeriodStart, periodStart);

    const b2cProposals = proposals.filter(p => p.segment === "b2c");
    const b2bProposals = proposals.filter(p => p.segment === "b2b");
    const currentProposalsB2C = countInRange(b2cProposals, periodStart, periodEnd);
    const prevProposalsB2C = countInRange(b2cProposals, prevPeriodStart, periodStart);
    const currentProposalsB2B = countInRange(b2bProposals, periodStart, periodEnd);
    const prevProposalsB2B = countInRange(b2bProposals, prevPeriodStart, periodStart);

    const wishlistUserIds = new Set(wishlistItems.filter(w => new Date(w.created_at) >= periodStart).map(w => w.user_id));
    const totalUsersInPeriod = profiles.filter(p => new Date(p.created_at) < periodEnd).length;
    const wishlistRate = totalUsersInPeriod > 0 ? (wishlistUserIds.size / totalUsersInPeriod) * 100 : 0;
    const prevWishlistUserIds = new Set(wishlistItems.filter(w => { const d = new Date(w.created_at); return d >= prevPeriodStart && d < periodStart; }).map(w => w.user_id));
    const prevTotalUsers = profiles.filter(p => new Date(p.created_at) < periodStart).length;
    const prevWishlistRate = prevTotalUsers > 0 ? (prevWishlistUserIds.size / prevTotalUsers) * 100 : 0;

    const pct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const pctOfTotal = (segment: number, total: number) => total > 0 ? Math.round((segment / total) * 100) : 0;

    const applyFilter = (b2cVal: number, b2bVal: number) => {
      if (segmentFilter === "b2c") return { val: b2cVal, b2c: b2cVal, b2b: 0 };
      if (segmentFilter === "b2b") return { val: b2bVal, b2c: 0, b2b: b2bVal };
      return { val: b2cVal + b2bVal, b2c: b2cVal, b2b: b2bVal };
    };

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
      { title: "Novos Leads", value: leadsData.val, icon: Users, delta: pct(leadsData.val, prevLeadsData.val), b2c: leadsData.b2c, b2b: leadsData.b2b, b2cPct: pctOfTotal(leadsData.b2c, leadsData.val), b2bPct: pctOfTotal(leadsData.b2b, leadsData.val), showSegments: segmentFilter === "all" },
      { title: "Usuários Cadastrados", value: usersData.val, icon: Users, delta: pct(segmentFilter === "b2b" ? currentLeadsB2B : currentUsersB2C, segmentFilter === "b2b" ? prevLeadsB2B : prevUsersB2C), b2c: usersData.b2c, b2b: usersData.b2b, b2cPct: pctOfTotal(usersData.b2c, usersData.val), b2bPct: pctOfTotal(usersData.b2b, usersData.val), showSegments: segmentFilter === "all" },
      { title: "Solicitações", value: solicitacoesData.val, icon: FileText, delta: pct(solicitacoesCurrData.val, solicitacoesPrevData.val), b2c: solicitacoesData.b2c, b2b: solicitacoesData.b2b, b2cPct: pctOfTotal(solicitacoesData.b2c, solicitacoesData.val), b2bPct: pctOfTotal(solicitacoesData.b2b, solicitacoesData.val), showSegments: segmentFilter === "all" },
      { title: "Itens na Wishlist", value: wishlistData.val, icon: Heart, delta: pct(wishlistCurrData.val, wishlistPrevData.val), b2c: null, b2b: null, b2cPct: 0, b2bPct: 0, showSegments: false },
      { title: "Taxa Wishlist", value: `${wishlistRate.toFixed(1)}%`, icon: ShoppingBag, delta: wishlistRate - prevWishlistRate, b2c: null, b2b: null, b2cPct: 0, b2bPct: 0, showSegments: false },
      { title: "Propostas", value: proposalsData.val, icon: TrendingUp, delta: pct(proposalsData.val, proposalsPrevData.val), b2c: proposalsData.b2c, b2b: proposalsData.b2b, b2cPct: pctOfTotal(proposalsData.b2c, proposalsData.val), b2bPct: pctOfTotal(proposalsData.b2b, proposalsData.val), showSegments: segmentFilter === "all" },
    ];
  }, [profiles, wishlistItems, quoteRequests, imersaoLeads, proposals, periodStart, prevPeriodStart, periodEnd, segmentFilter]);

  const monthlyTrend = useMemo(() => {
    const data: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = i > 0 ? startOfMonth(subMonths(now, i - 1)) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      data.push({
        month: format(d, "MMM yy", { locale: ptBR }),
        usuarios: countInRange(profiles, mStart, mEnd),
        solicitacoes: countInRange(quoteRequests, mStart, mEnd),
        b2b: countInRange(imersaoLeads, mStart, mEnd),
      });
    }
    return data;
  }, [profiles, quoteRequests, imersaoLeads, now]);

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

  const langData = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach(p => { const lang = p.language || "pt"; map[lang] = (map[lang] || 0) + 1; });
    const labels: Record<string, string> = { pt: "Português", en: "English", es: "Español" };
    return Object.entries(map).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [profiles]);

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

  const latestQuotes = useMemo(() =>
    [...quoteRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
  [quoteRequests]);

  const statusColor = (s: string) => {
    if (s === "pending" || s === "novo") return "bg-amber-100 text-amber-800";
    if (s === "contacted" || s === "atendido") return "bg-blue-100 text-blue-800";
    if (s === "closed") return "bg-emerald-100 text-emerald-800";
    return "bg-muted text-muted-foreground";
  };

  const typeLabel: Record<string, string> = {
    waterfall: "Cachoeira", experience: "Experiência", accommodation: "Hospedagem",
    service: "Serviço", itinerary: "Roteiro",
  };

  const handlePeriodChange = (v: string) => {
    if (v) {
      setPeriod(v as Period);
      if (v !== "custom") setDateRange(undefined);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) setPeriod("custom");
  };

  return (
    <div className="p-8 space-y-12 max-w-[1600px] mx-auto pb-24">
      {/* 1. Filters & Header */}
      <DashboardFilters 
        segmentFilter={segmentFilter}
        setSegmentFilter={setSegmentFilter}
        period={period}
        handlePeriodChange={handlePeriodChange}
        dateRange={dateRange}
        handleDateRangeChange={handleDateRangeChange}
      />

      {/* 2. KPI Section */}
      <DashboardKPIs 
        kpis={kpis}
        loading={loading}
        periodLabel={periodLabel}
      />

      {/* 3. Main Analytics Tabs */}
      <Tabs defaultValue="analytics" className="space-y-8">
        <div className="flex items-center justify-between">
           <TabsList className="bg-admin-muted/50 p-1 rounded-xl">
            <TabsTrigger value="analytics" className="text-[10px] font-black uppercase tracking-widest px-6 h-9 rounded-lg data-[state=on]:bg-white data-[state=on]:text-admin-primary data-[state=on]:shadow-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="tables" className="text-[10px] font-black uppercase tracking-widest px-6 h-9 rounded-lg data-[state=on]:bg-white data-[state=on]:text-admin-primary data-[state=on]:shadow-sm">Tabelas & Detalhes</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
             <ExportButton data={topProducts} filename="top_produtos" />
          </div>
        </div>

        <TabsContent value="analytics" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <DashboardCharts 
            monthlyTrend={monthlyTrend}
            funnelB2C={funnelB2C}
            funnelB2B={funnelB2B}
            langData={langData}
            quoteStatusData={quoteStatusData}
            colors={COLORS}
          />
        </TabsContent>

        <TabsContent value="tables" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <DashboardTables 
            latestQuotes={latestQuotes}
            topProducts={topProducts}
            statusColor={statusColor}
            typeLabel={typeLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
