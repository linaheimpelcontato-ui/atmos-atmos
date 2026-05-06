import React from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  InlinePrice, InlineText, InlineNumber, InlineSelect,
  getProductRegion, regionLabels, difficultyLabels, seasonalityLabels 
} from "./shared";
import { type Product, type ColumnKey } from "./shared";

interface ProductTableRowProps {
  product: Product;
  selected: boolean;
  visibleColumns: ColumnKey[];
  onToggle: (id: string) => void;
  onClick: (product: Product) => void;
  onUpdateField: (id: string, field: keyof UpdatePayload, value: any) => void;
  onUpdateVariables: (id: string, vars: Record<string, any>) => void;
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
  onUpdateField,
  onUpdateVariables,
  onToggleActive,
  onDelete,
  getTypeLabel
}: ProductTableRowProps) {
  const vars = (p.variables || {}) as Record<string, any>;

  const renderCell = (key: ColumnKey) => {
    switch (key) {
      case "name":
        return (
          <div className="flex items-center gap-4 min-w-[250px]">
            <div className="h-10 w-10 rounded-xl bg-admin-muted border border-admin-border/50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-admin-primary/20 transition-all group-hover:scale-105">
              {p.variables && (p.variables as any).variations?.[0]?.media?.[0] ? (
                <img src={(p.variables as any).variations[0].media[0]} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <InlineText 
                value={p.name} 
                onSave={(v) => onUpdateField(p.id, "name", v)} 
                className="font-bold text-admin-primary group-hover:text-black transition-colors leading-none mb-1 text-sm p-0 hover:bg-transparent"
                inputClassName="w-full"
              />
              <div className="flex items-center gap-1.5 ml-2">
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
            <InlinePrice value={p.unit_price} onSave={(v) => onUpdateField(p.id, "unit_price", v)} />
          </div>
        );
      case "cost_price":
        return (
          <div className="min-w-[100px]">
            <InlinePrice value={p.cost_price || 0} onSave={(v) => onUpdateField(p.id, "cost_price", v)} />
          </div>
        );
      case "status":
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-400"}`} />
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateField(p.id, "is_active", !p.is_active); }}
              className={`text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${p.is_active ? "text-green-600" : "text-red-400"}`}
            >
              {p.is_active ? "Ativo" : "Inativo"}
            </button>
          </div>
        );
      case "type":
        return <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(p.type)}</span>;
      case "category":
        return <InlineText value={p.category || ""} onSave={(v) => onUpdateField(p.id, "category", v)} placeholder="Geral" />;
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
        return (
          <InlineSelect 
            value={vars.region || ""} 
            options={regionLabels} 
            onSave={(v) => onUpdateVariables(p.id, { region: v })} 
          />
        );
      case "empresa":
        return <InlineText value={vars.empresa || ""} onSave={(v) => onUpdateVariables(p.id, { empresa: v })} />;
      case "responsavel":
        return <InlineText value={vars.responsavel || ""} onSave={(v) => onUpdateVariables(p.id, { responsavel: v })} />;
      case "telefone":
        return <InlineText value={vars.telefone || ""} onSave={(v) => onUpdateVariables(p.id, { telefone: v })} />;
      case "instagram":
        return <InlineText value={vars.instagram || ""} onSave={(v) => onUpdateVariables(p.id, { instagram: v })} className="text-admin-primary" placeholder="@" />;
      case "site":
        return <InlineText value={vars.site || ""} onSave={(v) => onUpdateVariables(p.id, { site: v })} className="truncate max-w-[120px]" />;
      case "capacity":
        return <InlineNumber value={vars.total_capacity || 0} onSave={(v) => onUpdateVariables(p.id, { total_capacity: v })} />;
      case "rooms":
        return <InlineNumber value={vars.total_rooms || 0} onSave={(v) => onUpdateVariables(p.id, { total_rooms: v })} />;
      case "notes":
        return <InlineText value={vars.operational_notes || ""} onSave={(v) => onUpdateVariables(p.id, { operational_notes: v })} className="truncate max-w-[150px]" />;
      case "difficulty":
        return (
          <InlineSelect 
            value={vars.difficulty || ""} 
            options={difficultyLabels} 
            onSave={(v) => onUpdateVariables(p.id, { difficulty: v })} 
          />
        );
      case "duration":
        return <InlineText value={vars.duracao || ""} onSave={(v) => onUpdateVariables(p.id, { duracao: v })} />;
      case "seasonality":
        return (
          <InlineSelect 
            value={vars.sazonalidade || ""} 
            options={seasonalityLabels} 
            onSave={(v) => onUpdateVariables(p.id, { sazonalidade: v })} 
          />
        );
      case "distance_trail":
        return <InlineNumber value={vars.distanceKm || 0} onSave={(v) => onUpdateVariables(p.id, { distanceKm: v })} suffix=" km" />;
      case "distance_car":
        return <InlineNumber value={vars.distanceCarKm || 0} onSave={(v) => onUpdateVariables(p.id, { distanceCarKm: v })} suffix=" km" />;
      case "comissao":
        return <InlineNumber value={vars.comissao || 0} onSave={(v) => onUpdateVariables(p.id, { comissao: v })} suffix="%" />;
      case "cnpj":
        return <InlineText value={vars.fiscal_cnpj || ""} onSave={(v) => onUpdateVariables(p.id, { fiscal_cnpj: v })} />;
      case "tax_rate":
        return <InlineNumber value={vars.fiscal_tax_rate || 0} onSave={(v) => onUpdateVariables(p.id, { fiscal_tax_rate: v })} suffix="%" />;
      case "seo_slug":
        return <InlineText value={vars.seo_slug || ""} onSave={(v) => onUpdateVariables(p.id, { seo_slug: v })} className="truncate max-w-[100px]" />;
      case "seo_title":
        return <InlineText value={vars.seo_title || ""} onSave={(v) => onUpdateVariables(p.id, { seo_title: v })} className="truncate max-w-[120px]" />;
      case "pricing_type":
        return (
          <InlineSelect 
            value={vars.pricingType || "por_pessoa"} 
            options={{ por_pessoa: "Por Pessoa", total: "Valor Total" }} 
            onSave={(v) => onUpdateVariables(p.id, { pricingType: v })} 
          />
        );
      case "limit_pax":
        return <InlineNumber value={vars.limitPeople || 0} onSave={(v) => onUpdateVariables(p.id, { limitPeople: v })} />;
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
