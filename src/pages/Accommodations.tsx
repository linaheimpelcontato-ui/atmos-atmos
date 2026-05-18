import { useState, useMemo, useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";

import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";

const heroHospedagens = storageUrl("hospedagens/hero-hospedagens.jpg");
import { useLanguage } from "@/contexts/LanguageContext";
import {
  type AccRegion,
  type AccType,
  type Amenity,
  type Accommodation,
  filterAccommodations,
  getGlobalPriceRange,
  getGlobalUnitsRange,
  getGlobalCapacityRange,
  accommodations as staticAccommodations,
} from "@/data/accommodations";
import { useProducts } from "@/hooks/useProducts";
import AccommodationFilters from "@/components/accommodations/AccommodationFilters";
import AccommodationCard from "@/components/accommodations/AccommodationCard";
import AccommodationDetailDialog from "@/components/accommodations/AccommodationDetailDialog";
import CollapsibleFilters from "@/components/shared/CollapsibleFilters";

const pageLabels = {
  pt: {
    title: "Hospedagens",
    subtitle:
      "Curadoria de refúgios entre o conforto e a natureza. Cada hospedagem foi visitada e selecionada para oferecer autenticidade, conforto e integração com a Chapada dos Veadeiros.",
    empty: "Nenhuma hospedagem encontrada com os filtros selecionados.",
  },
  en: {
    title: "Accommodations",
    subtitle:
      "A curated selection of retreats between comfort and nature. Each accommodation was visited and selected to offer authenticity, comfort and integration with Chapada dos Veadeiros.",
    empty: "No accommodations found with the selected filters.",
  },
  es: {
    title: "Hospedajes",
    subtitle:
      "Curaduría de refugios entre el confort y la naturaleza. Cada hospedaje fue visitado y seleccionado para ofrecer autenticidad, confort e integración con Chapada dos Veadeiros.",
    empty: "No se encontraron hospedajes con los filtros seleccionados.",
  },
};

const [, GLOBAL_MAX] = getGlobalPriceRange();
const [UNITS_MIN] = getGlobalUnitsRange();
const [CAP_MIN] = getGlobalCapacityRange();

const Accommodations = () => {
  const { language } = useLanguage();
  const [selectedRegions, setSelectedRegions] = useState<AccRegion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceMax, setPriceMax] = useState(GLOBAL_MAX);
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
  const [unitsMin, setUnitsMin] = useState(UNITS_MIN);
  const [capacityMin, setCapacityMin] = useState(CAP_MIN);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);

  const l = pageLabels[language];

  const { data: dbProducts = [] } = useProducts("accommodation");

  const accommodations = useMemo(() => {
    // If no products in DB, fallback to static list
    if (!dbProducts || dbProducts.length === 0) {
      return staticAccommodations;
    }

    // Use DB products as the base list
    return dbProducts.map(dbProduct => {
      const staticEntry = staticAccommodations.find(s => 
        s.id === dbProduct.source_id || 
        s.name.toLowerCase() === dbProduct.name.toLowerCase()
      );
      const dbVars = (dbProduct.variables || {}) as any;
      
      const mapped: Accommodation = {
        id: dbProduct.id,
        name: dbProduct.name,
        region: (dbVars.region || dbProduct.category || (staticEntry ? staticEntry.region : "alto-paraiso")) as AccRegion,
        type: (dbVars.type || dbVars.accommodation_type || (staticEntry ? staticEntry.type : "pousada")) as AccType,
        priceRange: dbVars.priceRange || (staticEntry ? staticEntry.priceRange : "R$ 0 – R$ 0"),
        capacity: dbVars.capacity || (staticEntry ? staticEntry.capacity : "2"),
        units: Number(dbVars.units || (staticEntry ? staticEntry.units : 1)),
        totalCapacity: Number(dbVars.totalCapacity || (staticEntry ? staticEntry.totalCapacity : 2)),
        instagram: dbVars.instagram || (staticEntry ? staticEntry.instagram : undefined),
        amenities: (dbVars.amenities || (staticEntry ? staticEntry.amenities : [])) as Amenity[],
        description: {
          pt: dbProduct.description || (staticEntry ? staticEntry.description?.pt || "" : ""),
          en: (staticEntry ? staticEntry.description?.en || "" : dbProduct.description || ""),
          es: (staticEntry ? staticEntry.description?.es || "" : dbProduct.description || ""),
        },
        imageIndex: staticEntry ? staticEntry.imageIndex : 1,
        website: dbVars.website || (staticEntry ? staticEntry.website : undefined),
        phone: dbVars.phone || (staticEntry ? staticEntry.phone : undefined),
        email: dbVars.email || (staticEntry ? staticEntry.email : undefined),
        bookingUrl: dbVars.bookingUrl || (staticEntry ? staticEntry.bookingUrl : undefined),
        longDescription: {
          pt: dbVars.longDescription_pt || (staticEntry ? staticEntry.longDescription?.pt || "" : ""),
          en: dbVars.longDescription_en || (staticEntry ? staticEntry.longDescription?.en || "" : ""),
          es: dbVars.longDescription_es || (staticEntry ? staticEntry.longDescription?.es || "" : ""),
        },
        storageId: dbProduct.category || (staticEntry?.id) || dbProduct.id,
      };

      return mapped;
    });
  }, [dbProducts]);

  const maxPriceInData = useMemo(() => {
    let max = GLOBAL_MAX;
    accommodations.forEach(a => {
      const matches = a.priceRange.match(/\d+/g);
      if (matches) {
        matches.forEach(m => {
          const p = parseInt(m);
          if (p > max) max = p;
        });
      }
    });
    return max;
  }, [accommodations]);

  useEffect(() => {
    setPriceMax(maxPriceInData);
  }, [maxPriceInData]);

  const filtered = useMemo(
    () =>
      filterAccommodations(
        selectedRegions,
        undefined,
        searchQuery,
        priceMax,
        selectedAmenities,
        unitsMin,
        capacityMin,
        accommodations
      ),
    [
      selectedRegions,
      searchQuery,
      priceMax,
      selectedAmenities,
      unitsMin,
      capacityMin,
      accommodations,
    ]
  );

  return (
    <Layout>
      <PageSEO
        title="Hospedagens na Chapada dos Veadeiros"
        description="Pousadas, chalés e casas selecionadas pela ATMOS em Alto Paraíso, São Jorge e Cavalcante. Compare preços, comodidades e localização."
        path="/hospedagens"
      />
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroHospedagens}
          alt="Hospedagens na Chapada dos Veadeiros"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-white/80 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-4 block">Hospedagens ATMOS</span>
          <h1 className="text-5xl md:text-7xl font-display text-white mb-6 drop-shadow-sm leading-tight">{l.title}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-sm">
            {l.subtitle}
          </p>
        </div>
      </section>



      <section className="py-0 md:py-16 min-h-screen bg-[#FDFCFB]">
        <div className="container px-4">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8">
            <aside className="sticky top-16 z-20 -mx-4 lg:mx-0 lg:sticky lg:top-24 lg:self-start lg:w-72 flex-shrink-0 bg-[#FDFCFB]/95 backdrop-blur-md lg:bg-transparent">
              <div className="px-4 py-3 lg:bg-card/90 lg:backdrop-blur-sm lg:rounded-2xl lg:p-5 lg:shadow-sm lg:border lg:border-border">
                <CollapsibleFilters>
                  <AccommodationFilters
                    selectedRegions={selectedRegions}
                    searchQuery={searchQuery}
                    priceMax={priceMax}
                    maxPrice={maxPriceInData}
                    selectedAmenities={selectedAmenities}
                    unitsMin={unitsMin}
                    capacityMin={capacityMin}
                    onRegionsChange={setSelectedRegions}
                    onSearchChange={setSearchQuery}
                    onPriceMaxChange={setPriceMax}
                    onAmenitiesChange={setSelectedAmenities}
                    onUnitsMinChange={setUnitsMin}
                    onCapacityMinChange={setCapacityMin}
                    resultCount={filtered.length}
                  />
                </CollapsibleFilters>
              </div>
            </aside>

            <div className="flex-1">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 -mx-4 sm:mx-0 sm:gap-5">
                  {filtered.map((acc) => (
                    <AccommodationCard
                      key={acc.id}
                      accommodation={acc}
                      onClick={() => setSelectedAccommodation(acc)}
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

      <AccommodationDetailDialog
        accommodation={selectedAccommodation}
        open={!!selectedAccommodation}
        onOpenChange={(open) => !open && setSelectedAccommodation(null)}
      />
    </Layout>
  );
};

export default Accommodations;
