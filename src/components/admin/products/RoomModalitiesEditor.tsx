import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Home } from "lucide-react";

export type RoomModality = {
  type: string;
  capacity: number;
  cost_price: number;
  sale_price: number;
  pricing_type: "per_person" | "per_room";
};

export type RoomConfig = {
  unit_label: string;
  total_units: number;
  max_capacity: number;
  modalities: RoomModality[];
};

const MODALITY_TYPES = [
  { value: "single", label: "Single", defaultCapacity: 1 },
  { value: "casal", label: "Casal / Duplo", defaultCapacity: 2 },
  { value: "triplo", label: "Triplo", defaultCapacity: 3 },
  { value: "quadruplo", label: "Quádruplo", defaultCapacity: 4 },
  { value: "familia", label: "Família", defaultCapacity: 5 },
  { value: "suite", label: "Suíte", defaultCapacity: 2 },
];

export function emptyRoomConfig(): RoomConfig {
  return { unit_label: "", total_units: 0, max_capacity: 1, modalities: [] };
}

/** Normalize raw data to RoomConfig array */
export function normalizeRoomConfigs(raw: unknown): RoomConfig[] {
  if (!raw) return [];
  // New format: array of RoomConfig
  if (Array.isArray(raw)) {
    // Check if it's an array of RoomConfig (has modalities key)
    if (raw.length > 0 && typeof raw[0] === "object" && "modalities" in (raw[0] as any)) {
      return raw as RoomConfig[];
    }
    // Old flat modality array — wrap in single config
    if (raw.length > 0 && typeof raw[0] === "object" && "type" in (raw[0] as any)) {
      const totalUnits = raw.reduce((s: number, m: any) => s + (m.units || 0), 0);
      const maxCap = Math.max(...raw.map((m: any) => m.capacity || 1));
      return [{
        unit_label: "",
        total_units: totalUnits,
        max_capacity: maxCap,
        modalities: raw.map((m: any) => ({
          type: m.type,
          capacity: m.capacity || 1,
          cost_price: m.cost_price || 0,
          sale_price: m.sale_price || 0,
          pricing_type: m.pricing_type || "per_room",
        })),
      }];
    }
    return [];
  }
  // Single RoomConfig object (previous refactor format)
  if (typeof raw === "object" && (raw as any).modalities) {
    return [raw as RoomConfig];
  }
  return [];
}

/** Backward compat — returns the first config or null */
export function normalizeRoomConfig(raw: unknown): RoomConfig | null {
  const configs = normalizeRoomConfigs(raw);
  return configs.length > 0 ? configs[0] : null;
}

// ─── Single Unit Editor ─────────────────────────────────────────────

function UnitEditor({
  config,
  onChange,
  onRemove,
  unitIndex,
}: {
  config: RoomConfig;
  onChange: (c: RoomConfig) => void;
  onRemove: () => void;
  unitIndex: number;
}) {
  const updateConfig = (patch: Partial<RoomConfig>) => onChange({ ...config, ...patch });

  const addModality = () => {
    const usedTypes = new Set(config.modalities.map((m) => m.type));
    const next = MODALITY_TYPES.find((t) => !usedTypes.has(t.value));
    updateConfig({
      modalities: [
        ...config.modalities,
        {
          type: next?.value || "single",
          capacity: next?.defaultCapacity || 1,
          cost_price: 0,
          sale_price: 0,
          pricing_type: "per_room",
        },
      ],
    });
  };

  const updateModality = (idx: number, patch: Partial<RoomModality>) => {
    const arr = [...config.modalities];
    arr[idx] = { ...arr[idx], ...patch };
    onChange({ ...config, modalities: arr });
  };

  const removeModality = (idx: number) => {
    onChange({ ...config, modalities: config.modalities.filter((_, i) => i !== idx) });
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-background">
      {/* Unit header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Unidade {unitIndex + 1}
          </span>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unit-level fields */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome da unidade</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Ex: Standard, Premium..."
            value={config.unit_label}
            onChange={(e) => updateConfig({ unit_label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Total de unidades</Label>
          <Input
            className="h-8 text-xs text-center tabular-nums"
            type="number" min={0}
            value={config.total_units}
            onChange={(e) => updateConfig({ total_units: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Capac. máx / unid.</Label>
          <Input
            className="h-8 text-xs text-center tabular-nums"
            type="number" min={1}
            value={config.max_capacity}
            onChange={(e) => updateConfig({ max_capacity: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      {/* Modalities header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Modalidades de Ocupação
        </h4>
        <Button type="button" size="sm" variant="outline" onClick={addModality} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Modalidade
        </Button>
      </div>

      {config.modalities.map((m, idx) => (
        <div key={idx} className="border border-border rounded-md p-2.5 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <Select value={m.type} onValueChange={(v) => {
              const def = MODALITY_TYPES.find((t) => t.value === v);
              updateModality(idx, { type: v, capacity: def?.defaultCapacity || m.capacity });
            }}>
              <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeModality(idx)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Capac.</Label>
              <Input
                className="h-7 text-xs text-center tabular-nums"
                type="number" min={1} max={10}
                value={m.capacity}
                onChange={(e) => updateModality(idx, { capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Custo R$</Label>
              <Input
                className="h-7 text-xs text-right tabular-nums"
                type="number" step="0.01" min={0}
                value={m.cost_price || ""}
                onChange={(e) => updateModality(idx, { cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Venda R$</Label>
              <Input
                className="h-7 text-xs text-right tabular-nums"
                type="number" step="0.01" min={0}
                value={m.sale_price || ""}
                onChange={(e) => updateModality(idx, { sale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Precificação</Label>
              <Select value={m.pricing_type} onValueChange={(v: "per_person" | "per_room") => updateModality(idx, { pricing_type: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_room">Por quarto</SelectItem>
                  <SelectItem value="per_person">Por pessoa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}

      {config.modalities.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Nenhuma modalidade cadastrada.</p>
      )}

      {config.total_units > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          {config.unit_label || "Unidade"}: {config.total_units} unidades · capacidade máxima: {config.total_units * config.max_capacity} pessoas
        </div>
      )}
    </div>
  );
}

// ─── Main Multi-Unit Editor ─────────────────────────────────────────

export default function RoomModalitiesEditor({
  configs,
  onChange,
}: {
  configs: RoomConfig[];
  onChange: (c: RoomConfig[]) => void;
}) {
  const addUnit = () => {
    onChange([...configs, emptyRoomConfig()]);
  };

  const updateUnit = (idx: number, config: RoomConfig) => {
    const arr = [...configs];
    arr[idx] = config;
    onChange(arr);
  };

  const removeUnit = (idx: number) => {
    onChange(configs.filter((_, i) => i !== idx));
  };

  const totalUnits = configs.reduce((s, c) => s + c.total_units, 0);
  const totalCapacity = configs.reduce((s, c) => s + c.total_units * c.max_capacity, 0);

  return (
    <div className="space-y-4">
      {configs.map((config, idx) => (
        <UnitEditor
          key={idx}
          config={config}
          onChange={(c) => updateUnit(idx, c)}
          onRemove={() => removeUnit(idx)}
          unitIndex={idx}
        />
      ))}

      <Button type="button" variant="outline" onClick={addUnit} className="w-full h-9 text-xs">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Tipo de Unidade
      </Button>

      {configs.length > 1 && totalUnits > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          Total geral: {totalUnits} unidades · capacidade máxima: {totalCapacity} pessoas
        </div>
      )}
    </div>
  );
}
