import { accommodationAmounts } from "@/lib/accommodationCalcs";
import { money, moneyProduct, moneySum } from "@/lib/proposalCalcs";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Hotel, AlertTriangle, Check, Home, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO, isValid, format, parse, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { normalizeRoomConfigs, type RoomConfig } from "@/components/admin/products/RoomModalitiesEditor";
import { AccommodationCostChecklistButton } from "./AccommodationCostChecklist";
import AccommodationCostChecklist from "./AccommodationCostChecklist";

// ─── Types ──────────────────────────────────────────────────────────

export type ProposalRoom = {
  type: string;
  capacity: number;
  units: number;
  price: number;
  cost: number;
  pricing_type: "per_person" | "per_room";
  available: boolean;
  commission_percent?: number;
};

export type ProposalUnit = {
  unit_label: string;
  total_units: number;
  max_capacity: number;
  rooms: ProposalRoom[];
};

export type ProposalAccommodation = {
  id?: string;
  product_id: string;
  product_name: string;
  checkin_date: string;
  checkout_date: string;
  num_nights: number;
  unit_configs: ProposalUnit[];
  notes: string;
  is_selected: boolean;
  /** "atmos" = valor entra no orçamento do cliente; "hospedagem" = apenas comissão */
  payment_type: "atmos" | "hospedagem";
  /** Catalog room configs for dynamic add */
  _catalog_configs?: RoomConfig[];
  /** Commission % from supplier (product.variables.comissao) */
  _commission_percent?: number;
};

const MODALITY_LABELS: Record<string, string> = {
  single: "Single",
  casal: "Casal / Duplo",
  triplo: "Triplo",
  quadruplo: "Quádruplo",
  familia: "Família",
  suite: "Suíte",
};

// ─── Calculation helpers ────────────────────────────────────────────

function calcRoomSubtotal(room: ProposalRoom, nights: number): number {
  if (!room.available) return 0;
  if (room.pricing_type === "per_person") {
    return moneyProduct(room.units, room.capacity, room.price, nights);
  }
  return moneyProduct(room.units, room.price, nights);
}

function calcRoomCostTotal(room: ProposalRoom, nights: number): number {
  if (!room.available) return 0;
  if (room.pricing_type === "per_person") {
    return moneyProduct(room.units, room.capacity, room.cost, nights);
  }
  return moneyProduct(room.units, room.cost, nights);
}

function calcNights(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 1;
  const d1 = parseISO(checkin);
  const d2 = parseISO(checkout);
  if (!isValid(d1) || !isValid(d2)) return 1;
  const diff = differenceInDays(d2, d1);
  return diff > 0 ? diff : 1;
}

function accTotalPeople(acc: ProposalAccommodation): number {
  return acc.unit_configs.reduce((s, u) =>
    s + u.rooms.filter((r) => r.available).reduce((rs, r) => rs + r.units * r.capacity, 0), 0);
}

function unitDistributed(unit: ProposalUnit): number {
  return unit.rooms.filter((r) => r.available).reduce((s, r) => s + r.units, 0);
}

export function calcAccommodationTotals(accommodations: ProposalAccommodation[]) {
  const selected = accommodations.filter((a) => a.is_selected);
  let totalRevenue = 0;
  let totalCost = 0;
  let totalPeople = 0;
  let totalCommission = 0;
  let atmosRevenue = 0;
  let atmosCost = 0;
  let atmosCommission = 0;
  let hospedagemCommission = 0;
  for (const acc of selected) {
    const amounts = accommodationAmounts(acc.unit_configs, acc.num_nights);
    totalRevenue = moneySum(totalRevenue, amounts.revenue);
    totalCost = moneySum(totalCost, amounts.cost);
    totalPeople += amounts.people;
    totalCommission = moneySum(totalCommission, amounts.commission);
    if (acc.payment_type === "atmos") {
      atmosRevenue = moneySum(atmosRevenue, amounts.revenue);
      atmosCost = moneySum(atmosCost, amounts.cost);
      atmosCommission = moneySum(atmosCommission, amounts.commission);
    } else hospedagemCommission = moneySum(hospedagemCommission, amounts.commission);
  }

  return { totalRevenue: money(totalRevenue), totalCost: money(totalCost), totalPeople,
    totalCommission: money(totalCommission), atmosRevenue: money(atmosRevenue), atmosCost: money(atmosCost),
    atmosCommission: money(atmosCommission), hospedagemCommission: money(hospedagemCommission) };
}

