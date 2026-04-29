import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Product, UpdatePayload, ColumnDef } from "./shared";
import { ProductTable, buildExtractors, regionLabels, getProductRegion, getProductSubcategory } from "./shared";
import { ProductImageCell } from "./ProductImageCell";
import { useSmartFilters } from "@/components/admin/SmartTableHead";

interface Pricing {
  atmos4x4?: { individual?: number; dupla?: number; trio?: number };
  carroProprio?: { individual?: number; dupla?: number; trio?: number };
}

interface Props {
  products: Product[];
  allProducts?: Product[];
  isLoading: boolean;
  onUpdate: (p: UpdatePayload) => void;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
}

const fmt = (v: number | undefined) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR")}` : "—";

function resolveCategory(p: Product): "classico" | "jurassico" {
  const nameLower = p.name.toLowerCase();
  if (nameLower.includes("juráss") || nameLower.includes("jurass")) return "jurassico";
  if (nameLower.includes("cláss") || nameLower.includes("class")) return "classico";
  if (p.category === "jurassico") return "jurassico";
  return "classico";
}

const columnDefs: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região", sortKey: "_region", valueExtractor: (r: any) => getProductRegion(r), labelMap: regionLabels },
  { label: "Subcategoria", sortKey: "_subcat", valueExtractor: (r: any) => getProductSubcategory(r) },
  { label: "Tipo", sortKey: "_category", valueExtractor: (r: any) => resolveCategory(r), labelMap: { classico: "Clássico", jurassico: "Jurássico" } },
  { label: "Dias", sortKey: "_duration", valueExtractor: (r: any) => (r.variables?.duration as number) || 0 },
  { label: "4×4 (1p)" },
  { label: "4×4 (2p)" },
  { label: "4×4 (3+p)" },
  { label: "Carro (1p)" },
  { label: "Carro (2p)" },
  { label: "Carro (3+p)" },
  { label: "Ingressos" },
  { label: "Equip." },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
  { label: "" },
];

function ItineraryRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product;
  onUpdate: (d: UpdatePayload) => void;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const vars = (product.variables || {}) as Record<string, any>;
  const pricing = vars.pricing as Pricing | undefined;
  const extraCosts = vars.extraCosts as { equipmentFees?: number; entranceFees?: number } | undefined;
  const duration = vars.duration as number | undefined;
  const category = resolveCategory(product);
  const isClassico = category === "classico";

  return (
    <>
      <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
        {onToggle && (
          <td className="p-3 w-10">
            <Checkbox checked={isSelected} onCheckedChange={onToggle} />
          </td>
        )}
        <td className="p-3"><ProductImageCell product={product} /></td>
        <td className="p-3 font-medium">
          <button className="hover:underline cursor-pointer text-left" onClick={() => onEdit(product)}>
            {product.name}
          </button>
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
          <Badge className={isClassico ? "bg-[#556952] text-white border-[#556952]" : "bg-red-900 text-white border-red-900"}>
            {isClassico ? "Clássico" : "Jurássico"}
          </Badge>
        </td>
        <td className="p-3 text-center">{duration ?? "—"}</td>
        <td className="p-3 text-right">{fmt(pricing?.atmos4x4?.individual)}</td>
        <td className="p-3 text-right">{fmt(pricing?.atmos4x4?.dupla)}</td>
        <td className="p-3 text-right">{fmt(pricing?.atmos4x4?.trio)}</td>
        <td className="p-3 text-right">{fmt(pricing?.carroProprio?.individual)}</td>
        <td className="p-3 text-right">{fmt(pricing?.carroProprio?.dupla)}</td>
        <td className="p-3 text-right">{fmt(pricing?.carroProprio?.trio)}</td>
        <td className="p-3 text-right">{extraCosts?.entranceFees ? `R$ ${extraCosts.entranceFees.toLocaleString("pt-BR")}` : "—"}</td>
        <td className="p-3 text-right">{extraCosts?.equipmentFees ? `R$ ${extraCosts.equipmentFees}` : "—"}</td>
        <td className="p-3">
          <Switch checked={product.is_active} onCheckedChange={(v) => onUpdate({ id: product.id, is_active: v })} />
        </td>
        <td className="p-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente. O roteiro "{product.name}" será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(product.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ItineraryTab({ products, isLoading, onUpdate, onEdit, onDelete, selectedIds, onToggleRow, onToggleAll }: Props) {
  const filterState = useSmartFilters();
  const sorted = filterState.applyFilters(products, buildExtractors(columnDefs));

  return (
    <ProductTable
      products={sorted}
      columnDefs={columnDefs}
      filterState={filterState}
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      renderRow={(p) => (
        <ItineraryRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete}
          isSelected={selectedIds?.has(p.id)} onToggle={onToggleRow ? () => onToggleRow(p.id) : undefined} />
      )}
      isLoading={isLoading}
    />
  );
}
