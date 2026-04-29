import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Sparkles, Loader2, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, subMonths, parseISO, getMonth, getYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const db = supabase as any;
const COLORS = ["hsl(217 91% 60%)", "hsl(142 71% 45%)", "hsl(45 93% 58%)", "hsl(0 84% 60%)", "hsl(280 67% 55%)", "hsl(190 80% 50%)"];
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function AdminFinanceReports() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [segment, setSegment] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let prospectQ = db.from("prospects").select("id, stage_id, country, segment, source, potential, seller_id, created_at")
      .gte("created_at", dateFrom + "T00:00:00").lte("created_at", dateTo + "T23:59:59");
    let proposalQ = db.from("proposals").select("id, total, status, segment, seller_id, created_at")
      .gte("created_at", dateFrom + "T00:00:00").lte("created_at", dateTo + "T23:59:59");
    if (segment !== "all") { prospectQ = prospectQ.eq("segment", segment); proposalQ = proposalQ.eq("segment", segment); }
    if (sellerId !== "all") { prospectQ = prospectQ.eq("seller_id", sellerId); proposalQ = proposalQ.eq("seller_id", sellerId); }

    const [{ data: txs }, { data: accs }, { data: prData }, { data: propData }, { data: sData }, { data: stData }] = await Promise.all([
      db.from("financial_transactions").select("id, type, amount, due_date, status, account_id, paid_date").gte("due_date", dateFrom).lte("due_date", dateTo).neq("status", "cancelled"),
      db.from("chart_of_accounts").select("id, code, name, type").order("code"),
      prospectQ, proposalQ,
      db.from("sellers").select("id, name").eq("is_active", true).order("name"),
      db.from("pipeline_stages").select("*").order("position"),
    ]);
    setTransactions(txs || []); setAccounts(accs || []); setProspects(prData || []); setProposals(propData || []); setSellers(sData || []); setStages(stData || []);
    setLoading(false);
  }, [dateFrom, dateTo, segment, sellerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // DRE
  const dre = useMemo(() => {
    const revenue = transactions.filter(t => t.type === "receivable" || t.type === "commission_in").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const costs = transactions.filter(t => t.type === "payable").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const commissions = transactions.filter(t => t.type === "commission_out").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const profit = revenue - costs - commissions;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, costs, commissions, profit, margin };
  }, [transactions]);

  // Cash flow by month
  const cashFlow = useMemo(() => {
    const months: Record<string, { month: string; entradas: number; saidas: number }> = {};
    transactions.forEach(tx => {
      const d = parseISO(tx.due_date);
      const key = `${getYear(d)}-${String(getMonth(d) + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { month: `${MONTHS_PT[getMonth(d)]}/${String(getYear(d)).slice(2)}`, entradas: 0, saidas: 0 };
      if (tx.type === "receivable" || tx.type === "commission_in") months[key].entradas += Number(tx.amount);
      else months[key].saidas += Number(tx.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  // By account
  const byAccount = useMemo(() => {
    const map: Record<string, { code: string; name: string; type: string; total: number }> = {};
    transactions.forEach(tx => {
      const acc = accounts.find((a: any) => a.id === tx.account_id);
      if (!acc) return;
      if (!map[acc.id]) map[acc.id] = { code: acc.code, name: acc.name, type: acc.type, total: 0 };
      map[acc.id].total += Number(tx.amount);
    });
    return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
  }, [transactions, accounts]);

  // Commercial stats
  const acceptedRevenue = proposals.filter(p => p.status === "accepted").reduce((s: number, p: any) => s + Number(p.total), 0);
  const pipelineData = stages.map(s => ({ name: s.name, value: prospects.filter((p: any) => p.stage_id === s.id).length, color: s.color })).filter(d => d.value > 0);
  const sellerRevenue: Record<string, number> = {};
  proposals.filter(p => p.status === "accepted").forEach(p => { if (p.seller_id) sellerRevenue[p.seller_id] = (sellerRevenue[p.seller_id] || 0) + Number(p.total); });
  const sellerRanking = sellers.map(s => ({ name: s.name, value: sellerRevenue[s.id] || 0 })).sort((a, b) => b.value - a.value).slice(0, 5);

  const fmtR = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    // DRE
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["DRE"], ["Receita Bruta", dre.revenue], ["(-) Custos", dre.costs], ["(-) Comissões", dre.commissions], ["Lucro", dre.profit], ["Margem %", dre.margin.toFixed(1)],
    ]), "DRE");
    // By Account
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Código", "Nome", "Tipo", "Total"], ...byAccount.map(a => [a.code, a.name, a.type, a.total])]), "Por Conta");
    // Commercial
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Comercial"], ["Total Prospects", prospects.length], ["Total Propostas", proposals.length], ["Receita Aceitas", acceptedRevenue],
    ]), "Comercial");
    XLSX.writeFile(wb, "relatorios-financeiros.xlsx");
  };

  const handleAiInsights = async () => {
    setAiLoading(true); setAiInsights(null);
    try {
      const payload = { period: `${dateFrom} a ${dateTo}`, segment, totalProspects: prospects.length, totalProposals: proposals.length, acceptedRevenue, dre, sellerRanking: sellerRanking.slice(0, 3) };
      const { data, error } = await supabase.functions.invoke("report-insights", { body: payload });
      if (error) throw error;
      setAiInsights(data?.insights || "Sem insights disponíveis.");
    } catch (err: any) { toast({ title: "Erro", description: err.message || String(err), variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 print:p-0">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
          <Button size="sm" onClick={handleAiInsights} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}Insights IA
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap print:hidden">
        <div className="space-y-1"><Label className="text-xs">De</Label><DatePicker size="sm" className="w-36" value={dateFrom} onChange={setDateFrom} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><DatePicker size="sm" className="w-36" value={dateTo} onChange={setDateTo} /></div>
        <div className="space-y-1"><Label className="text-xs">Segmento</Label>
          <Select value={segment} onValueChange={setSegment}><SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="b2b">B2B</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Vendedor</Label>
          <Select value={sellerId} onValueChange={setSellerId}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {aiInsights && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Insights de IA</CardTitle></CardHeader>
          <CardContent><div className="text-sm whitespace-pre-line">{aiInsights}</div></CardContent>
        </Card>
      )}

      {loading ? <p className="text-muted-foreground text-center py-12">Carregando...</p> : (
        <Tabs defaultValue="dre" className="space-y-4">
          <TabsList className="print:hidden"><TabsTrigger value="dre" className="text-xs">DRE Financeiro</TabsTrigger><TabsTrigger value="commercial" className="text-xs">Comercial</TabsTrigger></TabsList>

          <TabsContent value="dre" className="space-y-6">
            {/* DRE */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">DRE — Demonstração de Resultado</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border"><span className="font-medium">Receita Bruta</span><span className="text-green-600 font-bold">{fmtR(dre.revenue)}</span></div>
                  <div className="flex justify-between py-1 border-b border-border pl-4"><span className="text-muted-foreground">(-) Custos operacionais</span><span className="text-destructive">{fmtR(dre.costs)}</span></div>
                  <div className="flex justify-between py-1 border-b border-border pl-4"><span className="text-muted-foreground">(-) Comissões</span><span className="text-destructive">{fmtR(dre.commissions)}</span></div>
                  <div className={`flex justify-between py-2 border-t-2 border-border font-bold text-base ${dre.profit >= 0 ? "text-green-600" : "text-destructive"}`}><span>Lucro Líquido</span><span>{fmtR(dre.profit)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Margem</span><span>{dre.margin.toFixed(1)}%</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Cash flow chart */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Fluxo de Caixa Mensal</CardTitle></CardHeader>
              <CardContent>
                {cashFlow.length === 0 ? <p className="text-muted-foreground text-center py-8">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmtR(v)} /><Legend />
                      <Bar dataKey="entradas" name="Entradas" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* By account */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Detalhamento por Conta</CardTitle></CardHeader>
              <CardContent>
                {byAccount.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum lançamento vinculado</p> : (
                  <div className="space-y-1.5">{byAccount.map(a => (
                    <div key={a.code} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <span><span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>{a.name}</span>
                      <span className="font-medium">{fmtR(a.total)}</span>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commercial" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{prospects.length}</p><p className="text-sm text-muted-foreground">Total Prospects</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{proposals.length}</p><p className="text-sm text-muted-foreground">Total Propostas</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{fmtR(acceptedRevenue)}</p><p className="text-sm text-muted-foreground">Receita (aceitas)</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{proposals.length > 0 ? ((proposals.filter(p => p.status === "accepted").length / proposals.length) * 100).toFixed(0) : 0}%</p><p className="text-sm text-muted-foreground">Conversão</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader><CardTitle className="text-base">Ranking Vendedores</CardTitle></CardHeader>
                <CardContent>
                  {sellerRanking.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sellerRanking} layout="vertical" margin={{ left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip formatter={(v: number) => fmtR(v)} /><Bar dataKey="value" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} name="Receita" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
