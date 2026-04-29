import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Save, Search, AlertTriangle, Filter } from "lucide-react";

const db = supabase as any;

type DayItem = {
  day_number: number;
  item_index: number;
  item_name: string;
  category: string;
  cost: number;
  value: number;
  qty: number;
  catalog_item_id: string | null;
};

type CheckRow = {
  id?: string;
  day_number: number;
  item_index: number;
  catalog_cost: number;
  proposal_cost: number;
  actual_cost: number;
  is_verified: boolean;
  notes: string;
};

type Props = {
  proposalId: string | null;
  grid: DayItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  catalogCostResolver?: (item: DayItem) => number;
  isTotalCostResolver?: (item: DayItem) => boolean;
  catalogSalePriceResolver?: (item: DayItem) => number;
};

export function ProposalCostChecklistButton({ proposalId, grid, onClick }: { proposalId: string | null; grid: DayItem[]; onClick: () => void }) {
  const costItems = grid.filter(i => !!i.catalog_item_id && i.category !== "Hospedagem");

  const { data: checks = [] } = useQuery({
    queryKey: ["cost-checks", proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const { data } = await db.from("proposal_cost_checks").select("*").eq("proposal_id", proposalId).gte("day_number", 0);
      return (data || []) as CheckRow[];
    },
    enabled: !!proposalId,
  });

  const pending = costItems.length - checks.filter(c => c.is_verified).length;

  if (!proposalId || costItems.length === 0) return null;

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onClick}>
      <ClipboardCheck className="h-3.5 w-3.5" />
      Validar Custos
      {pending > 0 && (
        <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
          {pending}
        </Badge>
      )}
    </Button>
  );
}

