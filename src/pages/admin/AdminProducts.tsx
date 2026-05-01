import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { syncCatalog } from "@/lib/catalogSync";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AtmosCard } from "@/components/admin/shared/AtmosCard";
import { ProductFilters } from "@/components/admin/products/ProductFilters";
import { ProductDialog } from "@/components/admin/products/ProductDialog";
import { CategoryDialog } from "@/components/admin/products/CategoryDialog";
import ItineraryFormDialog from "@/components/admin/products/ItineraryFormDialog";
import {
  ProductTable, InlinePrice, productTypeLabels, DEDICATED_TYPES, 
  type Product, type UpdatePayload, type ColumnDef, useSmartFilters
} from "@/components/admin/products/shared";
import { ProductTableRow } from "@/components/admin/products/ProductTableRow";
import { useRowSelection } from "@/hooks/useRowSelection";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("experience");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itinDialogOpen, setItinDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const dynamicTabs = useMemo(() => {
    const customTypes = new Set<string>();
    products.forEach((p) => {
      if (!DEDICATED_TYPES.includes(p.type)) customTypes.add(p.type);
    });
    return Array.from(customTypes).sort();
  }, [products]);

  const allTypes = useMemo(() => [...DEDICATED_TYPES, ...dynamicTabs], [dynamicTabs]);
  const getTypeLabel = (type: string) => productTypeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

  const syncMutation = useMutation({
    mutationFn: syncCatalog,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Catálogo sincronizado", description: `${result.inserted} novos, ${result.skipped} existiam.` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, variables, ...fields }: UpdatePayload) => {
      const updateData: Record<string, unknown> = { ...fields };
      if (variables) {
        const existing = products.find((p) => p.id === id);
        updateData.variables = { ...(existing?.variables || {}), ...variables };
      }
      const { error } = await supabase.from("products").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto atualizado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      toast({ title: "Produto excluído" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...data } = payload;
      if (id) {
        const { error } = await supabase.from("products").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      toast({ title: "Produto salvo com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const filterState = useSmartFilters();
  const selection = useRowSelection();

  // Re-apply type filter when tab changes
  useEffect(() => {
    // Note: the current useSmartFilters doesn't have a direct setFilter for arbitrary keys like 'type'
    // but we can use setColumnFilter if 'type' is a column, or just handle it in useMemo
  }, [activeTab]);

  const columns: ColumnDef[] = [
    { label: "Produto", sortKey: "name" },
    { label: "Preço Base", sortKey: "unit_price" },
    { label: "Catálogo", sortKey: "variables->variations" },
    { label: "Status", sortKey: "is_active" },
    { label: "" },
  ];

  const filteredProducts = useMemo(() => {
    // 1. Apply type tab filter
    let result = products.filter(p => p.type === activeTab);
    
    // 2. Apply search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(s) || 
        (p.category && p.category.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s))
      );
    }

    // 3. Apply Smart Filters (Sort and Column filters)
    return filterState.applyFilters(result);
  }, [products, activeTab, search, filterState]);

  const counts = useMemo(() => {
    return allTypes.reduce((acc, t) => {
      acc[t] = products.filter(p => p.type === t).length;
      return acc;
    }, {} as Record<string, number>);
  }, [allTypes, products]);


  return (
    <div className="flex flex-col min-h-screen bg-admin-bg animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Produtos"
        subtitle="Administre seu catálogo de experiências, cachoeiras e serviços"
        icon={Package}
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { setEditingProduct(null); setDialogOpen(true); }}
            className="bg-admin-primary hover:bg-black text-white px-6 h-11 rounded-xl shadow-lg shadow-admin-primary/20 font-bold uppercase tracking-widest text-xs transition-all active:scale-95 flex gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </PageHeader>

        <AtmosCard className="flex-1 flex flex-col shadow-sm border-admin-border/40">
          <ProductFilters
            search={search}
            onSearchChange={setSearch}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allTypes={allTypes}
            getTypeLabel={getTypeLabel}
            counts={counts}
            onNewCategory={() => setCatDialogOpen(true)}
            onSync={() => syncMutation.mutate()}
            isSyncing={syncMutation.isPending}
          />

          <div className="flex-1 py-6">
            <ProductTable
              products={filteredProducts}
              columnDefs={columns}
              isLoading={isLoading}
              filterState={filterState}
              selectedIds={selection.selectedIds}
              onToggleRow={selection.toggle}
              onToggleAll={selection.toggleAll}
              renderRow={(p) => (
                <ProductTableRow
                  key={p.id}
                  product={p}
                  selected={selection.isSelected(p.id)}
                  onToggle={selection.toggle}
                  onClick={(product) => {
                    setEditingProduct(product);
                    if (product.type === "itinerary") setItinDialogOpen(true);
                    else setDialogOpen(true);
                  }}
                  onUpdatePrice={(id, price) => updateMutation.mutate({ id, unit_price: price })}
                  onToggleActive={(id, active) => updateMutation.mutate({ id, is_active: active })}
                  getTypeLabel={getTypeLabel}
                />
              )}
            />
          </div>
        </AtmosCard>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProduct(null); }}
        editingProduct={editingProduct}
        onSave={(data) => {
          if (editingProduct) saveMutation.mutate({ ...data, id: editingProduct.id });
          else saveMutation.mutate(data);
        }}
        isSaving={saveMutation.isPending}
        allTypes={allTypes}
        getTypeLabel={getTypeLabel}
      />

      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        onCreated={(slug, name) => {
          setActiveTab(slug);
          toast({ title: `Categoria "${name}" criada` });
        }}
      />

      <ItineraryFormDialog
        open={itinDialogOpen}
        onOpenChange={(open) => { setItinDialogOpen(open); if (!open) setEditingProduct(null); }}
        product={editingProduct}
        allProducts={products}
        isSaving={saveMutation.isPending || deleteMutation.isPending}
        onSave={async (data) => {
          if (editingProduct) {
            const { error } = await supabase.from("products").update({
              name: data.name, description: data.description, category: data.category,
              is_active: data.is_active, variables: JSON.parse(JSON.stringify(data.variables)),
            }).eq("id", editingProduct.id);
            if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
          } else {
            const { error } = await supabase.from("products").insert([{
              name: data.name, description: data.description, type: "itinerary", category: data.category,
              segment: "b2c", is_active: data.is_active, variables: JSON.parse(JSON.stringify(data.variables)), unit_price: 0,
            }]);
            if (error) { toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" }); return; }
          }
          qc.invalidateQueries({ queryKey: ["admin-products"] });
          setItinDialogOpen(false);
          setEditingProduct(null);
          toast({ title: editingProduct ? "Roteiro atualizado" : "Roteiro cadastrado" });
        }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
