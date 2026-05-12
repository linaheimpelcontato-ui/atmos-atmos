import React from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Search, X } from "lucide-react";
import { SmartTh, type SmartFilterState } from "@/components/admin/SmartTableHead";
import { type ColumnDef } from "./shared";

interface ProspectTableProps {
  prospects: any[];
  isLoading: boolean;
  filterState: SmartFilterState;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  columnDefs: ColumnDef[];
  renderRow: (p: any) => React.ReactNode;
}

export function ProspectTable({
  prospects,
  isLoading,
  filterState,
  selectedIds,
  onToggleRow,
  onToggleAll,
  columnDefs,
  renderRow,
}: ProspectTableProps) {
  const allIds = prospects.map(p => p.id);
  const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  return (
    <div className="flex-1 py-6 relative">
      {isLoading ? (
        <div className="py-32 text-center">
          <RefreshCw className="h-10 w-10 text-admin-primary/10 animate-spin mx-auto mb-6" />
          <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Carregando base de clientes...</p>
        </div>
      ) : prospects.length === 0 ? (
        <div className="py-32 text-center">
          <div className="w-20 h-20 bg-admin-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-admin-border/40">
              <TableRow className="hover:bg-transparent border-none h-20">
                <th className="p-0 w-20 text-center align-middle">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={() => onToggleAll(allIds)}
                      className="rounded-lg border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary h-5 w-5"
                    />
                  </div>
                </th>
                {columnDefs.map((col) => (
                  <SmartTh
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    filterState={filterState}
                    data={prospects}
                    valueExtractor={col.valueExtractor as any}
                    labelMap={col.labelMap}
                    className="px-6 py-5 whitespace-nowrap text-left"
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-admin-border/10">
              {prospects.map((p) => renderRow(p))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
