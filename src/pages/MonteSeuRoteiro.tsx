import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { storageUrl } from "@/lib/storage";
import { useProducts } from "@/hooks/useProducts";

// Icons
import { Droplets, Sparkles, Home, Wrench, Heart, Search, ChevronDown } from "lucide-react";

// Data
import { waterfalls as staticWaterfalls, Waterfall, regionLabels as wfRegionLabels, difficultyLabels, seasonalityLabels } from "@/data/waterfalls";
import { experiences as staticExperiences, Experience, ExperienceCategory, categoryLabels as expCategoryLabels, parseMinPrice } from "@/data/experiences";
import { accommodations as staticAccommodations, Accommodation, AccRegion, AccType, accRegionLabels, accTypeLabels, amenityLabels, getAllAmenities, parsePriceRange } from "@/data/accommodations";
import { services as staticServices, Service, categoryLabels as srvCategoryLabels } from "@/data/services";

// Components
import WaterfallCard from "@/components/waterfalls/WaterfallCard";
import WaterfallDetailDialog from "@/components/waterfalls/WaterfallDetailDialog";

import ExperienceCard from "@/components/experiences/ExperienceCard";
import ExperienceDetailDialog from "@/components/experiences/ExperienceDetailDialog";

import AccommodationCard from "@/components/accommodations/AccommodationCard";
import AccommodationDetailDialog from "@/components/accommodations/AccommodationDetailDialog";

import ServiceCard from "@/components/services/ServiceCard";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const heroBg = storageUrl("home/cat-waterfalls.jpg");



const TABS = [
  { id: 'waterfalls', label: 'Cachoeiras', icon: Droplets, image: storageUrl("cachoeiras/bocaina-farias-1.jpg"), description: "Quedas d'água secretas" },
  { id: 'experiences', label: 'Experiências', icon: Sparkles, image: storageUrl("experiencias/cavalo-1.jpg"), description: "Momentos imersivos" },
  { id: 'hospedagens', label: 'Hospedagens', icon: Home, image: storageUrl("hospedagens/casa-poema-1.jpg"), description: "Refúgios extraordinários" },
  { id: 'services', label: 'Serviços', icon: Wrench, image: storageUrl("servicos/drone.jpg"), description: "Comodidade total" },
];