/** Collect unique unit+modality variants across all ATMOS-type accommodations */
export function getAccommodationVariants(accommodations: ProposalAccommodation[]): { type: string; label: string; revenuePerPerson: number }[] {
  const selected = accommodations.filter(a => a.is_selected && a.payment_type === "atmos");
  // Aggregate revenue by unit_label + modality
  const variantTotals = new Map<string, { label: string; totalRev: number; totalPax: number }>();
  for (const acc of selected) {
    for (const unit of acc.unit_configs) {
      for (const room of unit.rooms) {
        if (!room.available || room.units === 0) continue;
        const rev = calcRoomSubtotal(room, acc.num_nights);
        const pax = room.units * room.capacity;
        const key = `${acc.product_name}_${unit.unit_label}_${room.type}`;
        const modalityLabel = MODALITY_LABELS[room.type] || room.type;
        const label = `${unit.unit_label} ${modalityLabel}`;
        const prev = variantTotals.get(key) || { label, totalRev: 0, totalPax: 0 };
        variantTotals.set(key, { label, totalRev: moneySum(prev.totalRev, rev), totalPax: prev.totalPax + pax });
      }
    }
  }
  return Array.from(variantTotals.entries()).map(([key, { label, totalRev, totalPax }]) => ({
    type: key,
    label,
    revenuePerPerson: totalPax > 0 ? totalRev / totalPax : 0,
  }));
}

// ─── Checkout Picker with range highlight ───────────────────────────

