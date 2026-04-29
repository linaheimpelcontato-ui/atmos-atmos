import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, RefreshCw, Search, Plus, FolderPlus, X, Pencil, Trash2, ChevronDown, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { syncCatalog } from "@/lib/catalogSync";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";
import type { Product, UpdatePayload, FieldDef } from "@/components/admin/products/shared";
import type { BulkField } from "@/components/admin/BulkActionBar";
import {
  ProductTable, InlinePrice, productTypeLabels, DEDICATED_TYPES, slugify,
  getFieldsForType, getCustomTypeFields, saveCustomTypeFields, regionLabels,
  getDialogFields, BASE_CATEGORY_FIELDS, SupplierCombobox, difficultyLabels, seasonalityLabels,
  PRICING_TYPE_FIELDS, FISCAL_FIELDS, SEO_FIELDS,
} from "@/components/admin/products/shared";
import WaterfallTab from "@/components/admin/products/WaterfallTab";
import ExperienceTab from "@/components/admin/products/ExperienceTab";
import ServiceTab from "@/components/admin/products/ServiceTab";
import AccommodationTab from "@/components/admin/products/AccommodationTab";
import ItineraryTab from "@/components/admin/products/ItineraryTab";
import ItineraryFormDialog from "@/components/admin/products/ItineraryFormDialog";
import { ProductMediaTab } from "@/components/admin/products/ProductMediaTab";
import { ProductVariationsTab } from "@/components/admin/products/ProductVariationsTab";

