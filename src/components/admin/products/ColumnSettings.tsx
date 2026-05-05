import React from "react";
import { Settings2, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_COLUMNS, type ColumnKey } from "./shared";

interface ColumnSettingsProps {
  visibleColumns: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

export function ColumnSettings({ visibleColumns, onChange }: ColumnSettingsProps) {
  const toggleColumn = (key: ColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) {
        onChange(visibleColumns.filter((c) => c !== key));
      }
    } else {
      onChange([...visibleColumns, key]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-12 px-4 rounded-xl border-admin-border/60 hover:bg-admin-muted hover:text-admin-primary transition-all flex gap-2 font-bold uppercase tracking-widest text-[10px]"
          title="Configurar Colunas"
        >
          <Settings2 className="h-4 w-4" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-white border-none shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200" align="end">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-admin-primary">Visibilidade</h4>
            <p className="text-[10px] text-muted-foreground font-medium">Escolha quais informações deseja ver na tabela.</p>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {ALL_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-admin-muted/50 cursor-pointer transition-colors group"
              >
                <Checkbox
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="border-admin-border data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                />
                <span className="text-xs font-bold text-admin-primary group-hover:text-black transition-colors">
                  {col.label}
                </span>
                {visibleColumns.includes(col.key) && (
                  <Check className="h-3 w-3 text-admin-primary ml-auto opacity-40" />
                )}
              </label>
            ))}
          </div>
          
          <div className="pt-2 border-t border-admin-border/50">
            <p className="text-[9px] text-center text-muted-foreground italic font-medium">
              As preferências são salvas automaticamente.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
