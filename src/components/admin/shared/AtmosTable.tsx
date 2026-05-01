import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, MoreHorizontal, Filter, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export interface AtmosColumn<T> {
  header: string;
  key: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
}

interface AtmosTableProps<T> {
  data: T[];
  columns: AtmosColumn<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  actions?: (item: T) => React.ReactNode;
}

export function AtmosTable<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick, 
  isLoading, 
  emptyMessage = "Nenhum registro encontrado.",
  searchPlaceholder = "Buscar...",
  onSearch,
  actions
}: AtmosTableProps<T>) {
  return (
    <div className="space-y-6">
      {(onSearch || searchPlaceholder) && (
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-admin-primary" />
            <Input 
              placeholder={searchPlaceholder} 
              onChange={(e) => onSearch?.(e.target.value)}
              className="pl-11 h-12 bg-white border-admin-border/60 rounded-2xl shadow-sm focus:ring-4 focus:ring-admin-primary/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" className="h-12 rounded-2xl border-admin-border/60 px-5 gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-admin-primary">
               <Filter className="h-4 w-4" />
               Filtros
             </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-admin-border/50 shadow-xl shadow-black/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-admin-border/40 bg-admin-muted/10">
                {columns.map((col) => (
                  <th 
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40`}
                  >
                    <div className={`flex items-center gap-2 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                      {col.header}
                      {col.sortable && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </th>
                ))}
                {actions && <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/30">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      {columns.map((_, j) => (
                        <td key={`cell-${i}-${j}`} className="px-8 py-6">
                          <div className="h-4 bg-admin-muted rounded-full w-2/3" />
                        </td>
                      ))}
                      {actions && <td className="px-8 py-6"><div className="h-4 bg-admin-muted rounded-full w-8 ml-auto" /></td>}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-admin-muted flex items-center justify-center text-admin-primary/20">
                          <Search className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-admin-primary/30 uppercase tracking-widest">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => onRowClick?.(item)}
                      className={`group hover:bg-admin-primary/[0.02] transition-all cursor-pointer`}
                    >
                      {columns.map((col) => (
                        <td 
                          key={col.key}
                          className={`px-8 py-6 text-[13.5px] font-semibold text-admin-primary/80 transition-colors group-hover:text-admin-primary ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                        >
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </td>
                      ))}
                      {actions && (
                        <td className="px-8 py-6 text-right">
                          <div onClick={(e) => e.stopPropagation()}>
                            {actions(item)}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="px-8 py-6 bg-admin-muted/10 border-t border-admin-border/30 flex items-center justify-between">
           <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
             Mostrando <span className="text-admin-primary">{data.length}</span> registros
           </p>
           <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white border border-transparent hover:border-admin-border/60 transition-all">
               <ChevronLeft className="h-4 w-4" />
             </Button>
             <div className="h-9 w-9 rounded-xl bg-admin-primary text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-admin-primary/20">
               1
             </div>
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white border border-transparent hover:border-admin-border/60 transition-all">
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
