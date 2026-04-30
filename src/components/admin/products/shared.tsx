import { useState, useEffect, useRef } from "react";
import { Check, X, ChevronsUpDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SmartTh, useSmartFilters, type SmartFilterState } from "@/components/admin/SmartTableHead";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────

export type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  cnpj: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductVariation = {
  id: string;
  name: string;
  unit_price: number;
  cost_price: number;
  description: string | null;
  is_active: boolean;
  media: string[];
  supplier_id?: string | null;
};

export type Product = {
  id: string;
  name: string;
  type: string;
  segment: string;
  description: string | null;
  unit_price: number;
  cost_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  source_id: string | null;
  source_type: string | null;
  category: string | null;
  variables: Record<string, unknown> & {
    variations?: ProductVariation[];
  } | null;
  supplier_id?: string | null;
};

export type UpdatePayload = {
  id: string;
  unit_price?: number;
  cost_price?: number;
  is_active?: boolean;
  variables?: Record<string, unknown>;
  name?: string;
  description?: string;
  category?: string;
};

// ─── Label maps ─────────────────────────────────────────────────────

export const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
};

export const regionLabels: Record<string, string> = {
  "alto-paraiso": "Alto Paraíso",
  "sao-jorge": "São Jorge",
  "sao-joao": "São João d'Aliança",
  cavalcante: "Cavalcante",
  kalunga: "Território Kalunga",
  "chapada-norte": "Chapada Norte",
};

export const categoryLabels: Record<string, string> = {
  aventura: "Aventura",
  "bem-estar": "Bem-estar",
  cultura: "Cultura",
  contemplacao: "Contemplação",
  drone: "Drone",
  lanche: "Lanche",
  transfer: "Transfer",
  especial: "Especial",
  gastronomia: "Gastronomia",
  fotografia: "Fotografia",
  produtora: "Produtora",
};

export const productTypeLabels: Record<string, string> = {
  waterfall: "Cachoeira",
  experience: "Experiência",
  service: "Serviço",
  accommodation: "Hospedagem",
  itinerary: "Roteiro",
  gastronomia: "Gastronomia",
  other: "Outro",
};

export const serviceTypeLabels: Record<string, string> = {
  lanche: "Lanche de Trilha",
  gastronomia: "Gastronomia",
  drone: "Registro Drone",
  transfer: "Transfer",
  especial: "Especial",
};

// Tipos que têm tabs dedicadas com componentes específicos
export const DEDICATED_TYPES = ["waterfall", "experience", "service", "accommodation", "itinerary"];

export function getProductRegion(product: Product): string {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const vRegion = vars.region as string;
  if (vRegion) return vRegion;
  if (product.category && regionLabels[product.category]) return product.category;
  return "";
}

export function getProductSubcategory(product: Product): string {
  const vars = (product.variables || {}) as Record<string, unknown>;
  if (vars.subcategory) return vars.subcategory as string;
  // Fallback for legacy categories that are actually subcategories
  if (product.category && !regionLabels[product.category] && !serviceTypeLabels[product.category] && product.category !== "accommodation") {
    return categoryLabels[product.category] || product.category;
  }
  return "";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Field Definitions for dynamic forms ────────────────────────────

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "percent" | "select";
  options?: Record<string, string>;
};

