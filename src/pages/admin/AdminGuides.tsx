import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, Users, ShieldCheck, MapPin, Phone, Mail, Instagram, Star, Languages, Car, UserCheck, Activity, FileText, ChevronRight, MoreHorizontal, Hash, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InlinePrice, regionLabels } from "@/components/admin/products/shared";
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
import { motion, AnimatePresence } from "framer-motion";
import { TableRow, TableCell } from "@/components/ui/table";

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

  const { data: waterfalls = [] } = useQuery({
    queryKey: ["waterfall-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, is_active")
        .eq("type", "waterfall")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: guidePrices = [], isLoading: isLoadingPrices } = useQuery({
    queryKey: ["guide-waterfall-prices", editing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_waterfall_prices")
        .select("*")
        .eq("guide_id", editing!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editing?.id,
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (payload: { product_id: string; [key: string]: any }) => {
      const { product_id, ...rest } = payload;
      const { error } = await supabase
        .from("guide_waterfall_prices")
        .upsert({
          guide_id: editing!.id,
          product_id,
          ...rest
        }, { onConflict: "guide_id,product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide-waterfall-prices", editing?.id] });
    },
  });

  const seedPricesMutation = useMutation({
    mutationFn: async (missing: { guide_id: string; product_id: string }[]) => {
      if (missing.length === 0) return;
      const { error } = await supabase
        .from("guide_waterfall_prices")
        .upsert(
          missing.map((m) => ({
            guide_id: m.guide_id,
            product_id: m.product_id,
            is_active: false,
            price_car_1: 0, price_car_2: 0, price_car_3plus: 0,
            price_4x4_1: 0, price_4x4_2: 0, price_4x4_3plus: 0,
          })),
          { onConflict: "guide_id,product_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guide-waterfall-prices", editing?.id] }),
  });

  // Auto-seed missing prices when waterfalls load
  useMemo(() => {
    if (!editing?.id || waterfalls.length === 0 || isLoadingPrices) return;
    const existingIds = new Set(guidePrices.map((p) => p.product_id));
    const missing = waterfalls
      .filter((w) => !existingIds.has(w.id))
      .map((w) => ({ guide_id: editing.id, product_id: w.id }));
    if (missing.length > 0) seedPricesMutation.mutate(missing);
  }, [editing?.id, waterfalls.length, guidePrices.length, isLoadingPrices]);

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
      toast({ title: editing ? "Guia atualizado" : "Guia cadastrado com sucesso!" });
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
      specialties: (g.specialties || []).join(", "), is_kalunga: g.is_kalunga,
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
      Idiomas: (g.languages || []).join(", "), Especialidades: (g.specialties || []).join(", "),
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
    if (field === "vehicle_seats") {
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <Users className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary tracking-tighter">Corpo de Guias</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14 uppercase tracking-widest text-[10px] opacity-70">Rede de condutores e especialistas credenciados Atmos</p>
        </div>
        <Button 
          onClick={openNew} 
          className="h-12 px-6 rounded-2xl bg-admin-primary text-white hover:bg-admin-primary/90 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-admin-primary/20"
        >
          <UserCheck className="h-5 w-5" /> Novo Guia
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar por nome ou especialidade..." 
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
                {!isHidden("residence") && <SmartTh label="Localidade" sortKey="residence" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" onHide={() => hideColumn("residence")} />}
                {!isHidden("phone") && <SmartTh label="Contato" sortKey="phone" filterState={filterState} data={filtered} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4" onHide={() => hideColumn("phone")} />}
                {!isHidden("has_4x4") && <th className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">4x4</th>}
                {!isHidden("is_active") && <th className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-4 text-center">Status</th>}
                <th className="p-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40">
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Sincronizando especialistas...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 opacity-40 font-black text-[10px] uppercase tracking-widest">Nenhum guia encontrado</TableCell></TableRow>
              ) : filtered.map((g) => (
                <TableRow 
                  key={g.id} 
                  className={`group transition-all duration-300 hover:bg-admin-muted/50 ${selection.isSelected(g.id) ? "bg-admin-primary/[0.03]" : ""}`}
                >
                  <TableCell className="p-4 text-center">
                    <Checkbox 
                      checked={selection.isSelected(g.id)} 
                      onCheckedChange={() => selection.toggle(g.id)}
                      className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                    />
                  </TableCell>
                  {!isHidden("name") && (
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <button className="h-10 w-10 rounded-xl bg-admin-primary/5 flex items-center justify-center text-admin-primary/40 group-hover:bg-admin-primary group-hover:text-white transition-all duration-500" onClick={() => openDetail(g)}>
                          <Users className="h-5 w-5" />
                        </button>
                        <div className="flex flex-col">
                          <button className="font-black text-admin-primary uppercase tracking-tight text-left hover:text-admin-primary/70 transition-colors" onClick={() => openDetail(g)}>
                            {g.name}
                          </button>
                          <div className="flex gap-1 mt-1">
                            {g.is_kalunga && <Badge className="bg-orange-500/10 text-orange-600 border-none text-[8px] font-black uppercase h-4 px-1.5 rounded-sm">Kalunga</Badge>}
                            {g.has_cadastur && <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase h-4 px-1.5 rounded-sm">Cadastur</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("residence") && (
                    <TableCell className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                        <MapPin className="h-3 w-3 opacity-40" /> {g.residence || "—"}
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("phone") && <TableCell className="p-4"><WhatsAppPhone phone={g.phone} className="text-xs font-bold" /></TableCell>}
                  {!isHidden("has_4x4") && (
                    <TableCell className="p-4 text-center">
                      <div className={`h-1.5 w-1.5 rounded-full mx-auto ${g.has_4x4 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-muted-foreground/20"}`} />
                    </TableCell>
                  )}
                  {!isHidden("is_active") && (
                    <TableCell className="p-4 text-center">
                      <div className={`h-1.5 w-1.5 rounded-full mx-auto ${g.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/20"}`} />
                    </TableCell>
                  )}
                  <TableCell className="p-4 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)} className="h-9 w-9 rounded-xl bg-admin-muted/40 text-admin-primary hover:bg-admin-primary hover:text-white">
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
                            <AlertDialogTitle className="text-xl font-black text-admin-primary uppercase tracking-tight">Remover Especialista?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium text-muted-foreground">
                              Esta ação removerá permanentemente o perfil de <strong>{g.name}</strong> e todo seu histórico de escalas vinculadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(g.id)}
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

      <GuideDetailSheet guide={detailGuide} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-none shadow-2xl overflow-hidden p-0 h-[90vh] flex flex-col">
          <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
            <div className="bg-admin-primary p-8 text-white relative shrink-0">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldCheck className="h-24 w-24" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                  {editing ? "Ficha do Especialista" : "Credenciamento de Novo Guia"}
                </DialogTitle>
                <p className="text-admin-primary-foreground/60 text-xs font-medium uppercase tracking-widest">Parâmetros operacionais e perfil de conduta</p>
              </DialogHeader>
              
              <div className="mt-6">
                <TabsList className="bg-admin-primary-foreground/10 border-none h-11 p-1 rounded-xl w-full justify-start gap-1">
                  <TabsTrigger value="geral" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary transition-all">Geral</TabsTrigger>
                  <TabsTrigger value="logistica" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary transition-all">Logística</TabsTrigger>
                  <TabsTrigger value="cachoeiras" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary transition-all">Cachoeiras</TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <form className="flex-1 flex flex-col min-h-0" onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing ? { ...form, id: editing.id } : form); }}>
              <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                <TabsContent value="geral" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Activity className="h-3 w-3" /> Identidade & Localidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    required 
                    className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vila / Localidade</Label>
                  <Select value={form.residence} onValueChange={v => setForm({ ...form, residence: v })}>
                    <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold uppercase tracking-widest text-[10px] px-4">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {RESIDENCE_OPTIONS
                        .filter(r => r !== "Engenho II" || form.is_kalunga)
                        .map(r => (
                          <SelectItem key={r} value={r} className="font-bold uppercase tracking-widest text-[10px]">{r}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sexo Biológico</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold uppercase tracking-widest text-[10px] px-4">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {Object.entries(GENDER_OPTIONS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="font-bold uppercase tracking-widest text-[10px]">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Phone className="h-3 w-3" /> Comunicação & Digital
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp Principal</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-12 bg-admin-muted/40 border-none rounded-2xl" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram (@perfil)</Label>
                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} className="h-12 bg-admin-muted/40 border-none rounded-2xl pl-11" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-admin-primary/5 p-8 rounded-[2rem] border border-admin-primary/10 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Star className="h-3 w-3" /> Competências & Idiomas
              </h4>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Idiomas Fluentes</Label>
                <div className="flex flex-wrap gap-4">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <label key={lang} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-admin-primary/60 cursor-pointer hover:text-admin-primary transition-colors">
                      <Checkbox 
                        checked={form.languages.includes(lang)} 
                        onCheckedChange={() => toggleLanguage(lang)} 
                        className="rounded-md border-admin-primary/20 data-[state=checked]:bg-admin-primary"
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary ml-1">Especialidades (separadas por vírgula)</Label>
                <Input 
                  placeholder="Ex: Ornitologia, Rapel, História Kalunga" 
                  value={form.specialties} 
                  onChange={e => setForm({ ...form, specialties: e.target.value })} 
                  className="h-12 bg-white border-none rounded-2xl font-bold text-admin-primary"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logistica" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                <Car className="h-3 w-3" /> Logística & Capacidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
                    <Switch checked={form.has_4x4} onCheckedChange={v => setForm({ ...form, has_4x4: v })} className="data-[state=checked]:bg-blue-500" />
                    <div className="flex-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Veículo 4x4 Próprio</Label>
                      <p className="text-[9px] font-bold text-blue-600/60 uppercase">Capacidade de transporte autônomo</p>
                    </div>
                  </div>
                  {form.has_4x4 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Configuração do Veículo</Label>
                      <Select value={String(form.vehicle_seats)} onValueChange={v => setForm({ ...form, vehicle_seats: parseInt(v) })}>
                        <SelectTrigger className="h-11 bg-admin-muted/40 border-none rounded-xl font-bold uppercase tracking-widest text-[10px] px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          <SelectItem value="5" className="font-bold uppercase tracking-widest text-[10px]">5 Lugares</SelectItem>
                          <SelectItem value="7" className="font-bold uppercase tracking-widest text-[10px]">7 Lugares</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Capacidade Turistas</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="Geral" 
                      value={form.limit_tourist} 
                      onChange={e => setForm({ ...form, limit_tourist: e.target.value })} 
                      className="h-11 bg-admin-muted/40 border-none rounded-xl font-black text-admin-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4 bg-orange-500/5 p-5 rounded-2xl border border-orange-500/10">
                  <Switch checked={form.is_kalunga} onCheckedChange={v => setForm({ ...form, is_kalunga: v, residence: !v && form.residence === "Engenho II" ? "" : form.residence })} className="data-[state=checked]:bg-orange-500" />
                  <Label className="text-[10px] font-black uppercase tracking-widest text-orange-600">Ancestralidade Kalunga</Label>
                </div>
                <div className="flex items-center gap-4 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10">
                  <Switch checked={form.has_cadastur} onCheckedChange={v => setForm({ ...form, has_cadastur: v })} className="data-[state=checked]:bg-emerald-500" />
                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Certificado Cadastur</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Anotações do Condutor</Label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
                <Textarea 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                  rows={4} 
                  placeholder="Observações sobre perfil, limitações ou habilidades específicas..." 
                  className="rounded-3xl bg-admin-muted/40 border-none pl-11 p-4 font-medium"
                />
              </div>
              <div className="flex items-center gap-4 bg-admin-muted/20 p-5 rounded-2xl border border-admin-border/10">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} className="data-[state=checked]:bg-emerald-500" />
                <div className="flex-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Status para Escalas</Label>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Habilitado para seleção em novos itinerários</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cachoeiras" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 h-full">
                {!editing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-admin-muted/20 rounded-[2rem] border-2 border-dashed border-admin-primary/10">
                    <ShieldCheck className="h-12 w-12 text-admin-primary/20" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-admin-primary uppercase tracking-tight">Primeiro, salve o guia</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">A precificação por cachoeira requer um perfil ativo</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> Tabela de Operação & Preços
                      </h4>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-admin-primary/20 text-admin-primary">
                        {guidePrices.filter((p: any) => p.is_active).length} Ativas
                      </Badge>
                    </div>

                    <div className="border border-admin-primary/10 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-admin-primary/[0.02] border-b border-admin-primary/5">
                          <tr>
                            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cachoeira</th>
                            <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Guia?</th>
                            <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">1 Pax</th>
                            <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">2 Pax</th>
                            <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">3+ Pax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-primary/5">
                          {waterfalls.map((w: any) => {
                            const gwp = guidePrices.find((p: any) => p.product_id === w.id);
                            return (
                              <tr key={w.id} className="hover:bg-admin-primary/[0.01] transition-colors">
                                <td className="p-3">
                                  <p className="text-[10px] font-black text-admin-primary uppercase tracking-tight truncate max-w-[120px]">{w.name}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">{regionLabels[w.category || ""] || w.category}</p>
                                </td>
                                <td className="p-3 text-center">
                                  <Switch 
                                    checked={gwp?.is_active || false} 
                                    onCheckedChange={v => updatePriceMutation.mutate({ product_id: w.id, is_active: v })}
                                    className="scale-75 data-[state=checked]:bg-admin-primary"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <InlinePrice 
                                    value={gwp?.price_car_1 || 0} 
                                    onSave={v => updatePriceMutation.mutate({ product_id: w.id, price_car_1: v })}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <InlinePrice 
                                    value={gwp?.price_car_2 || 0} 
                                    onSave={v => updatePriceMutation.mutate({ product_id: w.id, price_car_2: v })}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <InlinePrice 
                                    value={gwp?.price_car_3plus || 0} 
                                    onSave={v => updatePriceMutation.mutate({ product_id: w.id, price_car_3plus: v })}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>

            <div className="p-8 pt-0 flex gap-3 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="flex-[2] h-12 rounded-xl bg-admin-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-admin-primary/20"
              >
                {editing ? "Salvar Ficha" : "Efetivar Credenciamento"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
      </Dialog>
    </motion.div>
  );
}
