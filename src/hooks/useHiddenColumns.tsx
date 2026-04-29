import { useState, useCallback, useEffect, useMemo } from "react";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ColumnInfo {
  key: string;
  label: string;
}

export function useHiddenColumns(storageKey: string) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return new Set(JSON.parse(stored));
    } catch { /* ignore */ }
    return new Set<string>();
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...hiddenColumns]));
  }, [hiddenColumns, storageKey]);

  const hideColumn = useCallback((key: string) => {
    setHiddenColumns(prev => new Set([...prev, key]));
  }, []);

  const showColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setHiddenColumns(new Set());
  }, []);

  const isHidden = useCallback((key: string) => hiddenColumns.has(key), [hiddenColumns]);

  return { hiddenColumns, hideColumn, showColumn, showAll, isHidden, count: hiddenColumns.size };
}

/** Button that shows a popover to restore hidden columns */
export function HiddenColumnsButton({
  columns,
  hiddenColumns,
  showColumn,
  showAll,
}: {
  columns: ColumnInfo[];
  hiddenColumns: Set<string>;
  showColumn: (key: string) => void;
  showAll: () => void;
}) {
  const hiddenList = useMemo(
    () => columns.filter(c => hiddenColumns.has(c.key)),
    [columns, hiddenColumns],
  );

  if (hiddenList.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
          <EyeOff className="h-3.5 w-3.5" />
          {hiddenList.length} oculta{hiddenList.length > 1 ? "s" : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">Colunas ocultas</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {hiddenList.map(col => (
            <label key={col.key} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors">
              <Checkbox checked={false} onCheckedChange={() => showColumn(col.key)} />
              <span className="text-xs">{col.label}</span>
            </label>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onClick={showAll}>
          <Eye className="h-3 w-3 mr-1" /> Mostrar todas
        </Button>
      </PopoverContent>
    </Popover>
  );
}