export const typeFields: Record<string, FieldDef[]> = {
  waterfall: [
    { key: "region", label: "Região", type: "select", options: regionLabels },
    { key: "priceTier", label: "Nível Preço", type: "select", options: { economico: "Econômico", intermediario: "Intermediário", elevado: "Elevado" } },
    { key: "difficulty", label: "Dificuldade", type: "select", options: difficultyLabels },
    { key: "requiresGuide", label: "Guia Obrigatório", type: "select", options: { true: "Sim", false: "Não" } },
    { key: "distanceKm", label: "Trilha (km)", type: "number" },
    { key: "distanceCarKm", label: "Carro (km)", type: "number" },
  ],
  experience: [
    { key: "empresa", label: "Empresa", type: "text" },
    { key: "responsavel", label: "Responsável", type: "text" },
    { key: "telefone", label: "Telefone", type: "text" },
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "comissao", label: "Comissão (%)", type: "percent" },
    { key: "minPessoas", label: "Mín. Pessoas", type: "number" },
    { key: "maxPessoas", label: "Máx. Pessoas", type: "number" },
    { key: "duracao", label: "Duração", type: "text" },
    { key: "sazonalidade", label: "Sazonalidade", type: "select", options: { chuva: "Chuva", seca: "Seca", anual: "Anual" } },
  ],
  service: [
    { key: "empresa", label: "Empresa", type: "text" },
    { key: "responsavel", label: "Responsável", type: "text" },
    { key: "telefone", label: "Telefone", type: "text" },
    { key: "comissao", label: "Comissão (%)", type: "percent" },
  ],
  accommodation: [
    { key: "region", label: "Região", type: "select", options: regionLabels },
    { key: "responsavel", label: "Responsável", type: "text" },
    { key: "telefone", label: "Telefone", type: "text" },
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "site", label: "Site", type: "text" },
    { key: "comissao", label: "Comissão (%)", type: "percent" },
    { key: "accommodation_type", label: "Tipo Hospedagem", type: "select", options: { hotel: "Hotel", pousada: "Pousada", casa: "Casa", chale: "Chalé", bangalo: "Bangalô", resort: "Resort", hostel: "Hostel" } },
    { key: "total_capacity", label: "Capacidade Total", type: "number" },
    { key: "total_rooms", label: "Nº Quartos", type: "number" },
    { key: "operational_notes", label: "Obs. Operacionais", type: "text" },
  ],
};

export function getStorageInfo(product: Partial<Product> & { name: string; type: string; tempId?: string }): { folder: string; prefix: string } | null {
  const nameSlug = slugify(product.name);
  const vars = (product.variables || {}) as Record<string, unknown>;
  const prefix = (vars.storage_id as string) || product.id || product.tempId;
  
  if (!prefix || !product.name) return null;

  let categoryFolder = "";
  switch (product.type) {
    case "waterfall":
      categoryFolder = "cachoeiras";
      break;
    case "experience":
      categoryFolder = "experiencias";
      break;
    case "accommodation":
      categoryFolder = "hospedagens";
      break;
    case "service":
      categoryFolder = "servicos";
      break;
    case "itinerary":
      categoryFolder = "roteiros";
      break;
    default:
      categoryFolder = "outros";
  }

  // Return folder as the key that MAP_R2_PATH understands (e.g., 'experiencias', 'cachoeiras')
  const folderPath = categoryFolder;
  
  // Return parent folder and raw name for better image matching
  return { 
    folder: folderPath, 
    prefix: nameSlug,
    rawName: product.name
  };
}

const CUSTOM_FIELDS_KEY = "atmos-custom-type-fields";

export function getCustomTypeFields(): Record<string, FieldDef[]> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || "{}");
  } catch { return {}; }
}

export function saveCustomTypeFields(fields: Record<string, FieldDef[]>) {
  localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(fields));
}

export function getFieldsForType(type: string): FieldDef[] {
  return typeFields[type] || getCustomTypeFields()[type] || [];
}

export const seasonalityLabels: Record<string, string> = {
  chuva: "Chuva",
  seca: "Seca",
  anual: "Anual",
};

export const PRICING_TYPE_FIELDS: FieldDef[] = [
  { key: "pricingType", label: "Tipo de Preço", type: "select", options: { por_pessoa: "Por Pessoa", total: "Valor Total" } },
  { key: "limitPeople", label: "Limite de Pessoas", type: "number" },
];

export const FISCAL_FIELDS: FieldDef[] = [
  { key: "fiscal_cnpj", label: "CNPJ do Fornecedor", type: "text" },
  { key: "fiscal_ncm", label: "NCM / Código Fiscal", type: "text" },
  { key: "fiscal_tax_rate", label: "Alíquota Imposto (%)", type: "percent" },
];

export const SEO_FIELDS: FieldDef[] = [
  { key: "seo_slug", label: "URL (Slug)", type: "text" },
  { key: "seo_title", label: "Meta Title", type: "text" },
  { key: "seo_description", label: "Meta Description", type: "text" },
  { key: "seo_keywords", label: "Palavras-Chave", type: "text" },
];

// ─── Category-specific fields for the product dialog ────────────────

export const BASE_CATEGORY_FIELDS: FieldDef[] = [
  { key: "empresa", label: "Empresa", type: "text" },
  { key: "responsavel", label: "Contato", type: "text" },
  { key: "telefone", label: "Telefone", type: "text" },
  { key: "comissao", label: "Comissão (%)", type: "percent" },
];

