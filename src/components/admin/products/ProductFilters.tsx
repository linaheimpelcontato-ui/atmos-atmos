import { Search, Plus, FolderPlus, RefreshCw, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { ColumnSettings } from "./ColumnSettings";
import { type ColumnKey } from "./shared";

interface ProductFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: string;
  onTabChange: (v: string) => void;
  allTypes: string[];
  getTypeLabel: (t: string) => string;
  counts: Record<string, number>;
  onNewCategory: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onExport: () => void;
  onImport: (file: File) => void;
  visibleColumns: ColumnKey[];
  onVisibleColumnsChange: (cols: ColumnKey[]) => void;
}

export function ProductFilters({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  allTypes,
  getTypeLabel,
  counts,
  onNewCategory,
  onSync,
  isSyncing,
  onExport,
  onImport,
  visibleColumns,
  onVisibleColumnsChange,
}: ProductFiltersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6 py-8 border-b border-admin-border/40">
      {/* Top Line: Categories and Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 scroll-smooth">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap group ${
                activeTab === t 
                ? "bg-admin-primary text-white shadow-lg shadow-admin-primary/10" 
                : "text-muted-foreground/60 hover:bg-admin-muted hover:text-admin-primary"
              }`}
            >
              {getTypeLabel(t)}
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

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onNewCategory}
          className="h-10 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-admin-primary hover:bg-admin-muted rounded-xl gap-2 shrink-0 border border-transparent hover:border-admin-border/40"
        >
          <FolderPlus className="h-4 w-4" />
          Gerenciar Categorias
        </Button>
      </div>

      {/* Bottom Line: Search and Actions */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
          <Input 
            placeholder="Pesquisar catálogo por nome, subcategoria ou pasta..." 
            className="pl-11 h-13 bg-white border-admin-border/60 rounded-2xl focus:ring-4 focus:ring-admin-primary/5 transition-all text-sm font-medium shadow-sm"
            value={search} 
            onChange={(e) => onSearchChange(e.target.value)} 
          />
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".xlsx, .xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImport(file);
              e.target.value = ''; // Reset for same file re-upload
            }
          }}
        />

        <div className="flex items-center bg-white border border-admin-border/60 rounded-2xl overflow-hidden shadow-sm p-1">
          <ColumnSettings 
            visibleColumns={visibleColumns} 
            onChange={onVisibleColumnsChange} 
            activeTab={activeTab}
          />
          <div className="w-px h-8 bg-admin-border/20 mx-1" />
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest border-r border-admin-border/10 rounded-none"
            onClick={onExport}
            title="Exportar Excel"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest border-r border-admin-border/10 rounded-none"
            onClick={() => fileInputRef.current?.click()}
            title="Importar Excel"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button 
            variant="ghost" 
            className="h-11 px-4 hover:bg-admin-muted hover:text-admin-primary transition-all rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest rounded-l-none"
            onClick={onSync}
            disabled={isSyncing}
            title="Sincronizar Catálogo"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-admin-primary" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>
    </div>
  );
}
