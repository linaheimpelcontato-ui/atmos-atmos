import React from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlinePrice, getProductRegion } from "./shared";
import { type Product, type ColumnKey } from "./shared";

interface ProductTableRowProps {
  product: Product;
  selected: boolean;
  visibleColumns: ColumnKey[];
  onToggle: (id: string) => void;
  onClick: (product: Product) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  getTypeLabel: (type: string) => string;
}

export function ProductTableRow({
  product: p,
  selected,
  visibleColumns,
  onToggle,
  onClick,
  onUpdatePrice,
  onToggleActive,
  onDelete,
  getTypeLabel
}: ProductTableRowProps) {
  const vars = (p.variables || {}) as Record<string, any>;

  const renderCell = (key: ColumnKey) => {
    switch (key) {
      case "name":
        return (
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="h-10 w-10 rounded-xl bg-admin-muted border border-admin-border/50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-admin-primary/20 transition-all group-hover:scale-105">
              {p.variables && (p.variables as any).variations?.[0]?.media?.[0] ? (
                <img src={(p.variables as any).variations[0].media[0]} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-admin-primary truncate group-hover:text-black transition-colors leading-none mb-1 text-sm">{p.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">
                  {getTypeLabel(p.type)}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-admin-border" />
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider opacity-60 truncate">
                  {p.category || "Geral"}
                </span>
              </div>
            </div>
          </div>
        );
      case "price":
        return (
          <div className="min-w-[100px]">
            <InlinePrice value={p.unit_price} onSave={(v) => onUpdatePrice(p.id, v)} />
          </div>
        );
      case "cost_price":
        return <InlinePrice value={p.cost_price || 0} onSave={(v) => onUpdatePrice(p.id, v)} />;
      case "status":
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-400"}`} />
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActive(p.id, !p.is_active); }}
              className={`text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${p.is_active ? "text-green-600" : "text-red-400"}`}
            >
              {p.is_active ? "Ativo" : "Inativo"}
            </button>
          </div>
        );
      case "type":
        return <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(p.type)}</span>;
      case "category":
        return <span className="text-xs font-medium text-muted-foreground">{p.category || "-"}</span>;
      case "variations":
        const count = (p.variables as any)?.variations?.length || 0;
        return (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className={`text-xs font-bold ${count > 0 ? "text-admin-primary" : "text-muted-foreground/40"}`}>
              {count} {count === 1 ? "opção" : "opções"}
            </span>
          </div>
        );
      case "region":
        return <span className="text-xs font-medium text-muted-foreground">{getProductRegion(p) || "-"}</span>;
      case "empresa":
        return <span className="text-xs font-bold text-admin-primary">{vars.empresa || "-"}</span>;
      case "responsavel":
        return <span className="text-xs font-medium text-muted-foreground">{vars.responsavel || "-"}</span>;
      case "telefone":
        return <span className="text-xs font-medium text-muted-foreground tabular-nums">{vars.telefone || "-"}</span>;
      case "instagram":
        return <span className="text-xs font-medium text-admin-primary">@{vars.instagram || "-"}</span>;
      case "site":
        return <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{vars.site || "-"}</span>;
      case "capacity":
        return <span className="text-xs font-medium text-muted-foreground">{vars.total_capacity || "-"}</span>;
      case "rooms":
        return <span className="text-xs font-medium text-muted-foreground">{vars.total_rooms || "-"}</span>;
      case "notes":
        return <span className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">{vars.operational_notes || "-"}</span>;
      case "difficulty":
        return <span className="text-xs font-medium text-muted-foreground">{vars.difficulty || "-"}</span>;
      case "duration":
        return <span className="text-xs font-medium text-muted-foreground">{vars.duracao || "-"}</span>;
      case "seasonality":
        return <span className="text-xs font-medium text-muted-foreground">{vars.sazonalidade || "-"}</span>;
      case "distance_trail":
        return <span className="text-xs font-medium text-muted-foreground">{vars.distanceKm ? `${vars.distanceKm} km` : "-"}</span>;
      case "distance_car":
        return <span className="text-xs font-medium text-muted-foreground">{vars.distanceCarKm ? `${vars.distanceCarKm} km` : "-"}</span>;
      case "comissao":
        return <span className="text-xs font-bold text-orange-600">{vars.comissao ? `${vars.comissao}%` : "-"}</span>;
      case "cnpj":
        return <span className="text-xs font-medium text-muted-foreground tabular-nums">{vars.fiscal_cnpj || "-"}</span>;
      case "tax_rate":
        return <span className="text-xs font-medium text-muted-foreground">{vars.fiscal_tax_rate ? `${vars.fiscal_tax_rate}%` : "-"}</span>;
      case "seo_slug":
        return <span className="text-xs font-medium text-muted-foreground truncate max-w-[100px]">{vars.seo_slug || "-"}</span>;
      case "seo_title":
        return <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{vars.seo_title || "-"}</span>;
      case "id":
        return <span className="text-[10px] font-mono text-muted-foreground/40">{p.id.slice(0, 8)}</span>;
      default:
        return null;
    }
  };

  return (
    <tr 
      className="group hover:bg-admin-muted/40 transition-colors cursor-pointer border-b border-admin-border/10 last:border-0"
      onClick={() => onClick(p)}
    >
      <td className="px-6 py-4 w-14 align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(p.id)}
            className="border-admin-border data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary transition-all"
          />
        </div>
      </td>
      
      {visibleColumns.map((key) => (
        <td key={key} className="px-6 py-4">
          {renderCell(key)}
        </td>
      ))}

      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl hover:bg-admin-primary hover:text-white transition-all"
            onClick={() => onClick(p)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl hover:bg-red-500 hover:text-white transition-all"
            onClick={() => onDelete(p.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
