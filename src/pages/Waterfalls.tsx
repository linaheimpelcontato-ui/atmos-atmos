import { useState, useMemo } from "react";
import PageSEO from "@/components/seo/PageSEO";

import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";

const heroCachoeiras = storageUrl("cachoeiras/hero-cachoeiras.jpg");
import { useLanguage } from "@/contexts/LanguageContext";
import {
  type Region,
  type Difficulty,
  type Seasonality,
  type Waterfall,
  filterWaterfalls,
  waterfalls as staticWaterfalls,
  TRAIL_DISTANCE_MAX,
  CAR_DISTANCE_MAX,
} from "@/data/waterfalls";
import { useProducts } from "@/hooks/useProducts";
import WaterfallFilters from "@/components/waterfalls/WaterfallFilters";
import WaterfallCard from "@/components/waterfalls/WaterfallCard";
import WaterfallDetailDialog from "@/components/waterfalls/WaterfallDetailDialog";
import CollapsibleFilters from "@/components/shared/CollapsibleFilters";

const pageLabels = {
  pt: {
    title: "Cachoeiras & Atrativos",
    subtitle:
      "Explore mais de 35 cachoeiras e atrativos naturais da Chapada dos Veadeiros. Filtre por região, dificuldade e sazonalidade para encontrar a aventura perfeita.",
    empty: "Nenhuma cachoeira encontrada com os filtros selecionados.",
  },
  en: {
    title: "Waterfalls & Attractions",
    subtitle:
      "Explore 35+ waterfalls and natural attractions in Chapada dos Veadeiros. Filter by region, difficulty and seasonality to find the perfect adventure.",
    empty: "No waterfalls found with the selected filters.",
  },
  es: {
    title: "Cascadas y Atractivos",
    subtitle:
      "Explora más de 35 cascadas y atractivos naturales de Chapada dos Veadeiros. Filtra por región, dificultad y temporada para encontrar la aventura perfecta.",
    empty: "No se encontraron cascadas con los filtros seleccionados.",
  },
};

