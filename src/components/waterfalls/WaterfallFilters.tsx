import { useLanguage } from "@/contexts/LanguageContext";
import {
  type Region,
  type Difficulty,
  type Seasonality,
  getRegions,
  getDifficulties,
  getSeasonalities,
  regionLabels,
  difficultyLabels,
  seasonalityLabels,
  TRAIL_DISTANCE_MAX,
  CAR_DISTANCE_MAX,
} from "@/data/waterfalls";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MapPin, Mountain, Droplets, Search, Footprints, Car } from "lucide-react";
import PopoverFilter from "@/components/shared/PopoverFilter";
import { trackFilterUse } from "@/lib/analytics";

const filterLabels = {
  pt: {
    all: "Todas",
    region: "Região",
    difficulty: "Dificuldade",
    season: "Sazonalidade",
    search: "Buscar por nome...",
    trail: "Distância de trilha",
    car: "Distância de carro",
    carLegend: "km saindo de Alto Paraíso",
    kmLabel: "km",
  },
  en: {
    all: "All",
    region: "Region",
    difficulty: "Difficulty",
    season: "Seasonality",
    search: "Search by name...",
    trail: "Trail distance",
    car: "Car distance",
    carLegend: "km from Alto Paraíso",
    kmLabel: "km",
  },
  es: {
    all: "Todas",
    region: "Región",
    difficulty: "Dificultad",
    season: "Temporada",
    search: "Buscar por nombre...",
    trail: "Distancia de sendero",
    car: "Distancia en carro",
    carLegend: "km desde Alto Paraíso",
    kmLabel: "km",
  },
};

interface WaterfallFiltersProps {
  selectedRegions: Region[];
  selectedDifficulties: Difficulty[];
  selectedSeasonalities: Seasonality[];
  searchQuery: string;
  trailMax: number;
  carMax: number;
  onRegionsChange: (r: Region[]) => void;
  onDifficultiesChange: (d: Difficulty[]) => void;
  onSeasonalitiesChange: (s: Seasonality[]) => void;
  onSearchChange: (q: string) => void;
  onTrailMaxChange: (v: number) => void;
  onCarMaxChange: (v: number) => void;
  resultCount: number;
}

export default function WaterfallFilters({
  selectedRegions,
  selectedDifficulties,
  selectedSeasonalities,
  searchQuery,
  trailMax,
  carMax,
  onRegionsChange,
  onDifficultiesChange,
  onSeasonalitiesChange,
  onSearchChange,
  onTrailMaxChange,
  onCarMaxChange,
  resultCount,
}: WaterfallFiltersProps) {
  const { language } = useLanguage();
  const l = filterLabels[language];

  const resultLabel = {
    pt: `${resultCount} ${resultCount === 1 ? "resultado" : "resultados"}`,
    en: `${resultCount} ${resultCount === 1 ? "result" : "results"}`,
    es: `${resultCount} ${resultCount === 1 ? "resultado" : "resultados"}`,
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={l.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 rounded-full bg-background"
        />
      </div>

      {/* Region filter */}
      <PopoverFilter
        label={l.region}
        icon={<MapPin className="h-4 w-4 text-accent" />}
        options={getRegions().map((r) => ({ value: r, label: regionLabels[r][language] }))}
        selectedValues={selectedRegions}
        onChange={(vals) => onRegionsChange(vals as Region[])}
        multiSelect
      />

      {/* Difficulty filter */}
      <PopoverFilter
        label={l.difficulty}
        icon={<Mountain className="h-4 w-4 text-accent" />}
        options={getDifficulties().map((d) => ({ value: d, label: difficultyLabels[d][language] }))}
        selectedValues={selectedDifficulties}
        onChange={(vals) => onDifficultiesChange(vals as Difficulty[])}
        multiSelect
      />

      {/* Seasonality filter */}
      <PopoverFilter
        label={l.season}
        icon={<Droplets className="h-4 w-4 text-accent" />}
        options={getSeasonalities().map((s) => ({ value: s, label: seasonalityLabels[s][language] }))}
        selectedValues={selectedSeasonalities}
        onChange={(vals) => onSeasonalitiesChange(vals as Seasonality[])}
        multiSelect
      />

      {/* Trail distance filter */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">{l.trail}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {trailMax < TRAIL_DISTANCE_MAX ? `≤ ${trailMax}${l.kmLabel}` : `${TRAIL_DISTANCE_MAX}${l.kmLabel}`}
          </span>
        </div>
        <div className="px-1">
          <Slider
            min={0}
            max={TRAIL_DISTANCE_MAX}
            step={1}
            value={[trailMax]}
            onValueChange={([v]) => onTrailMaxChange(v)}
            onValueCommit={([v]) => trackFilterUse("trail_distance", String(v), "/cachoeiras")}
          />
        </div>
      </div>

      {/* Car distance filter */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">{l.car}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {carMax < CAR_DISTANCE_MAX ? `≤ ${carMax}${l.kmLabel}` : `${CAR_DISTANCE_MAX}${l.kmLabel}`}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2.5 ml-6">{l.carLegend}</p>
        <div className="px-1">
          <Slider
            min={0}
            max={CAR_DISTANCE_MAX}
            step={10}
            value={[carMax]}
            onValueChange={([v]) => onCarMaxChange(v)}
            onValueCommit={([v]) => trackFilterUse("car_distance", String(v), "/cachoeiras")}
          />
        </div>
      </div>

      {/* Result count */}
      <div className="text-sm text-muted-foreground font-medium pt-1">
        {resultLabel[language]}
      </div>
    </div>
  );
}