export const categoryFields: Record<string, FieldDef[]> = {
  // Service sub-categories
  lanche: [
    ...BASE_CATEGORY_FIELDS,
    { key: "pontoColeta", label: "Ponto de Coleta", type: "text" },
    { key: "entrega", label: "Entrega (R$)", type: "number" },
  ],
  gastronomia: [
    ...BASE_CATEGORY_FIELDS,
    { key: "localizacao", label: "Localização", type: "text" },
  ],
  drone: [...BASE_CATEGORY_FIELDS],
  transfer: [...BASE_CATEGORY_FIELDS],
  especial: [...BASE_CATEGORY_FIELDS],
  // Experience (type-level)
  experience: [
    ...BASE_CATEGORY_FIELDS,
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "minPessoas", label: "Mín. Pessoas", type: "number" },
    { key: "maxPessoas", label: "Máx. Pessoas", type: "number" },
    { key: "duracao", label: "Duração", type: "text" },
    { key: "sazonalidade", label: "Sazonalidade", type: "select", options: { chuva: "Chuva", seca: "Seca", anual: "Anual" } },
  ],
  // Accommodation (type-level)
  accommodation: [
    ...BASE_CATEGORY_FIELDS,
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "site", label: "Site", type: "text" },
    { key: "accommodation_type", label: "Tipo", type: "select", options: { hotel: "Hotel", pousada: "Pousada", casa: "Casa", chale: "Chalé", bangalo: "Bangalô", resort: "Resort", hostel: "Hostel" } },
    { key: "total_capacity", label: "Capacidade Total", type: "number" },
    { key: "total_rooms", label: "Nº Quartos", type: "number" },
    { key: "operational_notes", label: "Obs. Operacionais", type: "text" },
  ],
};

export function getDialogFields(type: string, category?: string): FieldDef[] {
  // Try category-specific first (for services), then type-level, then legacy typeFields
  if (category && categoryFields[category]) return categoryFields[category];
  if (categoryFields[type]) return categoryFields[type];
  return getFieldsForType(type);
}

// ─── Inline Price Editor ────────────────────────────────────────────

