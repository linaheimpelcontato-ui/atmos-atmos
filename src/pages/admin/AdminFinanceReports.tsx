import { isApprovedProposalStatus } from "@/lib/proposalStatus";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Sparkles, Loader2, Download, FileText, Activity, TrendingUp, Users, PieChart, Filter, Calendar, ChevronRight, BarChart3, Globe, Target, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { fmt } from "./finance/financeCalcs";
import { moneySum } from "@/lib/proposalCalcs";
import {
  calcActualCashFlow,
  calcProposalClusters,
  calcTransactionDre,
  REPORT_BASIS_LABELS,
  selectTransactionsForReport,
  type FinanceReportBasis,
} from "./finance/financeReporting";

const db = supabase as any;
const COLORS = ["hsl(var(--admin-primary))", "hsl(142 71% 45%)", "hsl(45 93% 58%)", "hsl(0 84% 60%)", "hsl(280 67% 55%)", "hsl(190 80% 50%)"];

export default function AdminFinanceReports() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [segment, setSegment] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [basis, setBasis] = useState<FinanceReportBasis>("due");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalDirectory, setProposalDirectory] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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

    const results = await Promise.all([
      db.from("financial_transactions").select("id, type, amount, due_date, competence_date, status, account_id, paid_date, proposal_id, supplier_id, invoice_number"),
      db.from("chart_of_accounts").select("id, code, name, type").order("code"),
      prospectQ, proposalQ,
      db.from("proposals").select("id, title, code"),
      db.from("sellers").select("id, name").eq("is_active", true).order("name"),
      db.from("pipeline_stages").select("*").order("position"),
    ]);
    const error = results.find(result => result.error)?.error;
    if (error) {
      setLoadError(error.message || "Não foi possível carregar os dados financeiros.");
      setTransactions([]); setAccounts([]); setProspects([]); setProposals([]); setProposalDirectory([]); setSellers([]); setStages([]);
      setLoading(false);
      toast({ title: "Falha ao carregar relatórios", description: error.message, variant: "destructive" });
      return;
    }
    const [{ data: txs }, { data: accs }, { data: prData }, { data: propData }, { data: propDirectory }, { data: sData }, { data: stData }] = results;
    setLoadError(null);
    setTransactions(txs || []); setAccounts(accs || []); setProspects(prData || []); setProposals(propData || []); setProposalDirectory(propDirectory || []); setSellers(sData || []); setStages(stData || []);
    setLoading(false);
  }, [dateFrom, dateTo, segment, sellerId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dre = useMemo(() => calcTransactionDre(transactions, dateFrom, dateTo, basis), [transactions, dateFrom, dateTo, basis]);

  const cashFlow = useMemo(() => calcActualCashFlow(transactions, dateFrom, dateTo), [transactions, dateFrom, dateTo]);

  const reportTransactions = useMemo(
    () => selectTransactionsForReport(transactions, dateFrom, dateTo, basis),
    [transactions, dateFrom, dateTo, basis],
  );

  const proposalClusters = useMemo(
    () => calcProposalClusters(transactions, proposalDirectory, dateFrom, dateTo, basis),
    [transactions, proposalDirectory, dateFrom, dateTo, basis],
  );

  const byAccount = useMemo(() => {
    const map: Record<string, { code: string; name: string; type: string; total: number }> = {};
    reportTransactions.forEach(tx => {
      const acc = accounts.find((a: any) => a.id === tx.account_id);
      if (!acc) return;
      if (!map[acc.id]) map[acc.id] = { code: acc.code, name: acc.name, type: acc.type, total: 0 };
       map[acc.id].total = moneySum(map[acc.id].total, Number(tx.amount));
    });
    return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
  }, [reportTransactions, accounts]);

  const acceptedRevenue = proposals.filter(p => isApprovedProposalStatus(p.status)).reduce((s: number, p: any) => s + Number(p.total), 0);
  const pipelineData = stages.map(s => ({ name: s.name, value: prospects.filter((p: any) => p.stage_id === s.id).length, color: s.color })).filter(d => d.value > 0);
  const sellerRevenue: Record<string, number> = {};
  proposals.filter(p => isApprovedProposalStatus(p.status)).forEach(p => { if (p.seller_id) sellerRevenue[p.seller_id] = (sellerRevenue[p.seller_id] || 0) + Number(p.total); });
  const sellerRanking = sellers.map(s => ({ name: s.name, value: sellerRevenue[s.id] || 0 })).sort((a, b) => b.value - a.value).slice(0, 5);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Critério do relatório", REPORT_BASIS_LABELS[basis]],
      ["Período", `${dateFrom} a ${dateTo}`],
      ["Lançamentos considerados", dre.transactionCount],
      ["Lançamentos sem data da base", dre.missingDateCount],
    ]), "Critério");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Proposta / Grupo", "Entradas", "Saídas", "Saldo", "Lançamentos", "Pendente", "Pago"], ...proposalClusters.map(cluster => [cluster.label, cluster.entradas, cluster.saidas, cluster.saldo, cluster.transactionCount, cluster.pending, cluster.paid])]), "Por Proposta");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["DRE"], ["Receita Bruta", dre.revenue], ["(-) Custos", dre.costs], ["(-) Comissões", dre.commissions], ["Lucro", dre.profit], ["Margem %", dre.margin.toFixed(1)],]), "DRE");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Código", "Nome", "Tipo", "Total"], ...byAccount.map(a => [a.code, a.name, a.type, a.total])]), "Por Conta");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Comercial"], ["Total Prospects", prospects.length], ["Total Propostas", proposals.length], ["Valor aprovado", acceptedRevenue],]), "Comercial");
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

  const basisDateLabel = basis === "competence"
    ? "competência"
    : basis === "cash"
      ? "data de pagamento"
      : "data de vencimento";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-admin-border/40 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <span className="text-[11px] font-bold text-admin-primary/60">{p.name}:</span>
                <span className="text-sm font-black tabular-nums" style={{ color: p.color || p.fill }}>
                  {fmt(p.value)}
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
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto print:p-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <FileText className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Relatórios Consolidados</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Inteligência financeira e performance comercial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleExportExcel} className="h-10 px-4 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-10 px-4 rounded-xl bg-admin-primary/5 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={handleAiInsights} disabled={aiLoading} className="h-10 px-4 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Insights IA
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-admin-border/40 shadow-sm print:hidden">
        <div className="flex items-center gap-3 px-4 border-r border-admin-border/40">
          <Filter className="h-4 w-4 text-admin-primary/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Filtros</span>
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
              <SelectTrigger className="h-10 border-none bg-admin-muted/40 hover:bg-admin-muted/60 rounded-xl transition-colors min-w-[100px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vendedor:</span>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className="h-10 border-none bg-admin-muted/40 hover:bg-admin-muted/60 rounded-xl transition-colors min-w-[150px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos Vendedores</SelectItem>
                {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Base do DRE:</span>
            <Select value={basis} onValueChange={value => setBasis(value as FinanceReportBasis)}>
              <SelectTrigger className="h-10 border-none bg-admin-muted/40 hover:bg-admin-muted/60 rounded-xl transition-colors min-w-[150px] font-bold text-xs uppercase tracking-wider focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="due">Vencimento</SelectItem>
                <SelectItem value="competence">Competência</SelectItem>
                <SelectItem value="cash">Caixa (pago)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive print:hidden">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-black">Os dados financeiros não puderam ser carregados.</p>
            <p className="mt-1 font-medium">{loadError}</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {aiInsights && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-admin-primary/10 via-white to-admin-primary/5 border border-admin-primary/20 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Sparkles className="h-32 w-32 text-admin-primary" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-admin-primary text-white shadow-lg shadow-admin-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Inteligência Atmos</h3>
                <p className="text-[10px] font-bold text-admin-primary/60 uppercase">Análise sintética gerada por IA</p>
              </div>
            </div>
            <div className="text-sm font-medium text-admin-primary/80 leading-relaxed whitespace-pre-line relative">
              {aiInsights}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="dre" className="space-y-8">
        <TabsList className="bg-admin-muted/40 p-1.5 rounded-2xl print:hidden">
          <TabsTrigger value="dre" className="px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all">DRE & Financeiro</TabsTrigger>
          <TabsTrigger value="commercial" className="px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all">Comercial & Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-8 focus-visible:ring-0">
          <div className="flex flex-col gap-2 rounded-2xl border border-admin-primary/10 bg-admin-primary/[0.03] px-5 py-4 text-xs text-admin-primary/70 md:flex-row md:items-center md:justify-between">
            <span>
              DRE gerencial por <strong className="text-admin-primary">{REPORT_BASIS_LABELS[basis].toLowerCase()}</strong> no período selecionado.
              O fluxo de caixa abaixo usa sempre a data efetiva de pagamento.
            </span>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {dre.missingDateCount > 0 || dre.invalidAmountCount > 0 ? (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-yellow-300/60 bg-yellow-50 p-4 text-xs text-yellow-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {dre.missingDateCount > 0 && `${dre.missingDateCount} lançamento(s) sem ${basisDateLabel} ficaram fora do DRE.`}
                {dre.invalidAmountCount > 0 && ` ${dre.invalidAmountCount} lançamento(s) com valor inválido também ficaram fora.`}
                {" "}{basis === "competence" ? "Preencha a competência antes de usar este relatório como fechamento contábil." : "Revise os lançamentos sem a data usada neste critério antes de fechar o período."}
              </span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div className="lg:col-span-1 bg-white border border-admin-border/60 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <TrendingUp className="h-32 w-32 text-admin-primary" />
              </div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-admin-primary/10">
                  <Activity className="h-4 w-4 text-admin-primary" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">DRE — Consolidado</h2>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-baseline py-2 border-b border-admin-border/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Receita Bruta</span>
                  <span className="text-lg font-black text-green-600 tabular-nums">{fmt(dre.revenue)}</span>
                </div>
                <div className="flex justify-between items-baseline py-2 border-b border-admin-border/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Custos Operacionais</span>
                  <span className="text-lg font-black text-destructive/60 tabular-nums">{fmt(dre.costs)}</span>
                </div>
                <div className="flex justify-between items-baseline py-2 border-b border-admin-border/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Comissões</span>
                  <span className="text-lg font-black text-destructive/60 tabular-nums">{fmt(dre.commissions)}</span>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} className="bg-admin-primary/[0.03] p-6 rounded-[2rem] border border-admin-primary/10 mt-8">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-admin-primary/60">Lucro Líquido</span>
                    <span className={`text-2xl font-black tabular-nums ${dre.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {fmt(dre.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Margem Operacional</span>
                    <span className="text-sm font-black text-admin-primary">{dre.margin.toFixed(1)}%</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <motion.div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Fluxo de Caixa Mensal</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Entradas vs Saídas no período</p>
                </div>
                <div className="p-2 rounded-xl bg-admin-primary/10">
                  <BarChart3 className="h-4 w-4 text-admin-primary" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--admin-border)/40)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--admin-primary))" radius={[10, 10, 10, 10]} barSize={24} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[10, 10, 10, 10]} barSize={24} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Detalhamento por Conta</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Análise granular do plano de contas</p>
              </div>
              <div className="p-2 rounded-xl bg-admin-primary/10">
                <Globe className="h-4 w-4 text-admin-primary" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {byAccount.map(a => (
                <div key={a.code} className="flex items-center justify-between p-4 rounded-2xl bg-admin-muted/20 border border-admin-border/10 hover:bg-admin-muted/40 transition-colors group/item">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-admin-primary/40 font-mono tracking-widest">{a.code}</p>
                    <p className="text-xs font-black text-admin-primary/80 uppercase tracking-tight">{a.name}</p>
                  </div>
                  <span className="text-sm font-black text-admin-primary tabular-nums group-hover/item:scale-110 transition-transform origin-right">{fmt(a.total)}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Resultado por proposta / grupo</h3>
                <p className="text-xs text-muted-foreground font-medium italic">Entradas e saídas rastreáveis no mesmo período e base do DRE</p>
              </div>
              <div className="p-2 rounded-xl bg-admin-primary/10">
                <Target className="h-4 w-4 text-admin-primary" />
              </div>
            </div>
            {proposalClusters.length === 0 ? (
              <p className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Nenhum lançamento vinculado ao período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-admin-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <th className="pb-3 pr-4">Proposta / grupo</th>
                      <th className="pb-3 px-4 text-right">Entradas</th>
                      <th className="pb-3 px-4 text-right">Saídas</th>
                      <th className="pb-3 px-4 text-right">Saldo</th>
                      <th className="pb-3 pl-4 text-right">Lançamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposalClusters.slice(0, 20).map(cluster => (
                      <tr key={cluster.proposalId || "unlinked"} className="border-b border-admin-border/20 last:border-0">
                        <td className="py-3 pr-4 font-black text-admin-primary">{cluster.label}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600 tabular-nums">{fmt(cluster.entradas)}</td>
                        <td className="px-4 py-3 text-right font-bold text-destructive tabular-nums">{fmt(cluster.saidas)}</td>
                        <td className={`px-4 py-3 text-right font-black tabular-nums ${cluster.saldo >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(cluster.saldo)}</td>
                        <td className="py-3 pl-4 text-right font-bold text-muted-foreground tabular-nums">{cluster.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="commercial" className="space-y-8 focus-visible:ring-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-admin-border/40 shadow-sm text-center">
              <p className="text-3xl font-black text-admin-primary tracking-tighter">{prospects.length}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Total Prospects</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-admin-border/40 shadow-sm text-center">
              <p className="text-3xl font-black text-admin-primary tracking-tighter">{proposals.length}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Total Propostas</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-admin-border/40 shadow-sm text-center">
              <p className="text-3xl font-black text-green-600 tracking-tighter">{fmt(acceptedRevenue)}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Valor aprovado</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-admin-border/40 shadow-sm text-center">
              <p className="text-3xl font-black text-admin-primary tracking-tighter">
                {proposals.length > 0 ? ((proposals.filter(p => isApprovedProposalStatus(p.status)).length / proposals.length) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Taxa Conversão</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Pipeline por Etapa</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Volume de prospects no funil</p>
                </div>
                <div className="p-2 rounded-xl bg-admin-primary/10">
                  <Target className="h-4 w-4 text-admin-primary" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie 
                      data={pipelineData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60}
                      outerRadius={100} 
                      paddingAngle={5}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div className="bg-white rounded-[2rem] p-8 border border-admin-border/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/80">Ranking Vendedores</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Performance individual por receita</p>
                </div>
                <div className="p-2 rounded-xl bg-admin-primary/10">
                  <Users className="h-4 w-4 text-admin-primary" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sellerRanking} layout="vertical" margin={{ left: 60, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--admin-border)/40)" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="value" name="Receita" fill="hsl(var(--admin-primary))" radius={[0, 10, 10, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
