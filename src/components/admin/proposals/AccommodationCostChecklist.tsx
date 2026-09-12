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
import { ClipboardCheck, Save, AlertTriangle, Check } from "lucide-react";
import type { ProposalAccommodation, ProposalRoom, ProposalUnit } from "./ProposalAccommodationsSection";

const db = supabase as any;

const MODALITY_LABELS: Record<string, string> = {
  single: "Single", casal: "Casal / Duplo", triplo: "Triplo",
  quadruplo: "Quádruplo", familia: "Família", suite: "Suíte",
};

type AccCheckRow = {
  id?: string;
  acc_index: number;
  unit_index: number;
  room_index: number;
  catalog_cost: number;
  actual_cost: number;
  is_verified: boolean;
  notes: string;
};

type Props = {
  proposalId: string | null;
  accommodation: ProposalAccommodation;
  accIndex: number;
  numPeople: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

/** Key for storing acc cost checks — reuse proposal_cost_checks table with negative day_numbers */
function makeKey(accIndex: number, unitIndex: number, roomIndex: number) {
  // Use negative day_number space to avoid collision with itinerary items
  // day_number = -(accIndex + 1) * 100 - unitIndex
  // item_index = roomIndex
  return {
    day_number: -(accIndex + 1) * 100 - unitIndex,
    item_index: roomIndex,
  };
}

export function AccommodationCostChecklistButton({
  proposalId, accommodation, accIndex, numPeople, onClick,
}: {
  proposalId: string | null;
  accommodation: ProposalAccommodation;
  accIndex: number;
  numPeople: number;
  onClick: () => void;
}) {
  const totalRooms = accommodation.unit_configs.reduce((s, u) => s + u.rooms.filter(r => r.available).length, 0);

  const { data: checks = [] } = useQuery({
    queryKey: ["acc-cost-checks", proposalId, accIndex],
    queryFn: async () => {
      if (!proposalId) return [];
      // Fetch all checks for this accommodation
      const dayNumbers = accommodation.unit_configs.map((_, ui) => makeKey(accIndex, ui, 0).day_number);
      if (dayNumbers.length === 0) return [];
      const { data } = await db.from("proposal_cost_checks").select("*").eq("proposal_id", proposalId).in("day_number", dayNumbers);
      return (data || []) as any[];
    },
    enabled: !!proposalId && totalRooms > 0,
  });

  const verified = checks.filter((c: any) => c.is_verified).length;
  const pending = totalRooms - verified;

  if (!proposalId || totalRooms === 0) return null;

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <ClipboardCheck className="h-3 w-3" />
      Validar
      {pending > 0 ? (
        <Badge variant="destructive" className="ml-0.5 h-4 min-w-[16px] px-1 text-[9px]">{pending}</Badge>
      ) : (
        <Check className="h-3 w-3 text-green-600" />
      )}
    </Button>
  );
}

