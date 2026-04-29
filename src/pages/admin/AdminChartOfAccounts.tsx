import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

const db = supabase as any;

type Account = {
  id: string; code: string; name: string; type: string;
  parent_id: string | null; is_active: boolean;
};

const typeOptions = [
  { value: "revenue", label: "Receita" },
  { value: "cost", label: "Custo" },
  { value: "expense", label: "Despesa" },
  { value: "commission", label: "Comissão" },
];

const typeBadge: Record<string, string> = {
  revenue: "bg-green-100 text-green-800",
  cost: "bg-orange-100 text-orange-800",
  expense: "bg-red-100 text-red-800",
  commission: "bg-blue-100 text-blue-800",
};

export default function AdminChartOfAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // Build hierarchy display
  const getDepth = (a: Account): number => {
    if (!a.parent_id) return 0;
    const parent = accounts.find(p => p.id === a.parent_id);
    return parent ? 1 + getDepth(parent) : 0;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plano de Contas</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SmartTableHead label="Código" sortKey="code" filterState={accountsFilterState} data={accounts} className="text-xs" />
                <SmartTableHead label="Nome" sortKey="name" filterState={accountsFilterState} data={accounts} className="text-xs" />
                <SmartTableHead label="Tipo" sortKey="type" filterState={accountsFilterState} data={accounts} className="text-xs" labelMap={Object.fromEntries(typeOptions.map(t => [t.value, t.label]))} />
                <SmartTableHead label="Status" sortKey="is_active" filterState={accountsFilterState} data={accounts} className="text-xs" labelMap={{ true: "Ativa", false: "Inativa" }} />
                <SmartTableHead label="" sortKey="_x" filterState={accountsFilterState} data={[]} className="text-xs w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : accountsFilterState.applyFilters(accounts).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada</TableCell></TableRow>
              ) : accountsFilterState.applyFilters(accounts).map(a => {
                const depth = getDepth(a);
                return (
                  <TableRow key={a.id} className={!a.is_active ? "opacity-50" : ""}>
                    <TableCell className="text-xs font-mono">{a.code}</TableCell>
                    <TableCell className="text-sm" style={{ paddingLeft: `${16 + depth * 20}px` }}>{a.name}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${typeBadge[a.type] || ""}`}>{typeOptions.find(t => t.value === a.type)?.label}</Badge></TableCell>
                    <TableCell><Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">{a.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
                              <AlertDialogAction 
                                onClick={() => handleDelete(a.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Código *</Label>
                <Input className="h-8 text-sm font-mono" placeholder="3.1.01" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input className="h-8 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Conta pai</Label>
              <Select value={form.parent_id || "none"} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {accounts.filter(a => a.id !== editingId).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">Conta ativa</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editingId ? "Atualizar" : "Criar Conta"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
