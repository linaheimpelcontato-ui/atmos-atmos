import { fetchPublicProducts } from "@/lib/publicProducts";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuideGuard } from "@/hooks/useGuideGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Map, DollarSign, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const db = supabase as any;

type WaterfallPrice = {
  product_id: string;
  is_active: boolean;
  price_car_1: number | null;
  price_car_2: number | null;
  price_car_3plus: number | null;
  price_4x4_1: number | null;
  price_4x4_2: number | null;
  price_4x4_3plus: number | null;
};

export default function GuideWaterfalls() {
  const { guideId } = useGuideGuard();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dirtyRows, setDirtyRows] = useState<Record<string, WaterfallPrice>>({});

  const { data: guide } = useQuery({
    queryKey: ["guide-details", guideId],
    queryFn: async () => {
      const { data } = await db.from("guides").select("has_4x4").eq("id", guideId).single();
      return data;
    },
    enabled: !!guideId,
  });

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["guide-waterfalls-catalog", guideId],
    queryFn: async () => {
      const prods = await fetchPublicProducts("waterfall");

      // 2. Fetch prices set by this exact guide
      const { data: prices } = await db
        .from("guide_waterfall_prices")
        .select("*")
        .eq("guide_id", guideId);

      // Merge defaults vs existing prices
      const priceMap = Object.fromEntries((prices || []).map((p: any) => [p.product_id, p]));

      return (prods || []).map((prod: any) => {
        const existing = priceMap[prod.id] || {};
        return {
          product_id: prod.id,
          name: prod.name,
          is_active: existing.is_active ?? true,
          price_car_1: existing.price_car_1 || "",
          price_car_2: existing.price_car_2 || "",
          price_car_3plus: existing.price_car_3plus || "",
          price_4x4_1: existing.price_4x4_1 || "",
          price_4x4_2: existing.price_4x4_2 || "",
          price_4x4_3plus: existing.price_4x4_3plus || "",
        };
      });
    },
    enabled: !!guideId,
  });

  const handleFieldChange = (productId: string, field: keyof WaterfallPrice, value: any) => {
    setDirtyRows((prev) => {
      const row = prev[productId] || products.find((p: any) => p.product_id === productId);
      if (!row) return prev;
      return { ...prev, [productId]: { ...row, [field]: value } as WaterfallPrice };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.values(dirtyRows).map((row) => ({
        guide_id: guideId,
        product_id: row.product_id,
        is_active: row.is_active,
        price_car_1: row.price_car_1 ? Number(row.price_car_1) : null,
        price_car_2: row.price_car_2 ? Number(row.price_car_2) : null,
        price_car_3plus: row.price_car_3plus ? Number(row.price_car_3plus) : null,
        price_4x4_1: row.price_4x4_1 ? Number(row.price_4x4_1) : null,
        price_4x4_2: row.price_4x4_2 ? Number(row.price_4x4_2) : null,
        price_4x4_3plus: row.price_4x4_3plus ? Number(row.price_4x4_3plus) : null,
      }));

      if (updates.length > 0) {
        const { error } = await db.from("guide_waterfall_prices").upsert(updates, { onConflict: "guide_id,product_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide-waterfalls-catalog", guideId] });
      setDirtyRows({});
      toast({ title: "Tabela de Preços Salva", description: "Seus valores foram atualizados para a equipe da ATMOS." });
    }
  });

  const mergedProducts = products.map((p: any) => dirtyRows[p.product_id] ? { ...p, ...dirtyRows[p.product_id] } : p);
  const hasUnsavedChanges = Object.keys(dirtyRows).length > 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-6 w-6 text-primary mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Preços de Diárias</h1>
            <p className="text-muted-foreground text-sm">Controle a sua tabela individual repassada para o time comercial da ATMOS.</p>
          </div>
        </div>
        {hasUnsavedChanges && (
           <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 animate-in slide-in-from-top-2">
             <Save className="h-4 w-4 mr-2" />
             {saveMutation.isPending ? "Salvando..." : "Salvar Tabela de Preços"}
           </Button>
        )}
      </div>

      {isError ? <p role="alert">Não foi possível carregar o catálogo e os preços. Recarregue a página para tentar novamente.</p> : isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando catálogo de cachoeiras...</div>
      ) : (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ativo</th>
                  <th className="px-4 py-3 font-semibold min-w-[200px]">Cachoeira / Atrativo</th>
                  <th colSpan={3} className="px-4 py-3 text-center border-l bg-blue-50/5 dark:bg-blue-900/10">Carro Turista (Qtd Pax)</th>
                  {guide?.has_4x4 && (
                    <th colSpan={3} className="px-4 py-3 text-center border-l bg-amber-50/5 dark:bg-amber-900/10">Seu 4x4 (Qtd Pax)</th>
                  )}
                </tr>
                <tr className="border-t border-border/30 bg-muted/20">
                  <th></th>
                  <th></th>
                  <th className="px-2 py-2 text-center text-[10px] border-l border-border/30 text-blue-800 dark:text-blue-300">1 pax</th>
                  <th className="px-2 py-2 text-center text-[10px] text-blue-800 dark:text-blue-300">2 pax</th>
                  <th className="px-2 py-2 text-center text-[10px] text-blue-800 dark:text-blue-300">3+ pax</th>
                  {guide?.has_4x4 && (
                    <>
                      <th className="px-2 py-2 text-center text-[10px] border-l border-border/30 text-amber-800 dark:text-amber-300">1 pax</th>
                      <th className="px-2 py-2 text-center text-[10px] text-amber-800 dark:text-amber-300">2 pax</th>
                      <th className="px-2 py-2 text-center text-[10px] text-amber-800 dark:text-amber-300">3+ pax</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {mergedProducts.map((p: any) => (
                  <tr key={p.product_id} className={`hover:bg-muted/20 transition-colors ${!p.is_active ? "opacity-50 bg-muted/10 grayscale" : ""}`}>
                    <td className="px-4 py-2.5 text-center">
                      <Checkbox 
                        checked={p.is_active} 
                        onCheckedChange={(v) => handleFieldChange(p.product_id, "is_active", v)} 
                      />
                    </td>
                    <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                       <Map className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                       <span className="truncate">{p.name}</span>
                    </td>
                    <td className="px-2 py-2 border-l border-border/40">
                      <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center" value={p.price_car_1} onChange={(e) => handleFieldChange(p.product_id, "price_car_1", e.target.value)} disabled={!p.is_active} />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center" value={p.price_car_2} onChange={(e) => handleFieldChange(p.product_id, "price_car_2", e.target.value)} disabled={!p.is_active} />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center" value={p.price_car_3plus} onChange={(e) => handleFieldChange(p.product_id, "price_car_3plus", e.target.value)} disabled={!p.is_active} />
                    </td>
                    
                    {guide?.has_4x4 && (
                      <>
                        <td className="px-2 py-2 border-l border-border/40">
                          <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center border-amber-500/30 focus-visible:ring-amber-500/30" value={p.price_4x4_1} onChange={(e) => handleFieldChange(p.product_id, "price_4x4_1", e.target.value)} disabled={!p.is_active} />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center border-amber-500/30 focus-visible:ring-amber-500/30" value={p.price_4x4_2} onChange={(e) => handleFieldChange(p.product_id, "price_4x4_2", e.target.value)} disabled={!p.is_active} />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="number" min="0" className="h-8 max-w-[80px] mx-auto text-center border-amber-500/30 focus-visible:ring-amber-500/30" value={p.price_4x4_3plus} onChange={(e) => handleFieldChange(p.product_id, "price_4x4_3plus", e.target.value)} disabled={!p.is_active} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
