import { isApprovedProposalStatus } from "@/lib/proposalStatus";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart as BarChartIcon, Printer, Sparkles, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;
const COLORS = ["hsl(217 91% 60%)", "hsl(142 71% 45%)", "hsl(45 93% 58%)", "hsl(0 84% 60%)", "hsl(280 67% 55%)", "hsl(190 80% 50%)"];

export default function AdminReports() {
  const { toast } = useToast();
  const [segment, setSegment] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stages, setStages] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    let stageQ = db.from("pipeline_stages").select("*").order("position");
    let prospectQ = db.from("prospects").select("id, stage_id, country, segment, source, potential, seller_id, created_at")
      .gte("created_at", dateFrom + "T00:00:00").lte("created_at", dateTo + "T23:59:59");
    let proposalQ = db.from("proposals").select("id, total, status, segment, seller_id, created_at")
      .gte("created_at", dateFrom + "T00:00:00").lte("created_at", dateTo + "T23:59:59");
    const sellersQ = db.from("sellers").select("id, name").eq("is_active", true).order("name");

    if (segment !== "all") {
      stageQ = stageQ.eq("segment", segment);
      prospectQ = prospectQ.eq("segment", segment);
      proposalQ = proposalQ.eq("segment", segment);
    }
    if (sellerId !== "all") {
      prospectQ = prospectQ.eq("seller_id", sellerId);
      proposalQ = proposalQ.eq("seller_id", sellerId);
    }

    const [{ data: stData }, { data: prData }, { data: propData }, { data: sData }] = await Promise.all([stageQ, prospectQ, proposalQ, sellersQ]);
    setStages(stData ?? []);
    setProspects(prData ?? []);
    setProposals(propData ?? []);
    setSellers(sData ?? []);
  }, [segment, sellerId, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pipeline pie
  const pipelineData = stages.map(s => ({
    name: s.name, value: prospects.filter(p => p.stage_id === s.id).length, color: s.color,
  })).filter(d => d.value > 0);

  // Source pie
  const sourceCounts: Record<string, number> = {};
  prospects.forEach(p => { sourceCounts[p.source] = (sourceCounts[p.source] || 0) + 1; });
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  // Country bar
  const countryCounts: Record<string, number> = {};
  prospects.forEach(p => { countryCounts[p.country || "Não informado"] = (countryCounts[p.country || "Não informado"] || 0) + 1; });
  const countryData = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Revenue & potential
  const acceptedRevenue = proposals.filter(p => isApprovedProposalStatus(p.status)).reduce((s, p) => s + Number(p.total), 0);
  const potentialCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  prospects.forEach(p => { potentialCounts[p.potential || "medium"]++; });
  const potentialData = [
    { name: "Alto", value: potentialCounts.high, color: "hsl(142 71% 45%)" },
    { name: "Médio", value: potentialCounts.medium, color: "hsl(45 93% 58%)" },
    { name: "Baixo", value: potentialCounts.low, color: "hsl(0 84% 60%)" },
  ].filter(d => d.value > 0);

  // Seller ranking
  const sellerRevenue: Record<string, number> = {};
  proposals.filter(p => isApprovedProposalStatus(p.status)).forEach(p => {
    if (p.seller_id) sellerRevenue[p.seller_id] = (sellerRevenue[p.seller_id] || 0) + Number(p.total);
  });
  const sellerRanking = sellers.map(s => ({ name: s.name, value: sellerRevenue[s.id] || 0 })).sort((a, b) => b.value - a.value).slice(0, 5);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handlePrint = () => window.print();

  const handleAiInsights = async () => {
    setAiLoading(true);
    setAiInsights(null);
    try {
      const payload = {
        period: `${dateFrom} a ${dateTo}`,
        segment,
        totalProspects: prospects.length,
        totalProposals: proposals.length,
        acceptedRevenue,
        conversionRate: proposals.length > 0 ? ((proposals.filter(p => isApprovedProposalStatus(p.status)).length / proposals.length) * 100).toFixed(1) : "0",
        topCountries: countryData.slice(0, 5),
        topSources: sourceData.slice(0, 5),
        sellerRanking: sellerRanking.slice(0, 3),
        pipelineDistribution: pipelineData,
      };
      const { data, error } = await supabase.functions.invoke("report-insights", { body: payload });
      if (error) throw error;
      setAiInsights(data?.insights || "Sem insights disponíveis.");
    } catch (err: any) {
      toast({ title: "Erro ao gerar insights", description: err.message || String(err), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Relatórios</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Exportar PDF</Button>
          <Button size="sm" onClick={handleAiInsights} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Insights IA
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <DatePicker size="sm" className="w-36" value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <DatePicker size="sm" className="w-36" value={dateTo} onChange={setDateTo} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Segmento</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vendedor</Label>
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Insights de IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground whitespace-pre-line">{aiInsights}</div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{prospects.length}</p><p className="text-sm text-muted-foreground">Total Prospects</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{proposals.length}</p><p className="text-sm text-muted-foreground">Total Propostas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{fmt(acceptedRevenue)}</p><p className="text-sm text-muted-foreground">Valor aprovado</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{Object.keys(countryCounts).length}</p><p className="text-sm text-muted-foreground">Países</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline por Etapa</CardTitle></CardHeader>
          <CardContent>
            {pipelineData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                  {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Source pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por Origem</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Country bar */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por País</CardTitle></CardHeader>
          <CardContent>
            {countryData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={countryData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip /><Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Seller ranking */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking Vendedores</CardTitle></CardHeader>
          <CardContent>
            {sellerRanking.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sellerRanking} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} name="Valor aprovado" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Potential pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por Potencial</CardTitle></CardHeader>
          <CardContent>
            {potentialData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={potentialData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                  {potentialData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
