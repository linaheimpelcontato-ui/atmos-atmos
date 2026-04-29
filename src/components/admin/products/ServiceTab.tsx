import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, UpdatePayload, ProductTable, InlinePrice, InlineText, InlineNumber, InlineSelect, SupplierCombobox, buildExtractors, regionLabels, serviceTypeLabels, type Supplier, type ColumnDef, getProductRegion, getProductSubcategory } from "./shared";
import { ProductImageCell } from "./ProductImageCell";
import { useSmartFilters } from "@/components/admin/SmartTableHead";
import { DeleteButton } from "./DeleteButton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

function useSupplierLink() {
  const qc = useQueryClient();
  return async (product: Product, supplier: Supplier | null, onUpdate: (d: UpdatePayload) => void) => {
    await supabase.from("products").update({ supplier_id: supplier?.id || null }).eq("id", product.id);
    const vars = { ...(product.variables || {}) } as Record<string, unknown>;
    if (supplier) {
      vars.empresa = supplier.name;
      vars.responsavel = supplier.contact_name || "";
      vars.telefone = supplier.phone || "";
    }
    onUpdate({ id: product.id, variables: vars });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };
}

function LancheRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onDelete?: (id: string) => void;
  isSelected?: boolean; onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };
  const linkSupplier = useSupplierLink();

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium max-w-[200px]">
        <button className="hover:underline cursor-pointer text-left truncate block w-full" onClick={() => onEdit?.(product)} title={product.name}>{product.name}</button>
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
        <SupplierCombobox supplierId={product.supplier_id} supplierName={(vars.empresa as string) || (vars.responsavel as string) || ""} onSelect={(s) => linkSupplier(product, s, onUpdate)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
      </td>
      <td className="p-3">
        <InlineSelect value={(vars.pricingType as string) || "por_pessoa"} options={{ por_pessoa: "Por pessoa", total: "Total" }} onSave={(v) => saveVar("pricingType", v)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.pontoColeta as string) || ""} onSave={(v) => saveVar("pontoColeta", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlinePrice value={(vars.entrega as number) || 0} onSave={(v) => saveVar("entrega", v)} />
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

function GastronomiaRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onDelete?: (id: string) => void;
  isSelected?: boolean; onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };
  const linkSupplier = useSupplierLink();

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium max-w-[200px]">
        <button className="hover:underline cursor-pointer text-left truncate block w-full" onClick={() => onEdit?.(product)} title={product.name}>{product.name}</button>
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
        <SupplierCombobox supplierId={product.supplier_id} supplierName={(vars.empresa as string) || (vars.responsavel as string) || ""} onSelect={(s) => linkSupplier(product, s, onUpdate)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
      </td>
      <td className="p-3">
        <InlineSelect value={(vars.pricingType as string) || "por_pessoa"} options={{ por_pessoa: "Por pessoa", total: "Total" }} onSave={(v) => saveVar("pricingType", v)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.localizacao as string) || ""} onSave={(v) => saveVar("localizacao", v)} placeholder="—" inputClassName="w-28" />
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

function DroneRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onDelete?: (id: string) => void;
  isSelected?: boolean; onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };
  const linkSupplier = useSupplierLink();

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium max-w-[200px]">
        <button className="hover:underline cursor-pointer text-left truncate block w-full" onClick={() => onEdit?.(product)} title={product.name}>{product.name}</button>
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
        <SupplierCombobox supplierId={product.supplier_id} supplierName={(vars.empresa as string) || (vars.responsavel as string) || ""} onSelect={(s) => linkSupplier(product, s, onUpdate)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
      </td>
      <td className="p-3">
        <Select value={(vars.pricingType as string) || "total"} onValueChange={(v) => saveVar("pricingType", v)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="por_pessoa">Valor por pessoa</SelectItem>
            <SelectItem value="total">Valor total</SelectItem>
          </SelectContent>
        </Select>
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

function TransferRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onDelete?: (id: string) => void;
  isSelected?: boolean; onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };
  const linkSupplier = useSupplierLink();

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium max-w-[200px]">
        <button className="hover:underline cursor-pointer text-left truncate block w-full" onClick={() => onEdit?.(product)} title={product.name}>{product.name}</button>
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
        <SupplierCombobox supplierId={product.supplier_id} supplierName={(vars.empresa as string) || (vars.responsavel as string) || ""} onSelect={(s) => linkSupplier(product, s, onUpdate)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
      </td>
      <td className="p-3">
        <Select value={(vars.pricingType as string) || "total"} onValueChange={(v) => saveVar("pricingType", v)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="por_pessoa">Valor por pessoa</SelectItem>
            <SelectItem value="total">Valor total</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.limitePessoas as number) || 0} onSave={(v) => saveVar("limitePessoas", v)} suffix="" inputClassName="w-16" />
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

function StandardServiceRow({
  product, onUpdate, onEdit, onDelete, isSelected, onToggle,
}: {
  product: Product; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onDelete?: (id: string) => void;
  isSelected?: boolean; onToggle?: () => void;
}) {
  const vars = (product.variables || {}) as Record<string, unknown>;
  const saveVar = (key: string, val: unknown) => {
    onUpdate({ id: product.id, variables: { ...vars, [key]: val } });
  };
  const linkSupplier = useSupplierLink();

  return (
    <tr className={`border-t border-border hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {onToggle && (
        <td className="p-3 w-10"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      )}
      <td className="p-3"><ProductImageCell product={product} /></td>
      <td className="p-3 font-medium max-w-[200px]">
        <button className="hover:underline cursor-pointer text-left truncate block w-full" onClick={() => onEdit?.(product)} title={product.name}>{product.name}</button>
      </td>      <td className="p-3">
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
        <SupplierCombobox supplierId={product.supplier_id} supplierName={(vars.empresa as string) || (vars.responsavel as string) || ""} onSelect={(s) => linkSupplier(product, s, onUpdate)} />
      </td>
      <td className="p-3">
        <InlineText value={(vars.responsavel as string) || ""} onSave={(v) => saveVar("responsavel", v)} placeholder="—" inputClassName="w-24" />
      </td>
      <td className="p-3">
        <InlineText value={(vars.telefone as string) || ""} onSave={(v) => saveVar("telefone", v)} placeholder="—" inputClassName="w-28" />
      </td>
      <td className="p-3">
        <InlineNumber value={(vars.comissao as number) || 0} onSave={(v) => saveVar("comissao", v)} suffix="%" inputClassName="w-16" />
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

const LANCHE_DEFS: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região" },
  { label: "Subcategoria" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Tipo Preço", sortKey: "_pricingType", valueExtractor: (r: any) => (r.variables?.pricingType as string) || "por_pessoa", labelMap: { por_pessoa: "Por pessoa", total: "Total" } },
  { label: "Ponto de Coleta", sortKey: "_pontoColeta", valueExtractor: (r: any) => (r.variables?.pontoColeta as string) || "" },
  { label: "Entrega (R$)", sortKey: "_entrega", valueExtractor: (r: any) => (r.variables?.entrega as number) || 0 },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];
const GASTRO_DEFS: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região" },
  { label: "Subcategoria" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Tipo Preço", sortKey: "_pricingType", valueExtractor: (r: any) => (r.variables?.pricingType as string) || "por_pessoa", labelMap: { por_pessoa: "Por pessoa", total: "Total" } },
  { label: "Localização", sortKey: "_localizacao", valueExtractor: (r: any) => (r.variables?.localizacao as string) || "" },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];
const DRONE_DEFS: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região" },
  { label: "Subcategoria" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Tipo Preço", sortKey: "_pricingType", valueExtractor: (r: any) => (r.variables?.pricingType as string) || "total", labelMap: { por_pessoa: "Por pessoa", total: "Total" } },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];
const TRANSFER_DEFS: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região" },
  { label: "Subcategoria" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Tipo Preço", sortKey: "_pricingType", valueExtractor: (r: any) => (r.variables?.pricingType as string) || "total", labelMap: { por_pessoa: "Por pessoa", total: "Total" } },
  { label: "Limite Pessoas", sortKey: "_limitPeople", valueExtractor: (r: any) => (r.variables?.limitPeople as number) || (r.variables?.limitePessoas as number) || 0 },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];
const STANDARD_DEFS: ColumnDef[] = [
  { label: "Fotos" },
  { label: "Nome", sortKey: "name" },
  { label: "Região" },
  { label: "Subcategoria" },
  { label: "Empresa", sortKey: "_empresa", valueExtractor: (r: any) => (r.variables?.empresa as string) || "" },
  { label: "Contato", sortKey: "_responsavel", valueExtractor: (r: any) => (r.variables?.responsavel as string) || "" },
  { label: "Telefone", sortKey: "_telefone", valueExtractor: (r: any) => (r.variables?.telefone as string) || "" },
  { label: "Comissão (%)", sortKey: "_comissao", valueExtractor: (r: any) => (r.variables?.comissao as number) || 0 },
  { label: "Custo (R$)", sortKey: "cost_price" },
  { label: "Venda (R$)", sortKey: "unit_price" },
  { label: "Visibilidade", sortKey: "is_active", labelMap: { true: "Público", false: "Oculto" } },
];

const subCategories = [
  { key: "lanche", label: "Lanche de Trilha" },
  { key: "gastronomia", label: "Gastronomia" },
  { key: "drone", label: "Registro Drone" },
  { key: "transfer", label: "Transfer" },
  { key: "especial", label: "Especial" },
];

export default function ServiceTab({
  products, isLoading, onUpdate, onEdit, onSubChange, onDelete, selectedIds, onToggleRow, onToggleAll,
}: {
  products: Product[]; isLoading: boolean; onUpdate: (d: UpdatePayload) => void; onEdit?: (p: Product) => void; onSubChange?: (sub: string) => void; onDelete?: (id: string) => void;
  selectedIds?: Set<string>; onToggleRow?: (id: string) => void; onToggleAll?: (ids: string[]) => void;
}) {
  const [sub, setSub] = useState("lanche");
  const lancheFilter = useSmartFilters();
  const gastroFilter = useSmartFilters();
  const droneFilter = useSmartFilters();
  const transferFilter = useSmartFilters();
  const especialFilter = useSmartFilters();

  const handleSubChange = (v: string) => {
    setSub(v);
    onSubChange?.(v);
  };

  const defsMap: Record<string, ColumnDef[]> = { lanche: LANCHE_DEFS, gastronomia: GASTRO_DEFS, drone: DRONE_DEFS, transfer: TRANSFER_DEFS, especial: STANDARD_DEFS };
  const getFiltered = (key: string, fs: ReturnType<typeof useSmartFilters>) => fs.applyFilters(
    products.filter((p) => {
      const vars = (p.variables || {}) as Record<string, unknown>;
      return (vars.service_type === key) || (p.category === key);
    }), 
    buildExtractors(defsMap[key] || STANDARD_DEFS)
  );

  const counts = subCategories.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = products.filter((p) => {
      const vars = (p.variables || {}) as Record<string, unknown>;
      return (vars.service_type === c.key) || (p.category === c.key);
    }).length;
    return acc;
  }, {});

  const makeRowProps = (p: Product) => ({
    isSelected: selectedIds?.has(p.id),
    onToggle: onToggleRow ? () => onToggleRow(p.id) : undefined,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
      <div className="shrink-0 px-6 py-3 border-b border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl w-fit overflow-x-auto no-scrollbar">
          {subCategories.map((c) => (
            <button
              key={c.key}
              onClick={() => handleSubChange(c.key)}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                sub === c.key
                ? "bg-white text-primary shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
              }`}
            >
              {c.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sub === c.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {counts[c.key] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {sub === "lanche" && (
          <ProductTable
            products={getFiltered("lanche", lancheFilter)}
            columnDefs={LANCHE_DEFS}
            filterState={lancheFilter}
            selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll}
            renderRow={(p) => <LancheRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} {...makeRowProps(p)} />}
            isLoading={isLoading}
          />
        )}

        {sub === "gastronomia" && (
          <ProductTable
            products={getFiltered("gastronomia", gastroFilter)}
            columnDefs={GASTRO_DEFS}
            filterState={gastroFilter}
            selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll}
            renderRow={(p) => <GastronomiaRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} {...makeRowProps(p)} />}
            isLoading={isLoading}
          />
        )}

        {sub === "drone" && (
          <ProductTable
            products={getFiltered("drone", droneFilter)}
            columnDefs={DRONE_DEFS}
            filterState={droneFilter}
            selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll}
            renderRow={(p) => <DroneRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} {...makeRowProps(p)} />}
            isLoading={isLoading}
          />
        )}

        {sub === "transfer" && (
          <ProductTable
            products={getFiltered("transfer", transferFilter)}
            columnDefs={TRANSFER_DEFS}
            filterState={transferFilter}
            selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll}
            renderRow={(p) => <TransferRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} {...makeRowProps(p)} />}
            isLoading={isLoading}
          />
        )}

        {sub === "especial" && (
          <ProductTable
            products={getFiltered("especial", especialFilter)}
            columnDefs={STANDARD_DEFS}
            filterState={especialFilter}
            selectedIds={selectedIds} onToggleRow={onToggleRow} onToggleAll={onToggleAll}
            renderRow={(p) => <StandardServiceRow key={p.id} product={p} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} {...makeRowProps(p)} />}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
