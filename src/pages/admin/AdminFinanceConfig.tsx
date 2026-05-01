import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, BookOpen, RefreshCw, Landmark, Building2, ChevronRight, Settings2, ShieldCheck, Wallet, MapPin, DollarSign, Activity } from "lucide-react";
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
import { fmt } from "./finance/financeCalcs";
import { motion, AnimatePresence } from "framer-motion";

const db = supabase as any;

type Account = { id: string; code: string; name: string; type: string; parent_id: string | null; is_active: boolean };
type BankAccount = { id: string; name: string; bank: string; agency: string; account_number: string; account_type: string; initial_balance: number; is_active: boolean };
type Branch = { id: string; name: string; cnpj: string; address: string; is_active: boolean };

const typeOptions = [
  { value: "revenue", label: "Receita", color: "text-green-600", bg: "bg-green-50" },
  { value: "cost", label: "Custo", color: "text-orange-600", bg: "bg-orange-50" },
  { value: "expense", label: "Despesa", color: "text-destructive", bg: "bg-red-50" },
  { value: "commission", label: "Comissão", color: "text-admin-primary", bg: "bg-admin-primary/5" },
];

const bankTypeOptions = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "digital", label: "Conta Digital" },
];

export default function AdminFinanceConfig() {
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accDialogOpen, setAccDialogOpen] = useState(false);
  const [accEditingId, setAccEditingId] = useState<string | null>(null);
  const [accForm, setAccForm] = useState({ code: "", name: "", type: "expense", parent_id: "", is_active: true });

  const [recurring, setRecurring] = useState<any[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(true);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankEditingId, setBankEditingId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", is_active: true });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchEditingId, setBranchEditingId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", cnpj: "", address: "", is_active: true });

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    const { data } = await db.from("chart_of_accounts").select("*").order("code");
    setAccounts(data || []);
    setLoadingAccounts(false);
  }, []);

  const fetchRecurring = useCallback(async () => {
    setLoadingRecurring(true);
    const { data } = await db.from("financial_transactions").select("*").eq("is_recurring", true).order("description");
    setRecurring(data || []);
    setLoadingRecurring(false);
  }, []);

  const fetchBanks = useCallback(async () => {
    setLoadingBanks(true);
    const { data } = await db.from("bank_accounts").select("*").order("name");
    setBankAccounts(data || []);
    setLoadingBanks(false);
  }, []);

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    const { data } = await db.from("branches").select("*").order("name");
    setBranches(data || []);
    setLoadingBranches(false);
  }, []);

  useEffect(() => { fetchAccounts(); fetchRecurring(); fetchBanks(); fetchBranches(); }, [fetchAccounts, fetchRecurring, fetchBanks, fetchBranches]);

  const resetAccForm = () => setAccForm({ code: "", name: "", type: "expense", parent_id: "", is_active: true });
  const openNewAcc = () => { resetAccForm(); setAccEditingId(null); setAccDialogOpen(true); };
  const openEditAcc = (a: Account) => { setAccEditingId(a.id); setAccForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id || "", is_active: a.is_active }); setAccDialogOpen(true); };
  const handleSaveAcc = async () => {
    const payload = { code: accForm.code, name: accForm.name, type: accForm.type, parent_id: accForm.parent_id || null, is_active: accForm.is_active };
    const { error } = accEditingId ? await db.from("chart_of_accounts").update(payload).eq("id", accEditingId) : await db.from("chart_of_accounts").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: accEditingId ? "Conta atualizada" : "Conta criada" });
    setAccDialogOpen(false);
    fetchAccounts();
  };
  const handleDeleteAcc = async (id: string) => { await db.from("chart_of_accounts").delete().eq("id", id); fetchAccounts(); };

  const getDepth = (a: Account): number => {
    if (!a.parent_id) return 0;
    const parent = accounts.find(p => p.id === a.parent_id);
    return parent ? 1 + getDepth(parent) : 0;
  };

  const resetBankForm = () => setBankForm({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", is_active: true });
  const openNewBank = () => { resetBankForm(); setBankEditingId(null); setBankDialogOpen(true); };
  const openEditBank = (b: BankAccount) => { setBankEditingId(b.id); setBankForm({ name: b.name, bank: b.bank, agency: b.agency, account_number: b.account_number, account_type: b.account_type, initial_balance: String(b.initial_balance), is_active: b.is_active }); setBankDialogOpen(true); };
  const handleSaveBank = async () => {
    const payload = { name: bankForm.name, bank: bankForm.bank, agency: bankForm.agency, account_number: bankForm.account_number, account_type: bankForm.account_type, initial_balance: Number(bankForm.initial_balance) || 0, is_active: bankForm.is_active };
    const { error } = bankEditingId ? await db.from("bank_accounts").update(payload).eq("id", bankEditingId) : await db.from("bank_accounts").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: bankEditingId ? "Conta bancária atualizada" : "Conta bancária criada" });
    setBankDialogOpen(false);
    fetchBanks();
  };
  const handleDeleteBank = async (id: string) => { await db.from("bank_accounts").delete().eq("id", id); fetchBanks(); };

  const resetBranchForm = () => setBranchForm({ name: "", cnpj: "", address: "", is_active: true });
  const openNewBranch = () => { resetBranchForm(); setBranchEditingId(null); setBranchDialogOpen(true); };
  const openEditBranch = (b: Branch) => { setBranchEditingId(b.id); setBranchForm({ name: b.name, cnpj: b.cnpj, address: b.address, is_active: b.is_active }); setBranchDialogOpen(true); };
  const handleSaveBranch = async () => {
    const payload = { name: branchForm.name, cnpj: branchForm.cnpj, address: branchForm.address, is_active: branchForm.is_active };
    const { error } = branchEditingId ? await db.from("branches").update(payload).eq("id", branchEditingId) : await db.from("branches").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: branchEditingId ? "Filial atualizada" : "Filial criada" });
    setBranchDialogOpen(false);
    fetchBranches();
  };
  const handleDeleteBranch = async (id: string) => { await db.from("branches").delete().eq("id", id); fetchBranches(); };

  const totalRecurring = recurring.reduce((s: number, t: any) => s + Number(t.amount), 0);

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
              <Settings2 className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Configurações Financeiras</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Gestão de infraestrutura, contas e regras de negócio</p>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-8">
        <TabsList className="bg-admin-muted/40 p-1.5 rounded-2xl flex-wrap h-auto print:hidden">
          <TabsTrigger value="accounts" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="banks" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" /> Contas Bancárias
          </TabsTrigger>
          <TabsTrigger value="branches" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" /> Filiais
          </TabsTrigger>
          <TabsTrigger value="recurring" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Custos Fixos
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="accounts" className="space-y-6 focus-visible:ring-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/60">Hierarquia de Classificação</h3>
              <Button onClick={openNewAcc} size="sm" className="h-10 px-4 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Conta
              </Button>
            </div>
            <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30">
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Código</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Estrutura e Nome</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Tipo</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</TableHead>
                    <TableHead className="w-24 p-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {loadingAccounts ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Carregando...</TableCell></TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhuma conta cadastrada</TableCell></TableRow>
                  ) : accounts.map(a => {
                    const depth = getDepth(a);
                    const typeOpt = typeOptions.find(t => t.value === a.type);
                    return (
                      <TableRow key={a.id} className={`group transition-all hover:bg-admin-muted/50 ${!a.is_active ? "opacity-50 grayscale-[0.5]" : ""}`}>
                        <TableCell className="p-4 font-mono font-bold text-admin-primary/60 text-xs tabular-nums">{a.code}</TableCell>
                        <TableCell className="p-4">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                            {depth > 0 && <ChevronRight className="h-3 w-3 text-admin-primary/20 shrink-0" />}
                            <span className={`text-sm tracking-tight ${depth === 0 ? "font-black text-admin-primary" : "font-bold text-admin-primary/80"}`}>{a.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${typeOpt?.bg} ${typeOpt?.color} border-current/20`}>{typeOpt?.label}</Badge>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${a.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-muted text-muted-foreground border-muted-foreground/10"}`}>{a.is_active ? "Ativa" : "Inativa"}</Badge>
                        </TableCell>
                        <TableCell className="p-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-admin-muted/40 text-admin-primary" onClick={() => openEditAcc(a)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                                <AlertDialogHeader><AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Excluir Conta?</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir <strong>{a.name}</strong>? Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter className="mt-4"><AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAcc(a.id)} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]">Excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="banks" className="space-y-6 focus-visible:ring-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/60">Contas e Disponibilidades</h3>
              <Button onClick={openNewBank} size="sm" className="h-10 px-4 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Conta Bancária
              </Button>
            </div>
            <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30">
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Identificação</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Agência/Conta</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Tipo</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</TableHead>
                    <TableHead className="w-24 p-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {loadingBanks ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Carregando...</TableCell></TableRow>
                  ) : bankAccounts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhuma conta bancária</TableCell></TableRow>
                  ) : bankAccounts.map(b => (
                    <TableRow key={b.id} className={`group transition-all hover:bg-admin-muted/50 ${!b.is_active ? "opacity-50 grayscale-[0.5]" : ""}`}>
                      <TableCell className="p-4">
                        <div className="flex flex-col">
                          <span className="font-black text-admin-primary uppercase tracking-tight">{b.name}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{b.bank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-4 font-mono text-[11px] text-muted-foreground/80">
                        Ag: {b.agency} / CC: {b.account_number}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-admin-muted/30">{bankTypeOptions.find(t => t.value === b.account_type)?.label}</Badge>
                      </TableCell>
                      <TableCell className="p-4 text-right font-black tabular-nums text-admin-primary/80">{fmt(b.initial_balance)}</TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${b.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-muted text-muted-foreground border-muted-foreground/10"}`}>{b.is_active ? "Ativa" : "Inativa"}</Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-admin-muted/40 text-admin-primary" onClick={() => openEditBank(b)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                              <AlertDialogHeader><AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Excluir Conta Bancária?</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir <strong>{b.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter className="mt-4"><AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBank(b.id)} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]">Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="branches" className="space-y-6 focus-visible:ring-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary/60">Filiais e Unidades</h3>
              <Button onClick={openNewBranch} size="sm" className="h-10 px-4 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Filial
              </Button>
            </div>
            <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30">
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Filial</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">CNPJ</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Endereço</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</TableHead>
                    <TableHead className="w-24 p-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {loadingBranches ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Carregando...</TableCell></TableRow>
                  ) : branches.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhuma filial cadastrada</TableCell></TableRow>
                  ) : branches.map(b => (
                    <TableRow key={b.id} className={`group transition-all hover:bg-admin-muted/50 ${!b.is_active ? "opacity-50 grayscale-[0.5]" : ""}`}>
                      <TableCell className="p-4 font-black text-admin-primary uppercase tracking-tight">{b.name}</TableCell>
                      <TableCell className="p-4 font-mono text-[11px] text-muted-foreground/80">{b.cnpj || "—"}</TableCell>
                      <TableCell className="p-4 text-xs font-medium text-muted-foreground/60 max-w-xs truncate">{b.address || "—"}</TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${b.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-muted text-muted-foreground border-muted-foreground/10"}`}>{b.is_active ? "Ativa" : "Inativa"}</Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-admin-muted/40 text-admin-primary" onClick={() => openEditBranch(b)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                              <AlertDialogHeader><AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Excluir Filial?</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir <strong>{b.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter className="mt-4"><AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBranch(b.id)} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]">Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6 focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <RefreshCw className="h-24 w-24 text-admin-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Custo Fixo Mensal</p>
                <p className="text-3xl font-black text-admin-primary tracking-tighter">{fmt(totalRecurring)}</p>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase mt-2">{recurring.length} Lançamentos Recorrentes</p>
              </motion.div>
              <div className="bg-admin-primary/5 rounded-[2rem] p-6 border border-admin-primary/10 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm">
                  <Activity className="h-6 w-6 text-admin-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-admin-primary uppercase tracking-widest">Ponto de Equilíbrio</p>
                  <p className="text-[10px] font-medium text-admin-primary/60">Base de custos fixos sem variáveis operacionais.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-admin-border/60 bg-admin-muted/30">
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Dia</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4">Descrição</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Tipo</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-right">Valor Mensal</TableHead>
                    <TableHead className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-admin-border/40">
                  {loadingRecurring ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Carregando custos fixos...</TableCell></TableRow>
                  ) : recurring.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhum custo fixo recorrente.</TableCell></TableRow>
                  ) : recurring.map((t: any) => (
                    <TableRow key={t.id} className="group transition-all hover:bg-admin-muted/50">
                      <TableCell className="p-4 text-center font-black text-admin-primary/40 tabular-nums">{t.recurrence_day || "—"}</TableCell>
                      <TableCell className="p-4 font-bold text-admin-primary uppercase tracking-tight">{t.description}</TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-admin-muted/30`}>
                          {t.type === "payable" ? "Despesa" : "Comissão"}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-right font-black tabular-nums text-admin-primary/80">{fmt(Number(t.amount))}</TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 border-green-100">{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Account form dialog */}
      <Dialog open={accDialogOpen} onOpenChange={setAccDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10"><BookOpen className="h-24 w-24" /></div>
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tight">{accEditingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código *</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-black font-mono" placeholder="3.1.01" value={accForm.code} onChange={e => setAccForm({ ...accForm, code: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo *</Label>
                <Select value={accForm.type} onValueChange={v => setAccForm({ ...accForm, type: v })}><SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">{typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome *</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conta Pai</Label>
              <Select value={accForm.parent_id || "none"} onValueChange={v => setAccForm({ ...accForm, parent_id: v === "none" ? "" : v })}><SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl max-h-[250px]"><SelectItem value="none">Nenhuma (raiz)</SelectItem>{accounts.filter(a => a.id !== accEditingId).map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4 bg-admin-muted/20 p-4 rounded-2xl border border-admin-border/10"><Switch checked={accForm.is_active} onCheckedChange={v => setAccForm({ ...accForm, is_active: v })} /><div className="flex-1"><Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary/80">Conta Ativa</Label></div></div>
            <Button onClick={handleSaveAcc} className="w-full h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20">{accEditingId ? "Atualizar Registro" : "Criar Conta"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Account form dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10"><Landmark className="h-24 w-24" /></div>
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tight">{bankEditingId ? "Editar Banco" : "Nova Conta Bancária"}</DialogTitle></DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identificação *</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" placeholder="Ex: Principal Itaú" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instituição</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" placeholder="Ex: Itaú" value={bankForm.bank} onChange={e => setBankForm({ ...bankForm, bank: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
                <Select value={bankForm.account_type} onValueChange={v => setBankForm({ ...bankForm, account_type: v })}><SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">{bankTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Agência</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-black font-mono" value={bankForm.agency} onChange={e => setBankForm({ ...bankForm, agency: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Número</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-black font-mono" value={bankForm.account_number} onChange={e => setBankForm({ ...bankForm, account_number: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Saldo Inicial</Label><div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-black tabular-nums" value={bankForm.initial_balance} onChange={e => setBankForm({ ...bankForm, initial_balance: e.target.value })} /></div></div>
            <div className="flex items-center gap-4 bg-admin-muted/20 p-4 rounded-2xl border border-admin-border/10"><Switch checked={bankForm.is_active} onCheckedChange={v => setBankForm({ ...bankForm, is_active: v })} /><div className="flex-1"><Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary/80">Conta Ativa</Label></div></div>
            <Button onClick={handleSaveBank} className="w-full h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20">{bankEditingId ? "Atualizar Banco" : "Cadastrar Conta Bancária"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch form dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10"><Building2 className="h-24 w-24" /></div>
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tight">{branchEditingId ? "Editar Filial" : "Nova Unidade Atmos"}</DialogTitle></DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Filial *</Label><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" placeholder="Ex: Matriz Alto Paraíso" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CNPJ</Label><div className="relative"><ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-black font-mono" value={branchForm.cnpj} onChange={e => setBranchForm({ ...branchForm, cnpj: e.target.value })} /></div></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Endereço Completo</Label><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-medium" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} /></div></div>
            <div className="flex items-center gap-4 bg-admin-muted/20 p-4 rounded-2xl border border-admin-border/10"><Switch checked={branchForm.is_active} onCheckedChange={v => setBranchForm({ ...branchForm, is_active: v })} /><div className="flex-1"><Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary/80">Unidade Operacional</Label></div></div>
            <Button onClick={handleSaveBranch} className="w-full h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20">{branchEditingId ? "Atualizar Unidade" : "Criar Nova Filial"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