function CheckoutPicker({ checkinDate, value, onChange, defaultMonth }: {
  checkinDate: string;
  value: string;
  onChange: (iso: string) => void;
  defaultMonth?: string;
}) {
  const [open, setOpen] = useState(false);

  const checkinParsed = useMemo(() => {
    if (!checkinDate) return undefined;
    const d = parse(checkinDate, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [checkinDate]);

  const checkoutParsed = useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const defaultMonthDate = useMemo(() => {
    if (checkinParsed) return checkinParsed;
    if (defaultMonth) {
      const d = parse(defaultMonth, "yyyy-MM-dd", new Date());
      return isValid(d) ? d : undefined;
    }
    return undefined;
  }, [checkinParsed, defaultMonth]);

  const rangeDays = useMemo(() => {
    if (!checkinParsed || !checkoutParsed || checkoutParsed <= checkinParsed) return [];
    return eachDayOfInterval({ start: checkinParsed, end: checkoutParsed });
  }, [checkinParsed, checkoutParsed]);

  const modifiers = useMemo(() => {
    const mods: Record<string, Date | Date[]> = {};
    if (checkinParsed) mods.checkin = checkinParsed;
    if (rangeDays.length > 2) mods.range = rangeDays.slice(1, -1);
    return mods;
  }, [checkinParsed, rangeDays]);

  const modifiersStyles = useMemo(() => ({
    checkin: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "50%" },
    range: { backgroundColor: "hsl(var(--primary) / 0.15)", borderRadius: "0" },
  }), []);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
  };

  const displayLabel = useMemo(() => {
    if (!checkoutParsed) return null;
    const base = format(checkoutParsed, "dd/MM/yyyy", { locale: ptBR });
    if (checkinParsed && checkoutParsed > checkinParsed) {
      const nights = differenceInDays(checkoutParsed, checkinParsed);
      return `${base} (${nights} noite${nights !== 1 ? "s" : ""})`;
    }
    return base;
  }, [checkoutParsed, checkinParsed]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-full h-8 text-xs px-2.5 gap-1.5",
            !checkoutParsed && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {displayLabel || "Check-out"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <Calendar
          mode="single"
          selected={checkoutParsed}
          onSelect={handleSelect}
          defaultMonth={checkoutParsed || defaultMonthDate}
          locale={ptBR}
          className="pointer-events-auto"
          disabled={checkinParsed ? (date) => date <= checkinParsed : undefined}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ProposalAccommodationsSection({
  accommodations,
  onChange,
  catalogItems,
  numPeople,
  startDate,
  proposalId,
}: {
  accommodations: ProposalAccommodation[];
  onChange: (accs: ProposalAccommodation[]) => void;
  catalogItems: any[];
  numPeople: number;
  startDate?: string;
  proposalId?: string | null;
}) {
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({});
  const [costCheckOpen, setCostCheckOpen] = useState<number | null>(null);

  const accommodationProducts = useMemo(
    () => catalogItems.filter((c: any) => c.type === "accommodation" && c.is_active),
    [catalogItems]
  );

  const toggleCard = (idx: number) => {
    setOpenCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const update = (idx: number, patch: Partial<ProposalAccommodation>) => {
    const arr = [...accommodations];
    arr[idx] = { ...arr[idx], ...patch };
    if (patch.checkin_date || patch.checkout_date) {
      const ci = patch.checkin_date ?? arr[idx].checkin_date;
      const co = patch.checkout_date ?? arr[idx].checkout_date;
      arr[idx].num_nights = calcNights(ci, co);
    }
    onChange(arr);
  };

  const updateRoom = (accIdx: number, unitIdx: number, roomIdx: number, patch: Partial<ProposalRoom>) => {
    const arr = [...accommodations];
    const units = [...arr[accIdx].unit_configs];
    const rooms = [...units[unitIdx].rooms];
    rooms[roomIdx] = { ...rooms[roomIdx], ...patch };
    units[unitIdx] = { ...units[unitIdx], rooms };
    arr[accIdx] = { ...arr[accIdx], unit_configs: units };
    onChange(arr);
  };

  const removeRoom = (accIdx: number, unitIdx: number, roomIdx: number) => {
    const arr = [...accommodations];
    const units = [...arr[accIdx].unit_configs];
    const rooms = [...units[unitIdx].rooms].filter((_, i) => i !== roomIdx);
    units[unitIdx] = { ...units[unitIdx], rooms };
    arr[accIdx] = { ...arr[accIdx], unit_configs: units };
    onChange(arr);
  };

  const removeUnit = (accIdx: number, unitIdx: number) => {
    const arr = [...accommodations];
    const units = [...arr[accIdx].unit_configs].filter((_, i) => i !== unitIdx);
    arr[accIdx] = { ...arr[accIdx], unit_configs: units };
    onChange(arr);
  };

  const addUnitFromCatalog = (accIdx: number, catalogUnitIdx: number) => {
    const acc = accommodations[accIdx];
    const configs = acc._catalog_configs;
    if (!configs || !configs[catalogUnitIdx]) return;
    const rc = configs[catalogUnitIdx];

    const newUnit: ProposalUnit = {
      unit_label: rc.unit_label,
      total_units: rc.total_units,
      max_capacity: rc.max_capacity,
      rooms: [],
    };

    const arr = [...accommodations];
    const units = [...arr[accIdx].unit_configs, newUnit];
    arr[accIdx] = { ...arr[accIdx], unit_configs: units };
    onChange(arr);
  };

  const addModalityToUnit = (accIdx: number, unitIdx: number, modalityType: string) => {
    const acc = accommodations[accIdx];
    const unit = acc.unit_configs[unitIdx];
    const catalogUnit = acc._catalog_configs?.find(c => c.unit_label === unit.unit_label);
    const catalogModality = catalogUnit?.modalities.find(m => m.type === modalityType);
    if (!catalogModality) return;

    const newRoom: ProposalRoom = {
      type: catalogModality.type,
      capacity: catalogModality.capacity,
      units: 1,
      price: catalogModality.sale_price,
      cost: catalogModality.cost_price,
      pricing_type: catalogModality.pricing_type,
      available: true,
      commission_percent: acc._commission_percent ?? 0,
    };

    const arr = [...accommodations];
    const units = [...arr[accIdx].unit_configs];
    const rooms = [...units[unitIdx].rooms, newRoom];
    units[unitIdx] = { ...units[unitIdx], rooms };
    arr[accIdx] = { ...arr[accIdx], unit_configs: units };
    onChange(arr);
  };

  const addAccommodation = (productId: string) => {
    const product = accommodationProducts.find((p: any) => p.id === productId);
    if (!product) return;
    const vars = (product.variables || {}) as Record<string, unknown>;
    const roomConfigs = normalizeRoomConfigs(vars.room_modalities);
    const commPct = Number(vars.comissao) || 0;

    const newIdx = accommodations.length;
    setOpenCards(prev => ({ ...prev, [newIdx]: true }));

    onChange([
      ...accommodations,
      {
        product_id: productId,
        product_name: product.name,
        checkin_date: startDate || "",
        checkout_date: "",
        num_nights: 1,
        unit_configs: [],
        notes: "",
        is_selected: true,
        payment_type: "hospedagem",
        _catalog_configs: roomConfigs,
        _commission_percent: commPct,
      },
    ]);
  };

  const removeAccommodation = (idx: number) => {
    onChange(accommodations.filter((_, i) => i !== idx));
  };

  const selectedAccs = accommodations.filter((a) => a.is_selected);
  const summaryTotals = calcAccommodationTotals(accommodations);
  const { totalRevenue, totalCost, totalPeople: totalAccommodatedPeople, totalCommission } = summaryTotals;

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = parseISO(iso);
    return isValid(d) ? format(d, "dd/MM", { locale: ptBR }) : "—";
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Hotel className="h-4 w-4 text-primary" />
          Hospedagens do Roteiro
        </h4>
        <Select value="none" onValueChange={(v) => v !== "none" && addAccommodation(v)}>
          <SelectTrigger className="h-8 text-xs w-[220px]">
            <SelectValue placeholder="+ Adicionar hospedagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" disabled>Selecionar hospedagem...</SelectItem>
            {accommodationProducts.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Occupancy validation */}
      {selectedAccs.length > 0 && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${
          totalAccommodatedPeople === numPeople
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {totalAccommodatedPeople === numPeople ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            Acomodado: <strong>{totalAccommodatedPeople}</strong> pessoas · Proposta: <strong>{numPeople}</strong> pessoas
            {totalAccommodatedPeople !== numPeople && (
              <span className="ml-1">
                ({totalAccommodatedPeople > numPeople ? `+${totalAccommodatedPeople - numPeople} sobrando` : `${numPeople - totalAccommodatedPeople} faltando`})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Accommodation cards */}
      {accommodations.map((acc, accIdx) => {
        const accPeople = accTotalPeople(acc);
        let accTotal = 0;
        let accCost = 0;
        for (const unit of acc.unit_configs) {
          for (const room of unit.rooms) {
            if (!room.available) continue;
            accTotal += calcRoomSubtotal(room, acc.num_nights);
            accCost += calcRoomCostTotal(room, acc.num_nights);
          }
        }

        const catalogConfigs = acc._catalog_configs || [];
        const isOpen = openCards[accIdx] !== undefined ? openCards[accIdx] : !acc.id; // new = open, loaded = closed

        return (
          <Card key={accIdx} className={`border ${acc.is_selected && accPeople !== numPeople && accPeople > 0 ? "border-destructive border-2" : acc.is_selected ? "border-primary/40" : "border-border opacity-60"}`}>
            <Collapsible open={isOpen} onOpenChange={() => toggleCard(accIdx)}>
              {/* Collapsible Header */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <Hotel className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-sm truncate">{acc.product_name}</span>
                    <Badge variant={acc.is_selected ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {acc.is_selected ? "Selecionada" : "Comparativo"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {acc.payment_type === "atmos" ? "Pago ATMOS" : "Pago Hospedagem"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground ml-2">
                    {!isOpen && acc.is_selected && accPeople !== numPeople && accPeople > 0 && (
                      <Badge variant="destructive" className="text-[10px] shrink-0 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {accPeople} pax ≠ {numPeople}
                      </Badge>
                    )}
                    {!isOpen && (
                      <>
                        <span>{fmtDate(acc.checkin_date)} → {fmtDate(acc.checkout_date)}</span>
                        <span>·</span>
                        <span>{accPeople} pax</span>
                        <span>·</span>
                        <span className="font-medium text-foreground tabular-nums">R$ {accTotal.toFixed(2)}</span>
                      </>
                    )}
                    <AccommodationCostChecklistButton
                      proposalId={proposalId || null}
                      accommodation={acc}
                      accIndex={accIdx}
                      numPeople={numPeople}
                      onClick={() => setCostCheckOpen(accIdx)}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {/* Controls row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Payment type toggle */}
                    <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                      <button
                        type="button"
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                          acc.payment_type === "atmos"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => update(accIdx, { payment_type: "atmos" })}
                      >
                        Pagamento para ATMOS
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                          acc.payment_type === "hospedagem"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => update(accIdx, { payment_type: "hospedagem" })}
                      >
                        Pagamento para Hospedagem
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Incluir</Label>
                      <Switch
                        checked={acc.is_selected}
                        onCheckedChange={(v) => update(accIdx, { is_selected: v })}
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAccommodation(accIdx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Check-in</Label>
                      <DatePicker size="sm" value={acc.checkin_date} onChange={(v) => update(accIdx, { checkin_date: v })} defaultMonth={startDate} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Check-out</Label>
                      <CheckoutPicker checkinDate={acc.checkin_date} value={acc.checkout_date} onChange={(v) => update(accIdx, { checkout_date: v })} defaultMonth={startDate} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Diárias</Label>
                      <Input className="h-8 text-sm tabular-nums bg-muted" type="number" value={acc.num_nights} readOnly />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pessoas</Label>
                      <Input className="h-8 text-sm tabular-nums bg-muted" type="number" value={accPeople} readOnly />
                    </div>
                  </div>

                  {/* Dynamically added unit configs */}
                  {acc.unit_configs.map((unit, unitIdx) => {
                    const distributed = unitDistributed(unit);
                    const overDistributed = distributed > unit.total_units;
                    const catalogUnit = catalogConfigs.find(c => c.unit_label === unit.unit_label);
                    const addedTypes = unit.rooms.map(r => r.type);
                    const availableModalities = (catalogUnit?.modalities || []).filter(m => !addedTypes.includes(m.type));

                    return (
                      <div key={unitIdx} className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Home className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {unit.unit_label || `Unidade ${unitIdx + 1}`} · {unit.total_units} unid. · máx {unit.max_capacity} pax/unid.
                            </span>
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeUnit(accIdx, unitIdx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {unit.rooms.length > 0 && (
                          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border ${
                            overDistributed
                              ? "bg-red-50 border-red-200 text-red-800"
                              : distributed === unit.total_units
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-muted/30 border-border text-muted-foreground"
                          }`}>
                            {overDistributed ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            ) : distributed === unit.total_units ? (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            ) : null}
                            <span>
                              Distribuídas: <strong>{distributed}</strong> / {unit.total_units}
                              {overDistributed && <span className="ml-1 font-semibold">(excede {distributed - unit.total_units})</span>}
                            </span>
                          </div>
                        )}

                        {unit.rooms.map((room, rIdx) => (
                          <div key={rIdx} className={`flex items-center gap-2 flex-wrap p-2 rounded-md border border-border bg-background ${!room.available ? "opacity-40" : ""}`}>
                            <span className="text-xs font-medium min-w-[80px]">{MODALITY_LABELS[room.type] || room.type}</span>
                            <span className="text-[10px] text-muted-foreground">{room.capacity} pax</span>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Unid.</Label>
                              <Input
                                className="h-7 w-14 text-xs text-center tabular-nums"
                                type="number" min={0}
                                value={room.units}
                                onChange={(e) => updateRoom(accIdx, unitIdx, rIdx, { units: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Custo</Label>
                              <Input
                                className="h-7 w-20 text-xs text-right tabular-nums"
                                type="number" step="any" min={0}
                                value={room.cost || ""}
                                onChange={(e) => updateRoom(accIdx, unitIdx, rIdx, { cost: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px]">Comissão %</Label>
                              <Input aria-label="Comissão do fornecedor (%)" type="number" min={0} max={100} step="0.01" className="h-7 w-20 text-xs"
                                placeholder="Confirmar" value={room.commission_percent ?? ""}
                                onChange={e => updateRoom(accIdx, unitIdx, rIdx, { commission_percent: e.target.value === "" ? undefined : Number(e.target.value) })} />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Venda</Label>
                              <Input
                                className="h-7 w-20 text-xs text-right tabular-nums"
                                type="number" step="any" min={0}
                                value={room.price || ""}
                                onChange={(e) => updateRoom(accIdx, unitIdx, rIdx, { price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {room.pricing_type === "per_person" ? "/pax" : "/quarto"}
                            </span>
                            <span className="text-xs tabular-nums font-medium ml-auto">
                              {room.available ? `R$ ${calcRoomSubtotal(room, acc.num_nights).toFixed(2)}` : "—"}
                            </span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeRoom(accIdx, unitIdx, rIdx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {availableModalities.length > 0 && (
                          <Select value="none" onValueChange={(v) => v !== "none" && addModalityToUnit(accIdx, unitIdx, v)}>
                            <SelectTrigger className="h-7 text-[11px] w-full border-dashed">
                              <Plus className="h-3 w-3 mr-1" />
                              <SelectValue placeholder="Adicionar modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" disabled>Selecionar modalidade...</SelectItem>
                              {availableModalities.map((m) => (
                                <SelectItem key={m.type} value={m.type}>
                                  {MODALITY_LABELS[m.type] || m.type} ({m.capacity} pax) — R$ {m.sale_price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {unit.rooms.length === 0 && availableModalities.length === 0 && (
                          <p className="text-xs text-muted-foreground py-1">Sem modalidades cadastradas.</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Add unit button */}
                  {catalogConfigs.length > 0 && (
                    <Select value="none" onValueChange={(v) => v !== "none" && addUnitFromCatalog(accIdx, parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs w-full border-dashed">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <SelectValue placeholder="Adicionar unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Selecionar tipo de unidade...</SelectItem>
                        {catalogConfigs.map((rc, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {rc.unit_label || `Unidade ${idx + 1}`} ({rc.total_units} unid. · máx {rc.max_capacity} pax)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {catalogConfigs.length === 0 && acc.unit_configs.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      Hospedagem sem unidades cadastradas. Cadastre no produto.
                    </p>
                  )}

                  {/* Notes */}
                  <Textarea
                    className="text-xs min-h-[40px] resize-none"
                    placeholder="Observações (negociação, disponibilidade...)"
                    rows={2}
                    value={acc.notes}
                    onChange={(e) => update(accIdx, { notes: e.target.value })}
                  />

                  {/* Totals */}
                  <div className="flex items-center justify-between text-xs border-t border-border pt-2 flex-wrap gap-1">
                    <span className="text-muted-foreground">
                      {acc.num_nights} diária{acc.num_nights !== 1 ? "s" : ""} · {accPeople} pessoa{accPeople !== 1 ? "s" : ""}
                      {accommodationAmounts(acc.unit_configs, acc.num_nights).missingCommissions > 0 && <span className="ml-2 text-amber-700">Comissão histórica não informada: confirme por modalidade antes de salvar.</span>}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Custo: <span className="tabular-nums text-destructive">R$ {accCost.toFixed(2)}</span></span>
                      {acc.payment_type === "hospedagem" && (
                        <span className="text-green-600">Comissão a receber: <span className="tabular-nums">R$ {accommodationAmounts(acc.unit_configs, acc.num_nights).commission.toFixed(2)}</span></span>
                      )}
                      <span className="font-semibold">Total: <span className="tabular-nums">R$ {accTotal.toFixed(2)}</span></span>
                    </div>
                  </div>
                  {acc.payment_type === "atmos" && (
                    <div className="text-[11px] text-primary font-medium">
                      ↑ Este valor será incluído no orçamento do cliente
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {accommodations.length === 0 && (
        <p className="text-xs text-muted-foreground py-3 text-center">
          Nenhuma hospedagem adicionada. Selecione uma hospedagem do cadastro acima.
        </p>
      )}

      {/* Summary bar */}
      {selectedAccs.length > 0 && (
        <div className="flex items-center justify-between text-sm border-t border-border pt-3 flex-wrap gap-2">
          <span className="text-muted-foreground">
            {selectedAccs.length} hospedagem{selectedAccs.length !== 1 ? "ns" : ""} selecionada{selectedAccs.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground">Custo: <span className="tabular-nums text-destructive">R$ {totalCost.toFixed(2)}</span></span>
            {totalCommission > 0 && (
              <span className="text-xs text-green-600">Comissão: <span className="tabular-nums">R$ {totalCommission.toFixed(2)}</span></span>
            )}
            {summaryTotals.atmosRevenue > 0 && (
              <span className="text-xs text-primary font-medium">ATMOS: <span className="tabular-nums">R$ {summaryTotals.atmosRevenue.toFixed(2)}</span></span>
            )}
            {summaryTotals.hospedagemCommission > 0 && (
              <span className="text-xs text-green-600">Comissão a receber: <span className="tabular-nums">R$ {summaryTotals.hospedagemCommission.toFixed(2)}</span></span>
            )}
            <span className="font-semibold">Total hospedagens: <span className="tabular-nums">R$ {totalRevenue.toFixed(2)}</span></span>
          </div>
        </div>
      )}

      {/* Accommodation cost checklist sheets */}
      {accommodations.map((acc, accIdx) => (
        <AccommodationCostChecklist
          key={accIdx}
          proposalId={proposalId || null}
          accommodation={acc}
          accIndex={accIdx}
          numPeople={numPeople}
          open={costCheckOpen === accIdx}
          onOpenChange={(v) => setCostCheckOpen(v ? accIdx : null)}
        />
      ))}
    </div>
  );
}
