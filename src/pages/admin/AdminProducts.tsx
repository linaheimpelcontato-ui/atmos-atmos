import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, ImageIcon, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { syncCatalog } from "@/lib/catalogSync";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AtmosCard } from "@/components/admin/shared/AtmosCard";
import { ProductFilters } from "@/components/admin/products/ProductFilters";
import { ProductDialog } from "@/components/admin/products/ProductDialog";
import { CategoryDialog } from "@/components/admin/products/CategoryDialog";
import { DeleteConfirmationDialog } from "@/components/admin/shared/DeleteConfirmationDialog";
import ItineraryFormDialog from "@/components/admin/products/ItineraryFormDialog";
import {
  ProductTable, InlinePrice, productTypeLabels, DEDICATED_TYPES, 
  type Product, type UpdatePayload, type ColumnDef, useSmartFilters,
  ALL_COLUMNS, getVisibleColumns, saveVisibleColumns, type ColumnKey,
  getProductRegion
} from "@/components/admin/products/shared";
import { ProductTableRow } from "@/components/admin/products/ProductTableRow";
import { useRowSelection } from "@/hooks/useRowSelection";

import { exportProductsToExcel, importProductsFromExcel } from "@/lib/excelUtils";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("experience");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(getVisibleColumns());
  
  const handleVisibleColumnsChange = (cols: ColumnKey[]) => {
    setVisibleColumns(cols);
    saveVisibleColumns(cols);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [itinDialogOpen, setItinDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
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

  const importMutation = useMutation({
    mutationFn: async (data: Partial<Product>[]) => {
      // Supabase upsert will update if ID exists, or insert if not
      // Using any[] cast because name is required for inserts but optional for updates in TS definition
      const { error } = await supabase.from("products").upsert(data as any[], { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produtos sincronizados com sucesso via Excel" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    },
  });

  const handleImport = async (file: File) => {
    try {
      const data = await importProductsFromExcel(file);
      if (data.length > 0) {
        importMutation.mutate(data);
      } else {
        toast({ title: "Planilha vazia", description: "Não encontramos produtos para importar.", variant: "default" });
      }
    } catch (err: any) {
      toast({ title: "Erro no arquivo", description: err.message, variant: "destructive" });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setDialogOpen(false);
      setEditingProduct(null);
      toast({ title: "Produto excluído" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      selection.clear();
      setBulkDeleteDialogOpen(false);
      toast({ title: "Produtos excluídos com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir produtos", description: err.message, variant: "destructive" });
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

  const columns: ColumnDef[] = useMemo(() => {
    return [
      ...visibleColumns.map(key => {
        const col = ALL_COLUMNS.find(c => c.key === key);
        const sortKeys: Record<string, string> = {
          name: "name",
          price: "unit_price",
          cost_price: "cost_price",
          status: "is_active",
          type: "type",
          category: "category",
          variations: "variables->variations",
          region: "variables->region",
          empresa: "variables->empresa",
          responsavel: "variables->responsavel",
          comissao: "variables->comissao",
          difficulty: "variables->difficulty",
          duration: "variables->duracao",
          cnpj: "variables->fiscal_cnpj",
          instagram: "variables->instagram",
          site: "variables->site",
          capacity: "variables->total_capacity",
          rooms: "variables->total_rooms",
          seasonality: "variables->sazonalidade",
          distance_trail: "variables->distanceKm",
          distance_car: "variables->distanceCarKm",
          tax_rate: "variables->fiscal_tax_rate",
        };
        
        return {
          label: col?.label || key,
          sortKey: sortKeys[key],
          valueExtractor: (p: any) => {
            const v = p.variables || {};
            if (key === "region") return getProductRegion(p);
            // Map table key to variable key if they differ
            const varMap: Record<string, string> = {
              duration: "duracao",
              seasonality: "sazonalidade",
              distance_trail: "distanceKm",
              distance_car: "distanceCarKm",
              capacity: "total_capacity",
              rooms: "total_rooms",
              notes: "operational_notes",
              tax_rate: "fiscal_tax_rate",
              cnpj: "fiscal_cnpj"
            };
            const vKey = varMap[key] || key;
            return v[vKey] || p[vKey] || p[key];
          }
        };
      }),
      { label: "Ações" }
    ];
  }, [visibleColumns]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.type === activeTab);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(s) || 
        (p.category && p.category.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s))
      );
    }
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
        actions={
          <div className="flex items-center gap-3">
            {selection.selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-xs flex gap-2 animate-in slide-in-from-right duration-300 shadow-lg shadow-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selection.selectedIds.size})
              </Button>
            )}
            <Button
              onClick={() => { setEditingProduct(null); setDialogOpen(true); }}
              className="bg-admin-primary hover:bg-black text-white px-6 h-11 rounded-xl shadow-lg shadow-admin-primary/20 font-bold uppercase tracking-widest text-xs transition-all active:scale-95 flex gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        }
      />

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
            onExport={() => exportProductsToExcel(products)}
            onImport={handleImport}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={handleVisibleColumnsChange}
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
                  visibleColumns={visibleColumns}
                  onToggle={selection.toggle}
                  onClick={(product) => {
                    setEditingProduct(product);
                    if (product.type === "itinerary") setItinDialogOpen(true);
                    else setDialogOpen(true);
                  }}
                  onUpdatePrice={(id, price) => updateMutation.mutate({ id, unit_price: price })}
                  onUpdateName={(id, name) => updateMutation.mutate({ id, name })}
                  onUpdateVariables={(id, vars) => updateMutation.mutate({ id, variables: vars })}
                  onToggleActive={(id, active) => updateMutation.mutate({ id, is_active: active })}
                  onDelete={(id) => {
                    setItemToDelete(id);
                    setDeleteDialogOpen(true);
                  }}
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

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => itemToDelete && deleteMutation.mutate(itemToDelete)}
        isLoading={deleteMutation.isPending}
        title="Excluir Produto"
        description="Deseja realmente remover este produto do catálogo? Esta ação não pode ser revertida."
      />

      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selection.selectedIds))}
        isLoading={bulkDeleteMutation.isPending}
        itemCount={selection.selectedIds.size}
        title="Excluir Produtos"
        description={`Você está prestes a excluir ${selection.selectedIds.size} produtos selecionados. Confirma esta ação?`}
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
        onDelete={(id) => {
          setItemToDelete(id);
          setDeleteDialogOpen(true);
        }}
      />
    </div>
  );
}
