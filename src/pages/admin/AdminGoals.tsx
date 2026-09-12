import { APPROVED_PROPOSAL_STATUSES } from "@/lib/proposalStatus";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, Plus, Trash2, TrendingUp, Trophy, Search, Filter, Calendar, Users, Briefcase, ArrowUpRight, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { motion, AnimatePresence } from "framer-motion";

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
    queryKey: ["approved-proposals-totals"],
    queryFn: async () => {
      const { data } = await db.from("proposals").select("total, seller_id, created_at, segment").in("status", APPROVED_PROPOSAL_STATUSES);
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
      toast({ title: "Meta criada com sucesso!" });
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
  const pct = (sold: number, goal: number) => goal > 0 ? Math.min((sold / goal) * 100, 100) : (sold > 0 ? 100 : 0);

  const summaryCards = useMemo(() => {
    const segments = ["b2c", "b2b"] as const;
    return segments.flatMap(seg => {
      const monthGoal = goals.find(g => g.period_start === currentMonthStart && g.period_type === "monthly" && g.segment === seg && !g.seller_id);
      const yearGoal = goals.find(g => g.period_start === currentYearStart && g.period_type === "yearly" && g.segment === seg && !g.seller_id);
      const monthSold = getSold(null, currentMonthStart, "monthly", seg);
      const yearSold = getSold(null, currentYearStart, "yearly", seg);
      return [
        { label: `Meta Mês ${seg.toUpperCase()}`, sold: monthSold, goal: monthGoal?.goal_amount ?? 0, seg, period: "monthly" },
        { label: `Meta Ano ${seg.toUpperCase()}`, sold: yearSold, goal: yearGoal?.goal_amount ?? 0, seg, period: "yearly" },
      ];
    });
  }, [goals, acceptedProposals, currentMonthStart, currentYearStart]);

  const sellerRanking = useMemo(() => {
    return sellers.map(s => {
      const monthGoal = goals.find(g => g.period_start === currentMonthStart && g.period_type === "monthly" && g.seller_id === s.id && (filterSegment === "geral" ? g.segment === "geral" : g.segment === filterSegment));
      const sold = getSold(s.id, currentMonthStart, "monthly", filterSegment);
      const goalAmt = monthGoal?.goal_amount ?? 0;
      return { ...s, sold, goal: goalAmt, pct: pct(sold, goalAmt) };
    }).sort((a, b) => b.sold - a.sold); // Sort by total sold first
  }, [sellers, goals, acceptedProposals, currentMonthStart, filterSegment]);

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <Target className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Gestão de Metas</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Acompanhamento de performance e objetivos comerciais</p>
        </div>
        <Button 
          onClick={() => { setFormSeller("none"); setFormType("monthly"); setFormStart(currentMonthStart); setFormAmount(0); setFormSegment(filterSegment); setDialogOpen(true); }} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <Plus className="h-5 w-5" /> Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => {
          const p = pct(c.sold, c.goal);
          const isDone = p >= 100;
          return (
            <motion.div 
              key={i}
              whileHover={{ y: -4 }}
              className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${c.seg === "b2b" ? "text-blue-600" : "text-emerald-600"}`}>
                <Trophy className="h-24 w-24" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.seg === "b2b" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                  {c.seg.toUpperCase()} • {c.period === "monthly" ? "Mensal" : "Anual"}
                </Badge>
                {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{c.label}</p>
              <p className="text-2xl font-black text-admin-primary tracking-tighter mb-4">{R$(c.sold)}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className={isDone ? "text-emerald-600" : "text-admin-primary"}>{p.toFixed(0)}%</span>
                </div>
                <Progress value={p} className={`h-2 rounded-full ${isDone ? "bg-emerald-100" : "bg-admin-muted"}`} />
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">Meta: {R$(c.goal)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2rem] border-admin-border/60 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Evolução de Vendas vs Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} 
                    tickFormatter={v => `R$ ${v / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                    contentStyle={{ borderRadius: "1.5rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "1rem" }}
                    formatter={(v: number) => [<span className="font-black text-admin-primary">{R$(v)}</span>, ""]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: "10px", fontWeight: "black", textTransform: "uppercase", letterSpacing: "0.1em", paddingBottom: "20px" }}
                  />
                  <Bar dataKey="b2c" name="Vendido B2C" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                  <Bar dataKey="b2b" name="Vendido B2B" fill="#3b82f6" stackId="a" radius={[10, 10, 0, 0]} barSize={40} />
                  <ReferenceLine 
                    y={chartData[chartData.length - 1]?.meta || 0} 
                    stroke="#ef4444" 
                    strokeDasharray="8 8" 
                    label={{ position: "right", value: "META ATUAL", fill: "#ef4444", fontSize: 9, fontWeight: "black" }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-admin-border/60 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Top Performers
              </CardTitle>
              <Tabs value={filterSegment} onValueChange={setFilterSegment} className="w-full">
                <TabsList className="bg-admin-muted/40 p-1 rounded-xl w-full">
                  <TabsTrigger value="geral" className="flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg">Geral</TabsTrigger>
                  <TabsTrigger value="b2c" className="flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg">B2C</TabsTrigger>
                  <TabsTrigger value="b2b" className="flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg">B2B</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            {sellerRanking.length === 0 ? (
              <div className="py-12 text-center opacity-30 font-black text-[10px] uppercase tracking-widest">Aguardando dados...</div>
            ) : (
              sellerRanking.map((s, i) => (
                <div key={s.id} className="relative group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center ${i === 0 ? "bg-yellow-400 text-white shadow-lg shadow-yellow-400/30" : i === 1 ? "bg-slate-300 text-white" : "bg-admin-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <p className="text-sm font-black text-admin-primary uppercase tracking-tight">{s.name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-black tabular-nums border-none ${s.pct >= 100 ? "text-emerald-600 bg-emerald-50" : "text-admin-primary bg-admin-muted"}`}>
                      {s.pct.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <Progress value={s.pct} className={`h-1.5 rounded-full ${s.pct >= 100 ? "bg-emerald-100" : "bg-admin-muted"}`} />
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest opacity-60">
                      <span className="text-admin-primary tabular-nums">{R$(s.sold)}</span>
                      <span className="text-muted-foreground tabular-nums">Meta: {R$(s.goal)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/60">Detalhamento de Objetivos</h3>
          <div className="flex flex-wrap gap-4 items-center">
             <div className="relative group w-full lg:w-64">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
              <Select value={filterSeller} onValueChange={setFilterSeller}>
                <SelectTrigger className="pl-11 h-11 bg-admin-muted/40 border-none rounded-xl font-bold text-xs">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="all">Todos (Empresa)</SelectItem>
                  {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-8">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-admin-border/60 bg-admin-muted/30">
                <SmartTh label="Vendedor" sortKey="_seller" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => sellerName(r.seller_id)} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6" />
                <SmartTh label="Canal" sortKey="segment" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => segmentLabel(r.segment)} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6" />
                <SmartTh label="Tipo" sortKey="period_type" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => r.period_type === "monthly" ? "Mensal" : "Anual"} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-center" />
                <SmartTh label="Período" sortKey="period_start" filterState={goalsFilterState} data={filteredGoals} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-center" />
                <SmartTh label="Meta (R$)" sortKey="goal_amount" filterState={goalsFilterState} data={filteredGoals} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-right" />
                <SmartTh label="Vendido (R$)" sortKey="_sold" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => getSold(r.seller_id, r.period_start, r.period_type, r.segment)} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-right" />
                <SmartTh label="Status" sortKey="_pct" filterState={goalsFilterState} data={filteredGoals} valueExtractor={(r: any) => pct(getSold(r.seller_id, r.period_start, r.period_type, r.segment), r.goal_amount)} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-center" />
                <th className="p-6 w-20" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/40">
              {filteredGoals.map(g => {
                const sold = getSold(g.seller_id, g.period_start, g.period_type, g.segment);
                const p = pct(sold, g.goal_amount);
                return (
                  <TableRow key={g.id} className="group hover:bg-admin-muted/50 transition-all duration-300">
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${!g.seller_id ? "bg-admin-primary/10 text-admin-primary" : "bg-slate-100 text-slate-400"}`}>
                          {!g.seller_id ? <Briefcase className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </div>
                        <span className="font-black text-admin-primary uppercase tracking-tight">{sellerName(g.seller_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${g.segment === "b2b" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                        {segmentLabel(g.segment)}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-6 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest">{g.period_type === "monthly" ? "Mensal" : "Anual"}</TableCell>
                    <TableCell className="p-6 text-center font-mono font-bold text-admin-primary/60 text-xs">{format(new Date(g.period_start), "MMM/yy", { locale: ptBR }).toUpperCase()}</TableCell>
                    <TableCell className="p-6 text-right font-black tabular-nums text-admin-primary/80">{R$(g.goal_amount)}</TableCell>
                    <TableCell className="p-6 text-right font-black tabular-nums text-admin-primary tracking-tight">{R$(sold)}</TableCell>
                    <TableCell className="p-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-black tabular-nums ${p >= 100 ? "text-emerald-600" : p >= 50 ? "text-yellow-600" : "text-destructive"}`}>
                          {p.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1 bg-admin-muted rounded-full overflow-hidden">
                          <div className={`h-full ${p >= 100 ? "bg-emerald-500" : p >= 50 ? "bg-yellow-500" : "bg-destructive"}`} style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-6">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive hover:text-white transition-all">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Remover Objetivo?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium text-muted-foreground">
                                Deseja realmente remover a meta de <strong>{R$(g.goal_amount)}</strong> para <strong>{sellerName(g.seller_id)}</strong>? O histórico de performance para este período será perdido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteGoal.mutate(g.id)}
                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]"
                              >
                                Confirmar Remoção
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredGoals.length === 0 && (
                <TableRow><TableCell colSpan={8} className="p-20 text-center opacity-30 font-black text-[10px] uppercase tracking-widest">Nenhuma meta configurada para este filtro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Target className="h-24 w-24" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Nova Meta Comercial</DialogTitle>
              <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Defina o objetivo para alavancar os resultados</p>
            </DialogHeader>
          </div>
          
          <form className="p-8 space-y-6" onSubmit={e => { e.preventDefault(); createGoal.mutate(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Canal de Venda</Label>
                <Select value={formSegment} onValueChange={setFormSegment}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="b2c">B2C</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vendedor</Label>
                <Select value={formSeller} onValueChange={setFormSeller}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl max-h-[200px]">
                    <SelectItem value="none">Geral (Empresa)</SelectItem>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Frequência</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Início do Período</Label>
                <DatePicker value={formStart} onChange={setFormStart} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor do Objetivo (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-black tabular-nums text-lg text-admin-primary" 
                  value={formAmount} 
                  onChange={e => setFormAmount(Number(e.target.value))} 
                  required 
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
              <Button type="submit" className="flex-[2] h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20">Ativar Nova Meta</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
