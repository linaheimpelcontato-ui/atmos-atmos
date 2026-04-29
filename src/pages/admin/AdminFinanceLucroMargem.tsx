import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Percent, TrendingUp, Target } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useFinanceData } from "./finance/useFinanceData";
import {
  filterProposals, calcOverviewKPIs, calcMonthlyEvolution,
  calcGuideRanking, calcCategoryBreakdown, calcProductRanking,
  calcProposalProfit, fmt, fmtPct,
} from "./finance/financeCalcs";
import { exportOverview, exportGuideRanking, exportCategories, exportProducts } from "./finance/financeExport";

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

  // Per-proposal margin
  const proposalMargins = useMemo(() => {
    return fd.accepted.map(p => {
      const pf = calcProposalProfit(p, fd.dayItems, proposalCosts);
      return { id: p.id, title: p.title, segment: p.segment, revenue: pf.revenue, cost: pf.revenue - pf.profit, profit: pf.profit, margin: pf.margin };
    }).sort((a, b) => b.profit - a.profit);
  }, [fd, proposalCosts]);

  const marginEvolution = useMemo(() => monthlyData.map(m => ({
    ...m,
    margem: m.receita > 0 ? ((m.lucro / m.receita) * 100) : 0,
  })), [monthlyData]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold">Lucro & Margem</h1>

      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-4">
        <div className="space-y-1"><Label className="text-xs">De</Label><DatePicker size="sm" className="w-36" value={dateFrom} onChange={setDateFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><DatePicker size="sm" className="w-36" value={dateTo} onChange={setDateTo} /></div>
        <div className="space-y-1"><Label className="text-xs">Segmento</Label>
          <Select value={segment} onValueChange={setSegment}><SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {/* DRE Summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">DRE — Demonstração de Resultado</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border"><span className="font-medium">Receita Bruta</span><span className="text-green-600 font-bold">{fmt(kpis.revenue)}</span></div>
          <div className="flex justify-between py-1 border-b border-border pl-4"><span className="text-muted-foreground">(-) Custos Totais</span><span className="text-destructive">{fmt(kpis.totalCost)}</span></div>
          <div className={`flex justify-between py-2 border-t-2 border-border font-bold text-base ${kpis.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
            <span>Lucro Líquido</span><span>{fmt(kpis.profit)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground"><span>Margem</span><span>{fmtPct(kpis.margin)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>ROI</span><span>{fmtPct(kpis.roi)}</span></div>
        </div>
      </div>

      {/* Margin evolution chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Evolução da Margem (%)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={marginEvolution}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Line type="monotone" dataKey="margem" name="Margem %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: "proposals", label: "Por Proposta" }, { key: "guides", label: "Por Guia" }, { key: "categories", label: "Por Categoria" }].map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setTab(t.key as any)}>{t.label}</Button>
        ))}
      </div>

      {/* Per proposal */}
      {tab === "proposals" && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
          <Table>
            <TableHeader><TableRow>
              <SmartTableHead label="Proposta" sortKey="title" filterState={proposalFilterState} data={proposalMargins} className="text-xs" />
              <SmartTableHead label="Segmento" sortKey="segment" filterState={proposalFilterState} data={proposalMargins} className="text-xs" />
              <SmartTableHead label="Receita" sortKey="revenue" filterState={proposalFilterState} data={proposalMargins} className="text-xs text-right" />
              <SmartTableHead label="Custo" sortKey="cost" filterState={proposalFilterState} data={proposalMargins} className="text-xs text-right" />
              <SmartTableHead label="Lucro" sortKey="profit" filterState={proposalFilterState} data={proposalMargins} className="text-xs text-right" />
              <SmartTableHead label="Margem" sortKey="margin" filterState={proposalFilterState} data={proposalMargins} className="text-xs text-right" />
            </TableRow></TableHeader>
            <TableBody>
              {proposalFilterState.applyFilters(proposalMargins).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
              : proposalFilterState.applyFilters(proposalMargins).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-medium">{p.title}</TableCell>
                  <TableCell className="text-xs uppercase">{p.segment}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(p.revenue)}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(p.cost)}</TableCell>
                  <TableCell className={`text-xs text-right font-medium ${p.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(p.profit)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtPct(p.margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Per guide */}
      {tab === "guides" && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
          <Table>
            <TableHeader><TableRow>
              <SmartTableHead label="Guia" sortKey="name" filterState={guideFilterState} data={guideRanking} className="text-xs" />
              <SmartTableHead label="Propostas" sortKey="proposals" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
              <SmartTableHead label="Faturamento" sortKey="revenue" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
              <SmartTableHead label="Custo Guia" sortKey="guideCost" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
              <SmartTableHead label="Lucro" sortKey="profit" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
              <SmartTableHead label="Margem" sortKey="margin" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
              <SmartTableHead label="ROI" sortKey="roi" filterState={guideFilterState} data={guideRanking} className="text-xs text-right" />
            </TableRow></TableHeader>
            <TableBody>
              {guideFilterState.applyFilters(guideRanking).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
              : guideFilterState.applyFilters(guideRanking).map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="text-xs font-medium">{g.name}</TableCell>
                  <TableCell className="text-xs text-right">{g.proposals}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(g.revenue)}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(g.guideCost)}</TableCell>
                  <TableCell className={`text-xs text-right font-medium ${g.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(g.profit)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtPct(g.margin)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtPct(g.roi)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "categories" && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
          <Table>
            <TableHeader><TableRow>
              <SmartTableHead label="Categoria" sortKey="category" filterState={categoryFilterState} data={categoryData} className="text-xs" />
              <SmartTableHead label="Faturamento" sortKey="revenue" filterState={categoryFilterState} data={categoryData} className="text-xs text-right" />
              <SmartTableHead label="Qtd" sortKey="count" filterState={categoryFilterState} data={categoryData} className="text-xs text-right" />
              <SmartTableHead label="% Total" sortKey="percent" filterState={categoryFilterState} data={categoryData} className="text-xs text-right" />
            </TableRow></TableHeader>
            <TableBody>
              {categoryFilterState.applyFilters(categoryData).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
              : categoryFilterState.applyFilters(categoryData).map((c: any) => (
                <TableRow key={c.category}>
                  <TableCell className="text-xs font-medium">{c.category}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(c.revenue)}</TableCell>
                  <TableCell className="text-xs text-right">{c.count}</TableCell>
                  <TableCell className="text-xs text-right">{fmtPct(c.percent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
