import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { storageUrl, normalize } from "@/lib/storage";
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

const getLangVal = (field: any, lang: 'pt' | 'en' | 'es'): string => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.pt || field.en || field.es || "";
};

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
            {itinerary.category && (
              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                isJurassico 
                  ? "bg-red-50 text-red-600 border border-red-100" 
                  : "bg-[#C5A267]/10 text-[#C5A267] border border-[#C5A267]/20"
              }`}>
                {isJurassico ? l.jurassico : l.classico}
              </span>
            )}
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
                  src={getDayImage(day.images?.[0] || "", day.resolvedTitle)}
                  fallbackSrcs={day.images?.map((img: string) => getDayImage(img, day.resolvedTitle))}
                  alt={day.title?.[language] || "Atmos Itinerary"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  containerClassName="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent transition-opacity duration-500 z-[1]" />
                
                {/* Day Badge */}
                <div className="absolute top-6 left-6 z-20">
                  <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                    {day.dayNumber}
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
          <div className="flex-shrink-0 w-72 md:w-80 space-y-4">
            <button 
              onClick={() => navigate(`/roteiros/${itinerary.id}`)}
              className="w-full aspect-[3/4] rounded-[2px] border border-[#1A261B]/10 flex flex-col items-center justify-center gap-6 hover:border-[#C5A267]/40 hover:bg-[#C5A267]/5 transition-all group/cta bg-white/50 backdrop-blur-sm shadow-xl"
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
        
      </div>
    </motion.div>
  );
};

const Itineraries = () => {
  const { language = "pt" } = useLanguage();
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState<DurationDays>(3);
  
  const { data: allProducts = [] } = useProducts();

  const mergedItineraries = useMemo(() => {
    const itinerariesOnly = allProducts.filter(p => p.type === 'itinerary');

    return itinerariesOnly.map((it: any) => {
      const supabaseVars = (it.variables || {}) as any;
      
      const allItems: any[] = [];
      (supabaseVars.days || []).forEach((day: any) => {
        if (day.items && day.items.length > 0) {
          day.items.forEach((item: any) => {
            allItems.push({
              ...item,
              dayNumber: day.day
            });
          });
        }
      });

      const allItineraryImages: string[] = [];

      const enrichedItems = allItems.map((item: any, idx: number) => {
        const childProduct = allProducts.find(p => p.id === (item.catalog_item_id || item.product_id));
        let itemImages: string[] = [];

        if (childProduct) {
          const vars = childProduct.variables as any || {};
          
          if (vars.gallery && Array.isArray(vars.gallery) && vars.gallery.length > 0) {
            itemImages = vars.gallery;
          } else if (vars.gallery_order && Array.isArray(vars.gallery_order) && vars.gallery_order.length > 0) {
            const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
            let folder = "experiencias";
            if (childProduct.type === "waterfall") folder = "cachoeiras";
            else if (childProduct.type === "accommodation") folder = "hospedagens";
            else if (childProduct.type === "service") folder = "serviços";
            
            itemImages = vars.gallery_order.map((fileName: string) => `produtos/${folder}/${prefix}/${fileName}`);
          } else {
            const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
            const lookupId = childProduct.source_id || vars.imageKey || prefix || childProduct.id;
            const keyNormalized = normalize(lookupId);
            
            let folder = "experiencias";
            if (childProduct.type === "waterfall") folder = "cachoeiras";
            else if (childProduct.type === "accommodation") folder = "hospedagens";
            else if (childProduct.type === "service") folder = "serviços";

            const waterfallMap: Record<string, string> = {
              "agua-fria": "produtos/cachoeiras/agua-fria/agua-fria-1.jpg",
              "almecegas-1-2-e-sao-bento": "produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg",
              "anjos-e-arcanjos": "produtos/cachoeiras/anjos-e-arcanjos/anjos-e-arcanjos-1.jpg",
              "bocaina-do-farias": "produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg",
              "boqueirao": "produtos/cachoeiras/boqueirao/boqueirao-1.jpg",
              "brancas": "produtos/cachoeiras/brancas/brancas-1.jpg",
              "capivara": "produtos/cachoeiras/capivara/capivara-1.jpg",
              "catuaba": "produtos/cachoeiras/catuaba/catuaba-1.jpg",
              "cavalcante": "produtos/cachoeiras/cavalcante/cavalcante-1.jpg",
              "couros": "produtos/cachoeiras/couros/couros-1.jpg",
              "cristais": "produtos/cachoeiras/cristais/cristais-1.jpg",
              "dragao": "produtos/cachoeiras/dragao/dragao-1.jpg",
              "loquinhas": "produtos/cachoeiras/loquinhas/loquinhas-1.jpg",
              "macacao": "produtos/cachoeiras/macacao/macacao-1.jpg",
              "macaquinhos": "produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg",
              "paraiso-dos-panderos": "produtos/cachoeiras/paraiso-dos-panderos/paraiso-dos-panderos-1.jpg",
              "ponte-de-pedra": "produtos/cachoeiras/ponte-de-pedra/ponte-de-pedra-1.jpg",
              "raizama": "produtos/cachoeiras/raizama/raizama-1.jpg",
              "santa-barbara": "produtos/cachoeiras/santa-barbara/santa-barbara-1.jpg",
              "segredo": "produtos/cachoeiras/segredo/segredo-1.jpg",
              "vale-da-lua": "produtos/cachoeiras/vale-da-lua/vale-da-lua-1.jpg"
            };

            const experienceMap: Record<string, string> = {
              "astroturismo": "produtos/experiencias/astro-turismo/astro-turismo-1.jpg",
              "astro-turismo": "produtos/experiencias/astro-turismo/astro-turismo-1.jpg",
              "batismo-de-escalada": "produtos/experiencias/rapel/rapel-1.jpg",
              "bike-cerrado": "produtos/experiencias/canionismo/canionismo-1.jpg",
              "comitivas": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg",
              "cozinha-de-origem": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
              "expedicao-4x4": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.jpg",
              "feira-do-produtor": "produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.jpg",
              "flutuacao-no-rio": "produtos/experiencias/rafting/rafting-1.jpg",
              "forro-pe-de-serra": "produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg",
              "massagem-terapeutica": "produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.jpg",
              "observacao-de-aves": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
              "oficina-de-ceramica": "produtos/experiencias/mesa-lira/mesa-lira-1.jpg",
              "panteao-da-chapada": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
              "picnic-no-por-do-sol": "produtos/experiencias/celestial-garden/celestial-garden-1.jpg",
              "rapel-nas-cachoeiras": "produtos/experiencias/rapel/rapel-1.jpg",
              "registro-com-drone": "produtos/serviços/registro-com-drone/registro-com-drone-1.jpg",
              "ritual-do-fogo": "produtos/experiencias/danca-com-fogo/danca-com-fogo-1.jpg",
              "tirolesa-vovo-a-jato": "produtos/experiencias/tirolesa-fazenda-sao-bento/tirolesa-fazenda-sao-bento-1.jpg",
              "trilha-noturna": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.jpg",
              "voo-de-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
              "noturna-imersiva": "produtos/experiencias/experiencia-noturna-imersiva/experiencia-noturna-imersiva-1.jpg",
              "voo-balao": "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg",
              "voo-paramotor": "produtos/experiencias/voo-de-paramotor/voo-de-paramotor-1.jpg",
              "massagem-bem-estar": "produtos/experiencias/massagem-e-bem-estar/massagem-e-bem-estar-1.jpg",
              "yoga-meditacao": "produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png",
              "yoga-e-meditacao": "produtos/experiencias/yoga-e-meditacao/yoga-e-meditacao-1.png",
              "passeio-cavalo": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg",
              "passeio-a-cavalo": "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg",
              "aula-forro": "produtos/experiencias/aula-de-forro/aula-de-forro-1.jpg",
              "feira-produtores": "produtos/experiencias/feira-dos-produtores-locais/feira-dos-produtores-locais-1.jpg"
            };

            const accMap: Record<string, string> = {
              "a-nossa-casa-da-arvore": "produtos/hospedagens/a-nossa-casa-da-arvore/a-nossa-casa-da-arvore-1.jpg",
              "amana-hotel": "produtos/hospedagens/amana-hotel/amana-hotel-1.jpg",
              "bagua-bangalos": "produtos/hospedagens/bagua-bangalos/bagua-bangalos-1.jpg",
              "casa-alta": "produtos/hospedagens/casa-alta/casa-alta-1.jpg",
              "casa-horizonte": "produtos/hospedagens/casa-horizonte/casa-horizonte-1.jpg",
              "casa-kanaro": "produtos/hospedagens/casa-kanaro/casa-kanaro-1.jpg",
              "casa-poema": "produtos/hospedagens/casa-poema/casa-poema-1.jpg",
              "espaco-horus": "produtos/hospedagens/espaco-horus/espaco-horus-1.jpg",
              "mariri-jungle-lodge": "produtos/hospedagens/mariri-jungle-lodge/mariri-jungle-lodge-1.jpg",
              "marley-s-house": "produtos/hospedagens/marley-s-house/marley-s-house-1.jpg",
              "pousada-casa-de-shiva": "produtos/hospedagens/pousada-casa-de-shiva/pousada-casa-de-shiva-1.jpg",
              "pousada-maya": "produtos/hospedagens/pousada-maya/pousada-maya-1.jpg",
              "refugio-veadeiros": "produtos/hospedagens/refugio-veadeiros/refugio-veadeiros-1.jpg",
              "rustik-chapada": "produtos/hospedagens/rustik-chapada/rustik-chapada-1.jpg",
              "terra-gaia": "produtos/hospedagens/terra-gaia/terra-gaia-1.jpg",
              "vila-abaton": "produtos/hospedagens/vila-abaton/vila-abaton-1.jpg",
              "vila-baru": "produtos/hospedagens/vila-baru/vila-baru-1.jpg",
              "vila-cerrado": "produtos/hospedagens/vila-cerrado/vila-cerrado-1.jpg",
              "vila-chapada": "produtos/hospedagens/vila-chapada/vila-chapada-1.jpg",
              "vila-komorebi": "produtos/hospedagens/vila-komorebi/vila-komorebi-1.jpg",
              "vila-libelula": "produtos/hospedagens/vila-libelula/vila-libelula-1.jpg",
              "vila-suindara": "produtos/hospedagens/vila-suindara/vila-suindara-1.jpg",
              "vila-toa": "produtos/hospedagens/vila-toa/vila-toa-1.jpg",
              "villa-azaleia": "produtos/hospedagens/villa-azaleia/villa-azaleia-1.jpg"
            };

            const serviceMap: Record<string, string> = {
              "transfers": "produtos/serviços/transfer-aeroporto-carro-particular/transfer-aeroporto-carro-particular-1.jpg",
              "seguro-viagem": "produtos/serviços/pedidos-especiais-atmos/pedidos-especiais-atmos-1.jpg",
              "lanche-de-trilha": "produtos/serviços/lanche-de-trilha-atmos-1.png",
              "lanche-de-trilha-atmos": "produtos/serviços/lanche-de-trilha-atmos-1.png",
              "registro-drone": "produtos/serviços/registro-com-drone/registro-com-drone-1.jpg",
              "registro-com-drone": "produtos/serviços/registro-com-drone/registro-com-drone-1.jpg",
              "registro-com-drone-captacao-com-edicao": "produtos/serviços/registro-com-drone-captacao-com-edicao/registro-com-drone-captacao-com-edicao-1.jpg"
            };

            const candidates: string[] = [];

            // 1. Try static maps matching the normalized key
            if (childProduct.type === "waterfall" && waterfallMap[keyNormalized]) {
              candidates.push(waterfallMap[keyNormalized]);
            } else if (childProduct.type === "experience" && experienceMap[keyNormalized]) {
              candidates.push(experienceMap[keyNormalized]);
            } else if (childProduct.type === "accommodation" && accMap[keyNormalized]) {
              candidates.push(accMap[keyNormalized]);
            } else if (childProduct.type === "service" && serviceMap[keyNormalized]) {
              candidates.push(serviceMap[keyNormalized]);
            }

            // Also try matching by exact ID or prefix
            if (candidates.length === 0) {
              if (childProduct.type === "waterfall" && waterfallMap[prefix]) {
                candidates.push(waterfallMap[prefix]);
              } else if (childProduct.type === "experience" && experienceMap[prefix]) {
                candidates.push(experienceMap[prefix]);
              } else if (childProduct.type === "accommodation" && accMap[prefix]) {
                candidates.push(accMap[prefix]);
              } else if (childProduct.type === "service" && serviceMap[prefix]) {
                candidates.push(serviceMap[prefix]);
              }
            }

            // 2. Add candidates with multiple extensions (.jpg, .png, .avif, .webp) for maximum robustness!
            const extensions = [".jpg", ".png", ".avif", ".webp"];
            [1, 2, 3, 4, 5].forEach(n => {
              extensions.forEach(ext => {
                if (prefix === "lanche-de-trilha" || prefix === "lanche-de-trilha-atmos") {
                  candidates.push(`produtos/${folder}/lanche-de-trilha-atmos-${n}${ext}`);
                } else {
                  candidates.push(`produtos/${folder}/${prefix}/${prefix}-${n}${ext}`);
                }
              });
            });

            itemImages = candidates;
          }
        }

        if (itemImages.length === 0) {
          const fallbackPrefix = item.product_storage_info?.prefix;
          const fallbackName = typeof item.product_name === "string" 
            ? item.product_name 
            : (item.product_name?.pt || item.product_name?.en || "");
          itemImages = [fallbackPrefix || fallbackName || ""];
        }

        allItineraryImages.push(...itemImages.slice(0, 5));

        return {
          id: `${it.id}-item-${idx}`,
          dayNumber: item.dayNumber,
          title: { 
            pt: getLangVal(item.product_name, 'pt'), 
            en: getLangVal(item.product_name, 'en'), 
            es: getLangVal(item.product_name, 'es') 
          },
          description: { pt: "", en: "", es: "" },
          attractions: { 
            pt: [getLangVal(item.product_name, 'pt')], 
            en: [getLangVal(item.product_name, 'en')], 
            es: [getLangVal(item.product_name, 'es')] 
          },
          trailDistanceKm: item.product_variables?.trailDistanceKm,
          difficulty: (item.product_variables?.difficulty || "moderado") as any,
          images: itemImages,
          resolvedTitle: getLangVal(item.product_name, 'pt')
        };
      });

      const itineraryPrefix = supabaseVars.storage_id || normalize(it.name) || it.id;
      const itineraryImages = supabaseVars.gallery_order && Array.isArray(supabaseVars.gallery_order) && supabaseVars.gallery_order.length > 0
        ? supabaseVars.gallery_order.map((fileName: string) => `produtos/roteiros/${itineraryPrefix}/${fileName}`)
        : [];
      
      const favorites = (supabaseVars.favorites && supabaseVars.favorites.length > 0)
        ? supabaseVars.favorites
        : (itineraryImages.length > 0 ? itineraryImages : Array.from(new Set(allItineraryImages)).filter(Boolean).slice(0, 10));

      return {
        id: it.source_id || it.id,
        duration: typeof supabaseVars.duration === 'number' ? supabaseVars.duration : (supabaseVars.duration ? parseInt(supabaseVars.duration) : 3),
        category: it.segment,
        name: { 
          pt: getLangVal(it.name, 'pt'), 
          en: getLangVal(it.name, 'en'), 
          es: getLangVal(it.name, 'es') 
        },
        description: { 
          pt: getLangVal(it.description || "", 'pt'), 
          en: getLangVal(it.description || "", 'en'), 
          es: getLangVal(it.description || "", 'es') 
        },
        days: enrichedItems,
        favorites,
        pricing: it.pricing || { 
          atmos4x4: { individual: 0, dupla: 0, trio: 0 }, 
          carroProprio: { individual: 0, dupla: 0, trio: 0 } 
        },
        extraCosts: it.extraCosts || { entranceFees: 0 },
        inclusions: it.inclusions || { pt: [], en: [], es: [] }
      };
    });
  }, [allProducts]);

  const durations = getDurations();
  const currentItineraries = getItinerariesByDuration(selectedDuration, mergedItineraries)
    .sort((a, b) => (a.category === "classico" ? -1 : 1));
    
  const l = pageLabels[language as keyof typeof pageLabels] || pageLabels.pt;

  return (
    <Layout hideWishlist>
      <PageSEO
        title="Roteiros Personalizados e Curadoria Atmos | ATMOS"
        description="Explore nossa seleção exclusiva de roteiros clássicos e jurássicos na Chapada dos Veadeiros. Experiências planejadas para o máximo de imersão e conforto."
        keywords="roteiros chapada dos veadeiros, viagem personalizada, curadoria atmos, roteiro 3 dias, roteiro 5 dias, turismo de luxo brasil"
        path="/roteiros"
      />
      
      <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-20 overflow-x-hidden">
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
      </div>
    </Layout>
  );
};

export default Itineraries;