// Shared MultiSelect Component
const FilterMultiSelect = ({ value, onChange, options, defaultLabel, language }: { value: string[], onChange: (val: string[]) => void, options: {value: string, label: string}[], defaultLabel: string, language: string }) => {
  const handleToggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 bg-[#FDFCFB]/80 backdrop-blur-sm border border-[#2C3E2D]/10 text-[#1A261B] text-[10px] md:text-xs uppercase tracking-widest pl-5 pr-4 py-3 rounded-full hover:border-[#1A261B]/40 transition-all shadow-sm shrink-0 font-medium whitespace-nowrap">
          {value.length === 0 ? defaultLabel : `${defaultLabel} (${value.length})`}
          <ChevronDown className="w-4 h-4 text-[#2C3E2D]/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-2 bg-white/95 backdrop-blur-md border-[#2C3E2D]/10 shadow-2xl rounded-2xl z-[100]" 
        align="start"
        onInteractOutside={(e) => {
          // Prevent closing if interacting with elements inside the Popover
          if (e.target instanceof Element && (e.target.closest('[data-radix-popover-content]') || e.target.closest('[role="dialog"]'))) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-1 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
          {options.map((opt) => (
            <div 
              key={opt.value}
              className="flex items-center gap-3 p-2 hover:bg-[#566952]/5 rounded-xl cursor-pointer transition-colors group"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggle(opt.value);
              }}
            >
              <Checkbox 
                checked={value.includes(opt.value)}
                onCheckedChange={() => handleToggle(opt.value)}
                className="border-[#2C3E2D]/20 data-[state=checked]:bg-[#566952] data-[state=checked]:border-[#566952]"
              />
              <span className="text-xs text-[#1A261B] group-hover:text-[#566952] transition-colors">{opt.label}</span>
            </div>
          ))}
        </div>
        {value.length > 0 && (
          <div className="pt-2 mt-2 border-t border-[#2C3E2D]/5">
            <button 
              onClick={() => onChange([])}
              className="w-full text-center text-[10px] uppercase tracking-wider text-[#2C3E2D]/40 hover:text-rose-500 py-1 transition-colors"
            >
              {language === "pt" ? "Limpar" : "Clear"}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Range Slider Component
const FilterSlider = ({ value, onChange, min, max, step, label, unit }: { value: number[], onChange: (val: number[]) => void, min: number, max: number, step?: number, label: string, unit?: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="flex items-center gap-2 bg-[#FDFCFB]/80 backdrop-blur-sm border border-[#2C3E2D]/10 text-[#1A261B] text-[10px] md:text-xs uppercase tracking-widest pl-5 pr-4 py-3 rounded-full hover:border-[#1A261B]/40 transition-all shadow-sm shrink-0 font-medium whitespace-nowrap">
        {label}: {value[0]} - {value[1]}{unit}
        <ChevronDown className="w-4 h-4 text-[#2C3E2D]/40" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-[280px] p-6 bg-white/95 backdrop-blur-md border-[#2C3E2D]/10 shadow-2xl rounded-2xl z-[100]" align="start">
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <span className="text-[10px] uppercase tracking-widest text-[#2C3E2D]/60 font-bold">{label}</span>
          <span className="text-sm font-display text-[#1A261B] font-bold">{value[0]} - {value[1]}{unit}</span>
        </div>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <Slider
            defaultValue={value}
            value={value}
            min={min}
            max={max}
            step={step || 1}
            onValueChange={onChange}
            className="py-4 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#2C3E2D]/40 font-medium">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default function MonteSeuRoteiro() {
  const { language } = useLanguage();
  const { count } = useWishlist();
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters State
  const [accRegionFilter, setAccRegionFilter] = useState<string[]>([]);
  const [accTypeFilter, setAccTypeFilter] = useState<string[]>([]);
  const [accPriceFilter, setAccPriceFilter] = useState([0, 5000]);
  const [accUnitsFilter, setAccUnitsFilter] = useState([0, 50]);
  const [accCapacityFilter, setAccCapacityFilter] = useState([0, 50]);
  const [accAmenityFilter, setAccAmenityFilter] = useState<string[]>([]);
  
  const [wfRegionFilter, setWfRegionFilter] = useState<string[]>([]);
  const [wfDifficultyFilter, setWfDifficultyFilter] = useState<string[]>([]);
  const [wfSeasonalityFilter, setWfSeasonalityFilter] = useState<string[]>([]);
  const [wfTrailFilter, setWfTrailFilter] = useState([0, 20]);
  const [wfCarDistanceFilter, setWfCarDistanceFilter] = useState([0, 200]);
  
  const [expCategoryFilter, setExpCategoryFilter] = useState<string[]>([]);
  const [expPriceFilter, setExpPriceFilter] = useState([0, 2000]);

  const [srvCategoryFilter, setSrvCategoryFilter] = useState<string[]>([]);

  // Dialog states
  const { data: dbWaterfalls = [] } = useProducts("waterfall");
  const { data: dbExperiences = [] } = useProducts("experience");
  const { data: dbAccommodations = [] } = useProducts("accommodation");
  const { data: dbServices = [] } = useProducts("service");

  const waterfalls = useMemo(() => {
    const merged = [...staticWaterfalls];
    dbWaterfalls.forEach(db => {
      const idx = merged.findIndex(i => i.id === db.source_id);
      const vars = (db.variables || {}) as any;
      const mapped: Waterfall = {
        id: db.source_id || db.id,
        name: { pt: db.name, en: db.name, es: db.name },
        region: db.region || (idx > -1 ? merged[idx].region : "alto-paraiso"),
        distanceKm: vars.distanceKm || (idx > -1 ? merged[idx].distanceKm : 0),
        distanceCarKm: vars.distanceCarKm || (idx > -1 ? merged[idx].distanceCarKm : 0),
        difficulty: vars.difficulty || (idx > -1 ? merged[idx].difficulty : "facil"),
        seasonality: vars.seasonality || (idx > -1 ? merged[idx].seasonality : "ano-todo"),
        description: { pt: db.description || "", en: db.description || "", es: db.description || "" },
        coordinates: vars.coordinates || (idx > -1 ? merged[idx].coordinates : { lat: 0, lng: 0 }),
      };
      if (idx > -1) merged[idx] = mapped; else merged.push(mapped);
    });
    return merged;
  }, [dbWaterfalls]);

  const experiences = useMemo(() => {
    const merged = [...staticExperiences];
    dbExperiences.forEach(db => {
      const idx = merged.findIndex(i => i.id === db.source_id || i.name.pt.toLowerCase() === db.name.toLowerCase());
      const vars = (db.variables || {}) as any;
      const staticEntry = idx > -1 ? merged[idx] : null;
      const validCategories = ["aventura", "bem-estar", "cultura", "contemplacao"];
      const rawCat = (db.category || db.segment || "").toLowerCase();
      const finalCat = validCategories.includes(rawCat) ? rawCat : (staticEntry?.category ?? "aventura");

      const mapped: Experience = {
        id: db.source_id || db.id,
        name: {
          pt: db.name,
          en: staticEntry?.name.en ?? db.name,
          es: staticEntry?.name.es ?? db.name,
        },
        category: finalCat as ExperienceCategory,
        priceRange: staticEntry?.priceRange || vars.priceRange || "",
        description: {
          // Always prefer static descriptions (rich, multilingual)
          pt: staticEntry?.description.pt || db.description || "",
          en: staticEntry?.description.en || db.description || "",
          es: staticEntry?.description.es || db.description || "",
        },
        // Always prefer static imageKey so gallery images resolve correctly
        imageKey: staticEntry?.imageKey || db.source_id || db.id,
      };
      if (idx > -1) merged[idx] = mapped; else merged.push(mapped);
    });
    return merged;
  }, [dbExperiences]);

  const accommodations = useMemo(() => {
    const merged = [...staticAccommodations];
    dbAccommodations.forEach(db => {
      const idx = merged.findIndex(i => i.id === db.source_id || i.name.toLowerCase() === db.name.toLowerCase());
      const vars = (db.variables || {}) as any;
      const staticEntry = idx > -1 ? merged[idx] : null;
      const mapped: Accommodation = {
        id: db.source_id || db.id,
        name: db.name,
        region: (db.region || staticEntry?.region || "alto-paraiso") as AccRegion,
        type: (db.segment || staticEntry?.type || "pousada") as AccType,
        priceRange: staticEntry?.priceRange || vars.priceRange || "",
        amenities: vars.amenities || staticEntry?.amenities || [],
        units: vars.units || staticEntry?.units || 1,
        totalCapacity: vars.totalCapacity || staticEntry?.totalCapacity || 2,
        capacity: staticEntry?.capacity || "",
        imageIndex: staticEntry?.imageIndex || 1,
        // Preserve multilingual description structure from static data
        description: {
          pt: staticEntry?.description.pt || db.description || "",
          en: staticEntry?.description.en || db.description || "",
          es: staticEntry?.description.es || db.description || "",
        },
        longDescription: staticEntry?.longDescription,
        instagram: staticEntry?.instagram,
        website: staticEntry?.website,
        bookingUrl: staticEntry?.bookingUrl,
        phone: staticEntry?.phone,
      };
      if (idx > -1) merged[idx] = mapped; else merged.push(mapped);
    });
    return merged;
  }, [dbAccommodations]);

  const services = useMemo(() => {
    const merged = [...staticServices];
    dbServices.forEach(db => {
      const idx = merged.findIndex(i => i.id === db.source_id);
      const vars = (db.variables || {}) as any;
      
      // Map admin categories to frontend categories
      const adminCat = (db.category || "").toLowerCase();
      let finalCat: ServiceCategory = "especial";
      
      if (adminCat === "lanche" || adminCat === "gastronomia") finalCat = "alimentacao";
      else if (adminCat === "drone") finalCat = "registros";
      else if (adminCat === "transfer") finalCat = "transfers";
      else if (adminCat === "especial") finalCat = "especial";
      else if (idx > -1) finalCat = merged[idx].category;

      const mapped: Service = {
        id: db.source_id || db.id,
        title: { pt: db.name, en: db.name, es: db.name },
        subtitle: { 
          pt: vars.subtitle || (db.segment && db.segment !== "b2c" && db.segment !== "b2b" ? db.segment : ""), 
          en: vars.subtitle_en || vars.subtitle || "", 
          es: vars.subtitle_es || vars.subtitle || "" 
        },
        category: finalCat,
        price: vars.price || (idx > -1 ? merged[idx].price : ""),
        description: { pt: db.description || "", en: db.description || "", es: db.description || "" },
        variations: vars.variations,
        type: "service",
        variables: vars,
        name: db.name,
      };
      if (idx > -1) merged[idx] = mapped; else merged.push(mapped);
    });
    return merged;
  }, [dbServices]);

  const [selectedWaterfall, setSelectedWaterfall] = useState<Waterfall | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const texts = {
    heroTitle: language === "pt" ? "Explore a Chapada dos Veadeiros" : "Explore Chapada dos Veadeiros",
    heroTagline: language === "pt" ? "A sua viagem começa agora" : "Your journey starts now",
    introTitle: language === "pt" ? "SEJA BEM-VINDO À ATMOS" : "WELCOME TO ATMOS",
    introTagline: language === "pt" ? "CURADORIA EXCLUSIVA" : "EXCLUSIVE CURATION",
    introSubtitle: language === "pt" 
      ? "Sua jornada começa aqui. Explore nossa seleção de cachoeiras, hospedagens, experiências e serviços extras. Adicione o que deseja ao seu roteiro clicando no coração, usaremos suas escolhas como base para desenhar uma experiência personalizada na Chapada dos Veadeiros para você. Caso não saiba o que adicionar, consulte nossa página de sugestões" 
      : "Your journey starts here. Explore our selection of waterfalls, accommodations, experiences, and extra services. Add what you want to your itinerary by clicking the heart — we will use your choices as a basis to design a personalized experience in Chapada dos Veadeiros for you. If you don't know what to add, consult our suggestions page",
    sendWishlist: language === "pt" ? "Concluir & Enviar" : "Conclude & Send",
  };

  const currentLang = language as "pt" | "en" | "es";

  return (
    <Layout hideWishlist={true}>
      <PageSEO
        title="Monte seu Roteiro | ATMOS"
        description="Crie seu roteiro personalizado na Chapada dos Veadeiros com a ATMOS navegando por categorias."
        path="/monte-seu-roteiro"
      />

      {/* Hero with Video Background */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Cinematic Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={storageUrl("monte-seu-roteiro/monte-seu-roteiro-bg.mp4")} type="video/mp4" />
        </video>
        
        {/* Clean Dark Overlay only */}
        <div className="absolute inset-0 bg-black/40" />

        <div className="container px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <span className="text-white/70 uppercase tracking-[0.5em] text-[10px] md:text-[11px] font-bold mb-6 block drop-shadow-lg">
              {texts.heroTagline}
            </span>
            <h1 className="text-5xl md:text-8xl font-display text-white/40 mb-8 drop-shadow-sm leading-tight mix-blend-overlay">
              {texts.heroTitle}
            </h1>
          </motion.div>
        </div>
      </section>


      {/* Content area: Tabs & Grids */}
      <section className="py-24 bg-white" id="categorias">
        <div className="container px-6 max-w-7xl mx-auto">
          
          <div className="text-left mb-16">
            <span className="text-[#566952] uppercase tracking-[0.4em] text-[10px] md:text-[11px] font-bold mb-4 block">
              {texts.introTagline}
            </span>
            <h2 className="text-4xl md:text-7xl font-display text-[#1A261B] mb-8 uppercase leading-tight">
              {texts.introTitle}
            </h2>
            <div className="w-24 h-[1px] bg-[#1A261B]/20 mr-auto mb-8" />
            <p className="text-[#2C3E2D]/60 font-light text-xl max-w-3xl mr-auto leading-relaxed">
              {language === "pt" ? (
                <>
                  Sua jornada começa aqui. Explore nossa seleção de cachoeiras, hospedagens, experiências e serviços extras. 
                  Adicione o que deseja ao seu roteiro clicando no coração, usaremos suas escolhas como base para desenhar uma experiência 
                  personalizada na Chapada dos Veadeiros para você. Caso não saiba o que adicionar, consulte nossa{" "}
                  <Link to="/roteiros" className="underline hover:text-[#566952] transition-colors">página de sugestões</Link>
                </>
              ) : (
                <>
                  Your journey starts here. Explore our selection of waterfalls, accommodations, experiences, and extra services. 
                  Add what you want to your itinerary by clicking the heart — we will use your choices as a basis to design a 
                  personalized experience in Chapada dos Veadeiros for you. If you don't know what to add, consult our{" "}
                  <Link to="/roteiros" className="underline hover:text-[#566952] transition-colors">suggestions page</Link>
                </>
              )}
            </p>
          </div>

          {/* New Category Menu with Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery("");
                    setAccRegionFilter([]);
                    setAccTypeFilter([]);
                    setAccPriceFilter([0, 5000]);
                    setAccUnitsFilter([0, 50]);
                    setAccCapacityFilter([0, 50]);
                    setAccAmenityFilter([]);
                    
                    setWfRegionFilter([]);
                    setWfDifficultyFilter([]);
                    setWfSeasonalityFilter([]);
                    setWfTrailFilter([0, 20]);
                    setWfCarDistanceFilter([0, 200]);
                    setExpCategoryFilter([]);
                    setExpPriceFilter([0, 2000]);
                    setSrvCategoryFilter([]);
                  }}
                  className={`group relative h-48 md:h-72 overflow-hidden transition-all duration-700 rounded-[2px] ${
                    isActive ? "ring-2 ring-[#1A261B] ring-offset-4" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  {/* Background Image */}
                  <img
                    src={tab.image}
                    alt={tab.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  {/* Overlay */}
                  <div className={`absolute inset-0 transition-colors duration-500 ${
                    isActive ? "bg-[#1A261B]/40" : "bg-black/40 group-hover:bg-black/20"
                  }`} />
                  
                  {/* Content */}
                  <div className="relative h-full flex items-center justify-center text-white p-6">
                    <h3 className="text-xl md:text-2xl font-display uppercase tracking-[0.3em] font-light text-center">{tab.label}</h3>
                  </div>

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-white"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Category Header */}
          <div className="max-w-7xl mx-auto w-full mb-10">
            <motion.div
              key={activeTab + "-header"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-6"
            >
              <div className="h-12 w-[1px] bg-[#1A261B]/10 hidden md:block" />
              <div>
                <span className="text-[#566952] uppercase tracking-[0.4em] text-[10px] font-bold opacity-60 mb-1 block">
                  {language === "pt" ? "Explorando Categoria" : "Exploring Category"}
                </span>
                <h3 className="text-3xl md:text-5xl font-display text-[#1A261B] uppercase tracking-widest leading-none">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h3>
              </div>
            </motion.div>
          </div>

          {/* Search and Filters Area */}
          <div className="max-w-7xl mx-auto w-full mb-8 flex flex-col gap-4">
            
            {/* Search Bar */}
            <div className="relative w-full max-w-[320px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C3E2D]/40" />
              <input
                type="text"
                placeholder={language === "pt" ? "Buscar por nome..." : "Search by name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#2C3E2D]/10 rounded-full py-3.5 pl-12 pr-6 text-sm text-[#1A261B] focus:outline-none focus:ring-1 focus:ring-[#2C3E2D]/30 transition-all placeholder:text-[#2C3E2D]/40 shadow-sm"
              />
            </div>

            {/* Dynamic Dropdown Filters */}
            <div className="w-full relative">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={activeTab + "-filters"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-wrap items-center justify-start gap-3"
                >
                  {activeTab === 'hospedagens' && (
                    <>
                      <FilterMultiSelect 
                        value={accRegionFilter}
                        onChange={setAccRegionFilter}
                        options={Object.entries(accRegionLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Região" : "Region"}
                        language={language}
                      />
                      <FilterMultiSelect 
                        value={accTypeFilter}
                        onChange={setAccTypeFilter}
                        options={Object.entries(accTypeLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Categoria" : "Category"}
                        language={language}
                      />
                      <FilterSlider
                        label={language === "pt" ? "Preço" : "Price"}
                        value={accPriceFilter}
                        onChange={setAccPriceFilter}
                        min={0}
                        max={5000}
                        step={100}
                        unit="/n"
                      />
                      <FilterSlider
                        label={language === "pt" ? "Acomodações" : "Units"}
                        value={accUnitsFilter}
                        onChange={setAccUnitsFilter}
                        min={0}
                        max={50}
                      />
                      <FilterSlider
                        label={language === "pt" ? "Capacidade" : "Capacity"}
                        value={accCapacityFilter}
                        onChange={setAccCapacityFilter}
                        min={0}
                        max={50}
                      />
                      <FilterMultiSelect 
                        value={accAmenityFilter}
                        onChange={setAccAmenityFilter}
                        options={getAllAmenities().map(a => ({ value: a, label: amenityLabels[a][currentLang] }))}
                        defaultLabel={language === "pt" ? "Comodidades" : "Amenities"}
                        language={language}
                      />
                    </>
                  )}

                  {activeTab === 'waterfalls' && (
                    <>
                      <FilterMultiSelect 
                        value={wfRegionFilter}
                        onChange={setWfRegionFilter}
                        options={Object.entries(wfRegionLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Região" : "Region"}
                        language={language}
                      />
                      <FilterMultiSelect 
                        value={wfDifficultyFilter}
                        onChange={setWfDifficultyFilter}
                        options={Object.entries(difficultyLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Dificuldade" : "Difficulty"}
                        language={language}
                      />
                      <FilterMultiSelect 
                        value={wfSeasonalityFilter}
                        onChange={setWfSeasonalityFilter}
                        options={Object.entries(seasonalityLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Sazonalidade" : "Seasonality"}
                        language={language}
                      />
                      <FilterSlider
                        label={language === "pt" ? "Trilha" : "Trail"}
                        value={wfTrailFilter}
                        onChange={setWfTrailFilter}
                        min={0}
                        max={20}
                        step={0.5}
                        unit="km"
                      />
                      <FilterSlider
                        label={language === "pt" ? "Carro" : "Car"}
                        value={wfCarDistanceFilter}
                        onChange={setWfCarDistanceFilter}
                        min={0}
                        max={200}
                        unit="km"
                      />
                    </>
                  )}

                  {activeTab === 'experiences' && (
                    <>
                      <FilterMultiSelect 
                        value={expCategoryFilter}
                        onChange={setExpCategoryFilter}
                        options={Object.entries(expCategoryLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                        defaultLabel={language === "pt" ? "Categoria" : "Category"}
                        language={language}
                      />
                      <FilterSlider
                        label={language === "pt" ? "Preço" : "Price"}
                        value={expPriceFilter}
                        onChange={setExpPriceFilter}
                        min={0}
                        max={2000}
                        step={50}
                        unit="R$"
                      />
                    </>
                  )}

                  {activeTab === 'services' && (
                    <FilterMultiSelect 
                      value={srvCategoryFilter}
                      onChange={setSrvCategoryFilter}
                      options={Object.entries(srvCategoryLabels).map(([k, v]) => ({ value: k, label: v[currentLang] }))}
                      defaultLabel={language === "pt" ? "Todos os Serviços" : "All Services"}
                      language={language}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Catalog Grids */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {activeTab === 'waterfalls' && waterfalls
                  .filter(item => {
                    const matchSearch = item.name[currentLang].toLowerCase().includes(searchQuery.toLowerCase());
                    const matchReg = wfRegionFilter.length === 0 || wfRegionFilter.includes(item.region);
                    const matchDiff = wfDifficultyFilter.length === 0 || wfDifficultyFilter.includes(item.difficulty);
                    const matchSeason = wfSeasonalityFilter.length === 0 || wfSeasonalityFilter.includes(item.seasonality);
                    const matchTrail = item.distanceKm >= wfTrailFilter[0] && item.distanceKm <= wfTrailFilter[1];
                    const matchCar = item.distanceCarKm >= wfCarDistanceFilter[0] && item.distanceCarKm <= wfCarDistanceFilter[1];
                    return matchSearch && matchReg && matchDiff && matchSeason && matchTrail && matchCar;
                  })
                  .map(item => (
                  <WaterfallCard 
                    key={item.id} 
                    waterfall={item} 
                    onClick={() => setSelectedWaterfall(item)} 
                  />
                ))}

                {activeTab === 'experiences' && experiences
                  .filter(item => {
                    const matchSearch = item.name[currentLang].toLowerCase().includes(searchQuery.toLowerCase());
                    const matchCat = expCategoryFilter.length === 0 || expCategoryFilter.includes(item.category);
                    
                    const minPrice = parseMinPrice(item.priceRange) || 0;
                    const matchPrice = minPrice >= expPriceFilter[0] && minPrice <= expPriceFilter[1];

                    return matchSearch && matchCat && matchPrice;
                  })
                  .map(item => (
                  <ExperienceCard 
                    key={item.id} 
                    experience={item} 
                    onClick={() => setSelectedExperience(item)} 
                  />
                ))}

                {activeTab === 'hospedagens' && accommodations
                  .filter(item => {
                    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchReg = accRegionFilter.length === 0 || accRegionFilter.includes(item.region);
                    const matchType = accTypeFilter.length === 0 || accTypeFilter.includes(item.type);
                    const matchUnits = item.units >= accUnitsFilter[0] && item.units <= accUnitsFilter[1];
                    const matchCapacity = item.totalCapacity >= accCapacityFilter[0] && item.totalCapacity <= accCapacityFilter[1];
                    const matchAmenity = accAmenityFilter.length === 0 || accAmenityFilter.every(a => item.amenities.includes(a as any));
                    
                    const [lo] = parsePriceRange(item.priceRange);
                    const matchPrice = lo >= accPriceFilter[0] && lo <= accPriceFilter[1];

                    return matchSearch && matchReg && matchType && matchUnits && matchCapacity && matchAmenity && matchPrice;
                  })
                  .map(item => (
                  <AccommodationCard 
                    key={item.id} 
                    accommodation={item} 
                    onClick={() => setSelectedAccommodation(item)} 
                  />
                ))}

                {activeTab === 'services' && services
                  .filter(item => {
                    const matchSearch = item.title[currentLang].toLowerCase().includes(searchQuery.toLowerCase());
                    const matchCat = srvCategoryFilter.length === 0 || srvCategoryFilter.includes(item.category);
                    return matchSearch && matchCat;
                  })
                  .map(item => (
                  <ServiceCard 
                    key={item.id} 
                    service={item} 
                    onClick={() => setSelectedService(item)} 
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </section>

      {/* Floating Wishlist CTA when items > 0 */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center drop-shadow-2xl"
          >
            <Button
              className="px-10 py-8 bg-[#1A261B] hover:bg-black text-white rounded-full font-bold uppercase tracking-[0.3em] text-[10px] shadow-2xl flex items-center gap-4 transition-all duration-500 transform hover:scale-105 border border-white/10"
              onClick={() => navigate('/wishlist')}
            >
              <Heart className="w-4 h-4 fill-current text-rose-400" />
              {texts.sendWishlist}
              <span className="flex items-center justify-center w-6 h-6 bg-white/10 text-white rounded-full text-[10px] ml-2 border border-white/20">
                {count}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <WaterfallDetailDialog 
        waterfall={selectedWaterfall} 
        open={!!selectedWaterfall} 
        onOpenChange={(open) => !open && setSelectedWaterfall(null)} 
      />
      <ExperienceDetailDialog 
        experience={selectedExperience} 
        open={!!selectedExperience} 
        onOpenChange={(open) => !open && setSelectedExperience(null)} 
      />
      <AccommodationDetailDialog 
        accommodation={selectedAccommodation} 
        open={!!selectedAccommodation} 
        onOpenChange={(open) => !open && setSelectedAccommodation(null)} 
      />
      <ServiceDetailDialog 
        service={selectedService} 
        open={!!selectedService} 
        onOpenChange={(open) => !open && setSelectedService(null)} 
      />

    </Layout>
  );
}
