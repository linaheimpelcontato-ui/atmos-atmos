import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuideGuard } from "@/hooks/useGuideGuard";
import { LayoutDashboard, Compass, Users, DollarSign, Leaf, Car, Map, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const db = supabase as any;

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function GuideDashboard() {
  const { guideId } = useGuideGuard();

  // Buscar Guias para saber se tem 4x4
  const { data: guide } = useQuery({
    queryKey: ["guide-profile", guideId],
    queryFn: async () => {
      const { data } = await db.from("guides").select("*").eq("id", guideId).single();
      return data;
    },
    enabled: !!guideId,
  });

  // Buscar Propostas (status: approved) para ver grupos e pessoas
  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["guide-dashboard-proposals", guideId],
    queryFn: async () => {
      const { data } = await db
        .from("proposals")
        .select("id, status, start_date, created_at, total, num_people")
        .eq("guide_id", guideId)
        .in("status", ["approved"]);
      return data || [];
    },
    enabled: !!guideId,
  });

  // Buscar Ocupação (pessoas, veículos)
  const { data: proposalItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["guide-dashboard-items", guideId],
    queryFn: async () => {
      // Simplificado: pegamos todas propostas e os dias delas, iterando para contar produtos (Cachoeiras)
      const { data: props } = await db.from("proposals").select("id").eq("guide_id", guideId).eq("status", "approved");
      if (!props || props.length === 0) return [];
      const propIds = props.map((p: any) => p.id);

      const { data: days } = await db.from("proposal_days").select("id").in("proposal_id", propIds);
      if (!days || days.length === 0) return [];
      const dayIds = days.map((d: any) => d.id);

      const { data: items } = await db
        .from("proposal_day_items")
        .select("id, type, product_id, title, products(name)")
        .in("day_id", dayIds)
        .eq("type", "waterfall");

      return items || [];
    },
    enabled: !!guideId,
  });

  // Buscar Custos (Para calcular a receita do guia)
  const { data: costs = [] } = useQuery({
    queryKey: ["guide-dashboard-costs", guideId],
    queryFn: async () => {
      const { data: props } = await db.from("proposals").select("id").eq("guide_id", guideId).eq("status", "approved");
      if (!props || props.length === 0) return [];
      const propIds = props.map((p: any) => p.id);

      const { data } = await db
        .from("proposal_costs")
        .select("id, description, amount")
        .in("proposal_id", propIds)
        .ilike("description", "%Guia%");
      return data || [];
    },
    enabled: !!guideId,
  });

  // Buscar Custos Pessoais (Gasolina, Manutenção, Combustível, etc)
  const { data: guideTripCosts = [] } = useQuery({
    queryKey: ["guide-dashboard-personal-costs", guideId],
    queryFn: async () => {
      const { data: props } = await db.from("proposals").select("id").eq("guide_id", guideId).eq("status", "approved");
      if (!props || props.length === 0) return [];
      const propIds = props.map((p: any) => p.id);

      const { data } = await db
        .from("guide_trip_costs")
        .select("id, amount")
        .in("proposal_id", propIds)
        .eq("guide_id", guideId);
      return data || [];
    },
    enabled: !!guideId,
  });

  // Análises e Cálculos
  const stats = useMemo(() => {
    const now = new Date();
    let pastGroups = 0;
    let futureGroups = 0;
    let totalPeople = 0; 

    (proposals || []).forEach((p: any) => {
      const pDate = p.start_date ? new Date(p.start_date) : new Date(p.created_at);
      if (pDate < now) pastGroups++;
      else futureGroups++;
      totalPeople += (p.num_people || 0);
    });

    const totalRevenue = (costs || []).reduce((acc: number, c: any) => acc + (c.amount || 0), 0);
    const totalOperationalCosts = (guideTripCosts || []).reduce((acc: number, c: any) => acc + (c.amount || 0), 0);
    const netProfit = totalRevenue - totalOperationalCosts;

    // Contagem de cachoeiras
    const waterfallCounts: Record<string, number> = {};
    let totalWaterfalls = 0;
    (proposalItems || []).forEach((i: any) => {
      const name = i.products?.name || i.title || "Cachoeira Desconhecida";
      waterfallCounts[name] = (waterfallCounts[name] || 0) + 1;
      totalWaterfalls++;
    });

    const pieData = Object.entries(waterfallCounts)
      .map(([name, count]) => ({
        name,
        value: count,
        percent: totalWaterfalls > 0 ? ((count / totalWaterfalls) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5

    // Distribuição por Meses
    const monthCounts: Record<string, number> = {};
    (proposals || []).forEach((p: any) => {
      const d = p.start_date ? new Date(p.start_date) : new Date(p.created_at);
      const mYear = `${d.toLocaleString("pt-BR", { month: "short" }).toUpperCase()} ${d.getFullYear()}`;
      monthCounts[mYear] = (monthCounts[mYear] || 0) + 1;
    });

    const barData = Object.entries(monthCounts)
      .map(([name, count]) => ({ name, grupos: count }))
      .reverse();

    return { pastGroups, futureGroups, totalPeople, totalRevenue, totalOperationalCosts, netProfit, pieData, barData };
  }, [proposals, proposalItems, costs, guideTripCosts]);

  if (isLoadingProposals || isLoadingItems) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando métricas...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Meu Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe seus passeios, receitas e estatísticas como guia parceiro.
        </p>
      </div>

      {guide && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-primary/10 text-primary px-3 py-1.5 flex items-center gap-2 rounded-full text-xs font-bold w-fit">
            <User className="h-4 w-4" />
            Vínculo Verificado: {guide.name}
          </div>
          <div className="bg-muted px-3 py-1.5 flex items-center gap-2 rounded-full text-xs font-bold w-fit text-muted-foreground">
            <Car className="h-4 w-4" />
            Veículo: {guide.has_4x4 ? "4x4 Próprio" : "Carro do Turista"}
          </div>
        </div>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-sm transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupos Concluídos</CardTitle>
            <Compass className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.pastGroups}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-sm transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupos Futuros</CardTitle>
            <Map className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{stats.futureGroups}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turistas Guiados</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{stats.totalPeople} <span className="text-sm font-medium opacity-50 block md:inline mt-1 text-muted-foreground">pessoas</span></div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-border/60 bg-gradient-to-br from-green-500/5 to-emerald-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Receita Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {stats.totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-[10px] text-green-600/70 mt-1 uppercase font-semibold">Valor Bruto Repassado</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-border/60 bg-gradient-to-br from-red-500/5 to-rose-500/10 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Custos Pessoais</CardTitle>
            <Car className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              {stats.totalOperationalCosts.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-[10px] text-red-600/70 mt-1 uppercase font-semibold">Operação e Combustível</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-border/60 bg-gradient-to-br from-blue-500/5 to-sky-500/10 border-blue-500/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Ganho Líquido (No Bolso)</CardTitle>
            <Map className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {stats.netProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-[10px] text-blue-600/70 mt-1 uppercase font-semibold">O que sobra limpo pós-passeio</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 pb-4 mb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              Top 5 Cachoeiras Mais Feitas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${percent}%)`}
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperClassName="font-sans text-xs" />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhum dado turístico ainda.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 pb-4 mb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              Passeios Mês a Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="grupos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhum histórico de passeios.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
