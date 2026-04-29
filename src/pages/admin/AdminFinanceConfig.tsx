import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, BookOpen, RefreshCw, Landmark, Building2 } from "lucide-react";
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

const db = supabase as any;

type Account = { id: string; code: string; name: string; type: string; parent_id: string | null; is_active: boolean };
type BankAccount = { id: string; name: string; bank: string; agency: string; account_number: string; account_type: string; initial_balance: number; is_active: boolean };
type Branch = { id: string; name: string; cnpj: string; address: string; is_active: boolean };

const typeOptions = [
  { value: "revenue", label: "Receita" },
  { value: "cost", label: "Custo" },
  { value: "expense", label: "Despesa" },
  { value: "commission", label: "Comissão" },
];
const typeBadge: Record<string, string> = { revenue: "bg-green-100 text-green-800", cost: "bg-orange-100 text-orange-800", expense: "bg-red-100 text-red-800", commission: "bg-blue-100 text-blue-800" };
const bankTypeOptions = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "digital", label: "Conta Digital" },
];

export default function AdminFinanceConfig() {
  const { toast } = useToast();

  // ---- Chart of Accounts ----
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accDialogOpen, setAccDialogOpen] = useState(false);
  const [accEditingId, setAccEditingId] = useState<string | null>(null);
  const [accForm, setAccForm] = useState({ code: "", name: "", type: "expense", parent_id: "", is_active: true });

  // ---- Recurring costs ----
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(true);

  // ---- Bank Accounts ----
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankEditingId, setBankEditingId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", is_active: true });

  // ---- Branches ----
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

  // ========== Account CRUD ==========
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

  // ========== Bank Account CRUD ==========
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

  // ========== Branch CRUD ==========
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
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configurações Financeiras</h1>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="accounts" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> Plano de Contas</TabsTrigger>
          <TabsTrigger value="banks" className="text-xs gap-1"><Landmark className="h-3.5 w-3.5" /> Contas Bancárias</TabsTrigger>
          <TabsTrigger value="branches" className="text-xs gap-1"><Building2 className="h-3.5 w-3.5" /> Filiais</TabsTrigger>
          <TabsTrigger value="recurring" className="text-xs gap-1"><RefreshCw className="h-3.5 w-3.5" /> Custos Fixos</TabsTrigger>
        </TabsList>

        {/* ========== CHART OF ACCOUNTS ========== */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewAcc} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingAccounts ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                : accounts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta</TableCell></TableRow>
                : accounts.map(a => {
                  const depth = getDepth(a);
                  return (
                    <TableRow key={a.id} className={!a.is_active ? "opacity-50" : ""}>
                      <TableCell className="text-xs font-mono">{a.code}</TableCell>
                      <TableCell className="text-sm" style={{ paddingLeft: `${16 + depth * 20}px` }}>{a.name}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${typeBadge[a.type] || ""}`}>{typeOptions.find(t => t.value === a.type)?.label}</Badge></TableCell>
                      <TableCell><Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">{a.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => openEditAcc(a)}><Pencil className="h-3 w-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Conta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a conta <strong>{a.name}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAcc(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
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

        {/* ========== BANK ACCOUNTS ========== */}
        <TabsContent value="banks" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewBank} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Conta Bancária</Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Banco</TableHead>
                <TableHead className="text-xs">Agência</TableHead>
                <TableHead className="text-xs">Conta</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs text-right">Saldo Inicial</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingBanks ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                : bankAccounts.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conta bancária cadastrada</TableCell></TableRow>
                : bankAccounts.map(b => (
                  <TableRow key={b.id} className={!b.is_active ? "opacity-50" : ""}>
                    <TableCell className="text-xs font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs">{b.bank}</TableCell>
                    <TableCell className="text-xs font-mono">{b.agency}</TableCell>
                    <TableCell className="text-xs font-mono">{b.account_number}</TableCell>
                    <TableCell className="text-xs">{bankTypeOptions.find(t => t.value === b.account_type)?.label}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(b.initial_balance)}</TableCell>
                    <TableCell><Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">{b.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => openEditBank(b)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Conta Bancária?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a conta <strong>{b.name}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBank(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
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

        {/* ========== BRANCHES ========== */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewBranch} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Filial</Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">CNPJ</TableHead>
                <TableHead className="text-xs">Endereço</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingBranches ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                : branches.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma filial cadastrada</TableCell></TableRow>
                : branches.map(b => (
                  <TableRow key={b.id} className={!b.is_active ? "opacity-50" : ""}>
                    <TableCell className="text-xs font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs font-mono">{b.cnpj || "—"}</TableCell>
                    <TableCell className="text-xs">{b.address || "—"}</TableCell>
                    <TableCell><Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">{b.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => openEditBranch(b)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Filial?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a filial <strong>{b.name}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBranch(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
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

        {/* ========== RECURRING COSTS ========== */}
        <TabsContent value="recurring" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Custos Fixos Mensais</p>
            <p className="text-lg font-bold">{fmt(totalRecurring)}</p>
            <p className="text-[10px] text-muted-foreground">{recurring.length} lançamento(s) recorrente(s)</p>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto overscroll-x-contain">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Dia</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingRecurring ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                : recurring.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum custo fixo. Crie despesas recorrentes na tela de Despesas.</TableCell></TableRow>
                : recurring.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.recurrence_day || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{t.description}</TableCell>
                    <TableCell className="text-xs">{t.type === "payable" ? "Despesa" : "Comissão"}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{fmt(Number(t.amount))}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account form dialog */}
      <Dialog open={accDialogOpen} onOpenChange={setAccDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{accEditingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Código *</Label><Input className="h-8 text-sm font-mono" placeholder="3.1.01" value={accForm.code} onChange={e => setAccForm({ ...accForm, code: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Tipo *</Label>
                <Select value={accForm.type} onValueChange={v => setAccForm({ ...accForm, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Conta pai</Label>
              <Select value={accForm.parent_id || "none"} onValueChange={v => setAccForm({ ...accForm, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhuma (raiz)</SelectItem>{accounts.filter(a => a.id !== accEditingId).map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={accForm.is_active} onCheckedChange={v => setAccForm({ ...accForm, is_active: v })} /><Label className="text-xs">Conta ativa</Label></div>
            <Button onClick={handleSaveAcc} className="w-full">{accEditingId ? "Atualizar" : "Criar Conta"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Account form dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{bankEditingId ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" placeholder="Ex: Conta Principal BB" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Banco</Label><Input className="h-8 text-sm" placeholder="Ex: Banco do Brasil" value={bankForm.bank} onChange={e => setBankForm({ ...bankForm, bank: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={bankForm.account_type} onValueChange={v => setBankForm({ ...bankForm, account_type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{bankTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Agência</Label><Input className="h-8 text-sm font-mono" value={bankForm.agency} onChange={e => setBankForm({ ...bankForm, agency: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Nº Conta</Label><Input className="h-8 text-sm font-mono" value={bankForm.account_number} onChange={e => setBankForm({ ...bankForm, account_number: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Saldo Inicial</Label><Input type="number" className="h-8 text-sm" value={bankForm.initial_balance} onChange={e => setBankForm({ ...bankForm, initial_balance: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={bankForm.is_active} onCheckedChange={v => setBankForm({ ...bankForm, is_active: v })} /><Label className="text-xs">Conta ativa</Label></div>
            <Button onClick={handleSaveBank} className="w-full">{bankEditingId ? "Atualizar" : "Criar Conta Bancária"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch form dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{branchEditingId ? "Editar Filial" : "Nova Filial"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" placeholder="Ex: Matriz Alto Paraíso" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">CNPJ</Label><Input className="h-8 text-sm font-mono" value={branchForm.cnpj} onChange={e => setBranchForm({ ...branchForm, cnpj: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Endereço</Label><Input className="h-8 text-sm" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={branchForm.is_active} onCheckedChange={v => setBranchForm({ ...branchForm, is_active: v })} /><Label className="text-xs">Filial ativa</Label></div>
            <Button onClick={handleSaveBranch} className="w-full">{branchEditingId ? "Atualizar" : "Criar Filial"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
