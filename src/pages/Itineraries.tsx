import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts } from "@/hooks/useProducts";
import { getDurations, getItinerariesByDuration, type DurationDays, type Itinerary, itineraries as staticItineraries } from "@/data/itineraries";
import { itineraryImages } from "@/components/itineraries/itineraryImages";
import { dayImages } from "@/components/itineraries/dayImages";
import { 
  ArrowRight, 
  Sparkles, 
  Map, 
  Flame, 
  Mountain, 
  Clock,
  Compass,
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { getDayImage } from "@/components/itineraries/dayImages";

const pageLabels = {
  pt: {
    title: "Sugestões Atmos",
    subtitle: "Explore os roteiros criados pela Atmos para diferentes perfis de viajantes, aqui o roteiro foi pensado já com combinações que funcionam perfeitamente juntas.",
    filterLabel: "Selecione a duração da sua jornada",
    days: "dias",
    viewDetails: "Explorar Roteiro",
    classico: "Clássico",
    jurassico: "Jurássico",
    highlights: "Destaques do Roteiro",
    bespokeTitle: "Monte Seu Roteiro",
    bespokeDesc: "Caso não queira nenhum roteiro sugerido pela Atmos, e prefira criar seu roteiro sob medida clique aqui.",
    bespokeBtn: "Criar Roteiro",
    tag: "Roteiros Exclusivos",
  },
  en: {
    title: "Atmos Suggestions",
    subtitle: "Explore itineraries created by Atmos for different traveler profiles, where every journey is designed with combinations that work perfectly together.",
    filterLabel: "Select your journey duration",
    days: "days",
    viewDetails: "Explore Itinerary",
    classico: "Classic",
    jurassico: "Jurassic",
    highlights: "Itinerary Highlights",
    bespokeTitle: "Build Your Itinerary",
    bespokeDesc: "If you don't want any of the itineraries suggested by Atmos and prefer to create your own tailor-made itinerary, click here.",
    bespokeBtn: "Create Itinerary",
    tag: "Exclusive Itineraries",
  },
  es: {
    title: "Sugerencias Atmos",
    subtitle: "Explore los itinerarios creados por Atmos para diferentes perfiles de viajeros, donde cada viaje está diseñado con combinaciones que funcionan perfectamente juntas.",
    filterLabel: "Seleccione la duración de su jornada",
    days: "días",
    viewDetails: "Explorar Itinerario",
    classico: "Clásico",
    jurassico: "Jurásico",
    highlights: "Destaques del Itinerario",
    bespokeTitle: "Cree su Itinerario",
    bespokeDesc: "Si não deseja nenhum itinerário sugerido por Atmos, e prefere criar seu itinerário sob medida clique aqui.",
    bespokeBtn: "Crear Itinerario",
    tag: "Itinerarios Exclusivos",
  },
};

const ItineraryRow = ({ itinerary, language, l, navigate }: any) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isJurassico = itinerary.category === "jurassico";

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className="container px-4"
    >
      {/* Row Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
              isJurassico 
                ? "bg-red-50 text-red-600 border border-red-100" 
                : "bg-[#C5A267]/10 text-[#C5A267] border border-[#C5A267]/20"
            }`}>
              {isJurassico ? l.jurassico : l.classico}
            </span>
            <div className="flex items-center gap-1.5 text-[#1A261B]/40 text-[10px] font-bold uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              {itinerary.duration} {l.days}
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-display text-[#1A261B] tracking-tight">
            {itinerary.name[language]}
          </h2>
          <p className="text-[#1A261B]/60 text-lg font-light max-w-2xl leading-relaxed">
            {itinerary.description[language]}
          </p>
        </div>
        
        <button
          onClick={() => navigate(`/roteiros/${itinerary.id}`)}
          className="flex items-center gap-4 group text-[#1A261B] font-bold text-xs uppercase tracking-widest"
        >
          {l.viewDetails}
          <div className="w-12 h-12 rounded-full border border-[#1A261B]/10 flex items-center justify-center transition-all group-hover:bg-[#1A261B] group-hover:text-white group-hover:scale-110">
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Items Horizontal Scroll */}
      <div className="relative group/row">
        {/* Navigation Arrows */}
        <div className="absolute top-1/2 -left-6 -translate-y-1/2 z-20 opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:block">
          <button 
            onClick={() => scroll('left')}
            className="w-12 h-12 rounded-full bg-white shadow-xl border border-black/5 flex items-center justify-center hover:bg-[#1A261B] hover:text-white transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="absolute top-1/2 -right-6 -translate-y-1/2 z-20 opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:block">
          <button 
            onClick={() => scroll('right')}
            className="w-12 h-12 rounded-full bg-white shadow-xl border border-black/5 flex items-center justify-center hover:bg-[#1A261B] hover:text-white transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-8 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
        >
          {itinerary.days.map((day: any, dayIdx: number) => (
            <div 
              key={dayIdx}
              className="flex-shrink-0 w-72 md:w-80 snap-start"
            >
              <div 
                className="relative aspect-[3/4] rounded-[2px] overflow-hidden shadow-xl group cursor-pointer bg-[#1A261B]"
                onClick={() => navigate(`/roteiros/${itinerary.id}`)}
              >
                <OptimizedImage
                  src={getDayImage(day.imageKey || "")}
                  alt={day.title?.[language] || "Atmos Itinerary"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  containerClassName="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent transition-opacity duration-500 z-[1]" />
                
                {/* Day Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold">
                    {dayIdx + 1}
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <h4 className="text-white font-display text-2xl leading-tight mb-2 drop-shadow-md">
                    {day.title?.[language] || (day.items?.[0]?.product_name ? `Dia ${dayIdx + 1} — ${day.items[0].product_name}` : `Dia ${dayIdx + 1}`)}
                  </h4>
                  <div className="flex items-center gap-1.5 text-white/90 text-[10px] uppercase font-bold tracking-[0.15em]">
                    <MapPin className="w-3 h-3 text-[#C5A267]" />
                    {day.attractions?.[language]?.[0] || day.items?.[0]?.product_name || "Atmos Expedition"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Final Card: Explore More */}
          <button 
            onClick={() => navigate(`/roteiros/${itinerary.id}`)}
            className="flex-shrink-0 w-72 md:w-80 aspect-[3/4] rounded-[2px] border border-[#1A261B]/10 flex flex-col items-center justify-center gap-6 hover:border-[#C5A267]/40 hover:bg-[#C5A267]/5 transition-all group/cta bg-white/50 backdrop-blur-sm shadow-xl"
          >
            <div className="w-14 h-14 rounded-full bg-[#1A261B]/5 flex items-center justify-center group-hover/cta:bg-[#1A261B] group-hover/cta:text-white transition-all group-hover/cta:scale-110">
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-[#1A261B]">
                {l.viewDetails}
              </span>
              <span className="block text-[9px] uppercase font-medium tracking-[0.1em] text-[#1A261B]/40">
                Ver roteiro completo
              </span>
            </div>
          </button>
        </div>
        
      </div>
    </motion.div>
  );
};

const Itineraries = () => {
  const { language = "pt" } = useLanguage();
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState<DurationDays>(3);
  
  const { data: supabaseProducts = [] } = useProducts("itinerary");

  const mergedItineraries = useMemo(() => {
    const merged = [...staticItineraries];
    
    supabaseProducts.forEach(supabaseProduct => {
      const staticIdx = merged.findIndex(i => i.id === supabaseProduct.source_id);
      const supabaseVars = (supabaseProduct.variables || {}) as any;
      
      const mapped: Itinerary = {
        id: supabaseProduct.source_id || supabaseProduct.id,
        duration: (supabaseVars.duration || (staticIdx > -1 ? merged[staticIdx].duration : 3)) as any,
        category: (supabaseProduct.segment || (staticIdx > -1 ? merged[staticIdx].category : "classico")) as any,
        name: {
          pt: supabaseProduct.name,
          en: (staticIdx > -1 ? merged[staticIdx].name.en : supabaseProduct.name),
          es: (staticIdx > -1 ? merged[staticIdx].name.es : supabaseProduct.name),
        },
        description: {
          pt: supabaseProduct.description || "",
          en: (staticIdx > -1 ? merged[staticIdx].description.en : supabaseProduct.description || ""),
          es: (staticIdx > -1 ? merged[staticIdx].description.es : supabaseProduct.description || ""),
        },
        days: supabaseVars.days || (staticIdx > -1 ? merged[staticIdx].days : []),
        pricing: supabaseVars.pricing || (staticIdx > -1 ? merged[staticIdx].pricing : { 
          atmos4x4: { individual: 0, dupla: 0, trio: 0 }, 
          carroProprio: { individual: 0, dupla: 0, trio: 0 } 
        }),
        extraCosts: supabaseVars.extraCosts || (staticIdx > -1 ? merged[staticIdx].extraCosts : { entranceFees: 0 }),
        inclusions: supabaseVars.inclusions || (staticIdx > -1 ? merged[staticIdx].inclusions : { pt: [], en: [], es: [] }),
      };

      if (staticIdx > -1) {
        merged[staticIdx] = mapped;
      } else {
        merged.push(mapped);
      }
    });
    
    return merged;
  }, [supabaseProducts]);

  const durations = getDurations();
  const currentItineraries = getItinerariesByDuration(selectedDuration, mergedItineraries)
    .sort((a, b) => (a.category === "classico" ? -1 : 1));
    
  const l = pageLabels[language as keyof typeof pageLabels] || pageLabels.pt;

  return (
    <Layout>
      <PageSEO
        title="Roteiros Personalizados e Curadoria Atmos | ATMOS"
        description="Explore nossa seleção exclusiva de roteiros clássicos e jurássicos na Chapada dos Veadeiros. Experiências planejadas para o máximo de imersão e conforto."
        keywords="roteiros chapada dos veadeiros, viagem personalizada, curadoria atmos, roteiro 3 dias, roteiro 5 dias, turismo de luxo brasil"
        path="/roteiros"
      />
      
      <div className="relative min-h-screen bg-[#FDFCFB]">
        {/* Cinematic Hero */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-[#0A0F0A]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img
              src={storageUrl("duvidas/duvidas-bg.jpg")}
              alt="Atmos Expeditions"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-black/30" />
          </motion.div>

          <div className="container px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="inline-block px-4 py-1 rounded-full bg-[#C5A267]/20 border border-[#C5A267]/30 text-[#C5A267] text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
                {l.tag}
              </span>
              <h1 className="text-5xl md:text-8xl font-display text-white mb-8 tracking-tight leading-[0.9]">
                {l.title}
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-light">
                {l.subtitle}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filter Section - Improved Visualization */}
        <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-[#1A261B]/5 py-4 md:py-8">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 md:space-y-8">
              <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.4em] text-[#1A261B]/40 block">
                {l.filterLabel}
              </span>
              <div className="inline-flex p-1 bg-[#1A261B]/5 rounded-full border border-[#1A261B]/5">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`relative px-8 md:px-12 py-3.5 rounded-full text-xs font-bold transition-all duration-500 ${
                      selectedDuration === d
                        ? "bg-[#1A261B] text-white shadow-2xl shadow-[#1A261B]/30"
                        : "text-[#1A261B]/40 hover:text-[#1A261B]"
                    }`}
                  >
                    {d} {l.days}
                    {selectedDuration === d && (
                      <motion.div 
                        layoutId="activeFilter"
                        className="absolute inset-0 bg-[#1A261B] rounded-full -z-10"
                        transition={{ type: "spring", duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Itineraries List (Stacked Rows) */}
        <section className="py-24 space-y-24">
          {currentItineraries.map((itinerary) => (
            <ItineraryRow 
              key={itinerary.id} 
              itinerary={itinerary} 
              language={language} 
              l={l} 
              navigate={navigate} 
            />
          ))}
        </section>

        {/* Compact Bespoke CTA Section - With Blurred Photo Background */}
        <section className="py-24 overflow-hidden relative bg-[#0A0F0A]">
          {/* Background Image with Blur (No Grayscale) */}
          <div className="absolute inset-0 z-0">
            <img loading="lazy" 
              src={storageUrl("duvidas/duvidas-bg.jpg")} 
              alt="" 
              className="w-full h-full object-cover opacity-60 blur-sm scale-110" 
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          <div className="container px-4 relative z-10 text-[#FDFCFB]">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold mb-8">
                <Sparkles className="w-3 h-3 text-[#C5A267]" />
                Experiência Exclusiva
              </div>
              <h2 className="text-4xl md:text-6xl font-display mb-6 tracking-tight">
                {l.bespokeTitle}
              </h2>
              <p className="text-white/60 text-base md:text-lg font-light mb-10 max-w-xl mx-auto leading-relaxed">
                {l.bespokeDesc}
              </p>
              <Link
                to="/monte-seu-roteiro"
                className="inline-flex items-center gap-4 bg-[#C5A267] text-[#1A261B] px-8 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-[#C5A267]/20"
              >
                {l.bespokeBtn}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Itineraries;
