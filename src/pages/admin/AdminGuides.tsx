import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import GuideDetailSheet from "@/components/admin/guides/GuideDetailSheet";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────

type Guide = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string[];
  daily_rate: number;
  is_active: boolean;
  notes: string | null;
  residence: string | null;
  gender: string | null;
  age: number | null;
  instagram: string | null;
  has_4x4: boolean;
  vehicle_seats: number;
  limit_4x4: number | null;
  limit_tourist: number | null;
  languages: string[];
  is_kalunga: boolean;
  has_cadastur: boolean;
  created_at: string;
};

const RESIDENCE_OPTIONS = ["Alto Paraíso", "São Jorge", "Cavalcante", "Colinas", "São João D'Aliança", "Moinho", "Engenho II"];
const LANGUAGE_OPTIONS = ["Português", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano"];
const GENDER_OPTIONS: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Outro" };

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  residence: "",
  gender: "",
  age: "" as string | number,
  instagram: "",
  has_4x4: false,
  vehicle_seats: 5,
  limit_4x4: "" as string | number,
  limit_tourist: "" as string | number,
  languages: [] as string[],
  specialties: "",
  is_kalunga: false,
  has_cadastur: false,
  is_active: true,
  notes: "",
};

const ALL_COLUMNS: ColumnInfo[] = [
  { key: "name", label: "Nome" },
  { key: "residence", label: "Residência" },
  { key: "phone", label: "Telefone" },
  { key: "gender", label: "Sexo" },
  { key: "age", label: "Idade" },
  { key: "instagram", label: "Instagram" },
  { key: "has_4x4", label: "4x4" },
  { key: "limit_4x4", label: "Limite 4x4" },
  { key: "limit_tourist", label: "Limite Turista" },
  { key: "languages", label: "Idiomas" },
  { key: "specialties", label: "Especialidades" },
  { key: "is_kalunga", label: "Kalunga" },
  { key: "has_cadastur", label: "Cadastur" },
  { key: "is_active", label: "Ativo" },
];

const BULK_FIELDS: BulkField[] = [
  { key: "name", label: "Nome", type: "text" },
  { key: "residence", label: "Residência", type: "select", options: RESIDENCE_OPTIONS.map(r => ({ value: r, label: r })) },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "gender", label: "Sexo", type: "select", options: Object.entries(GENDER_OPTIONS).map(([v, l]) => ({ value: v, label: l })) },
  { key: "age", label: "Idade", type: "number" },
  { key: "instagram", label: "Instagram", type: "text" },
  { key: "has_4x4", label: "4x4", type: "boolean" },
  { key: "vehicle_seats", label: "Bancos 4x4", type: "number" },
  { key: "limit_tourist", label: "Limite Turista", type: "number" },
  { key: "languages", label: "Idiomas", type: "select", options: LANGUAGE_OPTIONS.map(l => ({ value: l, label: l })) },
  { key: "specialties", label: "Especialidades", type: "text" },
  { key: "is_kalunga", label: "Kalunga", type: "boolean" },
  { key: "has_cadastur", label: "Cadastur", type: "boolean" },
  { key: "is_active", label: "Ativo", type: "boolean" },
  { key: "email", label: "Email", type: "text" },
  { key: "notes", label: "Observações", type: "text" },
];

// ─── Main Component ─────────────────────────────────────────────────

