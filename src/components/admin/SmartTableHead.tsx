import { useState, useMemo, useCallback, useRef, useEffect, CSSProperties } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Search, GripVertical, EyeOff } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableHead } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc" | null;

export type SmartFilters = Record<string, Set<string>>;

export interface SmartFilterState {
  sortKey: string | null;
  sortDir: SortDir;
  filters: SmartFilters;
  handleSort: (key: string, dir: SortDir) => void;
  setColumnFilter: (key: string, values: Set<string>) => void;
  clearColumnFilter: (key: string) => void;
  clearAll: () => void;
  applyFilters: <T>(data: T[], valueExtractors?: Record<string, (row: T) => unknown>) => T[];
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useSmartFilters(): SmartFilterState {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<SmartFilters>({});

  const handleSort = useCallback((key: string, dir: SortDir) => {
    if (dir === null) {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortKey(key);
      setSortDir(dir);
    }
  }, []);

  const setColumnFilter = useCallback((key: string, values: Set<string>) => {
    setFilters(prev => {
      const next = { ...prev };
      if (values.size === 0) {
        delete next[key];
      } else {
        next[key] = values;
      }
      return next;
    });
  }, []);

  const clearColumnFilter = useCallback((key: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSortKey(null);
    setSortDir(null);
    setFilters({});
  }, []);

  const applyFilters = useCallback(<T,>(
    data: T[],
    valueExtractors?: Record<string, (row: T) => unknown>,
  ): T[] => {
    let result = data;

    // Apply column filters
    const activeFilters = Object.entries(filters);
    if (activeFilters.length > 0) {
      result = result.filter(row => {
        return activeFilters.every(([key, allowedValues]) => {
          const extractor = valueExtractors?.[key];
          const rawVal = extractor ? extractor(row) : (row as Record<string, unknown>)[key];
          const strVal = rawVal == null ? "" : String(rawVal);
          return allowedValues.has(strVal);
        });
      });
    }

    // Apply sort
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const extractor = valueExtractors?.[sortKey];
        const av = extractor ? extractor(a) : (a as Record<string, unknown>)[sortKey];
        const bv = extractor ? extractor(b) : (b as Record<string, unknown>)[sortKey];
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

    return result;
  }, [filters, sortKey, sortDir]);

  return { sortKey, sortDir, filters, handleSort, setColumnFilter, clearColumnFilter, clearAll, applyFilters };
}

// ─── Shared Popover Content ─────────────────────────────────────────

interface SmartHeadProps {
  label: string;
  sortKey: string;
  filterState: SmartFilterState;
  /** Raw data array to extract unique values from */
  data: unknown[];
  /** Function to extract the column value from a row */
  valueExtractor?: (row: unknown) => unknown;
  /** Map raw values to display labels */
  labelMap?: Record<string, string>;
  className?: string;
  /** Callback to hide this column */
  onHide?: () => void;
}

function SmartFilterPopover({
  sortKey,
  label,
  filterState,
  data,
  valueExtractor,
  labelMap,
  children,
}: SmartHeadProps & { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isNumeric = useMemo(() => {
    let numCount = 0, total = 0;
    data.forEach(row => {
      const v = valueExtractor ? valueExtractor(row) : (row as Record<string, unknown>)[sortKey];
      if (v != null) { total++; if (typeof v === "number") numCount++; }
    });
    return total > 0 && numCount / total > 0.5;
  }, [data, sortKey, valueExtractor]);
  const ascLabel = isNumeric ? "Ordenar Crescente" : "Ordenar A → Z";
  const descLabel = isNumeric ? "Ordenar Decrescente" : "Ordenar Z → A";

  const isActiveSort = filterState.sortKey === sortKey;
  const activeFilterValues = filterState.filters[sortKey];
  const hasActiveFilter = !!activeFilterValues && activeFilterValues.size > 0;

  // Extract unique values
  const uniqueValues = useMemo(() => {
    const valSet = new Map<string, string>(); // strVal → displayLabel
    data.forEach((row) => {
      const rawVal = valueExtractor
        ? valueExtractor(row)
        : (row as Record<string, unknown>)[sortKey];
      const strVal = rawVal == null ? "" : String(rawVal);
      if (!valSet.has(strVal)) {
        const display = labelMap?.[strVal] || (strVal === "" ? "(vazio)" : strVal);
        valSet.set(strVal, display);
      }
    });
    return Array.from(valSet.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "pt-BR", { sensitivity: "base" }));
  }, [data, sortKey, valueExtractor, labelMap]);

  // Sync local state when popover opens
  useEffect(() => {
    if (open) {
      setLocalSelected(new Set(activeFilterValues || []));
      setSearchTerm("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, activeFilterValues]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const q = searchTerm.toLowerCase();
    return uniqueValues.filter(([, display]) => display.toLowerCase().includes(q));
  }, [uniqueValues, searchTerm]);

  const allSelected = filteredValues.length > 0 && filteredValues.every(([val]) => localSelected.has(val));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(localSelected);
      filteredValues.forEach(([val]) => next.delete(val));
      setLocalSelected(next);
    } else {
      const next = new Set(localSelected);
      filteredValues.forEach(([val]) => next.add(val));
      setLocalSelected(next);
    }
  };

  const toggleOne = (val: string) => {
    const next = new Set(localSelected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setLocalSelected(next);
  };

  const applyFilter = () => {
    filterState.setColumnFilter(sortKey, localSelected);
    setOpen(false);
  };

  const clearFilter = () => {
    filterState.clearColumnFilter(sortKey);
    setLocalSelected(new Set());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        {/* Sort section */}
        <div className="p-2 space-y-0.5">
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
              isActiveSort && filterState.sortDir === "asc" && "bg-muted font-medium"
            )}
            onClick={() => {
              filterState.handleSort(sortKey, isActiveSort && filterState.sortDir === "asc" ? null : "asc");
            }}
          >
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
            {ascLabel}
          </button>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
              isActiveSort && filterState.sortDir === "desc" && "bg-muted font-medium"
            )}
            onClick={() => {
              filterState.handleSort(sortKey, isActiveSort && filterState.sortDir === "desc" ? null : "desc");
            }}
          >
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
            {descLabel}
          </button>
          {isActiveSort && (
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => filterState.handleSort(sortKey, null)}
            >
              <X className="h-3.5 w-3.5" />
              Limpar ordenação
            </button>
          )}
        </div>

        <Separator />

        {/* Filter section */}
        <div className="p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>

          {/* Select all */}
          <label className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors mb-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs font-medium text-foreground">Selecionar todos</span>
          </label>

          {/* Values list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredValues.map(([val, display]) => (
              <label
                key={val}
                className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={localSelected.has(val)}
                  onCheckedChange={() => toggleOne(val)}
                />
                <span className="text-xs text-foreground truncate">{display}</span>
              </label>
            ))}
            {filteredValues.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum valor encontrado</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-2 flex gap-2">
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-muted-foreground" onClick={clearFilter}>
              Limpar filtro
            </Button>
          )}
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyFilter}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Sort icon helper ───────────────────────────────────────────────

function SortIcon({ sortKey: colKey, filterState }: { sortKey: string; filterState: SmartFilterState }) {
  const isActive = filterState.sortKey === colKey;
  if (isActive && filterState.sortDir === "asc") return <ArrowUp className="h-3 w-3 text-primary" />;
  if (isActive && filterState.sortDir === "desc") return <ArrowDown className="h-3 w-3 text-primary" />;
  return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
}

function FilterIndicator({ sortKey: colKey, filterState }: { sortKey: string; filterState: SmartFilterState }) {
  const activeFilter = filterState.filters[colKey];
  if (!activeFilter || activeFilter.size === 0) return null;
  return (
    <Badge variant="default" className="h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground leading-none">
      {activeFilter.size}
    </Badge>
  );
}

// ─── SmartTableHead (shadcn <TableHead>) ────────────────────────────

export function SmartTableHead({
  label,
  sortKey,
  filterState,
  data,
  valueExtractor,
  labelMap,
  className,
  onHide,
}: SmartHeadProps) {
  return (
    <SmartFilterPopover
      label={label}
      sortKey={sortKey}
      filterState={filterState}
      data={data}
      valueExtractor={valueExtractor}
      labelMap={labelMap}
    >
      <TableHead
        className={cn("cursor-pointer select-none hover:bg-muted/70 transition-colors group/th text-[10px] font-black uppercase tracking-widest text-muted-foreground/60", className)}
      >
        <span className="flex items-center gap-1 whitespace-nowrap">
          {label}
          <SortIcon sortKey={sortKey} filterState={filterState} />
          <FilterIndicator sortKey={sortKey} filterState={filterState} />
          {onHide && (
            <button
              className="opacity-0 group-hover/th:opacity-60 hover:!opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onHide(); }}
              title="Ocultar coluna"
            >
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </span>
      </TableHead>
    </SmartFilterPopover>
  );
}

// ─── SmartTh (plain <th>) ───────────────────────────────────────────

export function SmartTh({
  label,
  sortKey,
  filterState,
  data,
  valueExtractor,
  labelMap,
  className,
  onHide,
}: SmartHeadProps) {
  if (!filterState) return <th className={className}>{label}</th>;
  return (
    <SmartFilterPopover
      label={label}
      sortKey={sortKey}
      filterState={filterState}
      data={data}
      valueExtractor={valueExtractor}
      labelMap={labelMap}
    >
      <th
        className={cn(
          "text-left p-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground/60 whitespace-nowrap cursor-pointer select-none hover:bg-muted/70 transition-colors group/th",
          className
        )}
      >
        <span className="flex items-center gap-1">
          {label}
          <SortIcon sortKey={sortKey} filterState={filterState} />
          <FilterIndicator sortKey={sortKey} filterState={filterState} />
          {onHide && (
            <button
              className="opacity-0 group-hover/th:opacity-60 hover:!opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onHide(); }}
              title="Ocultar coluna"
            >
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </span>
      </th>
    </SmartFilterPopover>
  );
}

// ─── SortableSmartTableHead (drag-and-drop + smart filter) ──────────

interface SortableSmartHeadProps extends SmartHeadProps {
  id: string;
  onHide?: () => void;
}

export function SortableSmartTableHead({
  id,
  label,
  sortKey,
  filterState,
  data,
  valueExtractor,
  labelMap,
  className,
  onHide,
}: SortableSmartHeadProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };

  // Inline popover state
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isNumericSortable = useMemo(() => {
    let numCount = 0, total = 0;
    data.forEach(row => {
      const v = valueExtractor ? valueExtractor(row) : (row as Record<string, unknown>)[sortKey];
      if (v != null) { total++; if (typeof v === "number") numCount++; }
    });
    return total > 0 && numCount / total > 0.5;
  }, [data, sortKey, valueExtractor]);
  const ascLabelS = isNumericSortable ? "Ordenar Crescente" : "Ordenar A → Z";
  const descLabelS = isNumericSortable ? "Ordenar Decrescente" : "Ordenar Z → A";

  const isActiveSort = filterState.sortKey === sortKey;
  const activeFilterValues = filterState.filters[sortKey];
  const hasActiveFilter = !!activeFilterValues && activeFilterValues.size > 0;

  const uniqueValues = useMemo(() => {
    const valSet = new Map<string, string>();
    data.forEach((row) => {
      const rawVal = valueExtractor ? valueExtractor(row) : (row as Record<string, unknown>)[sortKey];
      const strVal = rawVal == null ? "" : String(rawVal);
      if (!valSet.has(strVal)) {
        const display = labelMap?.[strVal] || (strVal === "" ? "(vazio)" : strVal);
        valSet.set(strVal, display);
      }
    });
    return Array.from(valSet.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "pt-BR", { sensitivity: "base" }));
  }, [data, sortKey, valueExtractor, labelMap]);

  useEffect(() => {
    if (open) {
      setLocalSelected(new Set(activeFilterValues || []));
      setSearchTerm("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, activeFilterValues]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const q = searchTerm.toLowerCase();
    return uniqueValues.filter(([, display]) => display.toLowerCase().includes(q));
  }, [uniqueValues, searchTerm]);

  const allSelected = filteredValues.length > 0 && filteredValues.every(([val]) => localSelected.has(val));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(localSelected);
      filteredValues.forEach(([val]) => next.delete(val));
      setLocalSelected(next);
    } else {
      const next = new Set(localSelected);
      filteredValues.forEach(([val]) => next.add(val));
      setLocalSelected(next);
    }
  };

  const toggleOne = (val: string) => {
    const next = new Set(localSelected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setLocalSelected(next);
  };

  const applyFilter = () => {
    filterState.setColumnFilter(sortKey, localSelected);
    setOpen(false);
  };

  const clearFilter = () => {
    filterState.clearColumnFilter(sortKey);
    setLocalSelected(new Set());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TableHead
        ref={setNodeRef}
        style={style}
        className={cn("select-none hover:bg-muted/70 transition-colors group/th text-[10px] font-black uppercase tracking-widest text-muted-foreground/60", className)}
      >
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span
            className="opacity-0 group-hover/th:opacity-60 cursor-grab active:cursor-grabbing shrink-0 touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              listeners?.onPointerDown?.(e as any);
            }}
          >
            <GripVertical className="h-3 w-3" />
          </span>
          <PopoverTrigger asChild>
            <span className="flex items-center gap-1 cursor-pointer">
              {label}
              <SortIcon sortKey={sortKey} filterState={filterState} />
              <FilterIndicator sortKey={sortKey} filterState={filterState} />
            </span>
          </PopoverTrigger>
          {onHide && (
            <button
              className="opacity-0 group-hover/th:opacity-60 hover:!opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onHide(); }}
              title="Ocultar coluna"
            >
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </span>
      </TableHead>
      <PopoverContent className="w-64 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="p-2 space-y-0.5">
          <button className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors", isActiveSort && filterState.sortDir === "asc" && "bg-muted font-medium")} onClick={() => filterState.handleSort(sortKey, isActiveSort && filterState.sortDir === "asc" ? null : "asc")}>
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" /> {ascLabelS}
          </button>
          <button className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors", isActiveSort && filterState.sortDir === "desc" && "bg-muted font-medium")} onClick={() => filterState.handleSort(sortKey, isActiveSort && filterState.sortDir === "desc" ? null : "desc")}>
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /> {descLabelS}
          </button>
          {isActiveSort && (
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors" onClick={() => filterState.handleSort(sortKey, null)}>
              <X className="h-3.5 w-3.5" /> Limpar ordenação
            </button>
          )}
        </div>
        <Separator />
        <div className="p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input ref={searchRef} placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-7 text-xs" />
          </div>
          <label className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors mb-1">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-xs font-medium text-foreground">Selecionar todos</span>
          </label>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredValues.map(([val, display]) => (
              <label key={val} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Checkbox checked={localSelected.has(val)} onCheckedChange={() => toggleOne(val)} />
                <span className="text-xs text-foreground truncate">{display}</span>
              </label>
            ))}
            {filteredValues.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum valor encontrado</p>}
          </div>
        </div>
        <Separator />
        <div className="p-2 flex gap-2">
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-muted-foreground" onClick={clearFilter}>Limpar filtro</Button>
          )}
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyFilter}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
