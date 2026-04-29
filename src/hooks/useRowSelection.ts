import { useState, useCallback, useMemo } from "react";

export function useRowSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedIds(prev => {
      const allSelected = allIds.length > 0 && allIds.every(id => prev.has(id));
      if (allSelected) return new Set<string>();
      return new Set(allIds);
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const count = selectedIds.size;
  const hasSelection = count > 0;

  return { selectedIds, toggle, toggleAll, clear, isSelected, count, hasSelection };
}
