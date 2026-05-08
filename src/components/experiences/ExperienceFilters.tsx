import { useLanguage } from "@/contexts/LanguageContext";
import {
  type ExperienceCategory,
  getCategories,
  categoryLabels,
  getExperiencePriceRange,
} from "@/data/experiences";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Compass, Leaf, Palette, Eye, DollarSign } from "lucide-react";
import PopoverFilter from "@/components/shared/PopoverFilter";
import { trackFilterUse } from "@/lib/analytics";

const categoryIcons: Record<ExperienceCategory, typeof Compass> = {
  aventura: Compass,
  "bem-estar": Leaf,
  cultura: Palette,
  contemplacao: Eye,
};

const filterLabels = {
  pt: { all: "Todas", category: "Subcategoria", search: "Buscar por nome...", price: "Preço até" },
  en: { all: "All", category: "Subcategory", search: "Search by name...", price: "Price up to" },
  es: { all: "Todas", category: "Subcategoría", search: "Buscar por nombre...", price: "Precio hasta" },
};

interface ExperienceFiltersProps {
  selectedCategories: ExperienceCategory[];
  priceMax: number;
  maxAvailablePrice?: number;
  searchQuery: string;
  onCategoriesChange: (c: ExperienceCategory[]) => void;
  onPriceMaxChange: (v: number) => void;
  onSearchChange: (q: string) => void;
  resultCount: number;
}

const [GLOBAL_MIN, FALLBACK_MAX] = getExperiencePriceRange();

export default function ExperienceFilters({
  selectedCategories,
  priceMax,
  maxAvailablePrice,
  searchQuery,
  onCategoriesChange,
  onPriceMaxChange,
  onSearchChange,
  resultCount,
}: ExperienceFiltersProps) {
  const currentMax = maxAvailablePrice || FALLBACK_MAX;
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

      {/* Price slider */}
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
          max={currentMax}
          step={50}
          value={[priceMax]}
          onValueChange={([v]) => onPriceMaxChange(v)}
          onValueCommit={([v]) => trackFilterUse("price", String(v), "/experiencias")}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>R$ {GLOBAL_MIN}</span>
          <span>R$ {currentMax.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Category filter */}
      <PopoverFilter
        label={l.category}
        icon={<Compass className="h-4 w-4 text-accent" />}
        options={getCategories().map((c) => {
          const Icon = categoryIcons[c];
          return {
            value: c,
            label: categoryLabels[c][language],
            icon: <Icon className="h-3.5 w-3.5" />,
          };
        })}
        selectedValues={selectedCategories}
        onChange={(vals) => onCategoriesChange(vals as ExperienceCategory[])}
        multiSelect
      />

      {/* Result count */}
      <div className="text-sm text-muted-foreground font-medium pt-1">
        {resultLabel[language]}
      </div>
    </div>
  );
}
