import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Product, UpdatePayload, ProductTable, InlinePrice, InlineText, InlineNumber, InlineSelect,
  regionLabels, SupplierCombobox, buildExtractors, type Supplier, type ColumnDef,
  getProductRegion, getProductSubcategory
} from "./shared";
import { ProductImageCell } from "./ProductImageCell";
import { useSmartFilters } from "@/components/admin/SmartTableHead";
import { DeleteButton } from "./DeleteButton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RoomModalitiesEditor, { type RoomConfig, normalizeRoomConfigs } from "./RoomModalitiesEditor";

const accommodationTypeLabels: Record<string, string> = {
  hotel: "Hotel",
  pousada: "Pousada",
  casa: "Casa",
  chale: "Chalé",
  bangalo: "Bangalô",
  resort: "Resort",
  hostel: "Hostel",
};

function AccommodationRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle, onOpenModalities,
}: {
  product: Product;
  onUpdate: (d: UpdatePayload) => void;
  onEdit?: (p: Product) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpenModalities?: (p: Product) => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const qc = useQueryClient();
  const roomConfigs = normalizeRoomConfigs(vars.room_modalities);
  const totalModalities = roomConfigs.reduce((s, c) => s + c.modalities.length, 0);

  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };

  const handleSupplierSelect = async (supplier: Supplier | null) => {
    await supabase.from("products").update({ supplier_id: supplier?.id || null }).eq("id", product.id);
    const newVars = { ...vars };
    if (supplier) {
      newVars.empresa = supplier.name;
      newVars.responsavel = supplier.contact_name || "";
      newVars.telefone = supplier.phone || "";
      newVars.instagram = supplier.instagram || "";
      newVars.site = supplier.website || "";
    }
    onUpdate({ id: product.id, variables: newVars as Record<string, unknown> });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
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
      <td className="p-3 text-xs">{accommodationTypeLabels[(vars.accommodation_type as string) || ""] || "—"}</td>
      <td className="p-3 text-center">
        <button
          className="text-xs text-primary hover:underline cursor-pointer"
          onClick={() => onOpenModalities?.(product)}
        >
          {roomConfigs.length > 0 ? `${roomConfigs.length} un. · ${totalModalities} mod.` : "Definir"}
        </button>
      </td>
      <td className="p-3">
        <SupplierCombobox
          supplierId={product.supplier_id}
          supplierName={(vars.empresa as string) || ""}
          onSelect={handleSupplierSelect}
        />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.instagram as string) || ""} onSave={(v) => saveVar("instagram", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.site as string) || ""} onSave={(v) => saveVar("site", v)} placeholder="—" inputClassName="w-32" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
      </td>
      <td className="p-3">
        <InlineSelect value={(vars.pricingType as string) || "por_pessoa"} options={{ por_pessoa: "Por Pessoa", total: "Total" }} onSave={(v) => saveVar("pricingType", v)} />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.limitPeople as number) || 0} onSave={(v) => saveVar("limitPeople", v)} inputClassName="w-14" />
      </td>
      <td className="p-3">
        <InlinePrice value={product.cost_price} onSave={(v) => onUpdate({ id: product.id, cost_price: v })} />
      </td>
      <td className="p-3">
        <InlinePrice value={product.unit_price} onSave={(v) => onUpdate({ id: product.id, unit_price: v })} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2 justify-end">
          <Switch checked={product.is_active} onCheckedChange={(v) => onUpdate({ id: product.id, is_active: v })} />
          {onDelete && <DeleteButton onDelete={() => onDelete(product.id)} />}
        </div>
      </td>
    </tr>
  );
}

const columnDefs: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região", sortKey: "_region", valueExtractor: (r: any) => getProductRegion(r), labelMap: regionLabels },
  { label: "Subcategoria", sortKey: "_subcat", valueExtractor: (r: any) => getProductSubcategory(r) },
  { label: "Tipo", sortKey: "_acc_type", valueExtractor: (r: any) => (r.variables?.accommodation_type as string) || "", labelMap: accommodationTypeLabels },
  { label: "Modalidades" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Instagram", sortKey: "_instagram", valueExtractor: (r: any) => (r.variables?.instagram as string) || "" },
  { label: "Site", sortKey: "_site", valueExtractor: (r: any) => (r.variables?.site as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Tipo Preço", sortKey: "_pricingType", valueExtractor: (r: any) => (r.variables?.pricingType as string) || "por_pessoa", labelMap: { por_pessoa: "Por Pessoa", total: "Total" } },
  { label: "Limite", sortKey: "_limitPeople", valueExtractor: (r: any) => (r.variables?.limitPeople as number) || 0 },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];

export default function AccommodationTab({
  products, isLoading, onUpdate, onEdit, onDelete, selectedIds, onToggleRow, onToggleAll,
}: {
  products: Product[];
  isLoading: boolean;
  onUpdate: (d: UpdatePayload) => void;
  onEdit?: (p: Product) => void;
  onDelete?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
}) {
  const filterState = useSmartFilters();
  const sorted = filterState.applyFilters(products, buildExtractors(columnDefs));
  const [modalitiesProduct, setModalitiesProduct] = useState<Product | null>(null);

  const currentConfigs: RoomConfig[] = modalitiesProduct
    ? normalizeRoomConfigs(((modalitiesProduct.variables || {}) as Record<string, unknown>).room_modalities)
    : [];

  const handleConfigsChange = (configs: RoomConfig[]) => {
    if (!modalitiesProduct) return;
    const vars = { ...(modalitiesProduct.variables || {}), room_modalities: configs } as Record<string, unknown>;
    onUpdate({ id: modalitiesProduct.id, variables: vars });
    setModalitiesProduct({ ...modalitiesProduct, variables: vars });
  };

  return (
    <>
      <ProductTable
        products={sorted}
        columnDefs={columnDefs}
        filterState={filterState}
        selectedIds={selectedIds}
        onToggleRow={onToggleRow}
        onToggleAll={onToggleAll}
        renderRow={(p) => (
          <AccommodationRow
            key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete}
            isSelected={selectedIds?.has(p.id)} onToggle={onToggleRow ? () => onToggleRow(p.id) : undefined}
            onOpenModalities={setModalitiesProduct}
          />
        )}
        isLoading={isLoading}
      />

      <Sheet open={!!modalitiesProduct} onOpenChange={(v) => !v && setModalitiesProduct(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-sm">
              Modalidades — {modalitiesProduct?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RoomModalitiesEditor
              configs={currentConfigs}
              onChange={handleConfigsChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
