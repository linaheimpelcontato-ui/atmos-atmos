import { useLanguage } from "@/contexts/LanguageContext";
import {
  type AccRegion,
  type Amenity,
  getAccRegions,
  getAllAmenities,
  accRegionLabels,
  amenityLabels,
  getGlobalPriceRange,
  getGlobalUnitsRange,
  getGlobalCapacityRange,
} from "@/data/accommodations";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, DollarSign, SlidersHorizontal, Home, Users } from "lucide-react";
import PopoverFilter from "@/components/shared/PopoverFilter";
import { trackFilterUse } from "@/lib/analytics";

const filterLabels = {
  pt: { all: "Todas", region: "Região", search: "Buscar por nome...", price: "Preço até", amenities: "Comodidades", units: "Nº de Acomodações", capacity: "Capacidade máxima" },
  en: { all: "All", region: "Region", search: "Search by name...", price: "Price up to", amenities: "Amenities", units: "No. of Rooms", capacity: "Max. capacity" },
  es: { all: "Todas", region: "Región", search: "Buscar por nombre...", price: "Precio hasta", amenities: "Comodidades", units: "Nº de Alojamientos", capacity: "Capacidad máxima" },
};

interface AccommodationFiltersProps {
  selectedRegions: AccRegion[];
  searchQuery: string;
  priceMax: number;
  selectedAmenities: Amenity[];
  unitsMin: number;
  capacityMin: number;
  onRegionsChange: (r: AccRegion[]) => void;
  onSearchChange: (q: string) => void;
  onPriceMaxChange: (v: number) => void;
  onAmenitiesChange: (a: Amenity[]) => void;
  onUnitsMinChange: (v: number) => void;
  onCapacityMinChange: (v: number) => void;
  resultCount: number;
}

const [GLOBAL_MIN, GLOBAL_MAX] = getGlobalPriceRange();
const [UNITS_MIN, UNITS_MAX] = getGlobalUnitsRange();
const [CAP_MIN, CAP_MAX] = getGlobalCapacityRange();

export default function AccommodationFilters({
  selectedRegions,
  searchQuery,
  priceMax,
  selectedAmenities,
  unitsMin,
  capacityMin,
  onRegionsChange,
  onSearchChange,
  onPriceMaxChange,
  onAmenitiesChange,
  onUnitsMinChange,
  onCapacityMinChange,
  resultCount,
}: AccommodationFiltersProps) {
  const { language } = useLanguage();
  const l = filterLabels[language];

  const resultLabel = {
    pt: `${resultCount} ${resultCount === 1 ? "resultado" : "resultados"}`,
    en: `${resultCount} ${resultCount === 1 ? "result" : "results"}`,
    es: `${resultCount} ${resultCount === 1 ? "resultado" : "resultados"}`,
  };

  const guestsLabel = { pt: "hóspedes", en: "guests", es: "huéspedes" };

  return (
    <div className="space-y-5">
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

      {/* Price filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <DollarSign className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{l.price}</span>
          <span className="text-xs font-bold text-accent ml-auto">
            R$ {priceMax.toLocaleString("pt-BR")}
          </span>
        </div>
        <Slider
          min={GLOBAL_MIN}
          max={GLOBAL_MAX}
          step={50}
          value={[priceMax]}
          onValueChange={([v]) => onPriceMaxChange(v)}
          onValueCommit={([v]) => trackFilterUse("price", String(v), "/hospedagens")}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>R$ {GLOBAL_MIN}</span>
          <span>R$ {GLOBAL_MAX.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Units filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Home className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{l.units}</span>
          <span className="text-xs font-bold text-accent ml-auto">{unitsMin}</span>
        </div>
        <Slider
          min={UNITS_MIN}
          max={UNITS_MAX}
          step={1}
          value={[unitsMin]}
          onValueChange={([v]) => onUnitsMinChange(v)}
          onValueCommit={([v]) => trackFilterUse("units", String(v), "/hospedagens")}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{UNITS_MIN}</span>
          <span>{UNITS_MAX}</span>
        </div>
      </div>

      {/* Capacity filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Users className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-foreground">{l.capacity}</span>
          <span className="text-xs font-bold text-accent ml-auto">
            {capacityMin}
          </span>
        </div>
        <Slider
          min={CAP_MIN}
          max={CAP_MAX}
          step={1}
          value={[capacityMin]}
          onValueChange={([v]) => onCapacityMinChange(v)}
          onValueCommit={([v]) => trackFilterUse("capacity", String(v), "/hospedagens")}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{CAP_MIN}</span>
          <span>{CAP_MAX}</span>
        </div>
      </div>

      {/* Region */}
      <PopoverFilter
        label={l.region}
        icon={<MapPin className="h-4 w-4 text-accent" />}
        options={getAccRegions().map((r) => ({ value: r, label: accRegionLabels[r][language] }))}
        selectedValues={selectedRegions}
        onChange={(vals) => onRegionsChange(vals as AccRegion[])}
        multiSelect
      />

      {/* Amenities (multi-select) */}
      <PopoverFilter
        label={l.amenities}
        icon={<SlidersHorizontal className="h-4 w-4 text-accent" />}
        options={getAllAmenities().map((a) => ({ value: a, label: amenityLabels[a][language] }))}
        selectedValues={selectedAmenities}
        onChange={(vals) => onAmenitiesChange(vals as Amenity[])}
        multiSelect
      />

      <div className="text-sm text-muted-foreground font-medium pt-1">
        {resultLabel[language]}
      </div>
    </div>
  );
}
