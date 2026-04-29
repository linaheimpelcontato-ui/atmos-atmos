import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

const db = supabase as any;

type Seller = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  role: string | null;
  commission_rate: number;
  pix_key: string | null;
  address: string | null;
  notes: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  is_active: boolean;
  created_at: string;
};

const emptyForm = {
  name: "", email: "", phone: "", cpf: "", role: "", commission_rate: "0",
  pix_key: "", address: "", notes: "", birth_date: "", is_active: true,
};

const ALL_COLUMNS: ColumnInfo[] = [
  { key: "name", label: "Nome" },
  { key: "role", label: "Cargo" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "commission_rate", label: "Comissão" },
  { key: "is_active", label: "Ativo" },
];

const BULK_FIELDS: BulkField[] = [
  { key: "name", label: "Nome", type: "text" },
  { key: "role", label: "Cargo", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "commission_rate", label: "Comissão", type: "number" },
  { key: "is_active", label: "Ativo", type: "boolean" },
  { key: "cpf", label: "CPF", type: "text" },
  { key: "pix_key", label: "Chave PIX", type: "text" },
  { key: "address", label: "Endereço", type: "text" },
  { key: "notes", label: "Observações", type: "text" },
];

export default function AdminSellers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [form, setForm] = useState(emptyForm);
  const filterState = useSmartFilters();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns("admin-hidden-cols-sellers");
  const selection = useRowSelection();

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await db.from("sellers").select("*").order("name");
      if (error) throw error;
      return data as Seller[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof emptyForm & { id?: string }) => {
      const payload = {
        name: f.name, email: f.email || null, phone: f.phone || null,
        cpf: f.cpf || null, role: f.role || null,
        commission_rate: parseFloat(f.commission_rate) || 0,
        pix_key: f.pix_key || null, address: f.address || null,
        notes: f.notes || null, birth_date: f.birth_date || null, is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await db.from("sellers").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("sellers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      setDialogOpen(false);
      toast({ title: editing ? "Vendedor atualizado" : "Vendedor cadastrado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      toast({ title: "Vendedor removido" });
    },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Seller) => {
    setEditing(s);
    setForm({
      name: s.name, email: s.email || "", phone: s.phone || "",
      cpf: s.cpf || "", role: s.role || "",
      commission_rate: (s.commission_rate ?? 0).toString(),
      pix_key: s.pix_key || "", address: s.address || "",
      notes: s.notes || "", birth_date: s.birth_date || "",
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    let result = sellers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
    return filterState.applyFilters(result);
  }, [sellers, search, filterState]);

  const allIds = useMemo(() => filtered.map(s => s.id), [filtered]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds];
    for (const id of ids) await (supabase as any).from("sellers").delete().eq("id", id);
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    toast({ title: `${ids.length} vendedor(es) removido(s)` });
  };

  const handleBulkExport = () => {
    const rows = filtered.filter(s => selection.selectedIds.has(s.id)).map(s => ({
      Nome: s.name, Cargo: s.role, Email: s.email, Telefone: s.phone,
      "Comissão %": s.commission_rate, Ativo: s.is_active ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendedores");
    XLSX.writeFile(wb, "vendedores.xlsx");
  };

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const ids = [...selection.selectedIds];
    const val = field === "commission_rate" ? parseFloat(String(value)) || 0 : value;
    for (const id of ids) await (supabase as any).from("sellers").update({ [field]: val }).eq("id", id);
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    toast({ title: `${ids.length} vendedor(es) atualizado(s)` });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Vendedores</h1>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Vendedor
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar vendedor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="border border-border rounded-lg overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="bg-card sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))} onCheckedChange={() => selection.toggleAll(allIds)} />
                </th>
                {!isHidden("name") && <SmartTh label="Nome" sortKey="name" filterState={filterState} data={filtered} onHide={() => hideColumn("name")} />}
                {!isHidden("role") && <SmartTh label="Cargo" sortKey="role" filterState={filterState} data={filtered} onHide={() => hideColumn("role")} />}
                {!isHidden("email") && <SmartTh label="Email" sortKey="email" filterState={filterState} data={filtered} onHide={() => hideColumn("email")} />}
                {!isHidden("phone") && <SmartTh label="Telefone" sortKey="phone" filterState={filterState} data={filtered} onHide={() => hideColumn("phone")} />}
                {!isHidden("commission_rate") && <SmartTh label="Comissão" sortKey="commission_rate" filterState={filterState} data={filtered} className="text-center" onHide={() => hideColumn("commission_rate")} />}
                {!isHidden("is_active") && <th className="text-center p-3 font-medium">Ativo</th>}
                <th className="p-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={`border-t border-border hover:bg-muted/30 ${selection.isSelected(s.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3"><Checkbox checked={selection.isSelected(s.id)} onCheckedChange={() => selection.toggle(s.id)} /></td>
                  {!isHidden("name") && <td className="p-3 font-medium">{s.name}</td>}
                  {!isHidden("role") && <td className="p-3 text-muted-foreground">{s.role || "—"}</td>}
                  {!isHidden("email") && <td className="p-3 text-muted-foreground">{s.email || "—"}</td>}
                  {!isHidden("phone") && <td className="p-3"><WhatsAppPhone phone={s.phone} /></td>}
                  {!isHidden("commission_rate") && <td className="p-3 text-center tabular-nums">{s.commission_rate ? `${s.commission_rate}%` : "—"}</td>}
                  {!isHidden("is_active") && <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </td>}
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Vendedor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de <strong>{s.name}</strong> do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(s.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteMutation.isPending ? "Removendo..." : "Excluir"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhum vendedor encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkActionBar count={selection.count} onClear={selection.clear} onDelete={handleBulkDelete} onExport={handleBulkExport} bulkFields={BULK_FIELDS} onBulkUpdate={handleBulkUpdate} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing ? { ...form, id: editing.id } : form); }}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Nome Completo *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Cargo / Função</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Ex: Vendedor Sênior" /></div>
                <div className="space-y-1.5"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                <div className="space-y-1.5"><Label>Data de Nascimento</Label><DatePicker value={form.birth_date} onChange={v => setForm({ ...form, birth_date: v })} /></div>
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><PhoneInput value={form.phone} onChange={phone => setForm({ ...form, phone })} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" /></div>
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financeiro</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Comissão (%)</Label><Input type="number" step="0.1" min="0" max="100" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Chave PIX</Label><Input value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })} placeholder="CPF, email ou telefone" /></div>
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Observações</legend>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Anotações internas sobre o vendedor..." />
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Ativo</Label>
              </div>
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
