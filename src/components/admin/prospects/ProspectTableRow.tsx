import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { type ColumnDef } from "./shared";

interface ProspectTableRowProps {
  prospect: any;
  stages: any[];
  selected: boolean;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  visibleColumns: ColumnDef[];
}

export function ProspectTableRow({
  prospect,
  stages,
  selected,
  onToggle,
  onClick,
  visibleColumns,
}: ProspectTableRowProps) {
  return (
    <TableRow 
      className={`group cursor-pointer h-20 border-b border-admin-border/40 transition-colors ${
        selected ? "bg-admin-primary/[0.02]" : "hover:bg-admin-primary/[0.03]"
      }`}
      onClick={() => onClick(prospect.id)}
    >
      <TableCell className="w-20 text-center p-0 align-middle" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={selected} 
            onCheckedChange={() => onToggle(prospect.id)} 
            className="rounded-lg border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary h-5 w-5"
          />
        </div>
      </TableCell>
      {visibleColumns.map(col => (
        <TableCell key={col.key} className="px-6 whitespace-nowrap align-middle">
          {col.render(prospect, stages)}
        </TableCell>
      ))}
    </TableRow>
  );
}
