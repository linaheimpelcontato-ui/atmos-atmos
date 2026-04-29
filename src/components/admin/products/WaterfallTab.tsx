import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign } from "lucide-react";
import {
  Product, UpdatePayload, ProductTable, InlinePrice, InlineNumber, InlineSelect, InlineText,
  difficultyLabels, regionLabels, buildExtractors, type Supplier, SupplierCombobox,
  type ColumnDef, getProductRegion, getProductSubcategory
} from "./shared";
import { ProductImageCell } from "./ProductImageCell";
import { useSmartFilters } from "@/components/admin/SmartTableHead";

const guideOptions = { true: "Sim", false: "Não" };

type GuidePrices = {
  carroTurista: { "1": number; "2": number; "3plus": number };
  "4x4Atmos": { "1": number; "2": number; "3plus": number };
};

const defaultGuidePrices: GuidePrices = {
  carroTurista: { "1": 0, "2": 0, "3plus": 0 },
  "4x4Atmos": { "1": 0, "2": 0, "3plus": 0 },
};

function getGuidePrices(vars: Record<string, unknown>): GuidePrices {
  const gp = vars.guidePrices as GuidePrices | undefined;
  return gp ? { ...defaultGuidePrices, ...gp, carroTurista: { ...defaultGuidePrices.carroTurista, ...gp.carroTurista }, "4x4Atmos": { ...defaultGuidePrices["4x4Atmos"], ...gp["4x4Atmos"] } } : defaultGuidePrices;
}