export default function ProposalCostChecklist({ proposalId, grid, open, onOpenChange, catalogCostResolver, isTotalCostResolver, catalogSalePriceResolver }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const costItems = grid.filter(i => !!i.catalog_item_id && i.category !== "Hospedagem");

  const { data: savedChecks = [], isLoading } = useQuery({
    queryKey: ["cost-checks", proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const { data } = await db.from("proposal_cost_checks").select("*").eq("proposal_id", proposalId).gte("day_number", 0);
      return (data || []) as (CheckRow & { id: string })[];
    },
    enabled: !!proposalId && open,
  });

  const [rows, setRows] = useState<CheckRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterPending, setFilterPending] = useState(false);

  const costItemsKey = useMemo(() => {
    return costItems.map(item => {
      const catalogCost = catalogCostResolver ? catalogCostResolver(item) : item.cost;
      return `${item.day_number}-${item.item_index}-${catalogCost}-${item.qty}`;
    }).join("|");
  }, [costItems, catalogCostResolver]);

  useEffect(() => {
    if (!open) return;
    const merged = costItems.map(item => {
      const existing = savedChecks.find(c => c.day_number === item.day_number && c.item_index === item.item_index);
      const catalogCost = catalogCostResolver ? catalogCostResolver(item) : item.cost;
      return {
        id: existing?.id,
        day_number: item.day_number,
        item_index: item.item_index,
        catalog_cost: catalogCost,
        proposal_cost: item.cost,
                        actual_cost: existing
                          ? (Number(existing.actual_cost) === 0 && item.cost > 0 ? item.cost : Number(existing.actual_cost))
                          : (item.cost > 0 ? item.cost : catalogCost),
        is_verified: existing?.is_verified ?? false,
        notes: existing?.notes ?? "",
      };
    });
    setRows(merged);
  }, [open, savedChecks, costItemsKey]);

  // Reset filters when closing
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setFilterCategories([]);
      setFilterPending(false);
    }
  }, [open]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    costItems.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats).sort();
  }, [costItems]);

  const toggleCategory = useCallback((cat: string) => {
    setFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const pendingItems = useMemo(() => {
    return rows.filter(r => !r.is_verified).map(r => {
      const item = costItems.find(i => i.day_number === r.day_number && i.item_index === r.item_index);
      return { ...r, item };
    }).filter(r => r.item);
  }, [rows, costItems]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const item = costItems.find(i => i.day_number === r.day_number && i.item_index === r.item_index);
      if (!item) return false;
      if (filterPending && r.is_verified) return false;
      if (filterCategories.length > 0 && !filterCategories.includes(item.category)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = (item.item_name || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        if (!name.includes(term) && !cat.includes(term)) return false;
      }
      return true;
    });
  }, [rows, costItems, filterCategories, searchTerm, filterPending]);

  const updateRow = useCallback((dayNum: number, idx: number, patch: Partial<CheckRow>) => {
    setRows(prev => prev.map(r => {
      if (r.day_number === dayNum && r.item_index === idx) {
        return { ...r, ...patch };
      }
      return r;
    }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposalId) return;
      for (const r of rows) {
        const payload = {
          proposal_id: proposalId,
          day_number: r.day_number,
          item_index: r.item_index,
          catalog_cost: r.catalog_cost,
          proposal_cost: r.proposal_cost,
          actual_cost: r.actual_cost,
          is_verified: r.is_verified,
          notes: r.notes || null,
          updated_at: new Date().toISOString(),
        };
        if (r.id) {
          await db.from("proposal_cost_checks").update(payload).eq("id", r.id);
        } else {
          await db.from("proposal_cost_checks").upsert(payload, { onConflict: "proposal_id,day_number,item_index" });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-checks", proposalId] });
      toast({ title: "Validação de custos salva" });
      onOpenChange(false);
    },
  });

  const verified = rows.filter(r => r.is_verified).length;
  const total = rows.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Checklist de Custos
            <Badge variant="outline" className="ml-auto text-xs">
              {verified}/{total} validados
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
              {uniqueCategories.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {uniqueCategories.map(cat => (
                    <Badge
                      key={cat}
                      variant={filterCategories.includes(cat) ? "default" : "outline"}
                      className="cursor-pointer text-[10px] px-2 py-0.5 select-none"
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Pending alert */}
            {pendingItems.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pendingItems.length} {pendingItems.length === 1 ? "item pendente" : "itens pendentes"} de validação</span>
                    <Button
                      type="button"
                      variant={filterPending ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => setFilterPending(!filterPending)}
                    >
                      <Filter className="h-3 w-3" />
                      {filterPending ? "Mostrar todos" : "Filtrar pendentes"}
                    </Button>
                  </div>
                  {!filterPending && (
                    <ul className="list-disc list-inside pl-0.5 space-y-0.5 max-h-24 overflow-y-auto">
                      {pendingItems.slice(0, 8).map((p, i) => (
                        <li key={i} className="text-[10px]">D{p.day_number} — {p.item?.item_name || p.item?.category} ({p.item?.category})</li>
                      ))}
                      {pendingItems.length > 8 && (
                        <li className="text-[10px] text-muted-foreground">...e mais {pendingItems.length - 8}</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* List */}
            <div className="space-y-2">
              {filteredRows.map((r) => {
                const item = costItems.find(i => i.day_number === r.day_number && i.item_index === r.item_index);
                if (!item) return null;
                const diff = r.proposal_cost - r.actual_cost;
                return (
                  <div
                    key={`${r.day_number}-${r.item_index}`}
                    className={`border rounded-lg p-3 space-y-2 transition-colors ${r.is_verified ? "bg-muted/30 border-primary/20" : "bg-background border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.item_name || item.category}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-muted-foreground">
                            Dia {item.day_number} · {item.category} · Qtd: {item.qty}
                          </p>
                          {item.value === 0 && (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 px-1.5 py-0">
                              Venda R$ 0
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          checked={r.is_verified}
                          onCheckedChange={(v) => updateRow(r.day_number, r.item_index, { is_verified: !!v })}
                        />
                        <span className="text-[10px] text-muted-foreground">Validado</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Lucro</span>
                        {(() => {
                          const isTotal = isTotalCostResolver ? isTotalCostResolver(item) : false;
                          const totalRevenue = isTotal && catalogSalePriceResolver
                            ? catalogSalePriceResolver(item)
                            : Number(item.value || 0) * (item.qty || 1);
                          const totalCost = isTotal ? (r.actual_cost || 0) : (r.actual_cost || 0) * (item.qty || 1);
                          const rawProfit = totalRevenue - totalCost;
                          const totalProfit = Math.abs(rawProfit) < 0.05 ? 0 : rawProfit;
                          const profitPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
                          const color = totalProfit > 0 ? "text-green-600" : totalProfit < 0 ? "text-red-600" : "text-muted-foreground";
                          return (
                            <span className={`tabular-nums font-medium ${color}`}>R$ {totalProfit.toFixed(2)} <span className="text-[10px] font-normal">({profitPct.toFixed(1)}%)</span></span>
                          );
                        })()}
                      </div>
                      <div>
                        {(() => {
                          const isTotal = isTotalCostResolver ? isTotalCostResolver(item) : false;
                          const saleValue = isTotal && catalogSalePriceResolver
                            ? catalogSalePriceResolver(item)
                            : isTotal
                              ? Number(item.value || 0) * (item.qty || 1)
                              : Number(item.value || 0);
                          return (
                            <>
                              <span className="text-muted-foreground block mb-0.5">
                                {isTotal ? "Venda total" : "Venda /pessoa"}
                              </span>
                              <span className="tabular-nums">R$ {saleValue.toFixed(2)}</span>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Custo cadastro</span>
                        <span className="tabular-nums">R$ {r.catalog_cost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Custo real</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={r.catalog_cost > 0 ? r.catalog_cost : undefined}
                          value={r.actual_cost}
                          onChange={(e) => {
                            const raw = Math.max(0, Number(e.target.value) || 0);
                            const maxVal = r.catalog_cost > 0 ? r.catalog_cost + 0.05 : Infinity;
                            const v = Math.min(raw, maxVal);
                            updateRow(r.day_number, r.item_index, { actual_cost: v });
                          }}
                          className="h-7 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredRows.length === 0 && rows.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item corresponde aos filtros.</p>
              )}

              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item com custo nesta proposta.</p>
              )}

              {rows.length > 0 && (
                <Button
                  type="button"
                  className="w-full mt-4 gap-2"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  Salvar validação
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
