import { useState, useMemo, useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";

import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";

const heroExperiencias = storageUrl("home/cat-experiences.jpg");
import { useLanguage } from "@/contexts/LanguageContext";
import {
  type ExperienceCategory,
  type Experience,
  filterExperiences,
  getExperiencePriceRange,
  experiences as staticExperiences,
} from "@/data/experiences";
import { useProducts } from "@/hooks/useProducts";
import ExperienceFilters from "@/components/experiences/ExperienceFilters";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import ExperienceDetailDialog from "@/components/experiences/ExperienceDetailDialog";
import CollapsibleFilters from "@/components/shared/CollapsibleFilters";

const pageLabels = {
  pt: {
    title: "Experiências",
    subtitle:
      "Vivências que revelam o território além das trilhas. De momentos de adrenalina a pausas de contemplação, descubra experiências autênticas e inesquecíveis na Chapada dos Veadeiros.",
    empty: "Nenhuma experiência encontrada com os filtros selecionados.",
  },
  en: {
    title: "Experiences",
    subtitle:
      "Experiences that reveal the territory beyond the trails. From adrenaline moments to contemplative pauses, discover authentic and unforgettable experiences in Chapada dos Veadeiros.",
    empty: "No experiences found with the selected filters.",
  },
  es: {
    title: "Experiencias",
    subtitle:
      "Vivencias que revelan el territorio más allá de los senderos. De momentos de adrenalina a pausas de contemplación, descubre experiencias auténticas e inolvidables en Chapada dos Veadeiros.",
    empty: "No se encontraron experiencias con los filtros seleccionados.",
  },
};

const Experiences = () => {
  const { language } = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState<ExperienceCategory[]>([]);
  const [priceMax, setPriceMax] = useState(() => getExperiencePriceRange()[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  const l = pageLabels[language];

  const { data: dbProducts = [] } = useProducts("experience");

  const experiences = useMemo(() => {
    // If no products in DB, fallback to static list
    if (!dbProducts || dbProducts.length === 0) {
      return staticExperiences;
    }

    // Use DB products as the base list
    return dbProducts.map(dbProduct => {
      const staticEntry = staticExperiences.find(s => 
        s.id === dbProduct.source_id || 
        s.name.pt.toLowerCase() === dbProduct.name.toLowerCase()
      );
      const dbVars = (dbProduct.variables || {}) as any;
      
      const descPt = dbProduct.description || staticEntry?.description.pt || "";
      const descEn = staticEntry?.description.en || dbProduct.description || "";
      const descEs = staticEntry?.description.es || dbProduct.description || "";

      const mapped: Experience = {
        id: dbProduct.id,
        name: {
          pt: dbProduct.name,
          en: staticEntry?.name.en ?? dbProduct.name,
          es: staticEntry?.name.es ?? dbProduct.name,
        },
        category: (dbProduct.category || staticEntry?.category || "contemplacao") as ExperienceCategory,
        priceRange: dbProduct.unit_price > 0 ? `R$ ${dbProduct.unit_price}` : (staticEntry?.priceRange ?? "Sob consulta"),
        description: {
          pt: descPt,
          en: descEn,
          es: descEs,
        },
        imageKey: dbVars.imageKey || staticEntry?.imageKey || dbProduct.source_id || dbProduct.id,
        storageId: dbProduct.category || (staticEntry?.id) || dbProduct.id,
      };

      return mapped;
    });
  }, [dbProducts]);

  const maxPriceInData = useMemo(() => {
    let max = getExperiencePriceRange()[1];
    experiences.forEach(e => {
      const match = e.priceRange.match(/R\$\s?(\d+)/);
      if (match) {
        const p = parseInt(match[1]);
        if (p > max) max = p;
      }
    });
    return max;
  }, [experiences]);

  useEffect(() => {
    setPriceMax(maxPriceInData);
  }, [maxPriceInData]);

  const filtered = useMemo(
    () => filterExperiences(selectedCategories, searchQuery, priceMax, experiences),
    [selectedCategories, searchQuery, priceMax, experiences]
  );

  return (
    <Layout>
      <PageSEO
        title="Experiências na Chapada dos Veadeiros"
        description="Passeios de bike, cavalgadas, voos de balão, mirantes e vivências culturais na Chapada dos Veadeiros. Atividades além das trilhas."
        path="/experiencias"
      />
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroExperiencias}
          alt="Experiências na Chapada dos Veadeiros"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-white/80 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-4 block">Experiências ATMOS</span>
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
                  <ExperienceFilters
                    selectedCategories={selectedCategories}
                    priceMax={priceMax}
                    maxAvailablePrice={maxPriceInData}
                    searchQuery={searchQuery}
                    onCategoriesChange={setSelectedCategories}
                    onPriceMaxChange={setPriceMax}
                    onSearchChange={setSearchQuery}
                    resultCount={filtered.length}
                  />
                </CollapsibleFilters>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 -mx-4 sm:mx-0 sm:gap-5">
                  {filtered.map((experience) => (
                    <ExperienceCard
                      key={experience.id}
                      experience={experience}
                      onClick={() => setSelectedExperience(experience)}
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
      <ExperienceDetailDialog
        experience={selectedExperience}
        open={!!selectedExperience}
        onOpenChange={(open) => !open && setSelectedExperience(null)}
      />
    </Layout>
  );
};

export default Experiences;
