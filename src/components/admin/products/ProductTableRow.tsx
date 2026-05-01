import React from "react";
import { ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlinePrice } from "./shared";
import { type Product } from "./shared";

interface ProductTableRowProps {
  product: Product;
  selected: boolean;
  onToggle: (id: string) => void;
  onClick: (product: Product) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onToggleActive: (id: string, active: boolean) => void;
  getTypeLabel: (type: string) => string;
}

export function ProductTableRow({
  product: p,
  selected,
  onToggle,
  onClick,
  onUpdatePrice,
  onToggleActive,
  getTypeLabel
}: ProductTableRowProps) {
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
            className="border-admin-border data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-admin-muted border border-admin-border/50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-admin-primary/20 transition-all group-hover:scale-105">
            {p.variables && (p.variables as any).variations?.[0]?.media?.[0] ? (
              <img src={(p.variables as any).variations[0].media[0]} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-admin-primary truncate group-hover:text-black transition-colors leading-none mb-1">{p.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">
                {getTypeLabel(p.type)}
              </span>
              <span className="h-1 w-1 rounded-full bg-admin-border" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60 truncate">
                {p.category || "Geral"}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <InlinePrice
          value={p.unit_price}
          onSave={(v) => onUpdatePrice(p.id, v)}
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 overflow-hidden py-1">
            {((p.variables as any)?.variations || []).slice(0, 3).map((v: any, idx: number) => (
              <div key={idx} className="h-6 w-6 rounded-full border-2 border-white bg-admin-muted flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-admin-border/10">
                {v.media?.[0] ? <img src={v.media[0]} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-admin-muted" />}
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-admin-primary leading-none">
              {((p.variables as any)?.variations?.length || 0)}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight opacity-50">Opções</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <button 
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
            p.is_active 
            ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100" 
            : "bg-admin-muted/50 border-admin-border text-muted-foreground hover:bg-admin-muted"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(p.id, !p.is_active);
          }}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
          {p.is_active ? "Publicado" : "Rascunho"}
        </button>
      </td>
      <td className="px-6 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-admin-primary hover:text-white transition-all shadow-none"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
