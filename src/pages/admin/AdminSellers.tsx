import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, UserCheck, Mail, Phone, MapPin, Key, Hash, FileText, Activity, ShieldCheck, UserPlus, MoreHorizontal, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { motion, AnimatePresence } from "framer-motion";

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
      toast({ title: editing ? "Vendedor atualizado" : "Vendedor cadastrado com sucesso!" });
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <UserCheck className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Equipe Comercial</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Gestão de vendedores, parceiros e comissionamentos</p>
        </div>
        <Button 
          onClick={openNew} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <UserPlus className="h-5 w-5" /> Novo Vendedor
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              className="pl-11 h-12 bg-admin-muted/40 border-none rounded-2xl text-base focus-visible:ring-admin-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="h-8 w-[1px] bg-admin-border/40 mx-2 hidden lg:block" />
          <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-admin-border/60 bg-admin-muted/30">
                <th className="p-4 w-12 text-center">
                  <Checkbox
                    checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))}
                    onCheckedChange={() => selection.toggleAll(allIds)}
                    className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                  />
                </th>
                {!isHidden("name") && <SmartTh label="Identificação" sortKey="name" filterState={filterState} data={filtered} onHide={() => hideColumn("name")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("role") && <SmartTh label="Cargo" sortKey="role" filterState={filterState} data={filtered} onHide={() => hideColumn("role")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("email") && <SmartTh label="Contato" sortKey="email" filterState={filterState} data={filtered} onHide={() => hideColumn("email")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("commission_rate") && <SmartTh label="Comissão" sortKey="commission_rate" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center" onHide={() => hideColumn("commission_rate")} />}
                {!isHidden("is_active") && <th className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</th>}
                <th className="p-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40">
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Sincronizando equipe...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhum vendedor encontrado</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow 
                  key={s.id} 
                  className={`group transition-all duration-300 hover:bg-admin-muted/50 ${selection.isSelected(s.id) ? "bg-admin-primary/[0.03]" : ""}`}
                >
                  <TableCell className="p-4 text-center">
                    <Checkbox 
                      checked={selection.isSelected(s.id)} 
                      onCheckedChange={() => selection.toggle(s.id)}
                      className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                    />
                  </TableCell>
                  {!isHidden("name") && (
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-admin-primary/10 flex items-center justify-center font-black text-admin-primary uppercase text-xs">
                          {s.name.substring(0, 2)}
                        </div>
                        <span className="font-black text-admin-primary uppercase tracking-tight">{s.name}</span>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("role") && <TableCell className="p-4 font-bold text-muted-foreground/60 uppercase text-[10px] tracking-widest">{s.role || "Consultor"}</TableCell>}
                  {!isHidden("email") && (
                    <TableCell className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-admin-primary/80">
                          <Mail className="h-3 w-3 opacity-40" /> {s.email || "—"}
                        </div>
                        <WhatsAppPhone phone={s.phone} className="text-[10px] font-black" />
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("commission_rate") && (
                    <TableCell className="p-4 text-center">
                      <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] font-black tabular-nums bg-admin-primary/5 text-admin-primary border-admin-primary/10">
                        {s.commission_rate}%
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("is_active") && (
                    <TableCell className="p-4 text-center">
                      <div className={`h-2.5 w-2.5 rounded-full mx-auto ${s.is_active ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/20"}`} />
                    </TableCell>
                  )}
                  <TableCell className="p-4 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)} className="h-9 w-9 rounded-xl bg-admin-muted/40 text-admin-primary hover:bg-admin-primary hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Remover Membro?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-muted-foreground">
                              Esta ação removerá permanentemente o perfil de <strong>{s.name}</strong> e todos os vínculos com metas futuras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(s.id)}
                              className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest text-[10px]"
                            >
                              Confirmar Exclusão
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar 
        count={selection.count} 
        onClear={selection.clear} 
        onDelete={handleBulkDelete} 
        onExport={handleBulkExport} 
        bulkFields={BULK_FIELDS} 
        onBulkUpdate={handleBulkUpdate} 
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <UserCheck className="h-24 w-24" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                {editing ? "Perfil do Consultor" : "Novo Integrante Comercial"}
              </DialogTitle>
              <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Gestão de credenciais e parâmetros de venda</p>
            </DialogHeader>
          </div>
          
          <form className="p-8 space-y-8 max-h-[70vh] overflow-y-auto" onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing ? { ...form, id: editing.id } : form); }}>
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Activity className="h-3 w-3" /> Identidade & Atuação
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    required 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo / Função</Label>
                  <Input 
                    value={form.role} 
                    onChange={e => setForm({ ...form, role: e.target.value })} 
                    placeholder="Ex: Consultor Master" 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.cpf} 
                      onChange={e => setForm({ ...form, cpf: e.target.value })} 
                      placeholder="000.000.000-00" 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nascimento</Label>
                  <DatePicker value={form.birth_date} onChange={v => setForm({ ...form, birth_date: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Phone className="h-3 w-3" /> Comunicação & Localização
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      value={form.email} 
                      onChange={e => setForm({ ...form, email: e.target.value })} 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                  <PhoneInput value={form.phone} onChange={phone => setForm({ ...form, phone })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Residência / Endereço</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.address} 
                      onChange={e => setForm({ ...form, address: e.target.value })} 
                      placeholder="Endereço para correspondência" 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-admin-primary/5 p-8 rounded-[2rem] border border-admin-primary/10 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Landmark className="h-3 w-3" /> Parâmetros Financeiros
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Comissão Padrão (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="100" 
                    value={form.commission_rate} 
                    onChange={e => setForm({ ...form, commission_rate: e.target.value })} 
                    className="h-12 bg-white border-none rounded-2xl font-black text-admin-primary text-lg tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Chave PIX (Pagamentos)</Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-primary/40" />
                    <Input 
                      value={form.pix_key} 
                      onChange={e => setForm({ ...form, pix_key: e.target.value })} 
                      placeholder="Identificador para repasses" 
                      className="h-12 bg-white border-none rounded-2xl pl-11 font-bold text-admin-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Anotações Internas</Label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
                <Textarea 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                  rows={4} 
                  placeholder="Informações relevantes sobre histórico ou acordos..." 
                  className="rounded-3xl bg-admin-muted/40 border-none pl-11 p-4 font-medium"
                />
              </div>
              <div className="flex items-center gap-4 bg-admin-muted/20 p-5 rounded-2xl border border-admin-border/10">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} className="data-[state=checked]:bg-emerald-500" />
                <div className="flex-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Status Operacional</Label>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Vendedor habilitado para novos orçamentos</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="flex-[2] h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20"
              >
                {editing ? "Salvar Perfil" : "Ativar Novo Consultor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