const Waterfalls = () => {
  const { language } = useLanguage();
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [selectedSeasonalities, setSelectedSeasonalities] = useState<Seasonality[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trailMax, setTrailMax] = useState(TRAIL_DISTANCE_MAX);
  const [carMax, setCarMax] = useState(CAR_DISTANCE_MAX);
  const [selectedWaterfall, setSelectedWaterfall] = useState<Waterfall | null>(null);

  const l = pageLabels[language];

  const { data: dbProducts = [] } = useProducts("waterfall");

  const waterfalls = useMemo(() => {
    const merged = [...staticWaterfalls];
    
    dbProducts.forEach(dbProduct => {
      const staticIdx = merged.findIndex(s => 
        s.id === dbProduct.source_id || 
        s.name.pt.toLowerCase() === dbProduct.name.toLowerCase()
      );
      const dbVars = (dbProduct.variables || {}) as any;
      
      const mapped: Waterfall = {
        id: dbProduct.id,
        name: {
          pt: dbProduct.name,
          en: (staticIdx > -1 ? merged[staticIdx].name.en : dbProduct.name),
          es: (staticIdx > -1 ? merged[staticIdx].name.es : dbProduct.name),
        },
        region: (dbProduct.segment || (staticIdx > -1 ? merged[staticIdx].region : "alto-paraiso")) as Region,
        difficulty: (dbVars.difficulty || (staticIdx > -1 ? merged[staticIdx].difficulty : "facil")) as Difficulty,
        seasonality: (dbVars.seasonality || (staticIdx > -1 ? merged[staticIdx].seasonality : "anual")) as Seasonality,
        distanceKm: Number(dbVars.distanceKm || (staticIdx > -1 ? merged[staticIdx].distanceKm : 0)),
        distanceCarKm: Number(dbVars.distanceCarKm || (staticIdx > -1 ? merged[staticIdx].distanceCarKm : 0)),
        requiresGuide: dbVars.requiresGuide === "true" || dbVars.requiresGuide === true || (staticIdx > -1 ? merged[staticIdx].requiresGuide : false),
        requires4x4: dbVars.requires4x4 === "true" || dbVars.requires4x4 === true || (staticIdx > -1 ? merged[staticIdx].requires4x4 : false),
        description: {
          pt: dbProduct.description || (staticIdx > -1 ? merged[staticIdx].description.pt : ""),
          en: (staticIdx > -1 ? merged[staticIdx].description.en : dbProduct.description || ""),
          es: (staticIdx > -1 ? merged[staticIdx].description.es : dbProduct.description || ""),
        },
        imageIndex: staticIdx > -1 ? merged[staticIdx].imageIndex : 1,
        storageId: dbProduct.category || (staticIdx > -1 ? merged[staticIdx].id : dbProduct.id),
      };

      if (staticIdx > -1) {
        merged[staticIdx] = mapped;
      } else {
        merged.push(mapped);
      }
    });
    
    return merged;
  }, [dbProducts]);

  const maxDistances = useMemo(() => {
    let tMax = TRAIL_DISTANCE_MAX;
    let cMax = CAR_DISTANCE_MAX;
    waterfalls.forEach(w => {
      if (w.distanceKm > tMax) tMax = Math.ceil(w.distanceKm);
      if (w.distanceCarKm > cMax) cMax = Math.ceil(w.distanceCarKm);
    });
    return { tMax, cMax };
  }, [waterfalls]);

  const [hasSetDefaults, setHasSetDefaults] = useState(false);
  if (!hasSetDefaults && (maxDistances.tMax > TRAIL_DISTANCE_MAX || maxDistances.cMax > CAR_DISTANCE_MAX)) {
    setTrailMax(maxDistances.tMax);
    setCarMax(maxDistances.cMax);
    setHasSetDefaults(true);
  }

  const filtered = useMemo(
    () =>
      filterWaterfalls(
        selectedRegions,
        selectedDifficulties,
        selectedSeasonalities,
        searchQuery,
        trailMax,
        carMax,
        waterfalls
      ),
    [
      selectedRegions,
      selectedDifficulties,
      selectedSeasonalities,
      searchQuery,
      trailMax,
      carMax,
      waterfalls,
    ]
  );

  return (
    <Layout>
      <PageSEO
        title="Cachoeiras e Atrativos da Chapada dos Veadeiros"
        description="Guia completo de cachoeiras da Chapada dos Veadeiros com dificuldade, distância, sazonalidade e fotos. Filtre e descubra os melhores atrativos."
        path="/cachoeiras"
      />
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroCachoeiras}
          alt="Cachoeiras da Chapada dos Veadeiros"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-white/80 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-4 block">Atrativos ATMOS</span>
          <h1 className="text-5xl md:text-7xl font-display text-white mb-6 drop-shadow-sm leading-tight">{l.title}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-sm">
            {l.subtitle}
          </p>
        </div>
      </section>



      {/* Filters + Grid */}
      <section className="py-0 md:py-16 min-h-screen bg-[#FDFCFB]">
        <div className="container px-4">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8">
            {/* Sidebar filters */}
            <aside className="sticky top-16 z-20 -mx-4 lg:mx-0 lg:sticky lg:top-24 lg:self-start lg:w-72 flex-shrink-0 bg-[#FDFCFB]/95 backdrop-blur-md lg:bg-transparent">
              <div className="px-4 py-3 lg:bg-card/90 lg:backdrop-blur-sm lg:rounded-2xl lg:p-5 lg:shadow-sm lg:border lg:border-border">
                <CollapsibleFilters>
                  <WaterfallFilters
                  selectedRegions={selectedRegions}
                  selectedDifficulties={selectedDifficulties}
                  selectedSeasonalities={selectedSeasonalities}
                  searchQuery={searchQuery}
                  trailMax={trailMax}
                  carMax={carMax}
                  maxTrail={maxDistances.tMax}
                  maxCar={maxDistances.cMax}
                  onRegionsChange={setSelectedRegions}
                  onDifficultiesChange={setSelectedDifficulties}
                  onSeasonalitiesChange={setSelectedSeasonalities}
                  onSearchChange={setSearchQuery}
                  onTrailMaxChange={setTrailMax}
                  onCarMaxChange={setCarMax}
                  resultCount={filtered.length}
                />
                </CollapsibleFilters>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1">
              {/* Grid */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 -mx-4 sm:mx-0 sm:gap-5">
                  {filtered.map((waterfall) => (
                    <WaterfallCard
                      key={waterfall.id}
                      waterfall={waterfall}
                      onClick={() => setSelectedWaterfall(waterfall)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">{l.empty}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* Detail Dialog */}
      <WaterfallDetailDialog
        waterfall={selectedWaterfall}
        open={!!selectedWaterfall}
        onOpenChange={(open) => !open && setSelectedWaterfall(null)}
      />
    </Layout>
  );
};

export default Waterfalls;
