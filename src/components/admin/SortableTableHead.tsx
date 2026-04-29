import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc" | null;

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ label, sortKey, currentSortKey, currentSortDir, onSort, className }: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/70 transition-colors", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1 whitespace-nowrap">
        {label}
        {isActive && currentSortDir === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
        {isActive && currentSortDir === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
        {!isActive && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
      </span>
    </TableHead>
  );
}

// For plain <th> based tables (non-shadcn)
export function SortableTh({ label, sortKey, currentSortKey, currentSortDir, onSort, className }: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  return (
    <th
      className={cn("text-left p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:bg-muted/70 transition-colors", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && currentSortDir === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
        {isActive && currentSortDir === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
        {!isActive && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
      </span>
    </th>
  );
}

export function useSortState() {
  // Returns a cycle function: null → asc → desc → null
  const cycle = (currentKey: string | null, currentDir: SortDir, newKey: string): { key: string | null; dir: SortDir } => {
    if (currentKey !== newKey) return { key: newKey, dir: "asc" };
    if (currentDir === "asc") return { key: newKey, dir: "desc" };
    return { key: null, dir: null };
  };
  return { cycle };
}

// Generic sort function for arrays
export function sortData<T>(data: T[], sortKey: string | null, sortDir: SortDir): T[] {
  if (!sortKey || !sortDir) return data;
  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortKey];
    const bv = (b as Record<string, unknown>)[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv), "pt-BR", { sensitivity: "base" });
    }
    return sortDir === "desc" ? -cmp : cmp;
  });
}