export default function AdminGuides() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detailGuide, setDetailGuide] = useState<Guide | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const filterState = useSmartFilters();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns("admin-hidden-cols-guides");
  const selection = useRowSelection();

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["admin-guides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guides").select("*").order("name");
      if (error) throw error;
      return data as unknown as Guide[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (g: typeof form & { id?: string }) => {
      const payload = {
        name: g.name,
        email: g.email || null,
        phone: g.phone || null,
        residence: g.residence || null,
        gender: g.gender || null,
        age: typeof g.age === "number" ? g.age : (parseInt(String(g.age)) || null),
        instagram: g.instagram || null,
        has_4x4: g.has_4x4,
        vehicle_seats: g.vehicle_seats,
        limit_4x4: g.has_4x4 ? (g.vehicle_seats - 1) : null,
        limit_tourist: typeof g.limit_tourist === "number" ? g.limit_tourist : (parseInt(String(g.limit_tourist)) || null),
        languages: g.languages,
        specialties: g.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        is_kalunga: g.is_kalunga,
        has_cadastur: g.has_cadastur,
        is_active: g.is_active,
        notes: g.notes || null,
      };
      if (g.id) {
        const { error } = await supabase.from("guides").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guides").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-guides"] });
      setDialogOpen(false);
      toast({ title: editing ? "Guia atualizado" : "Guia cadastrado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-guides"] });
      toast({ title: "Guia removido" });
    },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (g: Guide) => {
    setEditing(g);
    setForm({
      name: g.name, email: g.email || "", phone: g.phone || "",
      residence: g.residence || "", gender: g.gender || "",
      age: g.age ?? "", instagram: g.instagram || "",
      has_4x4: g.has_4x4, vehicle_seats: g.vehicle_seats ?? 5,
      limit_4x4: g.limit_4x4 ?? "", limit_tourist: g.limit_tourist ?? "",
      languages: g.languages || [],
      specialties: g.specialties.join(", "), is_kalunga: g.is_kalunga,
      has_cadastur: g.has_cadastur, is_active: g.is_active, notes: g.notes || "",
    });
    setDialogOpen(true);
  };

  const openDetail = (g: Guide) => { setDetailGuide(g); setDetailOpen(true); };

  const toggleLanguage = (lang: string) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));
  };

  const filtered = useMemo(() => {
    let result = guides.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));
    return filterState.applyFilters(result);
  }, [guides, search, filterState]);

  const allIds = useMemo(() => filtered.map(g => g.id), [filtered]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds];
    for (const id of ids) await supabase.from("guides").delete().eq("id", id);
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-guides"] });
    toast({ title: `${ids.length} guia(s) removido(s)` });
  };

  const handleBulkExport = () => {
    const rows = filtered.filter(g => selection.selectedIds.has(g.id)).map(g => ({
      Nome: g.name, Residência: g.residence, Telefone: g.phone, Sexo: GENDER_OPTIONS[g.gender || ""] || "",
      Idade: g.age, Instagram: g.instagram, "4x4": g.has_4x4 ? "Sim" : "Não",
      "Limite 4x4": g.has_4x4 ? (g.vehicle_seats - 1) : "✕", "Limite Turista": g.limit_tourist ?? "",
      Idiomas: (g.languages || []).join(", "), Especialidades: g.specialties.join(", "),
      Kalunga: g.is_kalunga ? "Sim" : "Não", Cadastur: g.has_cadastur ? "Sim" : "Não",
      Ativo: g.is_active ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guias");
    XLSX.writeFile(wb, "guias.xlsx");
  };

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const ids = [...selection.selectedIds];
    let dbValue: unknown = value;

    if (field === "languages") {
      dbValue = [String(value)];
    } else if (field === "specialties") {
      dbValue = String(value).split(",").map(s => s.trim()).filter(Boolean);
    } else if (["age", "limit_tourist", "vehicle_seats"].includes(field)) {
      dbValue = parseInt(String(value)) || null;
    }

    const updates: Record<string, unknown> = { [field]: dbValue };
    // Recalculate limit_4x4 when vehicle_seats or has_4x4 changes
    if (field === "vehicle_seats") {
      // We need per-guide check for has_4x4, so update individually
      for (const id of ids) {
        const guide = guides.find(g => g.id === id);
        if (!guide) continue;
        await supabase.from("guides").update({
          vehicle_seats: Number(dbValue),
          limit_4x4: guide.has_4x4 ? (Number(dbValue) - 1) : guide.limit_4x4,
        }).eq("id", id);
      }
    } else if (field === "has_4x4") {
      for (const id of ids) {
        const guide = guides.find(g => g.id === id);
        if (!guide) continue;
        await supabase.from("guides").update({
          has_4x4: Boolean(dbValue),
          limit_4x4: dbValue ? (guide.vehicle_seats - 1) : null,
        }).eq("id", id);
      }
    } else {
      for (const id of ids) await supabase.from("guides").update(updates).eq("id", id);
    }

    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-guides"] });
    toast({ title: `${ids.length} guia(s) atualizado(s)` });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Guias Parceiros</h1>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Guia
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar guia..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <Checkbox
                    checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))}
                    onCheckedChange={() => selection.toggleAll(allIds)}
                  />
                </th>
                {!isHidden("name") && <SmartTh label="Nome" sortKey="name" filterState={filterState} data={filtered} onHide={() => hideColumn("name")} />}
                {!isHidden("residence") && <SmartTh label="Residência" sortKey="residence" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("residence")} />}
                {!isHidden("phone") && <SmartTh label="Telefone" sortKey="phone" filterState={filterState} data={filtered} className="hidden sm:table-cell" onHide={() => hideColumn("phone")} />}
                {!isHidden("gender") && <SmartTh label="Sexo" sortKey="gender" filterState={filterState} data={filtered} labelMap={GENDER_OPTIONS} className="hidden lg:table-cell" onHide={() => hideColumn("gender")} />}
                {!isHidden("age") && <SmartTh label="Idade" sortKey="age" filterState={filterState} data={filtered} className="text-center hidden lg:table-cell" onHide={() => hideColumn("age")} />}
                {!isHidden("instagram") && <th className="text-left p-3 font-medium whitespace-nowrap hidden xl:table-cell">Instagram</th>}
                {!isHidden("has_4x4") && <th className="text-center p-3 font-medium whitespace-nowrap">4x4</th>}
                {!isHidden("limit_4x4") && <th className="text-center p-3 font-medium whitespace-nowrap hidden lg:table-cell">Limite 4x4</th>}
                {!isHidden("limit_tourist") && <th className="text-center p-3 font-medium whitespace-nowrap hidden lg:table-cell">Limite Turista</th>}
                {!isHidden("languages") && <th className="text-left p-3 font-medium whitespace-nowrap hidden lg:table-cell">Idiomas</th>}
                {!isHidden("specialties") && <th className="text-left p-3 font-medium whitespace-nowrap hidden xl:table-cell">Especialidades</th>}
                {!isHidden("is_kalunga") && <th className="text-center p-3 font-medium whitespace-nowrap hidden xl:table-cell">Kalunga</th>}
                {!isHidden("has_cadastur") && <th className="text-center p-3 font-medium whitespace-nowrap hidden xl:table-cell">Cadastur</th>}
                {!isHidden("is_active") && <th className="text-center p-3 font-medium whitespace-nowrap">Ativo</th>}
                <th className="p-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className={`border-t border-border hover:bg-muted/30 ${selection.isSelected(g.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3"><Checkbox checked={selection.isSelected(g.id)} onCheckedChange={() => selection.toggle(g.id)} /></td>
                  {!isHidden("name") && <td className="p-3 font-medium whitespace-nowrap">
                    <button className="text-primary hover:underline cursor-pointer text-left" onClick={() => openDetail(g)}>
                      {g.name}
                    </button>
                  </td>}
                  {!isHidden("residence") && <td className="p-3 text-muted-foreground whitespace-nowrap hidden md:table-cell">{g.residence || "—"}</td>}
                  {!isHidden("phone") && <td className="p-3 whitespace-nowrap hidden sm:table-cell"><WhatsAppPhone phone={g.phone} /></td>}
                  {!isHidden("gender") && <td className="p-3 whitespace-nowrap hidden lg:table-cell">{GENDER_OPTIONS[g.gender || ""] || "—"}</td>}
                  {!isHidden("age") && <td className="p-3 text-center hidden lg:table-cell">{g.age || "—"}</td>}
                  {!isHidden("instagram") && <td className="p-3 text-muted-foreground whitespace-nowrap hidden xl:table-cell">{g.instagram || "—"}</td>}
                  {!isHidden("has_4x4") && <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${g.has_4x4 ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </td>}
                  {!isHidden("limit_4x4") && <td className="p-3 text-center hidden lg:table-cell">{g.has_4x4 ? (g.vehicle_seats - 1) : "✕"}</td>}
                  {!isHidden("limit_tourist") && <td className="p-3 text-center hidden lg:table-cell">{g.limit_tourist ?? "—"}</td>}
                  {!isHidden("languages") && <td className="p-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(g.languages || []).map((l) => (
                        <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                      ))}
                      {(!g.languages || g.languages.length === 0) && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>}
                  {!isHidden("specialties") && <td className="p-3 hidden xl:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {g.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </td>}
                  {!isHidden("is_kalunga") && <td className="p-3 text-center hidden xl:table-cell">
                    <span className={`inline-block w-2 h-2 rounded-full ${g.is_kalunga ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </td>}
                  {!isHidden("has_cadastur") && <td className="p-3 text-center hidden xl:table-cell">
                    <span className={`inline-block w-2 h-2 rounded-full ${g.has_cadastur ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </td>}
                  {!isHidden("is_active") && <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${g.is_active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </td>}
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)}>
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
                            <AlertDialogTitle>Remover Guia?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de <strong>{g.name}</strong> do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(g.id)}
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
                <tr>
                  <td colSpan={13} className="p-6 text-center text-muted-foreground">
                    Nenhum guia encontrado
                  </td>
                </tr>
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

      {/* ─── Detail Sheet ────────────────────────────────────────── */}
      <GuideDetailSheet guide={detailGuide} open={detailOpen} onOpenChange={setDetailOpen} />

      {/* ─── Dialog Form ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Guia" : "Novo Guia"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editing ? { ...form, id: editing.id } : form);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Residência</Label>
                <Select value={form.residence} onValueChange={(v) => setForm({ ...form, residence: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {RESIDENCE_OPTIONS
                      .filter((r) => r !== "Engenho II" || form.is_kalunga)
                      .map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@perfil" />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENDER_OPTIONS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Idiomas</Label>
              <div className="flex flex-wrap gap-3">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <label key={lang} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={form.languages.includes(lang)} onCheckedChange={() => toggleLanguage(lang)} />
                    {lang}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Especialidades (separadas por vírgula)</Label>
              <Input placeholder="Trilhas, Rapel, Cachoeiras" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.has_4x4} onCheckedChange={(v) => setForm({ ...form, has_4x4: v, vehicle_seats: v ? form.vehicle_seats : 5 })} /> 4x4
              </label>
              {form.has_4x4 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Bancos:</span>
                  <Select value={String(form.vehicle_seats)} onValueChange={(v) => setForm({ ...form, vehicle_seats: parseInt(v) })}>
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 lugares</SelectItem>
                      <SelectItem value="7">7 lugares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Limite 4x4</Label>
                <Input type="number" min="0" disabled value={form.has_4x4 ? (Number(form.vehicle_seats) - 1) : ""} readOnly className="bg-muted" />
                <p className="text-[10px] text-muted-foreground">{form.has_4x4 ? "Bancos – 1 (automático)" : "Sem 4x4"}</p>
              </div>
              <div className="space-y-2">
                <Label>Limite Turista</Label>
                <Input type="number" min="0" placeholder="Ex: 6" value={form.limit_tourist} onChange={(e) => setForm({ ...form, limit_tourist: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_kalunga} onCheckedChange={(v) => setForm({ ...form, is_kalunga: v, residence: !v && form.residence === "Engenho II" ? "" : form.residence })} /> Kalunga
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.has_cadastur} onCheckedChange={(v) => setForm({ ...form, has_cadastur: v })} /> Cadastur
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Ativo
              </label>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