export default function AccommodationCostChecklist({ proposalId, accommodation, accIndex, numPeople, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const acc = accommodation;

  // Build flat list of verifiable items
  const flatItems = useMemo(() => {
    const items: { unitIdx: number; roomIdx: number; unit: ProposalUnit; room: ProposalRoom }[] = [];
    acc.unit_configs.forEach((unit, ui) => {
      unit.rooms.forEach((room, ri) => {
        if (room.available) items.push({ unitIdx: ui, roomIdx: ri, unit, room });
      });
    });
    return items;
  }, [acc]);

  const { data: savedChecks = [], isLoading } = useQuery({
    queryKey: ["acc-cost-checks", proposalId, accIndex],
    queryFn: async () => {
      if (!proposalId) return [];
      const dayNumbers = acc.unit_configs.map((_, ui) => makeKey(accIndex, ui, 0).day_number);
      if (dayNumbers.length === 0) return [];
      const { data } = await db.from("proposal_cost_checks").select("*").eq("proposal_id", proposalId).in("day_number", dayNumbers);
      return (data || []) as any[];
    },
    enabled: !!proposalId && open,
  });

  const [rows, setRows] = useState<AccCheckRow[]>([]);

  useEffect(() => {
    if (!open) return;
    const merged = flatItems.map(({ unitIdx, roomIdx, room }) => {
      const key = makeKey(accIndex, unitIdx, roomIdx);
      const existing = savedChecks.find((c: any) => c.day_number === key.day_number && c.item_index === key.item_index);
      return {
        id: existing?.id,
        acc_index: accIndex,
        unit_index: unitIdx,
        room_index: roomIdx,
        catalog_cost: room.cost,
        actual_cost: existing
          ? Number(existing.actual_cost)
          : room.cost,
        is_verified: existing?.is_verified ?? false,
        notes: existing?.notes ?? "",
      };
    });
    setRows(merged);
  }, [open, savedChecks, flatItems, accIndex]);

  const updateRow = useCallback((unitIdx: number, roomIdx: number, patch: Partial<AccCheckRow>) => {
    setRows(prev => prev.map(r =>
      r.unit_index === unitIdx && r.room_index === roomIdx ? { ...r, ...patch } : r
    ));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposalId) return;
      for (const r of rows) {
        const key = makeKey(r.acc_index, r.unit_index, r.room_index);
        const payload = {
          proposal_id: proposalId,
          day_number: key.day_number,
          item_index: key.item_index,
          catalog_cost: r.catalog_cost,
          proposal_cost: r.catalog_cost,
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
      qc.invalidateQueries({ queryKey: ["acc-cost-checks", proposalId, accIndex] });
      toast({ title: "Validação de custos hospedagem salva" });
      onOpenChange(false);
    },
  });

  const verified = rows.filter(r => r.is_verified).length;
  const total = rows.length;

  // People check
  const totalAccPeople = acc.unit_configs.reduce((s, u) =>
    s + u.rooms.filter(r => r.available).reduce((rs, r) => rs + r.units * r.capacity, 0), 0);
  const peopleMismatch = totalAccPeople !== numPeople;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Custos — {acc.product_name}
            <Badge variant="outline" className="ml-auto text-xs">
              {verified}/{total} validados
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Alerts */}
            {peopleMismatch && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px]">
                  Pessoas na hospedagem ({totalAccPeople}) ≠ proposta ({numPeople})
                </AlertDescription>
              </Alert>
            )}
            {verified < total && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px]">
                  {total - verified} {total - verified === 1 ? "item pendente" : "itens pendentes"} de validação
                </AlertDescription>
              </Alert>
            )}

            {/* Items */}
            <div className="space-y-2">
              {rows.map((r) => {
                const fi = flatItems.find(f => f.unitIdx === r.unit_index && f.roomIdx === r.room_index);
                if (!fi) return null;
                const { unit, room } = fi;
                const nights = acc.num_nights;
                const totalCost = room.pricing_type === "per_person"
                  ? room.units * room.capacity * r.actual_cost * nights
                  : room.units * r.actual_cost * nights;
                const totalRevenue = room.pricing_type === "per_person"
                  ? room.units * room.capacity * room.price * nights
                  : room.units * room.price * nights;
                const profit = totalRevenue - totalCost;

                return (
                  <div
                    key={`${r.unit_index}-${r.room_index}`}
                    className={`border rounded-lg p-3 space-y-2 transition-colors ${r.is_verified ? "bg-muted/30 border-primary/20" : "bg-background border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {unit.unit_label} — {MODALITY_LABELS[room.type] || room.type}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {room.units} unid. × {room.capacity} pax × {nights} noite{nights !== 1 ? "s" : ""}
                          {room.pricing_type === "per_person" ? " (por pessoa)" : " (por quarto)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          checked={r.is_verified}
                          onCheckedChange={(v) => updateRow(r.unit_index, r.room_index, { is_verified: !!v })}
                        />
                        <span className="text-[10px] text-muted-foreground">Validado</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Lucro</span>
                        <span className={`tabular-nums font-medium ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          R$ {profit.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Venda total</span>
                        <span className="tabular-nums">R$ {totalRevenue.toFixed(0)}</span>
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
                          value={r.actual_cost}
                          onChange={(e) => {
                            const raw = Math.max(0, Number(e.target.value) || 0);
                            updateRow(r.unit_index, r.room_index, { actual_cost: raw });
                          }}
                          className="h-7 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum item de custo nesta hospedagem.</p>
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
