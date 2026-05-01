import { Search, Plus, FolderPlus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
}: ProductFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-6 border-b border-admin-border/40">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 lg:pb-0 scroll-smooth">
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
        
        <div className="h-6 w-px bg-admin-border/50 mx-2 hidden lg:block" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onNewCategory}
          className="h-10 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-admin-primary hover:bg-admin-muted rounded-xl gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full lg:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
          <Input 
            placeholder="Pesquisar catálogo..." 
            className="pl-11 h-12 bg-white border-admin-border/60 rounded-xl focus:ring-4 focus:ring-admin-primary/5 transition-all text-sm font-medium"
            value={search} 
            onChange={(e) => onSearchChange(e.target.value)} 
          />
        </div>
        <Button 
          variant="outline" 
          className="h-12 w-12 p-0 rounded-xl border-admin-border/60 hover:bg-admin-muted hover:text-admin-primary transition-all"
          onClick={onSync}
          disabled={isSyncing}
          title="Sincronizar Catálogo"
        >
          <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin text-admin-primary" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