function GuidePricePopover({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: (d: UpdatePayload) => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const gp = getGuidePrices(vars);

  const save = (transport: "carroTurista" | "4x4Atmos", pax: "1" | "2" | "3plus", val: number) => {
    const newGp = {
      ...gp,
      [transport]: { ...gp[transport], [pax]: val },
    };
    onUpdate({ id: product.id, variables: { ...vars, guidePrices: newGp } });
  };

  const rows: { key: "carroTurista" | "4x4Atmos"; label: string }[] = [
    { key: "carroTurista", label: "Carro Turista" },
    { key: "4x4Atmos", label: "4x4 ATMOS" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs hover:underline text-primary cursor-pointer">
          <DollarSign className="h-3.5 w-3.5" />
          Guia
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px]" align="end" collisionPadding={16} side="bottom" sideOffset={8}>
        <p className="text-xs font-semibold mb-2">Preços de Guia — {product.name}</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-1.5 font-medium" />
              <th className="p-1.5 font-medium">1 pessoa</th>
              <th className="p-1.5 font-medium">2 pessoas</th>
              <th className="p-1.5 font-medium">3+ pessoas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border/50">
                <td className="p-1.5 font-medium whitespace-nowrap">{r.label}</td>
                {(["1", "2", "3plus"] as const).map((pax) => (
                  <td key={pax} className="p-1.5">
                    <InlinePrice value={gp[r.key][pax]} onSave={(v) => save(r.key, pax, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}

const priceTierLabels: Record<string, string> = {
  economico: "Econômico",
  intermediario: "Intermediário",
  elevado: "Elevado",
};

function WaterfallRow({
  product,
  onUpdate,
  guideCount,
  onEdit,
  isSelected,
  onToggle,
}: {
  product: Product;
  onUpdate: (d: UpdatePayload) => void;
  guideCount: number;
  onEdit?: (p: Product) => void;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;

  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10">
          <Checkbox checked={isSelected} onCheckedChange={onToggle} />
        </td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium">
        <button className="hover:underline cursor-pointer text-left" onClick={() => onEdit?.(product)}>{product.name}</button>
      </td>
      <td className="p-3">
        <Badge variant="outline" className="font-normal bg-primary/10 text-primary text-[10px] uppercase tracking-wider">
          {regionLabels[getProductRegion(product)] || getProductRegion(product) || "—"}
        </Badge>
      </td>
      <td className="p-3">
        <Badge variant="outline" className="font-normal bg-muted/20 text-[10px] uppercase tracking-wider">
          {getProductSubcategory(product) || "—"}
        </Badge>
      </td>
      <td className="p-3">
        <SupplierCombobox
          supplierId={product.supplier_id}
          supplierName={(vars.empresa as string) || ""}
          onSelect={async (s) => {
            onUpdate({ id: product.id, supplier_id: s?.id || null, variables: { ...vars, empresa: s?.name || "" } });
          }}
        />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineSelect
          value={(vars.priceTier as string) || "intermediario"}
          options={priceTierLabels}
          onSave={(v) => saveVar("priceTier", v)}
        />
      </td>
      <td className="p-3">
        <InlineSelect
          value={(vars.difficulty as string) || "facil"}
          options={difficultyLabels}
          onSave={(v) => saveVar("difficulty", v)}
        />
      </td>
      <td className="p-3">
        <InlineSelect
          value={String(vars.requiresGuide ?? false)}
          options={guideOptions}
          onSave={(v) => saveVar("requiresGuide", v === "true")}
        />
      </td>
      <td className="p-3">
        <InlinePrice value={product.unit_price} onSave={(v) => onUpdate({ id: product.id, unit_price: v })} />
      </td>
      <td className="p-3">
        <GuidePricePopover product={product} onUpdate={onUpdate} />
      </td>
      <td className="p-3 text-center">
        <Badge variant="secondary" className="text-xs">
          {guideCount}
        </Badge>
      </td>
      <td className="p-3">
        <InlineNumber
          value={(vars.distanceKm as number) || 0}
          onSave={(v) => saveVar("distanceKm", v)}
          suffix=" km"
        />
      </td>
      <td className="p-3">
        <InlineNumber
          value={(vars.distanceCarKm as number) || 0}
          onSave={(v) => saveVar("distanceCarKm", v)}
          suffix=" km"
        />
      </td>
      <td className="p-3">
        <Switch
          checked={product.is_active}
          onCheckedChange={(v) => onUpdate({ id: product.id, is_active: v })}
        />
      </td>
    </tr>
  );
}

const columnDefs: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região", sortKey: "_region", valueExtractor: (r: any) => getProductRegion(r), labelMap: regionLabels },
  { label: "Subcategoria", sortKey: "_subcat", valueExtractor: (r: any) => getProductSubcategory(r) },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Nível", sortKey: "_priceTier", valueExtractor: (r: any) => (r.variables?.priceTier as string) || "intermediario", labelMap: priceTierLabels },
  { label: "Dificuldade", sortKey: "_difficulty", valueExtractor: (r: any) => (r.variables?.difficulty as string) || "facil", labelMap: difficultyLabels },
  { label: "Guia", sortKey: "_requiresGuide", valueExtractor: (r: any) => String(r.variables?.requiresGuide ?? false), labelMap: { true: "Sim", false: "Não" } },
  { label: "Ingressos (R$)", sortKey: "unit_price" },
  { label: "Guia (R$)" },
  { label: "Guias" },
  { label: "Trilha (km)", sortKey: "_distanceKm", valueExtractor: (r: any) => (r.variables?.distanceKm as number) || 0 },
  { label: "Carro (km)", sortKey: "_distanceCarKm", valueExtractor: (r: any) => (r.variables?.distanceCarKm as number) || 0 },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];

export default function WaterfallTab({
  products,
  isLoading,
  onUpdate,
  onEdit,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: {
  products: Product[];
  isLoading: boolean;
  onUpdate: (d: UpdatePayload) => void;
  onEdit?: (p: Product) => void;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
}) {
  const filterState = useSmartFilters();

  const sorted = filterState.applyFilters(products, buildExtractors(columnDefs));

  const { data: guideCounts = {} } = useQuery({
    queryKey: ["guide-waterfall-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_waterfall_prices")
        .select("product_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.product_id] = (counts[row.product_id] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <ProductTable
      products={sorted}
      columnDefs={columnDefs}
      filterState={filterState}
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      renderRow={(p) => (
        <WaterfallRow
          key={p.id}
          product={p}
          onUpdate={onUpdate}
          guideCount={guideCounts[p.id] || 0}
          onEdit={onEdit}
          isSelected={selectedIds?.has(p.id)}
          onToggle={onToggleRow ? () => onToggleRow(p.id) : undefined}
        />
      )}
      isLoading={isLoading}
    />
  );
}
