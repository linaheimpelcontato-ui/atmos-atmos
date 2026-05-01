import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, FolderTree, ArrowRight, ChevronRight, Activity, Database, ListTree, Search, Filter } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

const db = supabase as any;

type Account = {
  id: string; code: string; name: string; type: string;
  parent_id: string | null; is_active: boolean;
};

const typeOptions = [
  { value: "revenue", label: "Receita", color: "text-green-600", bg: "bg-green-50" },
  { value: "cost", label: "Custo", color: "text-orange-600", bg: "bg-orange-50" },
  { value: "expense", label: "Despesa", color: "text-destructive", bg: "bg-red-50" },
  { value: "commission", label: "Comissão", color: "text-admin-primary", bg: "bg-admin-primary/5" },
];

export default function AdminChartOfAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ code: "", name: "", type: "expense", parent_id: "", is_active: true });
  const accountsFilterState = useSmartFilters();

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("chart_of_accounts").select("*").order("code");
    setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => setForm({ code: "", name: "", type: "expense", parent_id: "", is_active: true });

  const openNew = () => { resetForm(); setEditingId(null); setDialogOpen(true); };
  const openEdit = (a: Account) => {
    setEditingId(a.id);
    setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id || "", is_active: a.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { code: form.code, name: form.name, type: form.type, parent_id: form.parent_id || null, is_active: form.is_active };
    const { error } = editingId
      ? await db.from("chart_of_accounts").update(payload).eq("id", editingId)
      : await db.from("chart_of_accounts").insert(payload);
    if (error) { toast({ title: "Erro", description: String(error.message), variant: "destructive" }); return; }
    toast({ title: editingId ? "Conta atualizada" : "Conta criada" });
    setDialogOpen(false);
    fetch();
  };

  const handleDelete = async (id: string) => {
    await db.from("chart_of_accounts").delete().eq("id", id);
    fetch();
  };

  const getDepth = (a: Account): number => {
    if (!a.parent_id) return 0;
    const parent = accounts.find(p => p.id === a.parent_id);
    return parent ? 1 + getDepth(parent) : 0;
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const sortedAccounts = accountsFilterState.applyFilters(filteredAccounts);

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
              <ListTree className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Plano de Contas</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Estrutura hierárquica de classificação financeira</p>
        </div>
        <Button 
          onClick={openNew} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <Plus className="h-5 w-5" /> Nova Conta
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar por código ou nome da conta..." 
              className="pl-11 h-12 bg-admin-muted/40 border-none rounded-2xl text-base focus-visible:ring-admin-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="h-8 w-[1px] bg-admin-border/40 mx-2 hidden lg:block" />
          <div className="flex items-center gap-2 bg-admin-muted/40 px-4 h-12 rounded-2xl">
            <Database className="h-4 w-4 text-admin-primary/40" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{accounts.length} Contas Totais</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm border-collapse">
            <TableHeader>
              <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-transparent">
                <SmartTh label="Código" sortKey="code" filterState={accountsFilterState} data={accounts} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Estrutura e Nome" sortKey="name" filterState={accountsFilterState} data={accounts} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px]" />
                <SmartTh label="Tipo" sortKey="type" filterState={accountsFilterState} data={accounts} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <SmartTh label="Status" sortKey="is_active" filterState={accountsFilterState} data={accounts} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] text-center" />
                <th className="p-4 w-28" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/40">
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Carregando plano de contas...</TableCell></TableRow>
              ) : sortedAccounts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-20 font-black uppercase tracking-widest text-[10px] opacity-40">Nenhuma conta encontrada</TableCell></TableRow>
              ) : sortedAccounts.map(a => {
                const depth = getDepth(a);
                const typeOpt = typeOptions.find(t => t.value === a.type);
                return (
                  <TableRow key={a.id} className={`group transition-all duration-300 hover:bg-admin-muted/50 ${!a.is_active ? "opacity-50 grayscale-[0.5]" : ""}`}>
                    <TableCell className="p-4 font-mono font-bold text-admin-primary/60 text-xs tabular-nums">{a.code}</TableCell>
                    <TableCell className="p-4">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
                        {depth > 0 && <ChevronRight className="h-3 w-3 text-admin-primary/20 shrink-0" />}
                        <span className={`text-sm tracking-tight ${depth === 0 ? "font-black text-admin-primary" : "font-bold text-admin-primary/80"}`}>
                          {a.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${typeOpt?.bg} ${typeOpt?.color} border-current/20`}>
                        {typeOpt?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${a.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-muted text-muted-foreground border-muted-foreground/10"}`}>
                        {a.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-xl bg-admin-muted/40 text-admin-primary hover:bg-admin-primary hover:text-white transition-all"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Excluir Conta?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground font-medium">
                                Tem certeza que deseja excluir <strong>{a.name}</strong>? Esta ação pode impactar lançamentos vinculados e classificações históricas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(a.id)}
                                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]"
                              >
                                Excluir Permanentemente
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <FolderTree className="h-24 w-24" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                {editingId ? "Editar Conta" : "Nova Conta Contábil"}
              </DialogTitle>
              <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Defina a classificação no plano de contas</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código *</Label>
                <Input 
                  className="h-12 bg-admin-muted/40 border-none rounded-2xl text-base font-black font-mono focus-visible:ring-admin-primary/20" 
                  placeholder="3.1.01" 
                  value={form.code} 
                  onChange={e => setForm({ ...form, code: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Conta *</Label>
              <Input 
                className="h-12 bg-admin-muted/40 border-none rounded-2xl text-base font-bold focus-visible:ring-admin-primary/20" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                placeholder="Ex: Fornecedores Nacionais"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vincular a Conta Pai</Label>
              <Select value={form.parent_id || "none"} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold">
                  <SelectValue placeholder="Nenhuma (Conta Raiz)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl max-h-[250px]">
                  <SelectItem value="none">Nenhuma (Conta Raiz)</SelectItem>
                  {accounts.filter(a => a.id !== editingId).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 bg-admin-muted/20 p-4 rounded-2xl border border-admin-border/10">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <div className="flex-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary/80">Conta Ativa</Label>
                <p className="text-[8px] font-bold text-muted-foreground/60 uppercase">Disponível para novos lançamentos</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-admin-muted/20 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              className="px-8 rounded-xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-admin-primary/20"
            >
              {editingId ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
