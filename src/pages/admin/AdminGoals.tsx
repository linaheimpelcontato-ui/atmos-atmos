import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, Plus, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";

const db = supabase as any;

type Seller = { id: string; name: string };
type Goal = { id: string; seller_id: string | null; period_type: string; period_start: string; goal_amount: number; segment: string };

const R$ = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export default function AdminGoals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSeller, setFilterSeller] = useState("all");
  const [filterSegment, setFilterSegment] = useState("geral");
  const [formSeller, setFormSeller] = useState<string>("none");
  const [formType, setFormType] = useState("monthly");
  const [formStart, setFormStart] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formSegment, setFormSegment] = useState("geral");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers-active"],
    queryFn: async () => {
      const { data } = await db.from("sellers").select("id, name").eq("is_active", true).order("name");
      return (data || []) as Seller[];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["sales-goals"],
    queryFn: async () => {
      const { data } = await db.from("sales_goals").select("*").order("period_start", { ascending: false });
      return (data || []) as Goal[];
    },
  });

  const { data: acceptedProposals = [] } = useQuery({
    queryKey: ["accepted-proposals-totals"],
    queryFn: async () => {
      const { data } = await db.from("proposals").select("total, seller_id, created_at, segment").eq("status", "accepted");
      return (data || []) as { total: number; seller_id: string | null; created_at: string; segment: string }[];
    },
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("sales_goals").insert({
        seller_id: formSeller === "none" ? null : formSeller,
        period_type: formType,
        period_start: formStart,
        goal_amount: formAmount,
        segment: formSegment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals"] });
      setDialogOpen(false);
      toast({ title: "Meta criada" });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("sales_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals"] });
      toast({ title: "Meta removida" });
    },
  });

  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const currentYearStart = `${now.getFullYear()}-01-01`;

  const getSold = (sellerId: string | null, periodStart: string, periodType: string, segment: string) => {
    const start = new Date(periodStart);
    const end = periodType === "monthly"
      ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
      : new Date(start.getFullYear() + 1, 0, 1);
    return acceptedProposals
      .filter(p => {
        const d = new Date(p.created_at);
        const inPeriod = d >= start && d < end;
        const matchSeller = sellerId ? p.seller_id === sellerId : true;
        const matchSegment = segment === "geral" ? true : p.segment === segment;
        return inPeriod && matchSeller && matchSegment;
      })
      .reduce((s, p) => s + Number(p.total), 0);
  };

  const sellerName = (id: string | null) => id ? (sellers.find(s => s.id === id)?.name ?? "—") : "Geral (Empresa)";
  const segmentLabel = (s: string) => s === "b2c" ? "B2C" : s === "b2b" ? "B2B" : "Geral";
  const pct = (sold: number, goal: number) => goal > 0 ? Math.min((sold / goal) * 100, 100) : 0;

  // 4 summary cards
  const summaryCards = useMemo(() => {
    const segments = ["b2c", "b2b"] as const;
    return segments.flatMap(seg => {
      const monthGoal = goals.find(g => g.period_start === currentMonthStart && g.period_type === "monthly" && g.segment === seg && !g.seller_id);
      const yearGoal = goals.find(g => g.period_start === currentYearStart && g.period_type === "yearly" && g.segment === seg && !g.seller_id);
      const monthSold = getSold(null, currentMonthStart, "monthly", seg);
      const yearSold = getSold(null, currentYearStart, "yearly", seg);
      return [
        { label: `Mês ${seg.toUpperCase()}`, sold: monthSold, goal: monthGoal?.goal_amount ?? 0, seg },
        { label: `Ano ${seg.toUpperCase()}`, sold: yearSold, goal: yearGoal?.goal_amount ?? 0, seg },
      ];
    });
  }, [goals, acceptedProposals, currentMonthStart, currentYearStart]);

  // Seller ranking
  const sellerRanking = useMemo(() => {
    return sellers.map(s => {
      const monthGoal = goals.find(g => g.period_start === currentMonthStart && g.period_type === "monthly" && g.seller_id === s.id && (filterSegment === "geral" ? g.segment === "geral" : g.segment === filterSegment));
      const sold = getSold(s.id, currentMonthStart, "monthly", filterSegment);
      const goalAmt = monthGoal?.goal_amount ?? 0;
      return { ...s, sold, goal: goalAmt, pct: pct(sold, goalAmt) };
    }).sort((a, b) => b.pct - a.pct);
  }, [sellers, goals, acceptedProposals, currentMonthStart, filterSegment]);

  // Chart data - last 6 months
  const chartData = useMemo(() => {
    const months: { name: string; b2c: number; b2b: number; meta: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const ms = format(startOfMonth(d), "yyyy-MM-dd");
      const b2c = getSold(null, ms, "monthly", "b2c");
      const b2b = getSold(null, ms, "monthly", "b2b");
      const goalB2C = goals.find(g => g.period_start === ms && g.period_type === "monthly" && g.segment === "b2c" && !g.seller_id)?.goal_amount ?? 0;
      const goalB2B = goals.find(g => g.period_start === ms && g.period_type === "monthly" && g.segment === "b2b" && !g.seller_id)?.goal_amount ?? 0;
      months.push({
        name: format(d, "MMM", { locale: ptBR }),
        b2c,
        b2b,
        meta: goalB2C + goalB2B,
      });
    }
    return months;
  }, [goals, acceptedProposals]);

  const goalsFilterState = useSmartFilters();

  const filteredGoals = useMemo(() => {
    const base = goals.filter(g => {
      const matchSeller = filterSeller === "all" ? true : (filterSeller === "none" ? !g.seller_id : g.seller_id === filterSeller);
      const matchSegment = g.segment === filterSegment;
      return matchSeller && matchSegment;
    });
    return goalsFilterState.applyFilters(base);
  }, [goals, filterSeller, filterSegment, goalsFilterState]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Metas de Vendas</h1>
        </div>
        <Button size="sm" onClick={() => { setFormSeller("none"); setFormType("monthly"); setFormStart(currentMonthStart); setFormAmount(0); setFormSegment(filterSegment); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Meta
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => {
          const p = pct(c.sold, c.goal);
          return (
            <Card key={i} className="relative overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                  <Badge variant="outline" className={`text-[9px] ${c.seg === "b2b" ? "border-blue-400 text-blue-600" : "border-emerald-400 text-emerald-600"}`}>
                    {c.seg.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-lg font-bold">R$ {R$(c.sold)}</p>
                <div className="flex items-center gap-2">
                  <Progress value={p} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-medium text-muted-foreground">{p.toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Meta: R$ {R$(c.goal)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R$ ${R$(v)}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="b2c" name="B2C" fill="hsl(152, 57%, 42%)" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="b2b" name="B2B" fill="hsl(217, 91%, 60%)" stackId="a" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={chartData[chartData.length - 1]?.meta || 0} stroke="hsl(0, 0%, 50%)" strokeDasharray="4 4" label={{ value: "Meta", fontSize: 10, fill: "hsl(0,0%,50%)" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Seller Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Ranking de Vendedores (Mês)
            </CardTitle>
            <Tabs value={filterSegment} onValueChange={setFilterSegment}>
              <TabsList className="h-8">
                <TabsTrigger value="geral" className="text-xs px-2 h-6">Geral</TabsTrigger>
                <TabsTrigger value="b2c" className="text-xs px-2 h-6">B2C</TabsTrigger>
                <TabsTrigger value="b2b" className="text-xs px-2 h-6">B2B</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {sellerRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vendedor ativo</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sellerRanking.map((s, i) => (
                <div key={s.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium">{s.name}</p>
                    </div>
                    <span className={`text-xs font-semibold ${s.pct >= 100 ? "text-green-600" : s.pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                      {s.pct.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={s.pct} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>R$ {R$(s.sold)}</span>
                    <span>Meta: R$ {R$(s.goal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Select value={filterSeller} onValueChange={setFilterSeller}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Filtrar vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Geral (Empresa)</SelectItem>
              {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-card sticky top-0 z-10">
              <tr>
                <SmartTh label="Vendedor" sortKey="_seller" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => sellerName(r.seller_id)} />
                <SmartTh label="Canal" sortKey="segment" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => segmentLabel(r.segment)} className="hidden md:table-cell" />
                <SmartTh label="Tipo" sortKey="period_type" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => r.period_type === "monthly" ? "Mensal" : "Anual"} className="hidden md:table-cell" />
                <SmartTh label="Período" sortKey="period_start" filterState={goalsFilterState} data={filteredGoals} className="hidden sm:table-cell" />
                <SmartTh label="Meta (R$)" sortKey="goal_amount" filterState={goalsFilterState} data={filteredGoals} />
                <SmartTh label="Vendido (R$)" sortKey="_sold" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => getSold(r.seller_id, r.period_start, r.period_type, r.segment)} />
                <SmartTh label="%" sortKey="_pct" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => pct(getSold(r.seller_id, r.period_start, r.period_type, r.segment), r.goal_amount)} />
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {filteredGoals.map(g => {
                const sold = getSold(g.seller_id, g.period_start, g.period_type, g.segment);
                const p = pct(sold, g.goal_amount);
                return (
                  <tr key={g.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{sellerName(g.seller_id)}</td>
                    <td className="p-3 hidden md:table-cell">{segmentLabel(g.segment)}</td>
                    <td className="p-3 hidden md:table-cell">{g.period_type === "monthly" ? "Mensal" : "Anual"}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{new Date(g.period_start).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right font-medium">{R$(Number(g.goal_amount))}</td>
                    <td className="p-3 text-right">{R$(sold)}</td>
                    <td className="p-3 text-right">
                      <span className={p >= 100 ? "text-green-600 font-medium" : p >= 50 ? "text-yellow-600" : "text-red-600"}>
                        {p.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Meta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja realmente remover a meta de <strong>R$ {R$(g.goal_amount)}</strong> para <strong>{sellerName(g.seller_id)}</strong>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteGoal.mutate(g.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                );
              })}
              {filteredGoals.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhuma meta cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); createGoal.mutate(); }}>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={formSegment} onValueChange={setFormSegment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="b2c">B2C</SelectItem>
                  <SelectItem value="b2b">B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={formSeller} onValueChange={setFormSeller}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geral (Empresa)</SelectItem>
                  {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início do período</Label>
              <DatePicker value={formStart} onChange={setFormStart} />
            </div>
            <div className="space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <Input type="number" min={0} step="0.01" value={formAmount} onChange={e => setFormAmount(Number(e.target.value))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
