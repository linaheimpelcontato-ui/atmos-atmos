import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Plus, Search, Pencil } from "lucide-react";
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
      toast({ title: editing ? "Fornecedor atualizado" : "Fornecedor cadastrado" });
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
    <div className="p-4 md:p-6 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Fornecedores</h1>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Fornecedor</Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto overscroll-x-contain mt-3">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox
                    checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))}
                    onCheckedChange={() => selection.toggleAll(allIds)}
                  />
                </th>
                {!isHidden("name") && <SmartTh label="Empresa" sortKey="name" filterState={filterState} data={filtered} onHide={() => hideColumn("name")} />}
                {!isHidden("contact_name") && <SmartTh label="Responsável" sortKey="contact_name" filterState={filterState} data={filtered} onHide={() => hideColumn("contact_name")} />}
                {!isHidden("phone") && <SmartTh label="Telefone" sortKey="phone" filterState={filterState} data={filtered} onHide={() => hideColumn("phone")} />}
                {!isHidden("email") && <SmartTh label="E-mail" sortKey="email" filterState={filterState} data={filtered} onHide={() => hideColumn("email")} />}
                {!isHidden("cnpj") && <SmartTh label="CNPJ" sortKey="cnpj" filterState={filterState} data={filtered} onHide={() => hideColumn("cnpj")} />}
                {!isHidden("pix_key") && <SmartTh label="PIX" sortKey="pix_key" filterState={filterState} data={filtered} onHide={() => hideColumn("pix_key")} />}
                {!isHidden("payment_terms") && <SmartTh label="Pagamento" sortKey="payment_terms" filterState={filterState} data={filtered} onHide={() => hideColumn("payment_terms")} />}
                {!isHidden("is_active") && <th className="text-center p-3 font-medium whitespace-nowrap">Ativo</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className={`border-t border-border hover:bg-muted/30 ${selection.isSelected(s.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <Checkbox checked={selection.isSelected(s.id)} onCheckedChange={() => selection.toggle(s.id)} />
                  </td>
                  {!isHidden("name") && <td className="p-3 font-medium">
                    <button className="hover:underline cursor-pointer text-left" onClick={() => openEdit(s)}>{s.name}</button>
                  </td>}
                  {!isHidden("contact_name") && <td className="p-3">{s.contact_name || "—"}</td>}
                  {!isHidden("phone") && <td className="p-3">{s.phone || "—"}</td>}
                  {!isHidden("email") && <td className="p-3">{s.email || "—"}</td>}
                  {!isHidden("cnpj") && <td className="p-3">{s.cnpj || "—"}</td>}
                  {!isHidden("pix_key") && <td className="p-3">{s.pix_key || "—"}</td>}
                  {!isHidden("payment_terms") && <td className="p-3">{s.payment_terms || "—"}</td>}
                  {!isHidden("is_active") && <td className="p-3 text-center">
                    <Switch checked={s.is_active} onCheckedChange={async (v) => {
                      await supabase.from("suppliers").update({ is_active: v }).eq("id", s.id);
                      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
                    }} />
                  </td>}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhum fornecedor encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        bulkFields={BULK_FIELDS}
        onBulkUpdate={handleBulkUpdate}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <><Pencil className="h-4 w-4" /> Editar Fornecedor</> : <><Plus className="h-4 w-4" /> Novo Fornecedor</>}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Responsável</Label><Input className="h-8 text-sm" value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input className="h-8 text-sm" value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">E-mail</Label><Input className="h-8 text-sm" value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input className="h-8 text-sm" value={form.instagram} onChange={(e) => setField("instagram", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Site</Label><Input className="h-8 text-sm" value={form.website} onChange={(e) => setField("website", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">CNPJ</Label><Input className="h-8 text-sm" value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} /></div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Dados Bancários / Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Chave PIX</Label><Input className="h-8 text-sm" value={form.pix_key} onChange={(e) => setField("pix_key", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Banco</Label><Input className="h-8 text-sm" value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Agência</Label><Input className="h-8 text-sm" value={form.bank_agency} onChange={(e) => setField("bank_agency", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Conta</Label><Input className="h-8 text-sm" value={form.bank_account} onChange={(e) => setField("bank_account", e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Condições de Pagamento</Label><Input className="h-8 text-sm" value={form.payment_terms} onChange={(e) => setField("payment_terms", e.target.value)} placeholder="Ex: 30 dias, à vista" /></div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)} />
              <Label>Ativo</Label>
            </div>

            <DialogFooter className="flex !justify-between">
              {editing ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">Excluir</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
                      <AlertDialogDescription>Produtos vinculados perderão a referência.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(editing.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{editing ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
