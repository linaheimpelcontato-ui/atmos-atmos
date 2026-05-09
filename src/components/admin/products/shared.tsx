import { useState, useEffect, useRef } from "react";
import { normalize } from "@/lib/storage";
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
  "cavalcante": "Cavalcante",
  "kalunga": "Território Kalunga",
  "teresina-goias": "Teresina de Goiás",
  "moinho": "Moinho",
  "campo-alegre": "Campo Alegre",
  "colinas-do-sul": "Colinas do Sul",
  "tocantins": "Tocantins",
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

// ─── Column Definitions ─────────────────────────────────────────────

export type ColumnKey = 
  | "name" | "price" | "cost_price" | "status" | "type" | "category" | "subcategory"
  | "variations" | "region" | "empresa" | "responsavel" | "telefone" 
  | "difficulty" | "comissao" | "instagram" | "site" | "capacity" 
  | "rooms" | "notes" | "duration" | "seasonality" | "distance_trail" 
  | "distance_car" | "cnpj" | "tax_rate" | "seo_slug" | "seo_title" | "id"
  | "pricing_type" | "limit_pax";

export interface ColumnInfo {
  key: ColumnKey;
  label: string;
  defaultVisible?: boolean;
}



export const ALL_COLUMNS: ColumnInfo[] = [
  { key: "name", label: "Produto", defaultVisible: true },
  { key: "price", label: "Valor Venda", defaultVisible: true },
  { key: "cost_price", label: "Preço Custo", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "type", label: "Tipo", defaultVisible: false },
  { key: "subcategory", label: "Subcategoria", defaultVisible: true },
  { key: "category", label: "Pasta / Ref. Interna", defaultVisible: false },
  { key: "variations", label: "Opções", defaultVisible: true },
  { key: "region", label: "Região", defaultVisible: true },
  { key: "empresa", label: "Empresa", defaultVisible: false },
  { key: "responsavel", label: "Contato", defaultVisible: false },
  { key: "telefone", label: "Telefone", defaultVisible: false },
  { key: "instagram", label: "Instagram", defaultVisible: false },
  { key: "site", label: "Site", defaultVisible: false },
  { key: "capacity", label: "Capacidade", defaultVisible: false },
  { key: "rooms", label: "Quartos", defaultVisible: false },
  { key: "notes", label: "Obs. Operacionais", defaultVisible: false },
  { key: "difficulty", label: "Dificuldade", defaultVisible: false },
  { key: "duration", label: "Duração", defaultVisible: false },
  { key: "seasonality", label: "Sazonalidade", defaultVisible: false },
  { key: "distance_trail", label: "Trilha (km)", defaultVisible: false },
  { key: "distance_car", label: "Estrada (km)", defaultVisible: false },
  { key: "comissao", label: "Comissão (%)", defaultVisible: false },
  { key: "cnpj", label: "CNPJ", defaultVisible: false },
  { key: "tax_rate", label: "Imposto (%)", defaultVisible: false },
  { key: "seo_slug", label: "Slug SEO", defaultVisible: false },
  { key: "seo_title", label: "Meta Title", defaultVisible: false },
  { key: "pricing_type", label: "Lógica Cobrança", defaultVisible: false },
  { key: "limit_pax", label: "Limite Pax", defaultVisible: false },
  { key: "id", label: "ID", defaultVisible: false },
];

export const COMMON_COLUMNS: ColumnKey[] = [
  "name", "price", "cost_price", "status", "type", "category", 
  "variations", "pricing_type", "limit_pax", "cnpj", "tax_rate", 
  "seo_slug", "seo_title", "id"
];

export const TYPE_RELEVANT_COLUMNS: Record<string, ColumnKey[]> = {
  waterfall: ["region", "difficulty", "distance_trail", "distance_car"],
  experience: ["region", "empresa", "responsavel", "telefone", "instagram", "comissao", "duration", "seasonality"],
  service: ["region", "empresa", "responsavel", "telefone", "comissao"],
  accommodation: ["region", "responsavel", "telefone", "instagram", "site", "comissao", "capacity", "rooms", "notes"],
  itinerary: [], // Common columns are enough for itineraries
};

