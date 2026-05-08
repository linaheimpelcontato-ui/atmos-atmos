import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trackItineraryView } from "@/lib/analytics";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useProducts } from "@/hooks/useProducts";
import { getItineraryById, type ItineraryDay, type Itinerary, itineraries as staticItineraries } from "@/data/itineraries";
import { dayImages, getDayImage } from "@/components/itineraries/dayImages";
import { itineraryImages, getItineraryImage } from "@/components/itineraries/itineraryImages";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Check, 
  MapPin, 
  Mountain, 
  Flame, 
  Truck, 
  Car, 
  ArrowLeft, 
  Ticket,
  Calendar,
  Compass,
  Zap,
  Info,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CircleDollarSign,
  Map
} from "lucide-react";
import HelmetIcon from "@/components/icons/HelmetIcon";
import { toast } from "@/hooks/use-toast";
import PageSEO from "@/components/seo/PageSEO";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const difficultyConfig = {
  facil: { pt: "Fácil", en: "Easy", es: "Fácil", color: "bg-emerald-500/10 text-emerald-600" },
  moderado: { pt: "Moderado", en: "Moderate", es: "Moderado", color: "bg-amber-500/10 text-amber-600" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil", color: "bg-rose-500/10 text-rose-600" },
};

const labels = {
  pt: {
    back: "Todos os Roteiros",
    days: "dias",
    classico: "Clássico",
    jurassico: "Jurássico",
    dayByDay: "Cronograma da Jornada",
    pricing: "Investimento por pessoa",
    atmos4x4: "Com Expedição ATMOS 4x4",
    carroProprio: "Com Veículo Próprio",
    individual: "Solo",
    dupla: "Duo",
    trioPlus: "Grupo (3+)",
    inclusions: "Experiência Inclusiva",
    addWishlist: "Adicionar à Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Roteiro adicionado na wishlist!",
    removed: "Roteiro removido da wishlist.",
    notFound: "Roteiro não encontrado.",
    clickDay: "Ver detalhes do dia",
    entranceFees: "Ingressos dos atrativos",
    equipmentFees: "Equipamentos técnicos",
    chargedSeparately: "cobrados à parte",
    extraCosts: "Custos Adicionais Estimados",
    bespokeTitle: "Monte Seu Roteiro",
    bespokeDesc: "Caso não queira nenhum roteiro sugerido pela Atmos, e prefira criar seu roteiro sob medida clique aqui.",
    bespokeBtn: "Criar Roteiro",
  },
  en: {
    back: "All Itineraries",
    days: "days",
    classico: "Classic",
    jurassico: "Jurassic",
    dayByDay: "Journey Schedule",
    pricing: "Investment per person",
    atmos4x4: "With ATMOS 4x4 Expedition",
    carroProprio: "With Own Vehicle",
    individual: "Solo",
    dupla: "Duo",
    trioPlus: "Group (3+)",
    inclusions: "Inclusive Experience",
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Itinerary added to wishlist!",
    removed: "Itinerary removed from wishlist.",
    notFound: "Itinerary not found.",
    clickDay: "View day details",
    entranceFees: "Attraction entrance fees",
    equipmentFees: "Technical equipment",
    chargedSeparately: "charged separately",
    extraCosts: "Estimated Additional Costs",
    bespokeTitle: "Build Your Itinerary",
    bespokeDesc: "If you don't want any of the itineraries suggested by Atmos and prefer to create your own tailor-made itinerary, click here.",
    bespokeBtn: "Create Itinerary",
  },
  es: {
    back: "Todos los Itinerarios",
    days: "días",
    classico: "Clásico",
    jurassico: "Jurásico",
    dayByDay: "Cronograma de la Jornada",
    pricing: "Inversión por persona",
    atmos4x4: "Con Expedición ATMOS 4x4",
    carroProprio: "Con Vehículo Propio",
    individual: "Solo",
    dupla: "Dúo",
    trioPlus: "Grupo (3+)",
    inclusions: "Experiencia Inclusiva",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Itinerario agregado a la wishlist!",
    removed: "¡Itinerario quitado de la wishlist!",
    notFound: "Roteiro não encontrado.",
    clickDay: "Ver detalhes do dia",
    entranceFees: "Entradas a atractivos",
    equipmentFees: "Equipos técnicos",
    chargedSeparately: "cobrados aparte",
    extraCosts: "Costos Adicionales Estimados",
    bespokeTitle: "Cree su Itinerario",
    bespokeDesc: "Si não deseja nenhum itinerário sugerido por Atmos, e prefere criar seu itinerário sob medida clique aqui.",
    bespokeBtn: "Crear Itinerario",
  },
};

export default function ItineraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language = "pt" } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();

  const { data: dbProducts = [] } = useProducts("itinerary");

  const mergedItineraries = useMemo(() => {
    const merged = [...staticItineraries];
    
    dbProducts.forEach(dbProduct => {
      const staticIdx = merged.findIndex(i => i.id === dbProduct.source_id);
      const dbVars = (dbProduct.variables || {}) as any;
      
      const mapped: Itinerary = {
        id: dbProduct.source_id || dbProduct.id,
        duration: (dbVars.duration || (staticIdx > -1 ? merged[staticIdx].duration : 3)) as any,
        category: (dbProduct.segment || (staticIdx > -1 ? merged[staticIdx].category : "classico")) as any,
        name: {
          pt: dbProduct.name,
          en: (staticIdx > -1 ? merged[staticIdx].name.en : dbProduct.name),
          es: (staticIdx > -1 ? merged[staticIdx].name.es : dbProduct.name),
        },
        description: {
          pt: dbProduct.description || "",
          en: (staticIdx > -1 ? merged[staticIdx].description.en : dbProduct.description || ""),
          es: (staticIdx > -1 ? merged[staticIdx].description.es : dbProduct.description || ""),
        },
        days: dbVars.days || (staticIdx > -1 ? merged[staticIdx].days : []),
        pricing: dbVars.pricing || (staticIdx > -1 ? merged[staticIdx].pricing : { 
          atmos4x4: { individual: 0, dupla: 0, trio: 0 }, 
          carroProprio: { individual: 0, dupla: 0, trio: 0 } 
        }),
        extraCosts: dbVars.extraCosts || (staticIdx > -1 ? merged[staticIdx].extraCosts : { entranceFees: 0 }),
        inclusions: dbVars.inclusions || (staticIdx > -1 ? merged[staticIdx].inclusions : { pt: [], en: [], es: [] }),
      };

      if (staticIdx > -1) {
        merged[staticIdx] = mapped;
      } else {
        merged.push(mapped);
      }
    });
    
    return merged;
  }, [dbProducts]);

  const itinerary = id ? getItineraryById(id, mergedItineraries) : undefined;
  const l = labels[language as keyof typeof labels] || labels.pt;

  useEffect(() => {
    if (itinerary) {
      trackItineraryView(itinerary.name.pt, itinerary.category, itinerary.duration);
      window.scrollTo(0, 0);
    }
  }, [itinerary?.id]);

  if (!itinerary) {
    return (
      <Layout>
        <div className="container px-4 py-24 text-center">
          <p className="text-[#1A261B]/40 text-lg">{l.notFound}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/roteiros")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {l.back}
          </Button>
        </div>
      </Layout>
    );
  }

  const isJurassico = itinerary.category === "jurassico";
  const inWishlist = isInWishlist(itinerary.id);

  const toggleWishlist = () => {
    if (inWishlist) {
      removeItem(itinerary.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: itinerary.id,
        type: "itinerary",
        name: itinerary.name[language as keyof typeof itinerary.name],
        details: `${itinerary.duration} ${l.days} — ${isJurassico ? l.jurassico : l.classico}`,
      });
      toast({ title: l.added });
    }
  };

  const formatPrice = (price: number) => `R$ ${price.toLocaleString("pt-BR")}`;

  return (
    <Layout>
      <PageSEO 
        title={`${itinerary.name[language as keyof typeof itinerary.name]} | ATMOS`}
        description={itinerary.description[language as keyof typeof itinerary.description]}
        path={`/roteiros/${itinerary.id}`}
      />

      <div className="bg-[#FDFCFB]">
        {/* Cinematic Hero */}
        <section className="relative h-[85vh] overflow-hidden bg-[#0A0F0A]">
            <OptimizedImage
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 }}
              transition={{ duration: 1.5 }}
              src={getItineraryImage(itinerary.id, itinerary.name.pt)}
              alt={itinerary.name[language as keyof typeof itinerary.name]}
              className="w-full h-full object-cover"
              containerClassName="absolute inset-0"
            />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F0A] via-transparent to-black/20" />
          
          <div className="absolute top-32 left-0 right-0 z-10">
            <div className="container px-4">
              <button
                onClick={() => navigate("/roteiros")}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.3em]"
              >
                <ArrowLeft className="h-4 w-4" />
                {l.back}
              </button>
            </div>
          </div>

          <div className="absolute bottom-20 left-0 right-0 z-10">
            <div className="container px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="max-w-4xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md border ${
                    isJurassico ? "bg-red-500/20 border-red-500/30 text-red-200" : "bg-[#C5A267]/20 border-[#C5A267]/30 text-[#C5A267]"
                  }`}>
                    {isJurassico ? <Flame className="h-3 w-3 inline mr-2" /> : <Mountain className="h-3 w-3 inline mr-2" />}
                    {isJurassico ? l.jurassico : l.classico}
                  </span>
                  <span className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                    <Calendar className="h-3 w-3" />
                    {itinerary.duration} {l.days}
                  </span>
                </div>
                <h1 className="text-4xl md:text-9xl font-display text-white mb-8 tracking-tighter leading-[0.85]">
                  {itinerary.name[language as keyof typeof itinerary.name]}
                </h1>
                <p className="text-xl md:text-2xl text-white/70 max-w-2xl font-light leading-relaxed">
                  {itinerary.description[language as keyof typeof itinerary.description]}
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Quick Stats Bar */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-[#1A261B]/5 py-6">
          <div className="container px-4">
            <div className="flex items-center justify-between gap-8 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-12 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#1A261B]/40">Destino</span>
                  <span className="text-sm font-bold text-[#1A261B]">Chapada dos Veadeiros</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#1A261B]/40">Duração</span>
                  <span className="text-sm font-bold text-[#1A261B]">{itinerary.duration} {l.days}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#1A261B]/40">Estilo</span>
                  <span className="text-sm font-bold text-[#1A261B]">{isJurassico ? l.jurassico : l.classico}</span>
                </div>
              </div>
              <Button
                onClick={toggleWishlist}
                className={`rounded-full px-8 py-6 gap-3 text-xs font-bold uppercase tracking-widest transition-all ${
                  inWishlist ? "bg-[#1A261B] text-white" : "bg-[#C5A267] text-[#1A261B] hover:scale-105"
                }`}
              >
                <Heart className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} />
                {inWishlist ? l.removeWishlist : l.addWishlist}
              </Button>
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <section className="py-24 md:py-32 overflow-hidden">
          <div className="container px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-6 mb-20">
                <h2 className="text-4xl md:text-6xl font-display text-[#1A261B] tracking-tight">{l.dayByDay}</h2>
                <div className="h-px flex-1 bg-[#1A261B]/10" />
              </div>

              <div className="grid grid-cols-1 gap-12 md:gap-32">
                {itinerary.days.map((day, idx) => {
                  const diff = difficultyConfig[day.difficulty as keyof typeof difficultyConfig] || difficultyConfig.moderado;
                  const resolvedTitle = day.title?.[language] || ((day as any).items?.[0]?.product_name ? `Dia ${idx + 1} — ${(day as any).items[0].product_name}` : `Dia ${idx + 1}`);
                  const activityName = (day as any).items?.[0]?.product_name || day.title?.[language] || "";
                  
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      className={`flex flex-col ${idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-12 md:gap-24 items-center`}
                    >
                      <div className="flex-1 w-full">
                        <div className="relative group cursor-pointer overflow-hidden rounded-[3rem] shadow-2xl" onClick={() => {}}>
                          <OptimizedImage
                            src={getDayImage(day.imageKey || "", activityName)}
                            alt={resolvedTitle}
                            className="w-full aspect-[4/5] object-cover transition-transform duration-1000 group-hover:scale-110"
                            containerClassName="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
                          <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white text-2xl font-display">
                            {idx + 1}
                          </div>
                          <div className="absolute bottom-10 right-10 bg-white px-6 py-4 rounded-2xl shadow-xl translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B]">Explorar Detalhes</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-8">
                        <div className="flex flex-wrap items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${diff.color}`}>
                            {diff[language as keyof typeof diff] || diff.pt}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B]/40 flex items-center gap-1.5">
                            <Map className="w-3 h-3" />
                            Distância: {day.trailDistanceKm || "—"}km
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A261B]/40 flex items-center gap-1.5">
                            <CircleDollarSign className="w-3 h-3 text-[#C5A267]" />
                            Ingresso: {day.voluntaryFee ? "Taxa Solidária" : day.entranceFee === 0 ? "Gratuito" : `R$ ${day.entranceFee || 0}`}
                          </span>
                        </div>
                        <h3 className="text-4xl md:text-5xl font-display text-[#1A261B] leading-tight">
                          {resolvedTitle}
                        </h3>
                        <p className="text-[#1A261B]/60 text-lg font-light leading-relaxed">
                          {typeof day.description === 'string' ? day.description : day.description?.[language] || ""}
                        </p>
                        <div className="space-y-4 pt-4">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#C5A267]">Atrações do dia</p>
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const rawAttrs = (day.attractions as any)?.[language] || day.attractions || [];
                              const attrs = Array.isArray(rawAttrs) 
                                ? rawAttrs 
                                : (typeof rawAttrs === 'string' ? rawAttrs.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : []);
                              
                              const items = (day as any).items ? (day as any).items.map((it: any) => it.product_name) : [];
                              const allAttrs = attrs.length > 0 ? attrs : items;
                              
                              return allAttrs.map((attr: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-white border border-[#1A261B]/5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#1A261B]/80 shadow-sm">
                                  <MapPin className="h-4 w-4 text-[#C5A267]" />
                                  {attr}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-32 bg-[#1A261B] text-[#FDFCFB]">
          <div className="container px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center space-y-4 mb-20">
                <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-[#C5A267]">Transparência ATMOS</span>
                <h2 className="text-5xl md:text-7xl font-display tracking-tight">{l.pricing}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                {/* 4x4 Option */}
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-[2px] p-8 md:p-12 relative overflow-hidden group"
                >
                  <div className="absolute right-0 top-0 w-32 h-32 bg-[#C5A267]/10 blur-[60px] rounded-full" />
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-[#C5A267]/20 flex items-center justify-center text-[#C5A267]">
                      <Truck className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-display">{l.atmos4x4}</h3>
                  </div>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end pb-6 border-b border-white/10">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.individual}</span>
                      <span className="text-4xl font-display">{formatPrice(itinerary.pricing.atmos4x4.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-6 border-b border-white/10">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.dupla}</span>
                      <span className="text-4xl font-display">{formatPrice(itinerary.pricing.atmos4x4.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.trioPlus}</span>
                      <span className="text-4xl font-display">{formatPrice(itinerary.pricing.atmos4x4.trio)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Own Vehicle Option */}
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-[2px] p-8 md:p-12 relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/60">
                      <Car className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-display">{l.carroProprio}</h3>
                  </div>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end pb-6 border-b border-white/10">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.individual}</span>
                      <span className="text-4xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-6 border-b border-white/10">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.dupla}</span>
                      <span className="text-4xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/40 uppercase text-[10px] font-bold tracking-widest">{l.trioPlus}</span>
                      <span className="text-4xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.trio)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Extra Costs & Inclusions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-20 border-t border-white/10">
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-[#C5A267]" />
                    <h4 className="text-xl font-bold uppercase tracking-widest text-[14px]">{l.extraCosts}</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <Ticket className="h-5 w-5 text-[#C5A267]" />
                        <div>
                          <p className="text-sm font-bold">{l.entranceFees}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">{l.chargedSeparately}</p>
                        </div>
                      </div>
                      <span className="text-2xl font-display">{formatPrice(itinerary.extraCosts.entranceFees)}</span>
                    </div>
                    {itinerary.extraCosts.equipmentFees && (
                      <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <HelmetIcon size={20} className="text-[#C5A267]" />
                          <div>
                            <p className="text-sm font-bold">{l.equipmentFees}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">
                              {typeof itinerary.extraCosts.equipmentItems === 'string' ? itinerary.extraCosts.equipmentItems : itinerary.extraCosts.equipmentItems?.[language as keyof typeof itinerary.extraCosts.equipmentItems] || ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-2xl font-display">{formatPrice(itinerary.extraCosts.equipmentFees)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-[#C5A267]" />
                    <h4 className="text-xl font-bold uppercase tracking-widest text-[14px]">{l.inclusions}</h4>
                  </div>
                  <ul className="grid grid-cols-1 gap-4">
                    {(itinerary.inclusions[language as keyof typeof itinerary.inclusions] || []).map((inc, i) => (
                      <li key={i} className="flex items-center gap-4 text-white/60 text-lg font-light">
                        <div className="w-6 h-6 rounded-full bg-[#C5A267]/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-[#C5A267]" />
                        </div>
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

    </Layout>
  );
}
