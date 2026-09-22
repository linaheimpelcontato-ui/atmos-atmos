import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Upload, RefreshCw, Plus, Users, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProspectColumnSettings } from "./ProspectColumnSettings";
import { type ColumnKey } from "./shared";

interface ProspectFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
  onNewProspect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onExport: () => void;
  onImport: () => void;
  visibleColumns: ColumnKey[];
  onVisibleColumnsChange: (cols: ColumnKey[]) => void;
}

export function ProspectFilters({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  counts,
  onNewProspect,
  onSync,
  isSyncing,
  onExport,
  onImport,
  visibleColumns,
  onVisibleColumnsChange,
}: ProspectFiltersProps) {
  return (
    <div className="flex flex-col gap-6 py-8 px-8 border-b border-admin-border/40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 scroll-smooth">
          {["geral", "b2c", "b2b"].map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`flex items-center gap-3 px-6 h-11 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap group ${
                activeTab === t 
                ? "bg-admin-primary text-white shadow-lg shadow-admin-primary/10" 
                : "text-muted-foreground/60 hover:bg-admin-muted hover:text-admin-primary"
              }`}
            >
              {t === "geral" ? "Geral" : t.toUpperCase()}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === t 
                ? "bg-white/20 text-white" 
                : "bg-admin-muted text-muted-foreground group-hover:bg-admin-border"
              }`}>
                {counts[t] || 0}
              </span>
            </button>
          ))}
        </div>


      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
          <Input 
            placeholder="Pesquisar por nome, email, telefone ou cidade..." 
            className="pl-11 h-13 bg-white border-admin-border/60 rounded-2xl focus:ring-4 focus:ring-admin-primary/5 transition-all text-sm font-bold shadow-sm"
            value={search} 
            onChange={(e) => onSearchChange(e.target.value)} 
          />
        </div>

        <div className="flex items-center bg-white border border-admin-border/60 rounded-2xl overflow-hidden shadow-sm p-1">
          <ProspectColumnSettings 
            visibleColumns={visibleColumns} 
            onChange={onVisibleColumnsChange} 
            activeTab={activeTab}
          />
          <div className="w-px h-8 bg-admin-border/20 mx-1" />
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-r border-admin-border/10 rounded-none"
            onClick={onExport}
            title="Exportar Excel (.xlsx) com as colunas e filtros atuais"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-r border-admin-border/10 rounded-none"
            onClick={onImport}
            title="Importar Excel"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest rounded-l-none"
            onClick={onSync}
            disabled={isSyncing}
            title="Atualizar lista de clientes"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-admin-primary" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
