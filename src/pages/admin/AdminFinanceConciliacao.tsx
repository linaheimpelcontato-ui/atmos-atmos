import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Link2, RefreshCw, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmt } from "./finance/financeCalcs";
import { parseStatementFile, suggestMatches, type ReconciliationTransaction, type StatementRow } from "./finance/bankReconciliation";
import { motion } from "framer-motion";

const db = supabase as any;

type StoredLine = StatementRow & { id: string; status: string; transaction_id: string | null };

export default function AdminFinanceConciliacao() {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<ReconciliationTransaction[]>([]);
  const [storedLines, setStoredLines] = useState<StoredLine[]>([]);
  const [bankAccountId, setBankAccountId] = useState("none");
  const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
  const [rejectedRows, setRejectedRows] = useState<Array<{ rowNumber: number; reason: string }>>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      db.from("bank_accounts").select("id, name, bank, account_number").eq("is_active", true).order("name"),
      db.from("financial_transactions").select("id, type, amount, due_date, paid_date, bank_account_id, description").neq("status", "cancelled"),
      db.from("bank_reconciliation_lines").select("*").order("transaction_date", { ascending: false }).limit(200),
    ]);
    const queryError = results.find(result => result.error)?.error;
    if (queryError) {
      setError(queryError.message || "Não foi possível carregar a conciliação.");
      setBankAccounts([]); setTransactions([]); setStoredLines([]);
      setLoading(false);
      return;
    }
    const [{ data: banks }, { data: txs }, { data: lines }] = results;
    setError(null);
    setBankAccounts(banks || []);
    setTransactions(txs || []);
    setStoredLines((lines || []).map((line: any) => ({
      rowNumber: 0, externalId: line.external_id, transactionDate: line.transaction_date,
      description: line.description, amount: Number(line.amount), direction: line.direction,
      id: line.id, status: line.status, transaction_id: line.transaction_id,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const suggestions = useMemo(() => Object.fromEntries(statementRows.map(row => [
    row.rowNumber, suggestMatches(row, transactions, bankAccountId),
  ])), [statementRows, transactions, bankAccountId]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (bankAccountId === "none") {
      toast({ title: "Selecione a conta bancária", description: "A conta define o contexto da conciliação.", variant: "destructive" });
      return;
    }
    try {
      const result = await parseStatementFile(file);
      setStatementRows(result.rows);
      setRejectedRows(result.rejected);
      const initialMatches: Record<number, string> = {};
      result.rows.forEach(row => {
        const candidates = suggestMatches(row, transactions, bankAccountId);
        if (candidates[0]?.exact && (!candidates[1] || candidates[0].score > candidates[1].score)) initialMatches[row.rowNumber] = candidates[0].transaction.id;
      });
      setSelectedMatches(initialMatches);
      toast({ title: "Extrato lido", description: `${result.rows.length} linha(s) válida(s) para revisão.` });
    } catch (parseError: any) {
      toast({ title: "Não foi possível ler o arquivo", description: parseError.message || String(parseError), variant: "destructive" });
    }
  };

  const saveReconciliation = async () => {
    if (bankAccountId === "none" || statementRows.length === 0) return;
    setSaving(true);
    const payload = statementRows.map(row => ({
      bank_account_id: bankAccountId,
      external_id: row.externalId,
      transaction_date: row.transactionDate,
      description: row.description,
      amount: row.amount,
      direction: row.direction,
      transaction_id: selectedMatches[row.rowNumber] || null,
      status: selectedMatches[row.rowNumber] ? "matched" : "unmatched",
      metadata: { source_row: row.rowNumber },
    }));
    const { error: saveError } = await db.from("bank_reconciliation_lines").upsert(payload, { onConflict: "bank_account_id,external_id" });
    if (saveError) {
      toast({ title: "Falha ao salvar conciliação", description: saveError.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: "Conciliação salva", description: "As linhas foram vinculadas sem alterar automaticamente o status dos lançamentos." });
    setStatementRows([]); setRejectedRows([]); setSelectedMatches({});
    setSaving(false);
    loadData();
  };

  const selectedBank = bankAccounts.find(bank => bank.id === bankAccountId);
  const matchedCount = Object.values(selectedMatches).filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 space-y-8 max-w-full mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10"><Link2 className="h-6 w-6 text-admin-primary" /></div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Conciliação bancária</h1>
          </div>
          <p className="ml-14 text-sm font-medium text-muted-foreground">Importe CSV/XLSX, revise sugestões e vincule cada linha ao lançamento correto.</p>
        </div>
        <Button variant="ghost" onClick={loadData} disabled={loading} className="rounded-xl bg-admin-primary/5 text-admin-primary font-bold"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
      </div>

      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Conciliação indisponível:</strong> {error}</span></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-[2rem] border border-admin-border/60 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-admin-primary" /><h2 className="text-sm font-black uppercase tracking-widest text-admin-primary">Importar extrato</h2></div>
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Conta bancária</Label><Select value={bankAccountId} onValueChange={value => { setBankAccountId(value); setStatementRows([]); setSelectedMatches({}); }}><SelectTrigger className="h-11 rounded-xl bg-admin-muted/50 border-none text-xs font-bold"><SelectValue placeholder="Selecionar conta" /></SelectTrigger><SelectContent><SelectItem value="none">Selecione...</SelectItem>{bankAccounts.map(bank => <SelectItem key={bank.id} value={bank.id}>{bank.name}{bank.bank ? ` — ${bank.bank}` : ""}</SelectItem>)}</SelectContent></Select></div>
          <div className="rounded-2xl border border-dashed border-admin-primary/30 bg-admin-primary/[0.03] p-5 text-center"><Upload className="mx-auto mb-3 h-6 w-6 text-admin-primary" /><p className="mb-3 text-xs font-bold text-muted-foreground">CSV ou Excel com data, descrição e valor (ou crédito/débito).</p><Input type="file" accept=".csv,.xls,.xlsx" disabled={bankAccountId === "none"} onChange={event => handleFile(event.target.files?.[0])} className="h-10 cursor-pointer rounded-xl bg-white text-xs" /></div>
          {statementRows.length > 0 && <div className="rounded-xl bg-admin-muted/40 p-4 text-xs font-bold text-admin-primary">{statementRows.length} linhas válidas · {matchedCount} sugestões vinculadas · {rejectedRows.length} rejeitadas</div>}
          {rejectedRows.length > 0 && <div className="space-y-1 text-xs text-destructive">{rejectedRows.slice(0, 5).map(row => <p key={row.rowNumber}>Linha {row.rowNumber}: {row.reason}</p>)}</div>}
          <Button onClick={saveReconciliation} disabled={saving || !selectedBank || statementRows.length === 0} className="w-full rounded-xl bg-admin-primary font-black text-white"><CheckCircle2 className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar conciliação"}</Button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">A sugestão não baixa a conta automaticamente. O status pago continua sendo uma decisão explícita do financeiro.</p>
        </div>

        <div className="rounded-[2rem] border border-admin-border/60 bg-white p-6 shadow-sm overflow-hidden">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-widest text-admin-primary">Revisão das linhas</h2><p className="mt-1 text-xs text-muted-foreground">Confirme ou altere o vínculo sugerido antes de salvar.</p></div><Badge variant="outline" className="rounded-lg">{matchedCount}/{statementRows.length || 0} vinculadas</Badge></div>
          {statementRows.length === 0 ? <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/50"><FileSpreadsheet className="h-8 w-8 opacity-40" />Nenhum extrato em revisão</div> : <div className="overflow-x-auto"><Table className="min-w-[900px]"><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Vínculo sugerido</TableHead></TableRow></TableHeader><TableBody>{statementRows.map(row => { const candidates = suggestions[row.rowNumber] || []; const selected = selectedMatches[row.rowNumber] || "none"; return <TableRow key={row.rowNumber}><TableCell className="font-mono text-xs">{row.transactionDate}</TableCell><TableCell className="max-w-[220px] truncate text-xs">{row.description || "—"}</TableCell><TableCell><Badge variant="outline" className={row.direction === "credit" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>{row.direction === "credit" ? "Entrada" : "Saída"}</Badge></TableCell><TableCell className="text-right font-black tabular-nums">{fmt(row.amount)}</TableCell><TableCell><Select value={selected} onValueChange={value => setSelectedMatches(current => ({ ...current, [row.rowNumber]: value === "none" ? "" : value }))}><SelectTrigger className="h-9 w-[330px] text-xs"><SelectValue placeholder="Sem vínculo" /></SelectTrigger><SelectContent><SelectItem value="none">Sem vínculo</SelectItem>{candidates.map(candidate => <SelectItem key={candidate.transaction.id} value={candidate.transaction.id}>{candidate.transaction.description || candidate.transaction.id} — {fmt(Number(candidate.transaction.amount))} {candidate.exact ? "✓" : ""}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>; })}</TableBody></Table></div>}
        </div>
      </div>

      <div className="rounded-[2rem] border border-admin-border/60 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-widest text-admin-primary">Histórico importado</h2><p className="mt-1 text-xs text-muted-foreground">Linhas recentes salvas no banco para auditoria.</p></div><Badge variant="outline" className="rounded-lg">{storedLines.length} linhas</Badge></div>{storedLines.length === 0 ? <p className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Nenhum histórico importado</p> : <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{storedLines.slice(0, 12).map(line => <div key={line.id} className="rounded-xl border border-admin-border/30 bg-admin-muted/20 p-3 text-xs"><div className="flex justify-between gap-3"><span className="font-mono">{line.transactionDate}</span><Badge variant="outline" className="text-[9px]">{line.status === "matched" ? "Vinculada" : "Pendente"}</Badge></div><p className="mt-2 truncate font-bold text-admin-primary">{line.description || "Sem descrição"}</p><p className="mt-1 font-black tabular-nums">{line.direction === "credit" ? "+" : "-"}{fmt(line.amount)}</p></div>)}</div>}</div>
    </motion.div>
  );
}