export function getRelevantColumns(type: string): ColumnKey[] {
  const specific = TYPE_RELEVANT_COLUMNS[type] || [];
  return [...COMMON_COLUMNS, ...specific];
}

const COLUMNS_STORAGE_PREFIX = "atmos-admin-product-columns-";

export function getVisibleColumns(type: string): ColumnKey[] {
  const saved = localStorage.getItem(COLUMNS_STORAGE_PREFIX + type);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing columns from localStorage", e);
    }
  }
  const relevant = getRelevantColumns(type);
  return ALL_COLUMNS.filter(c => c.defaultVisible && relevant.includes(c.key)).map(c => c.key);
}

export function saveVisibleColumns(type: string, columns: ColumnKey[]) {
  localStorage.setItem(COLUMNS_STORAGE_PREFIX + type, JSON.stringify(columns));
}

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
    return product.category;
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
  helpText?: string;
  warning?: boolean;
};

export const typeFields: Record<string, FieldDef[]> = {
  waterfall: [
    { key: "region", label: "Região", type: "select", options: regionLabels },
    { key: "priceTier", label: "Nível Preço", type: "select", options: { economico: "Econômico", intermediario: "Intermediário", elevado: "Elevado" } },
    { key: "difficulty", label: "Dificuldade", type: "select", options: difficultyLabels },
    { key: "requiresGuide", label: "Guia Obrigatório", type: "select", options: { true: "Sim", false: "Não" } },
    { key: "requires4x4", label: "Necessário 4x4", type: "select", options: { true: "Sim", false: "Não" } },
    { key: "distanceKm", label: "Trilha (km)", type: "number" },
    { key: "distanceCarKm", label: "Carro (km)", type: "number" },
  ],
  experience: [
    { key: "region", label: "Região", type: "select", options: regionLabels },
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

export function getStorageInfo(product: Partial<Product> & { name: string; type: string; tempId?: string }): { folder: string; productFolder: string; prefix: string; rawName: string } | null {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const rawName = (product.name as any)?.pt || product.name || "";
  const prefix = (vars.storage_id as string) || normalize(rawName) || product.id || product.tempId || "item";
  
  let categoryFolder = "produtos";
  switch (product.type) {
    case "waterfall":
      categoryFolder += "/cachoeiras";
      break;
    case "experience":
      categoryFolder += "/experiencias";
      break;
    case "accommodation":
      categoryFolder += "/hospedagens";
      break;
    case "service":
      categoryFolder += "/serviços";
      break;
    case "itinerary":
      categoryFolder += "/roteiros";
      break;
    default:
      categoryFolder += "/outros";
  }

  return { 
    folder: categoryFolder, // Search in the whole category
    productFolder: `${categoryFolder}/${prefix}`, // Upload specifically here
    prefix: prefix,
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
  { 
    key: "seo_slug", 
    label: "URL (Slug SEO)", 
    type: "text", 
    helpText: "⚠️ Cuidado: Alterar o slug muda a URL pública e pode quebrar links externos.",
    warning: true 
  },
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
    { key: "region", label: "Região", type: "select", options: regionLabels },
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "minPessoas", label: "Mín. Pessoas", type: "number" },
    { key: "maxPessoas", label: "Máx. Pessoas", type: "number" },
    { key: "duracao", label: "Duração", type: "text" },
    { key: "sazonalidade", label: "Sazonalidade", type: "select", options: { chuva: "Chuva", seca: "Seca", anual: "Anual" } },
  ],
  // Accommodation (type-level)
  accommodation: [
    ...BASE_CATEGORY_FIELDS,
    { key: "region", label: "Região", type: "select", options: regionLabels },
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

// ─── Inline Price Editor ────────────────────────────────────────────

export function InlinePrice({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!editing) hasSaved.current = false;
  }, [editing]);

  const handleSave = () => {
    if (hasSaved.current) return;
    const val = parseFloat(draft);
    if (!isNaN(val)) {
      hasSaved.current = true;
      onSave(val);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="text-right font-semibold tabular-nums cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-admin-muted hover:text-admin-primary whitespace-nowrap text-foreground"
        onClick={(e) => { e.stopPropagation(); setDraft(value.toString()); setEditing(true); }}
      >
        {`R$\u00A0${Number(value).toFixed(2)}`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg shadow-sm border border-admin-border animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
      <Input
        type="number" step="0.01" min="0" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-24 h-8 text-sm border-none focus-visible:ring-0 px-1 font-semibold" autoFocus
        onFocus={(e) => e.target.select()}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") { 
            e.preventDefault();
            e.stopPropagation();
            handleSave(); 
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex items-center gap-0.5">
        <button 
          onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
          className="p-1 rounded-md hover:bg-green-50 text-green-600 transition-colors"
        >
          <Check className="h-4 w-4" />
        </button>
        <button 
          onMouseDown={(e) => { e.preventDefault(); setEditing(false); }}
          className="p-1 rounded-md hover:bg-red-50 text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline Text Editor ─────────────────────────────────────────────

export function InlineText({
  value,
  onSave,
  placeholder = "-",
  className = "",
  inputClassName = "w-32",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!editing) hasSaved.current = false;
  }, [editing]);

  const handleSave = () => {
    if (hasSaved.current) return;
    hasSaved.current = true;
    onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className={`cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-admin-muted hover:text-admin-primary text-left truncate ${!value ? "text-muted-foreground/50 italic" : "font-medium"} ${className}`}
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg shadow-sm border border-admin-border animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`h-8 text-sm border-none focus-visible:ring-0 px-1 font-medium ${inputClassName}`}
        autoFocus
        onFocus={(e) => e.target.select()}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") { 
            e.preventDefault();
            e.stopPropagation();
            handleSave(); 
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex items-center gap-0.5">
        <button onMouseDown={(e) => { e.preventDefault(); handleSave(); }} className="p-1 rounded-md hover:bg-green-50 text-green-600">
          <Check className="h-4 w-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); setEditing(false); }} className="p-1 rounded-md hover:bg-red-50 text-red-400">
          <X className="h-4 w-4" />
        </button>
      </div>
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
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!editing) hasSaved.current = false;
  }, [editing]);

  const handleSave = () => {
    if (hasSaved.current) return;
    const val = parseFloat(draft);
    if (!isNaN(val)) {
      hasSaved.current = true;
      onSave(val);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className={`cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-admin-muted hover:text-admin-primary tabular-nums font-medium whitespace-nowrap ${value === 0 ? "text-muted-foreground/50" : ""}`}
        onClick={(e) => { e.stopPropagation(); setDraft(value.toString()); setEditing(true); }}
      >
        {value === 0 ? "-" : `${value}${suffix}`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg shadow-sm border border-admin-border animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
      <Input
        type="number" step="0.1" min="0" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`h-8 text-sm border-none focus-visible:ring-0 px-1 font-medium ${inputClassName}`}
        autoFocus
        onFocus={(e) => e.target.select()}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") { 
            e.preventDefault();
            e.stopPropagation();
            handleSave(); 
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="flex items-center gap-0.5">
        <button onMouseDown={(e) => { e.preventDefault(); handleSave(); }} className="p-1 rounded-md hover:bg-green-50 text-green-600">
          <Check className="h-4 w-4" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); setEditing(false); }} className="p-1 rounded-md hover:bg-red-50 text-red-400">
          <X className="h-4 w-4" />
        </button>
      </div>
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
    <div onClick={(e) => e.stopPropagation()}>
      <Select value={value} onValueChange={onSave}>
        <SelectTrigger className="h-8 text-xs w-auto min-w-[100px] bg-white border-admin-border rounded-lg hover:bg-admin-muted transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-admin-border shadow-xl">
          {Object.entries(options).map(([k, label]) => (
            <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
}) {
  const headers: ColumnDef[] = columnDefs || (columns || []).map((c) => ({ label: c }));
  const hasSelection = !!(selectedIds && onToggleRow && onToggleAll);
  const allIds = products.map(p => p.id);

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-x-auto custom-scrollbar bg-white rounded-[2rem] border border-admin-border/50 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-admin-border/40">
            <tr>
              {hasSelection && (
                <th className="px-6 py-5 w-14 align-middle">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allIds.length > 0 && allIds.every(id => selectedIds.has(id))}
                      onCheckedChange={() => onToggleAll(allIds)}
                      className="border-admin-border data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary transition-all"
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
                    className="px-6 py-5 whitespace-nowrap text-left"
                  />
                ) : (
                  <th 
                    key={c.label} 
                    className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/20">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {hasSelection && <td className="px-6 py-7"><div className="h-4 w-4 bg-admin-muted rounded-full mx-auto" /></td>}
                  {headers.map((_, j) => (
                    <td key={j} className="px-6 py-7">
                      <div className="h-4 w-full bg-admin-muted/60 rounded-lg" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={headers.length + (hasSelection ? 1 : 0)} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 max-w-xs mx-auto animate-in fade-in zoom-in duration-500">
                    <div className="p-5 bg-admin-muted/50 rounded-3xl text-admin-primary/20">
                      <X className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-admin-primary uppercase tracking-widest">Nenhum item</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Não encontramos produtos com os filtros atuais.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              products.map(renderRow)
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
          className={`flex items-center gap-2 cursor-pointer group transition-all text-left text-sm ${!displayName ? "text-muted-foreground/40 italic" : "text-admin-primary font-bold hover:text-black"}`}
          onClick={() => { setOpen(true); setSearch(""); }}
        >
          <span className="truncate max-w-[150px]">{displayName || "Selecionar Fornecedor"}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-admin-primary shrink-0 transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white border-none shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200" align="start">
        <div className="relative mb-3">
          <Input
            ref={inputRef}
            placeholder="Buscar parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs pl-3 bg-admin-bg border-admin-border rounded-xl focus:ring-2 focus:ring-admin-primary/10 transition-all"
            autoFocus
          />
        </div>
        
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filtered.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${s.id === supplierId ? "bg-admin-primary text-white font-bold" : "hover:bg-admin-muted text-admin-primary font-semibold"}`}
              onClick={() => { onSelect(s); setOpen(false); setSearch(""); }}
            >
              <span className="truncate">{s.name}</span>
              {s.contact_name && (
                <span className={`text-[9px] truncate opacity-70 ${s.id === supplierId ? "text-white" : "text-muted-foreground"}`}>
                  {s.contact_name}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && !search && (
            <div className="py-8 text-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-admin-muted flex items-center justify-center mx-auto opacity-40">
                <X className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Vazio</p>
            </div>
          )}
        </div>
        
        {(search || supplierId) && <div className="mt-2 pt-2 border-t border-admin-border/50 space-y-1">
          {search && !filtered.some((s) => s.name.toLowerCase() === search.toLowerCase()) && (
            <Button
              size="sm" variant="ghost"
              className="w-full text-[10px] h-9 justify-start font-bold uppercase tracking-widest text-admin-primary hover:bg-admin-primary/5 rounded-xl"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className="h-3 w-3 mr-2" /> Criar "{search}"
            </Button>
          )}
          {supplierId && (
            <Button
              size="sm" variant="ghost"
              className="w-full text-[10px] h-9 justify-start font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl"
              onClick={() => { onSelect(null); setOpen(false); }}
            >
              <X className="h-3 w-3 mr-2" /> Remover Parceiro
            </Button>
          )}
        </div>}
      </PopoverContent>
    </Popover>
  );
}