// Category options per type for the form
const serviceCategoryOptions: Record<string, string> = {
  lanche: "Lanche",
  gastronomia: "Gastronomia",
  drone: "Registro Drone",
  transfer: "Transfer",
  especial: "Especial",
};

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("waterfall");
  const selection = useRowSelection();
  const [activeServiceSub, setActiveServiceSub] = useState("lanche");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itinDialogOpen, setItinDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catFields, setCatFields] = useState<{ name: string; type: "text" | "number" | "percent" }[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formType, setFormType] = useState("experience");
  const [formSupplierId, setFormSupplierId] = useState<string | null>(null);
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCategory, setFormCategory] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formVars, setFormVars] = useState<Record<string, any>>({});
  const [formVariations, setFormVariations] = useState<any[]>([]);
  const [formTempId, setFormTempId] = useState<string>("");

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const dynamicTabs = useMemo(() => {
    const customTypes = new Set<string>();
    products.forEach((p) => {
      if (!DEDICATED_TYPES.includes(p.type)) customTypes.add(p.type);
    });
    return Array.from(customTypes).sort();
  }, [products]);

  const allTypes = useMemo(() => [...DEDICATED_TYPES, ...dynamicTabs], [dynamicTabs]);
  const getTypeLabel = (type: string) => productTypeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

  const syncMutation = useMutation({
    mutationFn: syncCatalog,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Catálogo sincronizado", description: `${result.inserted} novos, ${result.skipped} existiam.` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, variables, ...fields }: UpdatePayload) => {
      const updateData: Record<string, unknown> = { ...fields };
      if (variables) {
        const existing = products.find((p) => p.id === id);
        updateData.variables = { ...(existing?.variables || {}), ...variables };
      }
      const { error } = await supabase.from("products").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      toast({ title: "Produto excluído" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const varsObj: Record<string, unknown> = {};
      const fields = [
        ...getDialogFields(formType, formCategory),
        ...PRICING_TYPE_FIELDS,
        ...FISCAL_FIELDS,
        ...SEO_FIELDS,
      ];
      fields.forEach((f) => {
        const raw = formVars[f.key] || "";
        if (f.type === "number" || f.type === "percent") {
          varsObj[f.key] = parseFloat(raw) || 0;
        } else {
          varsObj[f.key] = raw;
        }
      });

      if (formType === "service") {
        varsObj.service_type = formCategory; // Old category was the type
        varsObj.region = formRegion; // New region
      }

      if (editingProduct) {
        const { error } = await supabase.from("products").update({
          name: formName,
          type: formType,
          category: formType === "service" ? formRegion : (formCategory || null),
          segment: "b2c",
          unit_price: parseFloat(formPrice) || 0,
          cost_price: parseFloat(formCostPrice) || 0,
          description: formDescription || null,
          is_active: formIsActive,
          supplier_id: formSupplierId || null,
          variables: JSON.parse(JSON.stringify({ 
            ...(editingProduct.variables || {}), 
            ...varsObj, 
            subcategory: formSubcategory,
            subtitle: formSubtitle,
            service_type: formType === "service" ? formCategory : undefined,
            variations: formVariations
          })),
        }).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([{
          name: formName,
          type: formType,
          category: formType === "service" ? formRegion : (formCategory || null),
          segment: "b2c",
          unit_price: parseFloat(formPrice) || 0,
          cost_price: parseFloat(formCostPrice) || 0,
          description: formDescription || null,
          is_active: formIsActive,
          supplier_id: formSupplierId || null,
          variables: JSON.parse(JSON.stringify({ 
            ...varsObj, 
            subcategory: formSubcategory,
            subtitle: formSubtitle,
            service_type: formType === "service" ? formCategory : undefined,
            variations: formVariations,
            storage_id: formTempId
          })),
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      toast({ title: editingProduct ? "Produto atualizado" : "Produto cadastrado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const handleUpdate = (payload: UpdatePayload) => updateMutation.mutate(payload);

  const filtered = (type: string) =>
    products.filter((p) => p.type === type)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const onToggleFavorite = (fileName: string) => {
    const currentFavorites = (formVars.favorites as string[]) || [];
    let newFavorites: string[];
    
    if (currentFavorites.includes(fileName)) {
      newFavorites = currentFavorites.filter(f => f !== fileName);
    } else {
      if (currentFavorites.length >= 5) {
        toast({
          title: "Limite atingido",
          description: "Você pode favoritar no máximo 5 imagens.",
          variant: "destructive"
        });
        return;
      }
      newFavorites = [...currentFavorites, fileName];
    }
    
    setFormVars(prev => ({ ...prev, favorites: newFavorites }));
  };

  const onDeleteMedia = (fileName: string) => {
    // 1. Remove from variations
    setFormVariations(prev => prev.map(v => ({
      ...v,
      media: (v.media || []).filter(m => m !== fileName)
    })));

    const currentFavorites = (formVars.favorites as string[]) || [];
    if (currentFavorites.includes(fileName)) {
      setFormVars(prev => ({
        ...prev,
        favorites: currentFavorites.filter(f => f !== fileName)
      }));
    }
    qc.invalidateQueries({ queryKey: ["product-media"] });
  };

  const openNewProduct = () => {
    // Intercept itinerary
    if (tab === "itinerary") {
      setEditingProduct(null);
      setItinDialogOpen(true);
      return;
    }
    setEditingProduct(null);
    setFormName("");
    setFormSubtitle("");
    setFormType(tab);
    setFormSupplierId(null);
    setFormPrice("");
    setFormCostPrice("");
    setFormDescription("");
    setFormIsActive(true);
    setFormSubcategory("");
    setFormVars({});
    setFormVariations([]);
    setFormTempId(crypto.randomUUID());
    // Auto-fill category based on active tab
    if (tab === "service") {
      setFormCategory(activeServiceSub);
    } else {
      setFormCategory("");
    }
    setDialogOpen(true);
  };

  const openEditProduct = (p: Product) => {
    // Intercept itinerary
    if (p.type === "itinerary") {
      setEditingProduct(p);
      setItinDialogOpen(true);
      return;
    }
    setEditingProduct(p);
    setFormName(p.name);
    const varsData = (p.variables || {}) as Record<string, unknown>;
    setFormSubtitle((varsData.subtitle as string) || "");
    setFormType(p.type);
    
    setFormCategory(p.category || "");
    setFormSubcategory((varsData.subcategory as string) || "");

    if (p.type === "service") {
      // For services, formCategory is service_type and formRegion is region
      setFormCategory((varsData.service_type as string) || p.category || "");
      setFormRegion((varsData.region as string) || (p.category && regionLabels[p.category] ? p.category : ""));
    } else {
      // For others, formCategory is region
      setFormRegion("");
    }

    setFormSupplierId(p.supplier_id || null);
    setFormPrice(p.unit_price.toString());
    setFormCostPrice(p.cost_price.toString());
    setFormDescription(p.description || "");
    setFormIsActive(p.is_active);
    setFormVariations(varsData.variations || []);
    setFormTempId("");
    setFormVars(varsData);
    setDialogOpen(true);
  };

  const handleCreateCategory = () => {
    const slug = slugify(catName);
    if (!slug) return;
    productTypeLabels[slug] = catName;
    // Save custom fields — always include base fields + user custom fields
    const custom = getCustomTypeFields();
    const baseKeys = BASE_CATEGORY_FIELDS.map((f) => f.key);
    const userFields: FieldDef[] = catFields
      .filter((f) => f.name.trim())
      .map((f) => ({ key: slugify(f.name), label: f.name, type: f.type }));
    // Merge base + custom, avoiding duplicates
    const merged: FieldDef[] = [
      ...BASE_CATEGORY_FIELDS,
      ...userFields.filter((f) => !baseKeys.includes(f.key)),
    ];
    custom[slug] = merged;
    saveCustomTypeFields(custom);
    setCatDialogOpen(false);
    setCatName("");
    setCatFields([]);
    setTab(slug);
    toast({ title: `Categoria "${catName}" criada`, description: "Agora adicione produtos nesta aba." });
  };

  const currentFields = getDialogFields(formType, formCategory);

  const renderGenericTab = (type: string) => {
    const fields = getFieldsForType(type);
    const columns = ["Nome", "Subcategoria", ...fields.map((f) => f.label), "Venda (R$)", "Visibilidade"];
    const tabProducts = filtered(type);

    return (
      <div key={type} className="flex-1 flex flex-col min-h-0 mt-0">
        <ProductTable
          products={tabProducts}
          columns={columns}
          selectedIds={selection.selectedIds}
          onToggleRow={selection.toggle}
          onToggleAll={selection.toggleAll}
          renderRow={(p) => {
            const vars = (p.variables || {}) as Record<string, unknown>;
            return (
              <tr key={p.id} className={`border-t border-border hover:bg-muted/30 ${selection.isSelected(p.id) ? "bg-primary/5" : ""}`}>
                <td className="p-3 w-10">
                  <Checkbox checked={selection.isSelected(p.id)} onCheckedChange={() => selection.toggle(p.id)} />
                </td>
                <td className="p-3 font-medium">
                  <button className="hover:underline cursor-pointer text-left" onClick={() => openEditProduct(p)}>{p.name}</button>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="font-normal bg-muted/20 text-[10px] uppercase tracking-wider">
                    {p.category || "—"}
                  </Badge>
                </td>
                {fields.map((f) => (
                  <td key={f.key} className="p-3 text-sm">{String(vars[f.key] ?? "—")}</td>
                ))}
                <td className="p-3">
                  <InlinePrice value={p.unit_price} onSave={(v) => handleUpdate({ id: p.id, unit_price: v })} />
                </td>
                <td className="p-3">
                  <Switch checked={p.is_active} onCheckedChange={(v) => handleUpdate({ id: p.id, is_active: v })} />
                </td>
              </tr>
            );
          }}
          isLoading={isLoading}
        />
      </div>
    );
  };

  const renderActiveTab = () => {
    const commonProps = { isLoading, onUpdate: handleUpdate, onEdit: openEditProduct, selectedIds: selection.selectedIds, onToggleRow: selection.toggle, onToggleAll: selection.toggleAll };
    
    switch(tab) {
      case 'waterfall': return <div className="flex-1 flex flex-col min-h-0"><WaterfallTab products={filtered("waterfall")} {...commonProps} /></div>;
      case 'experience': return <div className="flex-1 flex flex-col min-h-0"><ExperienceTab products={filtered("experience")} onDelete={(id) => deleteMutation.mutate(id)} {...commonProps} /></div>;
      case 'service': return <div className="flex-1 flex flex-col min-h-0"><ServiceTab products={filtered("service")} onDelete={(id) => deleteMutation.mutate(id)} onSubChange={setActiveServiceSub} {...commonProps} /></div>;
      case 'accommodation': return <div className="flex-1 flex flex-col min-h-0"><AccommodationTab products={filtered("accommodation")} onDelete={(id) => deleteMutation.mutate(id)} {...commonProps} /></div>;
      case 'itinerary': return <div className="flex-1 flex flex-col min-h-0"><ItineraryTab products={filtered("itinerary")} allProducts={products} onDelete={(id) => deleteMutation.mutate(id)} {...commonProps} /></div>;
      default:
        const dyn = dynamicTabs.find(t => t === tab);
        if (dyn) return renderGenericTab(dyn);
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFCFB] overflow-hidden">
      {/* 1. TOP HEADER */}
      <div className="flex-none px-6 py-4 border-b border-border/60 bg-white flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Cadastros & Preços</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9" onClick={() => { setCatName(""); setCatFields([]); setCatDialogOpen(true); }}>
            <FolderPlus className="h-4 w-4 mr-1.5" /> Categoria
          </Button>
          <Button size="sm" className="h-9 bg-primary" onClick={openNewProduct}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Produto
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* 2. NAVIGATION & SEARCH */}
      <div className="flex-none px-6 py-3 border-b border-border/40 bg-white/50 backdrop-blur-sm z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {allTypes.map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); selection.clear(); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  tab === t 
                  ? "bg-white text-primary shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                }`}
              >
                {getTypeLabel(t)}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {products.filter((p) => p.type === t).length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar catálogo..." 
              className="pl-10 h-10 bg-white border-border/50 rounded-xl focus:ring-2 focus:ring-primary/10 transition-all"
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* 3. TABLE AREA */}
      <div className="flex-1 min-h-0 bg-background/40 relative overflow-hidden">
        <div className="absolute inset-0 p-6 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-border/40 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
            {renderActiveTab()}
          </div>
        </div>
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          const ids = [...selection.selectedIds];
          for (const id of ids) await supabase.from("products").delete().eq("id", id);
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          toast({ title: `${ids.length} produto(s) excluído(s)` });
          selection.clear();
        }}
        onExport={() => {
          const rows = products.filter(p => selection.selectedIds.has(p.id));
          const ws = XLSX.utils.json_to_sheet(rows.map(p => ({ Nome: p.name, Tipo: p.type, Categoria: p.category, Preço: p.unit_price, Custo: p.cost_price, Ativo: p.is_active })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Produtos");
          XLSX.writeFile(wb, "produtos.xlsx");
        }}
        bulkFields={(() => {
          const fields: BulkField[] = [];
          if (tab === "waterfall") {
            fields.push(
              { key: "name", label: "Nome", type: "text" },
              { key: "category", label: "Região", type: "select", options: Object.entries(regionLabels).map(([v, l]) => ({ value: v, label: l })) },
              { key: "priceTier", label: "Nível", type: "select", isVariable: true, options: [{ value: "economico", label: "Econômico" }, { value: "intermediario", label: "Intermediário" }, { value: "elevado", label: "Elevado" }] },
              { key: "difficulty", label: "Dificuldade", type: "select", isVariable: true, options: [{ value: "facil", label: "Fácil" }, { value: "moderado", label: "Moderado" }, { value: "dificil", label: "Difícil" }] },
              { key: "requiresGuide", label: "Guia", type: "select", isVariable: true, options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] },
              { key: "unit_price", label: "Ingressos (R$)", type: "number" },
              { key: "cost_price", label: "Guia (R$)", type: "number" },
              { key: "distanceKm", label: "Trilha (km)", type: "number", isVariable: true },
              { key: "distanceCarKm", label: "Carro (km)", type: "number", isVariable: true },
              { key: "is_active", label: "Ativo", type: "boolean" },
            );
          } else if (tab === "experience") {
            fields.push(
              { key: "name", label: "Nome", type: "text" },
              { key: "empresa", label: "Empresa", type: "text", isVariable: true },
              { key: "responsavel", label: "Contato", type: "text", isVariable: true },
              { key: "telefone", label: "Telefone", type: "text", isVariable: true },
              { key: "comissao", label: "Comissão (%)", type: "number", isVariable: true },
              { key: "minPessoas", label: "Mín.", type: "number", isVariable: true },
              { key: "maxPessoas", label: "Máx.", type: "number", isVariable: true },
              { key: "duracao", label: "Duração", type: "text", isVariable: true },
              { key: "sazonalidade", label: "Sazonalidade", type: "select", isVariable: true, options: [{ value: "chuva", label: "Chuva" }, { value: "seca", label: "Seca" }, { value: "anual", label: "Anual" }] },
              { key: "cost_price", label: "Custo (R$)", type: "number" },
              { key: "unit_price", label: "Venda (R$)", type: "number" },
              { key: "is_active", label: "Ativo", type: "boolean" },
            );
          } else if (tab === "accommodation") {
            fields.push(
              { key: "name", label: "Nome", type: "text" },
              { key: "empresa", label: "Empresa", type: "text", isVariable: true },
              { key: "responsavel", label: "Contato", type: "text", isVariable: true },
              { key: "category", label: "Região", type: "select", options: Object.entries(regionLabels).map(([v, l]) => ({ value: v, label: l })) },
              { key: "telefone", label: "Telefone", type: "text", isVariable: true },
              { key: "instagram", label: "Instagram", type: "text", isVariable: true },
              { key: "site", label: "Site", type: "text", isVariable: true },
              { key: "comissao", label: "Comissão (%)", type: "number", isVariable: true },
              { key: "cost_price", label: "Custo (R$)", type: "number" },
              { key: "unit_price", label: "Venda (R$)", type: "number" },
              { key: "is_active", label: "Ativo", type: "boolean" },
            );
          } else if (tab === "service") {
            fields.push(
              { key: "name", label: "Nome", type: "text" },
              { key: "empresa", label: "Empresa", type: "text", isVariable: true },
              { key: "responsavel", label: "Contato", type: "text", isVariable: true },
              { key: "telefone", label: "Telefone", type: "text", isVariable: true },
              { key: "comissao", label: "Comissão (%)", type: "number", isVariable: true },
              { key: "cost_price", label: "Custo (R$)", type: "number" },
              { key: "unit_price", label: "Venda (R$)", type: "number" },
            );
            if (activeServiceSub === "lanche") {
              fields.splice(-1, 0,
                { key: "pontoColeta", label: "Ponto de Coleta", type: "text", isVariable: true },
                { key: "entrega", label: "Entrega (R$)", type: "number", isVariable: true },
              );
            } else if (activeServiceSub === "gastronomia") {
              fields.splice(-1, 0,
                { key: "localizacao", label: "Localização", type: "text", isVariable: true },
              );
            } else if (activeServiceSub === "transfer") {
              fields.splice(-1, 0,
                { key: "pricingType", label: "Tipo Preço", type: "select", isVariable: true, options: [{ value: "por_pessoa", label: "Valor por pessoa" }, { value: "total", label: "Valor total" }] },
                { key: "limitePessoas", label: "Limite Pessoas", type: "number", isVariable: true },
              );
            } else if (activeServiceSub === "drone") {
              fields.splice(-1, 0,
                { key: "pricingType", label: "Tipo Preço", type: "select", isVariable: true, options: [{ value: "por_pessoa", label: "Valor por pessoa" }, { value: "total", label: "Valor total" }] },
              );
            }
          } else if (tab === "itinerary") {
            fields.push(
              { key: "name", label: "Nome", type: "text" },
              { key: "category", label: "Categoria", type: "select", options: [{ value: "classico", label: "Clássico" }, { value: "jurassico", label: "Jurássico" }] },
              { key: "cost_price", label: "Custo (R$)", type: "number" },
              { key: "unit_price", label: "Venda (R$)", type: "number" },
            );
          }
          return fields;
        })()}
        onBulkUpdate={async (field, value) => {
          const ids = [...selection.selectedIds];
          const bulkField = (document.querySelector('[data-bulk-fields]') as any);
          // Check if it's a variable field
          const allBulkFields: BulkField[] = (() => {
            // Reconstruct to check isVariable
            const f: BulkField[] = [{ key: "is_active", label: "Visibilidade", type: "boolean" }, { key: "name", label: "", type: "text" }, { key: "cost_price", label: "", type: "number" }, { key: "unit_price", label: "", type: "number" }];
            if (tab === "waterfall") f.push({ key: "priceTier", label: "", type: "text", isVariable: true }, { key: "difficulty", label: "", type: "text", isVariable: true }, { key: "requiresGuide", label: "", type: "text", isVariable: true }, { key: "distanceKm", label: "", type: "number", isVariable: true }, { key: "distanceCarKm", label: "", type: "number", isVariable: true });
            if (tab === "experience") f.push({ key: "empresa", label: "", type: "text", isVariable: true }, { key: "responsavel", label: "", type: "text", isVariable: true }, { key: "telefone", label: "", type: "text", isVariable: true }, { key: "comissao", label: "", type: "number", isVariable: true }, { key: "minPessoas", label: "", type: "number", isVariable: true }, { key: "maxPessoas", label: "", type: "number", isVariable: true }, { key: "duracao", label: "", type: "text", isVariable: true }, { key: "sazonalidade", label: "", type: "text", isVariable: true });
            if (tab === "accommodation") f.push({ key: "empresa", label: "", type: "text", isVariable: true }, { key: "responsavel", label: "", type: "text", isVariable: true }, { key: "telefone", label: "", type: "text", isVariable: true }, { key: "instagram", label: "", type: "text", isVariable: true }, { key: "site", label: "", type: "text", isVariable: true }, { key: "comissao", label: "", type: "number", isVariable: true });
            if (tab === "service") f.push({ key: "empresa", label: "", type: "text", isVariable: true }, { key: "responsavel", label: "", type: "text", isVariable: true }, { key: "telefone", label: "", type: "text", isVariable: true }, { key: "comissao", label: "", type: "number", isVariable: true }, { key: "pontoColeta", label: "", type: "text", isVariable: true }, { key: "entrega", label: "", type: "number", isVariable: true }, { key: "localizacao", label: "", type: "text", isVariable: true }, { key: "pricingType", label: "", type: "text", isVariable: true }, { key: "limitePessoas", label: "", type: "number", isVariable: true });
            return f;
          })();
          const fieldDef = allBulkFields.find(f => f.key === field);
          const isVar = fieldDef?.isVariable;
          
          if (isVar) {
            // Update JSONB variables field
            const parsed = fieldDef?.type === "number" ? (parseFloat(String(value)) || 0) : value;
            for (const id of ids) {
              const product = products.find(p => p.id === id);
              const vars = { ...(product?.variables || {}), [field]: parsed } as Record<string, unknown>;
              await supabase.from("products").update({ variables: vars as any }).eq("id", id);
            }
          } else {
            const parsed = field === "cost_price" || field === "unit_price" ? (parseFloat(String(value)) || 0) : value;
            for (const id of ids) {
              await supabase.from("products").update({ [field]: parsed }).eq("id", id);
            }
          }
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          toast({ title: `${ids.length} produto(s) atualizado(s)` });
          selection.clear();
        }}
      />

      {/* Dialog Nova Categoria */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da categoria</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex: Fotógrafos" autoFocus />
            </div>
            {catName && (
              <p className="text-xs text-muted-foreground">
                Slug: <code className="bg-muted px-1 rounded">{slugify(catName)}</code>
              </p>
            )}
            <div className="space-y-2">
              <Label>Colunas / Campos</Label>
              <p className="text-xs text-muted-foreground">Campos base incluídos: Empresa, Contato, Telefone, Comissão. Adicione campos extras abaixo.</p>
              {catFields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f.name}
                    onChange={(e) => { const nf = [...catFields]; nf[i].name = e.target.value; setCatFields(nf); }}
                    placeholder="Nome do campo"
                    className="flex-1 h-8 text-sm"
                  />
                  <Select value={f.type} onValueChange={(v) => { const nf = [...catFields]; nf[i].type = v as any; setCatFields(nf); }}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="percent">Percentual</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => setCatFields(catFields.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setCatFields([...catFields, { name: "", type: "text" }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Campo
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!catName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo / Editar Produto */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProduct(null); }}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-background">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              {editingProduct ? (
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><Pencil className="h-5 w-5" /></div>
                  <div>
                    <span className="block">Editar Produto</span>
                    <span className="text-xs font-normal text-muted-foreground">ID: {editingProduct.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><Plus className="h-5 w-5" /></div>
                  <span>Novo Produto</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <form className="flex-1 flex flex-col min-h-0" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <Tabs defaultValue="geral" className="flex-1 flex flex-col h-full">
              <div className="px-6 border-b bg-muted/10">
                <TabsList className="bg-transparent h-12 w-full justify-start gap-6 rounded-none p-0">
                  <TabsTrigger value="geral" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Geral</TabsTrigger>
                  <TabsTrigger value="variations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Variações</TabsTrigger>
                  <TabsTrigger value="images" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Imagens & Vídeos</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Logística & Extras</TabsTrigger>
                  <TabsTrigger value="fiscal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Fiscal & SEO</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-6 min-h-0 h-full">
                <TabsContent value="geral" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LADO ESQUERDO: INFOS PRINCIPAIS */}
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Nome do Produto *</Label>
                        <Input value={formName} onChange={(e) => setFormName(e.target.value)} required className="h-11 text-base bg-muted/20 border-muted-foreground/20 focus:border-primary transition-all" placeholder="Ex: Trilha das Sete Quedas" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Subtítulo (Exibido abaixo do nome)</Label>
                        <Input value={formSubtitle} onChange={(e) => setFormSubtitle(e.target.value)} className="h-11 bg-muted/20 border-muted-foreground/20 focus:border-primary transition-all" placeholder="Ex: Aventura de dia inteiro" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Fornecedor / Parceiro</Label>
                        <SupplierCombobox
                          supplierId={formSupplierId}
                          supplierName=""
                          onSelect={(s) => {
                            setFormSupplierId(s?.id || null);
                            if (s) {
                              setFormVars(prev => ({
                                ...prev,
                                empresa: s.name,
                                responsavel: s.contact_name || prev.responsavel || "",
                                telefone: s.phone || prev.telefone || "",
                              }));
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Tipo de Produto *</Label>
                          <Select value={formType} onValueChange={(v) => { setFormType(v); setFormVars({}); setFormCategory(""); }}>
                            <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {allTypes.map((t) => (
                                <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4 pt-2">
                          <Label className="text-sm font-semibold">Visibilidade & Mídia</Label>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border/50 shadow-sm transition-all hover:bg-muted/5">
                              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                              <span className="text-xs font-medium text-muted-foreground">
                                {formIsActive ? "Público no Site" : "Oculto no Site"}
                              </span>
                            </div>
                            
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full justify-start gap-3 h-12 rounded-xl border-dashed hover:border-primary/40 hover:bg-primary/5 group"
                              onClick={() => {
                                const imagesTab = document.querySelector('[value="images"]') as HTMLButtonElement;
                                if (imagesTab) imagesTab.click();
                              }}
                            >
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <ImageIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="text-left">
                                <span className="block text-xs font-semibold">Fotos & Vídeos</span>
                                <span className="text-[10px] text-muted-foreground">Gerenciar galeria do produto</span>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {formType === "service" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Tipo de Serviço</Label>
                            <Select value={formCategory} onValueChange={setFormCategory}>
                              <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(serviceCategoryOptions).map(([k, label]) => (
                                  <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Região</Label>
                            <Select value={formRegion} onValueChange={setFormRegion}>
                              <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(regionLabels).map(([k, label]) => (
                                  <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-full space-y-2">
                            <Label className="text-sm font-semibold">Subcategoria (Livre)</Label>
                            <Input 
                              value={formSubcategory} 
                              onChange={(e) => setFormSubcategory(e.target.value)} 
                              placeholder="Ex: Lanche Vegano..." 
                              className="h-11 bg-muted/20 border-muted-foreground/20"
                            />
                          </div>
                        </div>
                      )}

                      {formType === "experience" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Categoria de Experiência</Label>
                            <Select value={formCategory} onValueChange={setFormCategory}>
                              <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aventura">Aventura</SelectItem>
                                <SelectItem value="bem-estar">Bem-estar</SelectItem>
                                <SelectItem value="cultura">Cultura</SelectItem>
                                <SelectItem value="contemplacao">Contemplação</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Região</Label>
                            <Select value={formRegion} onValueChange={setFormRegion}>
                              <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(regionLabels).map(([k, label]) => (
                                  <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {(formType === "waterfall" || formType === "accommodation" || formType === "itinerary") && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Região</Label>
                            <Select value={formCategory} onValueChange={setFormCategory}>
                              <SelectTrigger className="h-11 bg-muted/20 border-muted-foreground/20"><SelectValue placeholder="Selecionar região" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(regionLabels).map(([k, label]) => (
                                  <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Subcategoria (Livre)</Label>
                            <Input 
                              value={formSubcategory} 
                              onChange={(e) => setFormSubcategory(e.target.value)} 
                              placeholder={formType === "itinerary" ? "Ex: Clássico, Jurássico..." : "Ex: Particular, Estadual..."}
                              className="h-11 bg-muted/20 border-muted-foreground/20"
                            />
                          </div>
                        </div>
                      )}
                      
                      {!(formType === "service" || formType === "waterfall" || formType === "accommodation" || formType === "experience" || formType === "itinerary") && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Subcategoria (Livre)</Label>
                          <Input 
                            value={formSubcategory} 
                            onChange={(e) => setFormSubcategory(e.target.value)} 
                            placeholder="Ex: Experiência VIP, Roteiro Personalizado..." 
                            className="h-11 bg-muted/20 border-muted-foreground/20"
                          />
                        </div>
                      )}
                    </div>

                    {/* LADO DIREITO: PREÇOS E DESCRIÇÃO */}
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Preço de Venda (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-muted-foreground text-sm">R$</span>
                            <Input type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="h-11 pl-9 bg-muted/20 border-muted-foreground/20 font-mono" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Custo Operacional (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-muted-foreground text-sm">R$</span>
                            <Input type="number" step="0.01" min="0" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} className="h-11 pl-9 bg-muted/20 border-muted-foreground/20 font-mono" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Descrição do Produto</Label>
                        <Textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Descreva os diferenciais, o que está incluso e informações importantes..."
                          className="min-h-[160px] bg-muted/20 border-muted-foreground/20 resize-none text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="variations" className="mt-0 flex-1 min-h-0 bg-white">
                  <ProductVariationsTab 
                    product={{
                      ...(editingProduct || {}),
                      name: formName,
                      type: formType,
                      tempId: formTempId,
                      unit_price: parseFloat(formPrice) || 0,
                      cost_price: parseFloat(formCostPrice) || 0,
                      variables: {
                        ...(editingProduct?.variables || {}),
                        storage_id: (editingProduct?.variables as any)?.storage_id || formTempId,
                        favorites: formVars.favorites
                      }
                    } as any}
                    value={formVariations}
                    onChange={setFormVariations}
                    favorites={formVars.favorites || []}
                  />
                </TabsContent>

                <TabsContent value="details" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-4 bg-muted/10 p-5 rounded-xl border border-border/50">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Precificação & Capacidade</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {PRICING_TYPE_FIELDS.map((f) => (
                            <div key={f.key} className="space-y-1.5">
                              <Label className="text-xs font-medium">{f.label}</Label>
                              {f.type === "select" ? (
                                <Select value={formVars[f.key] || ""} onValueChange={(v) => setFormVars({ ...formVars, [f.key]: v })}>
                                  <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(f.options || {}).map(([k, label]) => (
                                      <SelectItem key={k} value={k}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="number"
                                  value={formVars[f.key] || ""}
                                  onChange={(e) => setFormVars({ ...formVars, [f.key]: e.target.value })}
                                  className="h-10 bg-background"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {currentFields.length > 0 && (
                        <div className="space-y-4 bg-primary/5 p-5 rounded-xl border border-primary/10">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Campos Específicos</h4>
                          <div className="grid grid-cols-1 gap-4">
                            {currentFields.map((f) => (
                              <div key={f.key} className="space-y-1.5">
                                <Label className="text-xs font-medium">{f.label}</Label>
                                {f.type === "select" && f.options ? (
                                  <Select value={formVars[f.key] || ""} onValueChange={(v) => setFormVars({ ...formVars, [f.key]: v })}>
                                    <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(f.options).map(([k, label]) => (
                                        <SelectItem key={k} value={k}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    type={f.type === "number" || f.type === "percent" ? "number" : "text"}
                                    step={f.type === "percent" ? "0.1" : f.type === "number" ? "0.01" : undefined}
                                    value={formVars[f.key] || ""}
                                    onChange={(e) => setFormVars({ ...formVars, [f.key]: e.target.value })}
                                    className="h-10 bg-background"
                                    placeholder={f.label}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fiscal" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Package className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Dados Fiscais</h4>
                      </div>
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">CNPJ do Emissor</Label>
                          <Input value={formVars.fiscal_cnpj || ""} onChange={(e) => setFormVars({ ...formVars, fiscal_cnpj: e.target.value })} className="h-10 bg-muted/10 border-none" placeholder="00.000.000/0000-00" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">NCM</Label>
                            <Input value={formVars.fiscal_ncm || ""} onChange={(e) => setFormVars({ ...formVars, fiscal_ncm: e.target.value })} className="h-10 bg-muted/10 border-none" placeholder="Ex: 9999.99.99" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Alíquota ICMS (%)</Label>
                            <Input type="number" step="0.01" value={formVars.fiscal_tax_rate || ""} onChange={(e) => setFormVars({ ...formVars, fiscal_tax_rate: e.target.value })} className="h-10 bg-muted/10 border-none" placeholder="0.00" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Search className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Marketing & SEO</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">SEO Slug (URL)</Label>
                          <Input value={formVars.seo_slug || ""} onChange={(e) => setFormVars({ ...formVars, seo_slug: e.target.value })} className="h-10 bg-muted/10 border-none" placeholder="exemplo-de-produto" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Meta Title</Label>
                          <Input value={formVars.seo_title || ""} onChange={(e) => setFormVars({ ...formVars, seo_title: e.target.value })} className="h-10 bg-muted/10 border-none" placeholder="Título para o Google" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Meta Description</Label>
                          <Textarea value={formVars.seo_description || ""} onChange={(e) => setFormVars({ ...formVars, seo_description: e.target.value })} rows={3} className="bg-muted/10 border-none text-xs" placeholder="Breve descrição para busca..." />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="mt-0 animate-in fade-in slide-in-from-right-2 duration-300 min-h-0 h-full">
                  {editingProduct || formName.trim() ? (
                    <ProductMediaTab 
                      product={{
                        ...(editingProduct || {}),
                        name: formName, 
                        type: formType, 
                        tempId: formTempId,
                        category: formCategory,
                        variables: {
                          ...(editingProduct?.variables || {}),
                          storage_id: (editingProduct?.variables as any)?.storage_id || formTempId,
                          favorites: formVars.favorites
                        }
                      } as any} 
                      onDelete={onDeleteMedia}
                      favorites={formVars.favorites || []}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <h4 className="text-sm font-semibold">Dê um nome ao produto primeiro</h4>
                      <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                        Preencha o nome do produto na aba Geral para poder gerenciar fotos e vídeos.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>

              <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
                {editingProduct ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir Produto
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir "{editingProduct.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(editingProduct.id)}
                        >
                          Confirmar Exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : <div />}
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending} className="px-8 shadow-lg shadow-primary/20">
                    {saveMutation.isPending ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                  </Button>
                </div>
              </DialogFooter>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {/* Itinerary Dialog */}
      <ItineraryFormDialog
        open={itinDialogOpen}
        onOpenChange={(open) => { setItinDialogOpen(open); if (!open) setEditingProduct(null); }}
        product={editingProduct}
        allProducts={products}
        isSaving={saveMutation.isPending || deleteMutation.isPending}
        onSave={async (data) => {
          if (editingProduct) {
            const { error } = await supabase.from("products").update({
              name: data.name,
              description: data.description,
              category: data.category,
              is_active: data.is_active,
              variables: JSON.parse(JSON.stringify(data.variables)),
            }).eq("id", editingProduct.id);
            if (error) {
              toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
              return;
            }
          } else {
            const { error } = await supabase.from("products").insert([{
              name: data.name,
              description: data.description,
              type: "itinerary",
              category: data.category,
              segment: "b2c",
              is_active: data.is_active,
              variables: JSON.parse(JSON.stringify(data.variables)),
              unit_price: 0,
            }]);
            if (error) {
              toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
              return;
            }
          }
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          setItinDialogOpen(false);
          setEditingProduct(null);
          toast({ title: editingProduct ? "Roteiro atualizado" : "Roteiro cadastrado" });
        }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
