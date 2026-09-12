import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Percent, TrendingUp, Target, Activity, PieChart, Users, FileText, ChevronRight, Filter, Calendar } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { useFinanceData } from "./finance/useFinanceData";
import {
  filterProposals, calcOverviewKPIs, calcMonthlyEvolution,
  calcGuideRanking, calcCategoryBreakdown, calcProductRanking,
  calcProposalProfit, fmt, fmtPct,
} from "./finance/financeCalcs";
import { exportOverview, exportGuideRanking, exportCategories, exportProducts } from "./finance/financeExport";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminFinanceLucroMargem() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(subMonths(startOfMonth(now), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [segment, setSegment] = useState("all");
  const [tab, setTab] = useState<"dre" | "proposals" | "guides" | "categories">("dre");
  
  const proposalFilterState = useSmartFilters();
  const guideFilterState = useSmartFilters();
  const categoryFilterState = useSmartFilters();

  const { proposals, dayItems, proposalCosts, guides, products } = useFinanceData();

  const fd = useMemo(() => filterProposals(proposals, dayItems, proposalCosts, dateFrom, dateTo, segment), [proposals, dayItems, proposalCosts, dateFrom, dateTo, segment]);
  const kpis = useMemo(() => calcOverviewKPIs(fd, proposalCosts), [fd, proposalCosts]);
  const monthlyData = useMemo(() => calcMonthlyEvolution(proposals, proposalCosts, dayItems, dateFrom, dateTo, segment), [proposals, proposalCosts, dayItems, dateFrom, dateTo, segment]);
  const guideRanking = useMemo(() => calcGuideRanking(fd, guides, proposalCosts), [fd, guides, proposalCosts]);
  const categoryData = useMemo(() => calcCategoryBreakdown(fd), [fd]);

  const proposalMargins = useMemo(() => {
    return fd.accepted.map(p => {
      const pf = calcProposalProfit(p, fd.dayItems, proposalCosts);
      return { id: p.id, title: p.title, segment: p.segment, revenue: pf.revenue, cost: pf.revenue - pf.profit, profit: pf.profit, margin: pf.margin, resultIncomplete: pf.resultIncomplete, missingAccommodationCommissions: pf.missingAccommodationCommissions };
    }).sort((a, b) => b.profit - a.profit);
  }, [fd, proposalCosts]);

  const hasIncompleteResults = kpis.resultIncomplete || monthlyData.some(m => m.resultIncomplete);

  const marginEvolution = useMemo(() => monthlyData.map(m => ({
    ...m,
    margem: m.receita > 0 ? ((m.lucro / m.receita) * 100) : 0,
  })), [monthlyData]);

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
                  {p.name.includes('%') || p.name.includes('Margem') ? `${p.value.toFixed(1)}%` : fmt(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

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
              <Activity className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Lucro & Margem</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Rentabilidade das propostas aprovadas; os valores não representam recebimentos realizados.</p>
        </div>
        <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2" disabled={hasIncompleteResults} title={hasIncompleteResults ? "Complete as comissões de hospedagem antes de exportar o resultado consolidado." : undefined} onClick={() => exportOverview(kpis, monthlyData)}>
          <Download className="h-4 w-4" /> Exportar Análise
        </Button>
      </div>

      {hasIncompleteResults && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Resultado incompleto</strong> — Há comissões de hospedagem sem dado nas propostas ou no histórico exibido.
          Lucro, custos derivados, margem e ROI são parciais; os valores não comprovam o lucro final.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div className="lg:col-span-1 bg-white border border-admin-border/60 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <FileText className="h-32 w-32 text-admin-primary" />
          </div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-admin-primary/10">
              <FileText className="h-4 w-4 text-admin-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">DRE Operacional</h2>
          </div>
          <div className="space-y-6 relative">
            <div className="flex justify-between items-baseline py-2 border-b border-admin-border/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Receita Bruta</span>
              <span className="text-lg font-black text-green-600 tabular-nums">{fmt(kpis.revenue)}</span>
            </div>
            <div className="flex justify-between items-baseline py-2 border-b border-admin-border/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Custos Totais</span>
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Op + Comissões</span>
              </div>
              <span className="text-lg font-black text-destructive tabular-nums">{fmt(kpis.totalCost)}</span>
            </div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-admin-primary/[0.03] p-6 rounded-[2rem] border border-admin-primary/10"
            >
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary/60">{kpis.resultIncomplete ? "Lucro parcial" : "Lucro Líquido"}</span>
                <span className={`text-2xl font-black tabular-nums ${kpis.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {fmt(kpis.profit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Margem</p>
                  <p className={`text-sm font-black ${kpis.margin >= 0 ? "text-green-600" : "text-destructive"}`}>{fmtPct(kpis.margin)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">ROI</p>
                  <p className={`text-sm font-black ${kpis.roi >= 0 ? "text-green-600" : "text-destructive"}`}>{fmtPct(kpis.roi)}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Evolução da Margem</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Rentabilidade percentual mensal</p>
            </div>
            <div className="p-2 rounded-xl bg-admin-primary/10">
              <Percent className="h-4 w-4 text-admin-primary" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marginEvolution} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorMargem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--admin-primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--admin-primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="margem" name="Margem %" stroke="hsl(var(--admin-primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorMargem)" dot={{ r: 4, fill: "white", stroke: "hsl(var(--admin-primary))", strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 p-1.5 bg-admin-muted/40 rounded-2xl w-fit">
          {[
            { key: "dre", label: "Visão Geral", icon: FileText },
            { key: "proposals", label: "Por Proposta", icon: DollarSign },
            { key: "guides", label: "Por Guia", icon: Users },
            { key: "categories", label: "Por Categoria", icon: PieChart }
          ].map(t => (
            <Button 
              key={t.key} 
              variant="ghost" 
              size="sm" 
              className={`h-10 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all gap-2 ${tab === t.key ? "bg-white text-admin-primary shadow-sm" : "text-muted-foreground/60 hover:text-admin-primary"}`}
              onClick={() => setTab(t.key as any)}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </Button>
          ))}
        </div>

        <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto">
            {tab === "proposals" && (
              <Table className="w-full text-sm border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                    <SmartTh label="Proposta" sortKey="title" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                    <SmartTh label="Segmento" sortKey="segment" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                    <SmartTh label="Receita" sortKey="revenue" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Custo" sortKey="cost" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Lucro" sortKey="profit" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Margem" sortKey="margin" filterState={proposalFilterState} data={proposalMargins} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {proposalFilterState.applyFilters(proposalMargins).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhum dado encontrado</TableCell></TableRow>
                  ) : (
                    proposalFilterState.applyFilters(proposalMargins).map((p: any) => (
                      <TableRow key={p.id} className="group transition-all duration-300 hover:bg-admin-muted/50">
                        <TableCell className="p-4 font-bold text-admin-primary">{p.title}{p.resultIncomplete && <span className="block text-xs font-medium text-amber-800">Resultado incompleto — {p.missingAccommodationCommissions} comissão(ões) de hospedagem sem dado</span>}</TableCell>
                        <TableCell className="p-4">
                          <Badge variant="outline" className="rounded-lg bg-admin-muted/60 text-[10px] font-black text-admin-primary/60 px-2 uppercase tracking-tighter">
                            {p.segment}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4 text-right font-bold text-admin-primary/80 tabular-nums">{fmt(p.revenue)}</TableCell>
                        <TableCell className="p-4 text-right font-bold text-destructive/60 tabular-nums">{fmt(p.cost)}</TableCell>
                        <TableCell className={`p-4 text-right font-black tabular-nums ${p.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {fmt(p.profit)}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-black tabular-nums ${p.margin >= 0 ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                            {fmtPct(p.margin)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {tab === "guides" && (
              <><p className="px-4 py-3 text-xs text-muted-foreground">Resultado das propostas associadas a cada guia, incluindo os custos completos do roteiro. Propostas com mais de um guia aparecem em mais de uma linha; não some as linhas.</p><Table className="w-full text-sm border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                    <SmartTh label="Guia" sortKey="name" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                    <SmartTh label="Propostas" sortKey="proposals" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Faturamento" sortKey="revenue" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Lucro" sortKey="profit" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Margem" sortKey="margin" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="ROI" sortKey="roi" filterState={guideFilterState} data={guideRanking} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {guideFilterState.applyFilters(guideRanking).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhum dado encontrado</TableCell></TableRow>
                  ) : (
                    guideFilterState.applyFilters(guideRanking).map((g: any) => (
                      <TableRow key={g.id} className="group transition-all duration-300 hover:bg-admin-muted/50">
                        <TableCell className="p-4 font-bold text-admin-primary">{g.name}{g.resultIncomplete && <span className="block text-xs font-medium text-amber-800">Resultado incompleto — {g.incompleteProposals} proposta(s) com comissão de hospedagem sem dado</span>}</TableCell>
                        <TableCell className="p-4 text-right font-black text-admin-primary/40 tabular-nums">{g.proposals}</TableCell>
                        <TableCell className="p-4 text-right font-bold text-admin-primary/80 tabular-nums">{fmt(g.revenue)}</TableCell>
                        <TableCell className={`p-4 text-right font-black tabular-nums ${g.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {fmt(g.profit)}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-black tabular-nums ${g.margin >= 0 ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                            {fmtPct(g.margin)}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4 text-right font-bold text-admin-primary/60 tabular-nums">{fmtPct(g.roi)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table></>
            )}

            {tab === "categories" && (
              <Table className="w-full text-sm border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                    <SmartTh label="Categoria" sortKey="category" filterState={categoryFilterState} data={categoryData} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                    <SmartTh label="Faturamento" sortKey="revenue" filterState={categoryFilterState} data={categoryData} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="Quantidade" sortKey="count" filterState={categoryFilterState} data={categoryData} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                    <SmartTh label="% de Participação" sortKey="percent" filterState={categoryFilterState} data={categoryData} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {categoryFilterState.applyFilters(categoryData).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhum dado encontrado</TableCell></TableRow>
                  ) : (
                    categoryFilterState.applyFilters(categoryData).map((c: any) => (
                      <TableRow key={c.category} className="group transition-all duration-300 hover:bg-admin-muted/50">
                        <TableCell className="p-4 font-bold text-admin-primary uppercase tracking-tight">{c.category}</TableCell>
                        <TableCell className="p-4 text-right font-black text-admin-primary/80 tabular-nums">{fmt(c.revenue)}</TableCell>
                        <TableCell className="p-4 text-right font-bold text-admin-primary/40 tabular-nums">{c.count}</TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 h-1.5 bg-admin-muted rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${c.percent}%` }}
                                className="h-full bg-admin-primary opacity-60" 
                              />
                            </div>
                            <span className="text-[10px] font-black text-admin-primary/60 tabular-nums">{fmtPct(c.percent)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {tab === "dre" && (
               <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-[2rem] bg-admin-primary/5">
                    <FileText className="h-12 w-12 text-admin-primary/20" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-admin-primary/80 uppercase tracking-widest">Resumo Consolidado</p>
                    <p className="text-xs text-muted-foreground font-medium italic">Selecione as outras abas para detalhamento granular</p>
                  </div>
                  <div className="pt-8 grid grid-cols-2 gap-8 w-full max-w-2xl">
                    <div className="text-left space-y-2 p-6 rounded-3xl bg-admin-muted/20">
                      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Ponto de Equilíbrio</p>
                      <p className="text-xl font-black text-admin-primary tabular-nums">{fmt(kpis.totalCost)}</p>
                    </div>
                    <div className="text-left space-y-2 p-6 rounded-3xl bg-admin-muted/20">
                      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Eficiência ROI</p>
                      <p className={`text-xl font-black tabular-nums ${kpis.roi >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmtPct(kpis.roi)}
                      </p>
                    </div>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