export function InlinePrice({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  if (!editing) {
    return (
      <button
        className={`text-right tabular-nums cursor-pointer hover:underline ${value === 0 ? "text-orange-500" : ""}`}
        onClick={() => { setDraft(value.toString()); setEditing(true); }}
      >
        {value === 0 ? (
          <Badge variant="outline" className="text-orange-500 border-orange-300">definir</Badge>
        ) : (
          Number(value).toFixed(2)
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number" step="0.01" min="0" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-24 h-7 text-xs" autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(parseFloat(draft) || 0); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button onClick={() => { onSave(parseFloat(draft) || 0); setEditing(false); }}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </button>
      <button onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Inline Text Editor ─────────────────────────────────────────────

export function InlineText({
  value,
  onSave,
  placeholder = "-",
  className = "",
  inputClassName = "w-28",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        className={`cursor-pointer hover:underline text-left ${!value ? "text-muted-foreground" : ""} ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`h-7 text-xs ${inputClassName}`}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button onClick={() => { onSave(draft); setEditing(false); }}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </button>
      <button onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Inline Number Editor ───────────────────────────────────────────

export function InlineNumber({
  value,
  onSave,
  suffix = "",
  inputClassName = "w-20",
}: {
  value: number;
  onSave: (v: number) => void;
  suffix?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  if (!editing) {
    return (
      <button
        className={`cursor-pointer hover:underline tabular-nums ${value === 0 ? "text-muted-foreground" : ""}`}
        onClick={() => { setDraft(value.toString()); setEditing(true); }}
      >
        {value === 0 ? "-" : `${value}${suffix}`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number" step="0.1" min="0" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`h-7 text-xs ${inputClassName}`}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(parseFloat(draft) || 0); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button onClick={() => { onSave(parseFloat(draft) || 0); setEditing(false); }}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </button>
      <button onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Inline Select ──────────────────────────────────────────────────

export function InlineSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: Record<string, string>;
  onSave: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onSave}>
      <SelectTrigger className="h-7 text-xs w-auto min-w-[80px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([k, label]) => (
          <SelectItem key={k} value={k}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Product Table Wrapper ──────────────────────────────────────────

export type ColumnDef = {
  label: string;
  sortKey?: string;
  valueExtractor?: (row: any) => unknown;
  labelMap?: Record<string, string>;
};

export function ProductTable({
  products,
  columns,
  columnDefs,
  renderRow,
  isLoading,
  filterState,
  selectedIds,
  onToggleRow,
  onToggleAll,
  // Legacy props kept for compatibility
  sortKey,
  sortDir,
  onSort,
}: {
  products: Product[];
  columns?: string[];
  columnDefs?: ColumnDef[];
  renderRow: (p: Product) => React.ReactNode;
  isLoading: boolean;
  filterState?: SmartFilterState;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  sortKey?: string | null;
  sortDir?: import("@/components/admin/SmartTableHead").SortDir;
  onSort?: (key: string) => void;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Carregando...</p>;

  const headers: ColumnDef[] = columnDefs || (columns || []).map((c) => ({ label: c }));
  const hasSelection = selectedIds && onToggleRow && onToggleAll;
  const allIds = products.map(p => p.id);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/40 sticky top-0 z-20 backdrop-blur-md border-b border-border/50">
            <tr>
              {hasSelection && (
                <th className="p-4 w-12 align-middle border-b border-border/50">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allIds.length > 0 && allIds.every(id => selectedIds.has(id))}
                      onCheckedChange={() => onToggleAll(allIds)}
                      className="border-muted-foreground/30 data-[state=checked]:bg-primary"
                    />
                  </div>
                </th>
              )}
              {headers.map((c) =>
                c.sortKey && filterState ? (
                  <SmartTh
                    key={c.label}
                    label={c.label}
                    sortKey={c.sortKey}
                    filterState={filterState}
                    data={products}
                    valueExtractor={c.valueExtractor}
                    labelMap={c.labelMap}
                    className="p-4 border-b border-border/50"
                  />
                ) : (
                  <th key={c.label} className="text-left p-4 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-border/50">{c.label}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {products.map(renderRow)}
          {products.length === 0 && (
            <tr>
              <td colSpan={headers.length + (hasSelection ? 1 : 0)} className="p-6 text-center text-muted-foreground">
                Nenhum item encontrado
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { useSmartFilters };

export function buildExtractors(defs: ColumnDef[]): Record<string, (row: any) => unknown> {
  const map: Record<string, (row: any) => unknown> = {};
  for (const d of defs) {
    if (d.sortKey && d.valueExtractor) map[d.sortKey] = d.valueExtractor;
  }
  return map;
}

// ─── Supplier Combobox ──────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Supplier[];
    },
    staleTime: 60_000,
  });
}

export function SupplierCombobox({
  supplierId,
  supplierName,
  onSelect,
}: {
  supplierId?: string | null;
  supplierName?: string;
  onSelect: (supplier: Supplier | null) => void;
}) {
  const { data: suppliers = [] } = useSuppliers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = supplierId ? suppliers.find((s) => s.id === supplierId) : null;
  const displayName = current?.name || supplierName || "";

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!search.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("suppliers").insert([{ name: search.trim() }]).select().single();
    setCreating(false);
    if (error) return;
    qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
    onSelect(data as Supplier);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 cursor-pointer hover:underline text-left text-sm ${!displayName ? "text-muted-foreground" : ""}`}
          onClick={() => { setOpen(true); setSearch(""); }}
        >
          {displayName || "—"}
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input
          ref={inputRef}
          placeholder="Buscar fornecedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs mb-1"
          autoFocus
        />
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {filtered.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center gap-2 ${s.id === supplierId ? "bg-muted font-medium" : ""}`}
              onClick={() => { onSelect(s); setOpen(false); setSearch(""); }}
            >
              <span className="truncate">{s.name}</span>
              {s.contact_name && <span className="text-muted-foreground truncate">({s.contact_name})</span>}
            </button>
          ))}
          {filtered.length === 0 && !search && (
            <p className="text-xs text-muted-foreground px-2 py-1">Nenhum fornecedor</p>
          )}
        </div>
        {search && !filtered.some((s) => s.name.toLowerCase() === search.toLowerCase()) && (
          <Button
            size="sm" variant="ghost"
            className="w-full mt-1 text-xs h-7 justify-start"
            onClick={handleCreate}
            disabled={creating}
          >
            <Plus className="h-3 w-3 mr-1" /> Criar "{search}"
          </Button>
        )}
        {supplierId && (
          <Button
            size="sm" variant="ghost"
            className="w-full mt-1 text-xs h-7 justify-start text-muted-foreground"
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            <X className="h-3 w-3 mr-1" /> Remover vínculo
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
