import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trackItineraryView } from "@/lib/analytics";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalize } from "@/lib/storage";
import { useWishlist } from "@/contexts/WishlistContext";
import { useProducts } from "@/hooks/useProducts";
import { getItineraryById, type ItineraryDay, type Itinerary, itineraries as staticItineraries } from "@/data/itineraries";
import { getDayImage } from "@/components/itineraries/dayImages";
import { getItineraryImage } from "@/components/itineraries/itineraryImages";
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
  Map,
  ChevronLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  Camera
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
    atmos4x4: "Expedição ATMOS 4x4",
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
    inclusiveExp: "Experiência Inclusiva",
    highlights: "Destaques do Dia",
    priceNote: "Valores por pessoa conforme o tamanho do grupo",
    guideIncluded: "Guia Atmos incluso",
    guideSuggested: "Guia Sugerido"
  },
  en: {
    back: "All Itineraries",
    days: "days",
    classico: "Classic",
    jurassico: "Jurassic",
    dayByDay: "Journey Schedule",
    pricing: "Investment per person",
    atmos4x4: "ATMOS 4x4 Expedition",
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
    inclusiveExp: "Inclusive Experience",
    highlights: "Daily Highlights",
    priceNote: "Prices per person based on group size",
    guideIncluded: "Atmos Guide included",
    guideSuggested: "Suggested Guide"
  },
  es: {
    back: "Todos los Itinerarios",
    days: "días",
    classico: "Clásico",
    jurassico: "Jurásico",
    dayByDay: "Cronograma de la Jornada",
    pricing: "Inversión por persona",
    atmos4x4: "Expedición ATMOS 4x4",
    carroProprio: "Con Vehículo Propio",
    individual: "Solo",
    dupla: "Dúo",
    trioPlus: "Grupo (3+)",
    inclusions: "Experiencia Inclusiva",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Itinerario agregado a la wishlist!",
    removed: "¡Itinerario quitado de la wishlist!",
    notFound: "Itinerario no encontrado.",
    clickDay: "Ver detalles del día",
    entranceFees: "Entradas a atractivos",
    equipmentFees: "Equipos técnicos",
    chargedSeparately: "cobrados aparte",
    extraCosts: "Costos Adicionales Estimados",
    bespokeTitle: "Cree su Itinerario",
    bespokeDesc: "Si não deseja nenhum itinerário sugerido por Atmos, e prefere criar seu itinerário sob medida clique aqui.",
    bespokeBtn: "Crear Itinerario",
    inclusiveExp: "Experiencia Inclusiva",
    highlights: "Destaques del Día",
    priceNote: "Valores por persona según el tamaño del grupo",
    guideIncluded: "Guía Atmos incluido",
    guideSuggested: "Guía Sugerido"
  },
};

