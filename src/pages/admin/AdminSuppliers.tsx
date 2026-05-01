import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Plus, Search, Pencil, Mail, Phone, Landmark, CreditCard, Instagram, Globe, FileText, Activity, ShieldCheck, UserPlus, MoreHorizontal, Trash2, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import type { Supplier } from "@/components/admin/products/shared";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const emptyForm = {
  name: "", contact_name: "", phone: "", email: "", instagram: "", website: "",
  cnpj: "", pix_key: "", bank_name: "", bank_agency: "", bank_account: "",
  payment_terms: "", notes: "", is_active: true,
};

const ALL_COLUMNS: ColumnInfo[] = [
  { key: "name", label: "Empresa" },
  { key: "contact_name", label: "Responsável" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "cnpj", label: "CNPJ" },
  { key: "pix_key", label: "PIX" },
  { key: "payment_terms", label: "Pagamento" },
  { key: "is_active", label: "Ativo" },
];

const BULK_FIELDS: BulkField[] = [
  { key: "name", label: "Empresa", type: "text" },
  { key: "contact_name", label: "Responsável", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "cnpj", label: "CNPJ", type: "text" },
  { key: "pix_key", label: "Chave PIX", type: "text" },
  { key: "payment_terms", label: "Condições de Pagamento", type: "text" },
  { key: "is_active", label: "Ativo", type: "boolean" },
  { key: "instagram", label: "Instagram", type: "text" },
  { key: "website", label: "Website", type: "text" },
  { key: "bank_name", label: "Banco", type: "text" },
  { key: "bank_agency", label: "Agência", type: "text" },
  { key: "bank_account", label: "Conta", type: "text" },
  { key: "notes", label: "Observações", type: "text" },
];

