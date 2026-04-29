import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { InlinePrice } from "@/components/admin/products/shared";
import { regionLabels } from "@/components/admin/products/shared";
import { useEffect, useRef } from "react";
import { Car, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportGuideExcel, parseGuideExcel } from "./guideExcel";

type Guide = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  residence: string | null;
  has_4x4: boolean;
  vehicle_seats: number;
  limit_4x4: number | null;
  limit_tourist: number | null;
  languages: string[];
  is_kalunga: boolean;
  has_cadastur: boolean;
};

type WaterfallProduct = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
};

type GuideWaterfallPrice = {
  id: string;
  guide_id: string;
  product_id: string;
  is_active: boolean;
  price_car_1: number;
  price_car_2: number;
  price_car_3plus: number;
  price_4x4_1: number;
  price_4x4_2: number;
  price_4x4_3plus: number;
};

const CAR_FIELDS = ["price_car_1", "price_car_2", "price_car_3plus"] as const;
const FOUR_X_FOUR_FIELDS = ["price_4x4_1", "price_4x4_2", "price_4x4_3plus"] as const;

export default function GuideDetailSheet({
  guide,
  open,
  onOpenChange,
}: {
  guide: Guide | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const show4x4 = guide?.has_4x4 ?? false;
  const totalCols = 3 + (show4x4 ? 6 : 3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: waterfalls = [] } = useQuery({
    queryKey: ["waterfall-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, is_active")
        .eq("type", "waterfall")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as WaterfallProduct[];
    },
    enabled: open,
  });

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["guide-waterfall-prices", guide?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_waterfall_prices")
        .select("*")
        .eq("guide_id", guide!.id);
      if (error) throw error;
      return data as unknown as GuideWaterfallPrice[];
    },
    enabled: open && !!guide,
  });

  const seedMutation = useMutation({
    mutationFn: async (missing: { guide_id: string; product_id: string }[]) => {
      if (missing.length === 0) return;
      const { error } = await supabase
        .from("guide_waterfall_prices")
        .upsert(
          missing.map((m) => ({
            guide_id: m.guide_id,
            product_id: m.product_id,
            is_active: false,
            price_car_1: 0, price_car_2: 0, price_car_3plus: 0,
            price_4x4_1: 0, price_4x4_2: 0, price_4x4_3plus: 0,
          })),
          { onConflict: "guide_id,product_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guide-waterfall-prices", guide?.id] }),
  });

  useEffect(() => {
    if (!guide || waterfalls.length === 0 || isLoading) return;
    const existingIds = new Set(prices.map((p) => p.product_id));
    const missing = waterfalls
      .filter((w) => !existingIds.has(w.id))
      .map((w) => ({ guide_id: guide.id, product_id: w.id }));
    if (missing.length > 0) seedMutation.mutate(missing);
  }, [guide?.id, waterfalls.length, prices.length, isLoading]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<GuideWaterfallPrice> & { guide_id: string; product_id: string }) => {
      const { guide_id, product_id, ...rest } = payload;
      const { error } = await supabase
        .from("guide_waterfall_prices")
        .update(rest as any)
        .eq("guide_id", guide_id)
        .eq("product_id", product_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide-waterfall-prices", guide?.id] });
      qc.invalidateQueries({ queryKey: ["guide-waterfall-counts"] });
    },
  });

  const priceMap = new Map(prices.map((p) => [p.product_id, p]));
  const rows = waterfalls.map((w) => ({ ...w, gwp: priceMap.get(w.id) }));

  const update = (productId: string, field: string, value: unknown) => {
    if (!guide) return;
    updateMutation.mutate({ guide_id: guide.id, product_id: productId, [field]: value } as any);
  };

  const passengerCapacity = (guide?.vehicle_seats ?? 5) - 1;

  const handleExport = () => {
    if (!guide) return;
    const exportRows = rows.map((r) => ({
      name: r.name,
      category: r.category,
      gwp: r.gwp ? {
        is_active: r.gwp.is_active,
        price_car_1: r.gwp.price_car_1,
        price_car_2: r.gwp.price_car_2,
        price_car_3plus: r.gwp.price_car_3plus,
        price_4x4_1: r.gwp.price_4x4_1,
        price_4x4_2: r.gwp.price_4x4_2,
        price_4x4_3plus: r.gwp.price_4x4_3plus,
      } : undefined,
    }));
    exportGuideExcel(guide.name, exportRows, show4x4);
    toast.success("Planilha exportada com sucesso");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guide) return;
    e.target.value = "";

    const waterfallMap = new Map(
      waterfalls.map((w) => [w.name.toLowerCase().trim(), w.id])
    );

    try {
      const { payloads, notFound } = await parseGuideExcel(file, waterfallMap, show4x4);

      if (payloads.length > 0) {
        const upsertData = payloads.map((p) => ({
          guide_id: guide.id,
          ...p,
        }));
        const { error } = await supabase
          .from("guide_waterfall_prices")
          .upsert(upsertData as any, { onConflict: "guide_id,product_id" });
        if (error) throw error;

        qc.invalidateQueries({ queryKey: ["guide-waterfall-prices", guide.id] });
        qc.invalidateQueries({ queryKey: ["guide-waterfall-counts"] });
      }

      const msgs: string[] = [];
      if (payloads.length > 0) msgs.push(`${payloads.length} cachoeira(s) atualizada(s)`);
      if (notFound.length > 0) msgs.push(`${notFound.length} não encontrada(s): ${notFound.slice(0, 5).join(", ")}`);
      toast.success(msgs.join(" · ") || "Nenhum dado importado");
    } catch (err: any) {
      toast.error("Erro ao importar: " + (err.message || err));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">{guide?.name}</SheetTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {guide?.residence && <span>{guide.residence}</span>}
            {guide?.phone && <span>{guide.phone}</span>}
            {guide?.email && <span>{guide.email}</span>}
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-2 mt-2">
            {show4x4 ? (
              <Badge variant="default" className="text-xs gap-1">
                <Car className="h-3 w-3" /> 4x4 · {passengerCapacity} passageiros
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Sem 4x4</Badge>
            )}
            {guide?.limit_4x4 != null && (
              <Badge variant="outline" className="text-xs">Limite 4x4: {guide.limit_4x4}</Badge>
            )}
            {guide?.limit_tourist != null && (
              <Badge variant="outline" className="text-xs">Limite Turista: {guide.limit_tourist}</Badge>
            )}
            {(guide?.languages || []).map((l) => (
              <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
            ))}
            {guide?.is_kalunga && <Badge variant="outline" className="text-xs">Kalunga</Badge>}
            {guide?.has_cadastur && <Badge variant="outline" className="text-xs">Cadastur</Badge>}
          </div>
        </SheetHeader>

        {/* Export / Import buttons */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Importar Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        <div className="text-xs font-medium text-muted-foreground mb-2">
          Preços por pessoa conforme tamanho do grupo — ative as cachoeiras que este guia atende
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Carregando...</p>
        ) : (
          <div className="border border-border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium whitespace-nowrap">Cachoeira</th>
                  <th className="text-left p-2 font-medium whitespace-nowrap">Região</th>
                  <th className="text-center p-2 font-medium whitespace-nowrap">Ativo</th>
                  {CAR_FIELDS.map((_, i) => (
                    <th key={`car-${i}`} className="p-2 font-medium text-center">
                      <div className="leading-tight">Carro Turista</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {i === 0 ? "1 pessoa" : i === 1 ? "2 pessoas" : "3 pessoas+"}
                      </div>
                    </th>
                  ))}
                  {show4x4 && FOUR_X_FOUR_FIELDS.map((_, i) => (
                    <th key={`4x4-${i}`} className="p-2 font-medium text-center">
                      <div className="leading-tight">4x4 Guia</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {i === 0 ? "1 pessoa" : i === 1 ? "2 pessoas" : "3 pessoas+"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const gwp = r.gwp;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2 font-medium whitespace-nowrap">{r.name}</td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {regionLabels[r.category || ""] || r.category || "—"}
                      </td>
                      <td className="p-2 text-center">
                        <Switch
                          checked={gwp?.is_active ?? false}
                          onCheckedChange={(v) => update(r.id, "is_active", v)}
                        />
                      </td>
                      {CAR_FIELDS.map((field) => (
                        <td key={field} className="p-2">
                          <InlinePrice
                            value={(gwp as any)?.[field] ?? 0}
                            onSave={(v) => update(r.id, field, v)}
                          />
                        </td>
                      ))}
                      {show4x4 && FOUR_X_FOUR_FIELDS.map((field) => (
                        <td key={field} className="p-2">
                          <InlinePrice
                            value={(gwp as any)?.[field] ?? 0}
                            onSave={(v) => update(r.id, field, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={totalCols} className="p-6 text-center text-muted-foreground">
                      Nenhuma cachoeira cadastrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1">{prices.filter((p) => p.is_active).length}</Badge>
          cachoeiras ativas para este guia
        </div>
      </SheetContent>
    </Sheet>
  );
}