function ImageCarousel({ images, alt }: { images: string[], alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;
  if (images.length === 1) {
    return (
      <OptimizedImage
        src={images[0]}
        alt={alt}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="relative w-full h-full group overflow-hidden">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <OptimizedImage
            src={images[currentIndex]}
            alt={`${alt} - ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === currentIndex ? "bg-white w-4" : "bg-white/40"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function DayBanner({ number, title }: { number: number, title: string }) {
  return (
    <div className="relative py-12 px-8 overflow-hidden rounded-[2rem] bg-[#1A261B] text-white">
      {/* Background Leaf Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0C50 0 70 30 70 50C70 70 50 100 50 100C50 100 30 70 30 50C30 30 50 0 50 0Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px',
        }}
      />
      
      <div className="relative flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C5A267] mb-2">Dia</span>
          <span className="text-8xl font-display leading-none text-white/10 absolute -left-4 -top-4 pointer-events-none">
            {number.toString().padStart(2, '0')}
          </span>
          <span className="text-4xl md:text-5xl font-display relative z-10 leading-[0.9]">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ItineraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language = "pt" } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const { data: allProducts = [] } = useProducts();

  const [heroImages, setHeroImages] = useState<string[]>([]);

  const mergedItineraries = useMemo(() => {
    // Se houver produtos no banco, eles são a fonte da verdade.
    const itinerariesOnly = allProducts.filter(p => p.type === 'itinerary');
    const merged = itinerariesOnly.length > 0 ? [] : [...staticItineraries];
    
    // Transform into a flat list of items (one section per product)
    return itinerariesOnly.map(dbProduct => {
      const supabaseVars = (dbProduct.variables || {}) as any;
      const allItineraryImages: string[] = [];
      
      const enrichedDays = (supabaseVars.days || []).map((day: any) => {
        const enrichedItems = (day.items || []).filter((item: any) => item.product_type !== 'guide').map((item: any, itemIdx: number) => {
          const childProduct = allProducts.find(p => p.id === (item.catalog_item_id || item.product_id));
          let itemImages: string[] = [];

          if (childProduct) {
            const vars = childProduct.variables as any || {};
            if (vars.gallery_order && Array.isArray(vars.gallery_order) && vars.gallery_order.length > 0) {
              const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
              let folder = "experiencias";
              if (childProduct.type === "waterfall") folder = "cachoeiras";
              else if (childProduct.type === "accommodation") folder = "hospedagens";
              else if (childProduct.type === "service") folder = "serviços";
              
              itemImages = vars.gallery_order.map((fileName: string) => `produtos/${folder}/${prefix}/${fileName}`);
            } else if (vars.gallery && Array.isArray(vars.gallery) && vars.gallery.length > 0) {
              itemImages = vars.gallery;
            } else {
              const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
              let folder = "experiencias";
              if (childProduct.type === "waterfall") folder = "cachoeiras";
              else if (childProduct.type === "accommodation") folder = "hospedagens";
              else if (childProduct.type === "service") folder = "serviços";
              
              itemImages = [1, 2, 3, 4, 5].map(n => `produtos/${folder}/${prefix}/${prefix}-${n}.jpg`);
            }
          }

          if (itemImages.length === 0) {
            itemImages = [item.product_storage_info?.prefix || item.product_name];
          }

          allItineraryImages.push(...itemImages.slice(0, 5));

          return {
            ...item,
            id: `${dbProduct.id}-item-${itemIdx}`,
            dayNumber: day.day,
            itemNumber: itemIdx + 1,
            title: { pt: item.product_name, en: item.product_name, es: item.product_name },
            trailDistanceKm: item.product_variables?.trailDistanceKm,
            difficulty: (item.product_variables?.difficulty || "moderado") as any,
            resolvedTitle: item.product_name,
            attractions: { pt: [item.product_name], en: [item.product_name], es: [item.product_name] },
            description: { 
              pt: item.product_description || "", 
              en: item.product_description || "",
              es: item.product_description || ""
            },
            hasGuide: day.items.some((it: any) => it.product_type === 'guide'),
            images: itemImages
          };
        });

        return {
          ...day,
          title: { pt: `Dia ${day.dayNumber}`, en: `Day ${day.dayNumber}`, es: `Día ${day.dayNumber}` },
          items: enrichedItems,
          images: day.images || (enrichedItems[0]?.images || [])
        };
      });

      const itineraryPrefix = supabaseVars.storage_id || normalize(dbProduct.name) || dbProduct.id;
      const itineraryImages = supabaseVars.gallery_order && Array.isArray(supabaseVars.gallery_order) && supabaseVars.gallery_order.length > 0
        ? supabaseVars.gallery_order.map((fileName: string) => `produtos/roteiros/${itineraryPrefix}/${fileName}`)
        : [];
      
      const favorites = (supabaseVars.favorites && supabaseVars.favorites.length > 0)
        ? supabaseVars.favorites
        : (itineraryImages.length > 0 ? itineraryImages : Array.from(new Set(allItineraryImages)).filter(Boolean).slice(0, 15));

      return {
        id: dbProduct.source_id || dbProduct.id,
        duration: typeof supabaseVars.duration === 'number' ? supabaseVars.duration : (supabaseVars.duration ? parseInt(supabaseVars.duration) : 3),
        category: dbProduct.segment as any,
        name: { pt: dbProduct.name, en: dbProduct.name, es: dbProduct.name },
        description: { pt: dbProduct.description || "", en: dbProduct.description || "", es: dbProduct.description || "" },
        days: enrichedDays,
        favorites,
        pricing: supabaseVars.pricing || { 
          atmos4x4: { individual: 0, dupla: 0, trio: 0 }, 
          carroProprio: { individual: 0, dupla: 0, trio: 0 } 
        },
        extraCosts: supabaseVars.extraCosts || { entranceFees: 0 },
        inclusions: supabaseVars.inclusions || { pt: [], en: [], es: [] }
      };
    });
  }, [allProducts]);

  const itinerary = id ? getItineraryById(id, mergedItineraries) : undefined;
  const l = labels[language as keyof typeof labels] || labels.pt;

  useEffect(() => {
    if (itinerary?.favorites) {
      setHeroImages(itinerary.favorites.slice(0, 5).map(f => getDayImage(f, itinerary.name.pt)));
    }
  }, [itinerary, language]);

  useEffect(() => {
    if (itinerary) {
      trackItineraryView(itinerary.name.pt, itinerary.category, itinerary.duration);
      window.scrollTo(0, 0);
    }
  }, [itinerary?.id]);

  if (!itinerary) {
    return (
      <Layout hideWishlist>
        <div className="bg-white min-h-screen container px-4 py-24 text-center">
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
        <section className="relative h-[95vh] overflow-hidden bg-[#0A0F0A]">
          <div className="absolute inset-0">
            <ImageCarousel images={heroImages} alt={itinerary.name.pt} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F0A] via-transparent to-black/20" />
          </div>
          
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
                <div className="flex items-center gap-4 mb-8">
                  {itinerary.category && (
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border ${
                      isJurassico ? "bg-red-500/20 border-red-500/30 text-red-200" : "bg-[#C5A267]/20 border-[#C5A267]/30 text-[#C5A267]"
                    }`}>
                      {isJurassico ? <Flame className="h-3 w-3 inline mr-2" /> : <Mountain className="h-3 w-3 inline mr-2" />}
                      {itinerary.category}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-white/80 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10">
                    <Calendar className="h-3 w-3" />
                    {itinerary.duration} {l.days}
                  </span>
                </div>
                <h1 className="text-6xl md:text-[11rem] font-display text-white mb-8 tracking-tighter leading-[0.8] drop-shadow-2xl">
                  {itinerary.name[language as keyof typeof itinerary.name]}
                </h1>
                <p className="text-xl md:text-3xl text-white/80 max-w-2xl font-light leading-relaxed">
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
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#1A261B]/40">Destino</span>
                  <span className="text-sm font-bold text-[#1A261B]">Chapada dos Veadeiros</span>
                </div>
                {itinerary.category && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#1A261B]/40">Estilo</span>
                    <span className="text-sm font-bold text-[#1A261B]">{itinerary.category}</span>
                  </div>
                )}
                {itinerary.guidedDays !== undefined && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#C5A267]">Suporte Local</span>
                    <span className="text-sm font-bold text-[#1A261B]">{itinerary.guidedDays} Dias Guiados</span>
                  </div>
                )}
              </div>
              <Button
                onClick={toggleWishlist}
                className={`rounded-full px-8 py-6 gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                  inWishlist ? "bg-[#1A261B] text-white" : "bg-[#C5A267] text-[#1A261B] hover:scale-105"
                }`}
              >
                <Heart className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} />
                {inWishlist ? l.removeWishlist : l.addWishlist}
              </Button>
            </div>
          </div>
        </div>

        {/* Experience Gallery */}
        {itinerary.favorites && itinerary.favorites.length > 1 && (
          <section className="py-24 bg-[#FDFCFB] border-t border-[#1A261B]/5">
            <div className="container px-4">
              <div className="max-w-xl mb-16">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C5A267] block mb-4">Curadoria Atmos</span>
                <h2 className="text-4xl md:text-5xl font-display text-[#1A261B] tracking-tight">Experiências que compõem sua jornada</h2>
                <p className="text-[#1A261B]/60 mt-4 font-light text-lg">Uma seleção cuidadosa de cenários e vivências que garantem a autenticidade da sua expedição.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {itinerary.favorites.slice(0, 5).map((imgKey: string, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="group relative aspect-[4/5] rounded-[2px] overflow-hidden shadow-2xl bg-[#1A261B]/5"
                  >
                    <OptimizedImage 
                      src={getDayImage(imgKey, itinerary.name.pt)} 
                      alt="Atmos Experience" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Timeline Summary */}
        <section className="py-12 bg-white border-b border-[#1A261B]/5 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
          <div className="container px-4">
            <div className="flex flex-wrap gap-4 justify-center">
              {itinerary.days.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => document.getElementById(`day-${idx + 1}`)?.scrollIntoView({ behavior: 'smooth' })}>
                  <div className="w-10 h-10 rounded-full border border-[#1A261B]/10 flex items-center justify-center text-[10px] font-bold text-[#1A261B]/40 group-hover:bg-[#1A261B] group-hover:text-white transition-all">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Itinerary Sections */}
        <section className="py-24 md:py-40 bg-white relative overflow-hidden">
          {/* Subtle pattern background */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 48L30 24L6 48' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E")` }} />
          
          <div className="container px-4 relative z-10">
            <div className="max-w-6xl mx-auto space-y-32 md:space-y-48">
              {itinerary.days.map((day, idx) => {
                const diff = difficultyConfig[day.difficulty as keyof typeof difficultyConfig] || difficultyConfig.moderado;
                const resolvedTitle = day.title?.[language] || ((day as any).items?.[0]?.product_name ? (day as any).items[0].product_name : `Dia ${idx + 1}`);
                const guideItem = (day as any).items?.find((it: any) => it.product_type === "guide");
                
                return (
                  <div key={idx} id={`day-${idx + 1}`} className="space-y-12 scroll-mt-32">
                    <DayBanner number={idx + 1} title={resolvedTitle} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                      <div className="lg:col-span-7 space-y-8">
                        <div className="aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl border border-black/5 group">
                          <OptimizedImage
                            src={getDayImage(day.images?.[0] || "", resolvedTitle)}
                            alt={resolvedTitle}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A267] flex items-center gap-2">
                              <Compass className="w-3 h-3" /> Jornada
                            </p>
                            <p className="text-[#1A261B]/70 text-lg font-light leading-relaxed">
                              {typeof day.description === 'string' ? day.description : day.description?.[language] || ""}
                            </p>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="p-6 bg-[#F8F7F4] rounded-3xl border border-black/5 space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#1A261B]/40">Especificações Técnicas</p>
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm">
                                  <div className={`w-1.5 h-1.5 rounded-full ${diff.color.split(' ')[0]}`} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{diff[language as keyof typeof diff] || diff.pt}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm text-[#1A261B]/60">
                                  <Map className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{day.trailDistanceKm || "—"}km Trilha</span>
                                </div>
                                {day.hasGuide && (
                                  <div className="px-4 py-1.5 bg-[#C5A267]/10 rounded-full border border-[#C5A267]/20 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-[#C5A267]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A267]">Com Guia</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A267]">{l.highlights}</p>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const rawAttrs = (day.attractions as any)?.[language] || day.attractions || [];
                                  const attrs = Array.isArray(rawAttrs) 
                                    ? rawAttrs 
                                    : (typeof rawAttrs === 'string' ? rawAttrs.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : []);
                                  
                                  const items = (day as any).items ? (day as any).items.filter((it: any) => it.product_type !== 'guide').map((it: any) => it.product_name) : [];
                                  const allAttrs = attrs.length > 0 ? attrs : items;
                                  
                                  return allAttrs.map((attr: string, i: number) => (
                                    <div key={i} className="px-4 py-2 bg-white border border-black/5 rounded-full text-xs font-medium text-[#1A261B]/60 shadow-sm hover:border-[#C5A267]/30 transition-colors">
                                      {attr}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-5 space-y-10">
                        <div className="relative group rounded-[3rem] overflow-hidden aspect-square shadow-2xl">
                          <OptimizedImage
                            src={getDayImage(day.images?.[0] || "", day.resolvedTitle || resolvedTitle)}
                            alt={resolvedTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                            containerClassName="absolute inset-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1A261B]/80 opacity-60" />
                          <div className="absolute bottom-10 left-10 right-10">
                            <h4 className="text-white font-display text-2xl mb-4">A essência do {idx + 1}º Dia</h4>
                            <p className="text-white/60 text-sm font-light">Uma jornada curada para conectar você com a alma da Chapada.</p>
                          </div>
                        </div>

                        {guideItem && (
                          <div className="p-8 bg-[#F8F7F4] rounded-[2.5rem] border border-[#C5A267]/10 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C5A267]/5 rounded-full blur-3xl" />
                            <div className="relative z-10 flex flex-col gap-6">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#C5A267] shadow-sm border border-[#C5A267]/10">
                                  <Compass className="w-8 h-8" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A267]">{l.guideSuggested}</p>
                                  <p className="text-2xl font-display text-[#1A261B]">{guideItem.product_name}</p>
                                </div>
                              </div>
                              <p className="text-sm text-[#1A261B]/50 font-light leading-relaxed">
                                Este dia conta com a condução de {guideItem.product_name}, especialista local que garantirá segurança e histórias fascinantes sobre a região.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Cards - Premium Style */}
        <section className="py-32 md:py-48 bg-[#1A261B] text-[#FDFCFB] relative overflow-hidden">
          {/* Background Leaf Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0C50 0 70 30 70 50C70 70 50 100 50 100C50 100 30 70 30 50C30 30 50 0 50 0Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
              backgroundSize: '180px 180px',
            }}
          />
          
          <div className="container px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center space-y-6 mb-24">
                <span className="text-[10px] uppercase font-black tracking-[0.6em] text-[#C5A267]">Investimento</span>
                <h2 className="text-6xl md:text-9xl font-display tracking-tight leading-[0.8]">{l.pricing}</h2>
                <p className="text-white/40 text-sm font-light uppercase tracking-widest pt-4">{l.priceNote}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-32">
                {/* 4x4 Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-white/5 border border-white/10 rounded-[3rem] p-10 md:p-16 relative overflow-hidden group backdrop-blur-sm"
                >
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C5A267]/10 blur-[100px] rounded-full group-hover:bg-[#C5A267]/20 transition-colors duration-700" />
                  
                  <div className="flex items-center gap-6 mb-16">
                    <div className="w-20 h-20 rounded-3xl bg-[#C5A267]/20 flex items-center justify-center text-[#C5A267] border border-[#C5A267]/20">
                      <Truck className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white">{l.atmos4x4}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A267]/60">{l.guideIncluded}</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.individual}</span>
                      <span className="text-5xl font-display text-white">{formatPrice(itinerary.pricing.atmos4x4.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.dupla}</span>
                      <span className="text-5xl font-display text-white">{formatPrice(itinerary.pricing.atmos4x4.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.trioPlus}</span>
                      <span className="text-5xl font-display text-[#C5A267]">{formatPrice(itinerary.pricing.atmos4x4.trio)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Own Vehicle Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-white/5 border border-white/10 rounded-[3rem] p-10 md:p-16 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="flex items-center gap-6 mb-16">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                      <Car className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white">{l.carroProprio}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Seu ritmo, sua jornada</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.individual}</span>
                      <span className="text-5xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.dupla}</span>
                      <span className="text-5xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.trioPlus}</span>
                      <span className="text-5xl font-display text-white/80">{formatPrice(itinerary.pricing.carroProprio.trio)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Extra Costs & Inclusions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20 lg:gap-32 pt-24 border-t border-white/10">
                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#C5A267]" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.extraCosts}</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-8 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-[#C5A267]/10 flex items-center justify-center text-[#C5A267]">
                          <Ticket className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-display">{l.entranceFees}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest">{l.chargedSeparately}</p>
                        </div>
                      </div>
                      <span className="text-3xl font-display text-[#C5A267]">{formatPrice(itinerary.extraCosts.entranceFees)}</span>
                    </div>
                    {itinerary.extraCosts.equipmentFees && (
                      <div className="flex items-center justify-between p-8 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-[#C5A267]/10 flex items-center justify-center text-[#C5A267]">
                            <HelmetIcon size={24} />
                          </div>
                          <div>
                            <p className="text-lg font-display">{l.equipmentFees}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">
                              {typeof itinerary.extraCosts.equipmentItems === 'string' ? itinerary.extraCosts.equipmentItems : itinerary.extraCosts.equipmentItems?.[language as keyof typeof itinerary.extraCosts.equipmentItems] || ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-3xl font-display text-[#C5A267]">{formatPrice(itinerary.extraCosts.equipmentFees)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#C5A267]" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.inclusiveExp}</h4>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6">
                    {(itinerary.inclusions[language as keyof typeof itinerary.inclusions] || []).map((inc, i) => (
                      <li key={i} className="flex items-start gap-6 text-white/70 group">
                        <div className="w-8 h-8 rounded-full bg-[#C5A267]/10 flex items-center justify-center flex-shrink-0 border border-[#C5A267]/20 group-hover:bg-[#C5A267]/30 transition-colors">
                          <Check className="h-4 w-4 text-[#C5A267]" />
                        </div>
                        <span className="text-xl font-light leading-snug">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-32 bg-white text-center">
          <div className="container px-4">
            <div className="max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl md:text-5xl font-display text-[#1A261B] tracking-tight">{l.bespokeTitle}</h2>
              <p className="text-[#1A261B]/60 text-lg font-light leading-relaxed">
                {l.bespokeDesc}
              </p>
              <Button 
                onClick={() => navigate("/monte-seu-roteiro")}
                className="rounded-full px-12 py-8 bg-[#C5A267] text-[#1A261B] text-sm font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl shadow-[#C5A267]/20"
              >
                {l.bespokeBtn}
                <ArrowRight className="h-4 w-4 ml-3" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