export default function AdminSuppliers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();
  const filterState = useSmartFilters();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns("admin-hidden-cols-suppliers");
  const selection = useRowSelection();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert([form]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? "Fornecedor atualizado" : "Fornecedor cadastrado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "Fornecedor excluído" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, contact_name: s.contact_name || "", phone: s.phone || "",
      email: s.email || "", instagram: s.instagram || "", website: s.website || "",
      cnpj: s.cnpj || "", pix_key: s.pix_key || "", bank_name: s.bank_name || "",
      bank_agency: s.bank_agency || "", bank_account: s.bank_account || "",
      payment_terms: s.payment_terms || "", notes: s.notes || "", is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    let result = suppliers.filter((s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_name || "").toLowerCase().includes(search.toLowerCase())
    );
    return filterState.applyFilters(result);
  }, [suppliers, search, filterState]);

  const allIds = useMemo(() => filtered.map(s => s.id), [filtered]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds];
    for (const id of ids) {
      await supabase.from("suppliers").delete().eq("id", id);
    }
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
    toast({ title: `${ids.length} fornecedor(es) excluído(s)` });
  };

  const handleBulkExport = () => {
    const rows = filtered.filter(s => selection.selectedIds.has(s.id)).map(s => ({
      Empresa: s.name, Responsável: s.contact_name, Telefone: s.phone,
      "E-mail": s.email, CNPJ: s.cnpj, PIX: s.pix_key,
      Pagamento: s.payment_terms, Ativo: s.is_active ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fornecedores");
    XLSX.writeFile(wb, "fornecedores.xlsx");
  };

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const ids = [...selection.selectedIds];
    for (const id of ids) {
      await supabase.from("suppliers").update({ [field]: value }).eq("id", id);
    }
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
    toast({ title: `${ids.length} fornecedor(es) atualizado(s)` });
  };

  const setField = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

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
              <Truck className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary tracking-tighter">Fornecedores</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14 uppercase tracking-widest text-[10px] opacity-70">Rede de parceiros e operadoras locais</p>
        </div>
        <Button 
          onClick={openNew} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <Plus className="h-5 w-5" /> Novo Parceiro
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar por empresa, responsável ou CNPJ..." 
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
                {!isHidden("name") && <SmartTh label="Empresa" sortKey="name" filterState={filterState} data={filtered} onHide={() => hideColumn("name")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("contact_name") && <SmartTh label="Responsável" sortKey="contact_name" filterState={filterState} data={filtered} onHide={() => hideColumn("contact_name")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("phone") && <SmartTh label="Contato" sortKey="phone" filterState={filterState} data={filtered} onHide={() => hideColumn("phone")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("payment_terms") && <SmartTh label="Condições" sortKey="payment_terms" filterState={filterState} data={filtered} onHide={() => hideColumn("payment_terms")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" />}
                {!isHidden("is_active") && <th className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</th>}
                <th className="p-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40">
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Sincronizando parceiros...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhum parceiro encontrado</TableCell></TableRow>
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
                      <div className="flex flex-col">
                        <span className="font-black text-admin-primary uppercase tracking-tight">{s.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/40">{s.cnpj || "CNPJ não informado"}</span>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("contact_name") && <TableCell className="p-4 font-bold text-muted-foreground/70 uppercase text-[10px] tracking-widest">{s.contact_name || "—"}</TableCell>}
                  {!isHidden("phone") && (
                    <TableCell className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-admin-primary/80">{s.phone || "—"}</span>
                        <span className="text-[10px] font-medium text-muted-foreground opacity-60">{s.email || "—"}</span>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("payment_terms") && (
                    <TableCell className="p-4">
                      <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase bg-admin-muted text-admin-primary/60 border-none">
                        {s.payment_terms || "À combinar"}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("is_active") && (
                    <TableCell className="p-4 text-center">
                      <Switch 
                        checked={s.is_active} 
                        onCheckedChange={async (v) => {
                          await supabase.from("suppliers").update({ is_active: v }).eq("id", s.id);
                          qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
                        }}
                        className="data-[state=checked]:bg-emerald-500 mx-auto"
                      />
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
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Remover Parceiro?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-muted-foreground">
                              Esta ação removerá permanentemente o fornecedor <strong>{s.name}</strong>. Os produtos vinculados a ele podem ficar órfãos.
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-admin-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                {editing ? "Ficha do Parceiro" : "Novo Registro de Fornecedor"}
              </DialogTitle>
              <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Gestão de operadoras, hotéis e serviços locais</p>
            </DialogHeader>
          </div>
          
          <form className="p-8 space-y-8 max-h-[70vh] overflow-y-auto" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Activity className="h-3 w-3" /> Identificação Institucional
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Razão Social / Nome Fantasia *</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setField("name", e.target.value)} 
                    required 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold uppercase tracking-tight"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CNPJ</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.cnpj} 
                      onChange={e => setField("cnpj", e.target.value)} 
                      placeholder="00.000.000/0000-00" 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável Operacional</Label>
                  <Input 
                    value={form.contact_name} 
                    onChange={e => setField("contact_name", e.target.value)} 
                    placeholder="Nome do contato principal" 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Phone className="h-3 w-3" /> Comunicação & Digital
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail para Reservas</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      value={form.email} 
                      onChange={e => setField("email", e.target.value)} 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.phone} 
                      onChange={e => setField("phone", e.target.value)} 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram (@)</Label>
                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.instagram} 
                      onChange={e => setField("instagram", e.target.value)} 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={form.website} 
                      onChange={e => setField("website", e.target.value)} 
                      className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-admin-primary/5 p-8 rounded-[2rem] border border-admin-primary/10 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Landmark className="h-3 w-3" /> Liquidação Financeira
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Chave PIX Prioritária</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-primary/40" />
                    <Input 
                      value={form.pix_key} 
                      onChange={e => setField("pix_key", e.target.value)} 
                      placeholder="Identificador para transferências rápidas" 
                      className="h-12 bg-white border-none rounded-2xl pl-11 font-bold text-admin-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Banco</Label>
                  <Input 
                    value={form.bank_name} 
                    onChange={e => setField("bank_name", e.target.value)} 
                    className="h-12 bg-white border-none rounded-2xl font-bold text-admin-primary uppercase text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Agência / Conta</Label>
                  <div className="flex gap-2">
                    <Input value={form.bank_agency} onChange={e => setField("bank_agency", e.target.value)} placeholder="Ag." className="h-12 bg-white border-none rounded-2xl font-bold text-admin-primary w-24 text-center" />
                    <Input value={form.bank_account} onChange={e => setField("bank_account", e.target.value)} placeholder="C/C" className="h-12 bg-white border-none rounded-2xl font-bold text-admin-primary flex-1" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Condições de Pagamento</Label>
                  <Input 
                    value={form.payment_terms} 
                    onChange={e => setField("payment_terms", e.target.value)} 
                    placeholder="Ex: Faturado 15 dias, 50% entrada + 50% saída" 
                    className="h-12 bg-white border-none rounded-2xl font-bold text-admin-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Anotações & Histórico</Label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
                <Textarea 
                  value={form.notes} 
                  onChange={e => setField("notes", e.target.value)} 
                  rows={3} 
                  placeholder="Informações contratuais ou operacionais relevantes..." 
                  className="rounded-3xl bg-admin-muted/40 border-none pl-11 p-4 font-medium"
                />
              </div>
              <div className="flex items-center gap-4 bg-admin-muted/20 p-5 rounded-2xl border border-admin-border/10">
                <Switch checked={form.is_active} onCheckedChange={v => setField("is_active", v)} className="data-[state=checked]:bg-emerald-500" />
                <div className="flex-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Status do Cadastro</Label>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Habilitado para inclusão em novos orçamentos</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="flex-[2] h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20"
              >
                {editing ? "Atualizar Registro" : "Ativar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
