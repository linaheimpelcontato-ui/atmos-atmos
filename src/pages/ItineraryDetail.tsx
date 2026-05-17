import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trackItineraryView } from "@/lib/analytics";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalize, optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
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
  Camera,
  Leaf,
  Footprints,
  Home,
  Sunrise
} from "lucide-react";
import HelmetIcon from "@/components/icons/HelmetIcon";
import { toast } from "@/hooks/use-toast";
import PageSEO from "@/components/seo/PageSEO";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ScrollArea } from "@/components/ui/scroll-area";

const leafTexture = optimizedUrl("proposta-visual-cliente/leaf-texture - horizontal.jpg", IMAGE_PRESETS.large);
const leafTextureAlt = optimizedUrl("proposta-visual-cliente/leaf-texture.jpg", IMAGE_PRESETS.large);

const difficultyConfig = {
  facil: { pt: "Fácil", en: "Easy", es: "Fácil", color: "text-[#166534] bg-[#dcfce7]" },
  moderado: { pt: "Moderado", en: "Moderate", es: "Moderado", color: "text-[#92400e] bg-[#fef3c7]" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil", color: "text-[#991b1b] bg-[#fee2e2]" },
  muito_facil: { pt: "Muito Fácil", en: "Very Easy", es: "Muy Fácil", color: "text-[#166534] bg-[#dcfce7]" },
  moderado_dificil: { pt: "Moderado/Difícil", en: "Moderate/Hard", es: "Moderado/Difícil", color: "text-[#991b1b] bg-[#fee2e2]" },
};

const CATEGORY_ICONS: Record<string, any> = {
  Cachoeira: Mountain, 
  Ingresso: Mountain, 
  "Cachoeira / Ingresso": Mountain,
  Guia: Compass, 
  "Diária Guia ATMOS": Compass, 
  Hospedagem: MapPin,
  Lanche: Leaf, 
  "Lanche Trilha": Leaf, 
  Transfer: Sunrise, 
  "Refeição": Leaf,
  "Experiência": Sparkles,
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  Cachoeira: { pt: "Cachoeira / Ingresso", en: "Waterfall / Entrance", es: "Cascada / Entrada" },
  Ingresso: { pt: "Cachoeira / Ingresso", en: "Waterfall / Entrance", es: "Cascada / Entrada" },
  "Cachoeira / Ingresso": { pt: "Cachoeira / Ingresso", en: "Waterfall / Entrance", es: "Cascada / Entrada" },
  Guia: { pt: "Guia", en: "Guide", es: "Guía" },
  "Diária Guia ATMOS": { pt: "Diária Guia ATMOS", en: "ATMOS Guide Fee", es: "Tarifa Guía ATMOS" },
  Hospedagem: { pt: "Hospedagem", en: "Lodging", es: "Hospedaje" },
  Lanche: { pt: "Lanche de Trilha", en: "Trail Snack", es: "Snack de Sendero" },
  "Lanche Trilha": { pt: "Lanche de Trilha", en: "Trail Snack", es: "Snack de Sendero" },
  Transfer: { pt: "Transfer", en: "Transfer", es: "Transfer" },
  "Refeição": { pt: "Refeição", en: "Meal", es: "Comida" },
  "Experiência": { pt: "Experiência", en: "Experience", es: "Experiencia" },
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

function DayBanner({ number, title, bgImage, children }: { number: number, title: string, bgImage?: string, children?: React.ReactNode }) {
  return (
    <div className="relative w-full px-6 md:px-12 py-20 md:py-32 overflow-hidden bg-[#2e2019]">
      {/* Base layer: the leaf pattern pattern */}
      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${bgImage ? 'opacity-25 mix-blend-overlay' : 'opacity-100'}`}
        style={{ 
          backgroundImage: `url("${leafTexture}"), url("${leafTextureAlt}")`, 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Overlay layer: destination photo if available */}
      {bgImage && (
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0"
        >
          <img loading="lazy" src={bgImage} alt="" className="w-full h-full object-cover grayscale-[20%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2e2019]/60 via-transparent to-[#2e2019]/80" />
        </motion.div>
      )}
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex items-end gap-6 md:gap-10">
            <span className="text-8xl md:text-[12rem] font-black leading-[0.7] flex-shrink-0 text-white/10 font-outfit">
              {String(number).padStart(2, "0")}
            </span>
            <div className="min-w-0 pb-2">
              <p className="text-[12px] uppercase tracking-[0.4em] font-bold mb-3" style={{ color: "#c4a97d" }}>
                Dia {number}
              </p>
              <h3 className="text-3xl md:text-6xl font-black text-white leading-[0.9] font-outfit uppercase tracking-tighter">
                {title}
              </h3>
            </div>
          </div>
          {children}
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

      <div className="bg-[#fcfaf7]">
        {/* Cinematic Hero */}
        <section className="relative h-[95vh] overflow-hidden bg-[#2e2019]">
          <div className="absolute inset-0">
            <ImageCarousel images={heroImages} alt={itinerary.name.pt} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2e2019] via-transparent to-black/20" />
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
                    <span className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-[#c4a97d]/30 bg-[#c4a97d]/20 text-[#c4a97d]">
                      {isJurassico ? <Flame className="h-3 w-3 inline mr-2" /> : <Mountain className="h-3 w-3 inline mr-2" />}
                      {itinerary.category}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-white/80 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 backdrop-blur-xl px-5 py-2 border border-white/10">
                    <Calendar className="h-3 w-3" />
                    {itinerary.duration} {l.days}
                  </span>
                </div>
                <h1 className="text-6xl md:text-[8rem] lg:text-[10rem] font-display text-white mb-8 tracking-tighter leading-[0.8] drop-shadow-2xl font-outfit uppercase">
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
        <div className="sticky top-0 z-40 bg-[#fcfaf7]/90 backdrop-blur-2xl border-b border-[#e4dbcc] py-6">
          <div className="container px-4">
            <div className="flex items-center justify-between gap-8 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-12 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#2e2019]/40">Destino</span>
                  <span className="text-sm font-bold text-[#2e2019]">Chapada dos Veadeiros</span>
                </div>
                {itinerary.category && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#2e2019]/40">Estilo</span>
                    <span className="text-sm font-bold text-[#2e2019]">{itinerary.category}</span>
                  </div>
                )}
                {itinerary.guidedDays !== undefined && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#c4a97d]">Suporte Local</span>
                    <span className="text-sm font-bold text-[#2e2019]">{itinerary.guidedDays} Dias Guiados</span>
                  </div>
                )}
              </div>
              <Button
                onClick={toggleWishlist}
                className={`rounded-none px-8 py-6 gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                  inWishlist ? "bg-[#2e2019] text-white" : "bg-[#c4a97d] text-white hover:scale-105 shadow-lg"
                }`}
                style={{ boxShadow: inWishlist ? "none" : "0 4px 20px rgba(196,169,125,0.3)" }}
              >
                <Heart className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} />
                {inWishlist ? l.removeWishlist : l.addWishlist}
              </Button>
            </div>
          </div>
        </div>

        {/* Experience Gallery */}
        {itinerary.favorites && itinerary.favorites.length > 1 && (
          <section className="py-32 md:py-40 bg-white border-b border-[#e4dbcc]">
            <div className="container px-4">
              <div className="max-w-xl mb-16">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c4a97d] block mb-4">Curadoria Atmos</span>
                <h2 className="text-4xl md:text-5xl font-display text-[#2e2019] tracking-tight">Experiências que compõem sua jornada</h2>
                <p className="text-[#2e2019]/60 mt-4 font-light text-lg">Uma seleção cuidadosa de cenários e vivências que garantem a autenticidade da sua expedição.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {itinerary.favorites.slice(0, 5).map((imgKey: string, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="group relative aspect-[4/5] rounded-[4px] overflow-hidden shadow-xl bg-[#2e2019]/5 border border-[#e4dbcc]"
                  >
                    <OptimizedImage 
                      src={getDayImage(imgKey, itinerary.name.pt)} 
                      fallbackSrcs={[
                        getDayImage(imgKey, itinerary.name.pt),
                        optimizedUrl(`produtos/cachoeiras/${imgKey.toLowerCase()}/${imgKey.toLowerCase()}-1.jpg`, IMAGE_PRESETS.thumbnail),
                        optimizedUrl(`produtos/experiencias/${imgKey.toLowerCase()}/${imgKey.toLowerCase()}-1.jpg`, IMAGE_PRESETS.thumbnail),
                        optimizedUrl(`produtos/experiencias/${imgKey.toLowerCase()}/${imgKey.toLowerCase()}-1.png`, IMAGE_PRESETS.thumbnail)
                      ]}
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
        <section className="py-8 bg-[#fcfaf7]/90 border-b border-[#e4dbcc] sticky top-[76px] z-30 backdrop-blur-xl">
          <div className="container px-4">
            <div className="flex flex-wrap gap-4 justify-center">
              {itinerary.days.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => document.getElementById(`day-${idx + 1}`)?.scrollIntoView({ behavior: 'smooth' })}>
                  <div className="w-10 h-10 rounded-full border border-[#2e2019]/10 flex items-center justify-center text-[10px] font-bold text-[#2e2019]/40 group-hover:bg-[#2e2019] group-hover:text-white transition-all">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ ITINERARY SECTION TITLE ══════════════════════ */}
        <section className="py-24 md:py-32 text-center" style={{ background: "#2e2019" }}>
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-12 h-[1px] bg-[#c4a97d]/40" />
            <p className="text-[12px] uppercase tracking-[0.5em] font-bold" style={{ color: "#c4a97d" }}>
              {language === "pt" ? "Cronograma" : language === "es" ? "Cronograma" : "Schedule"}
            </p>
            <div className="w-12 h-[1px] bg-[#c4a97d]/40" />
          </div>
          <h2 className="text-5xl md:text-8xl font-black text-white font-outfit uppercase tracking-tighter leading-none">
            {language === "pt" ? "Sua Viagem" : language === "es" ? "Tu Viaje" : "Your Trip"}
          </h2>
        </section>

        {/* ══════════════════════ DAY SECTIONS ══════════════════════ */}
        <div
          style={{
            backgroundImage: `url(${optimizedUrl("home/day-banner-bg.jpg", IMAGE_PRESETS.large)})`,
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {itinerary.days.map((day, idx) => {
            const diff = difficultyConfig[day.difficulty as keyof typeof difficultyConfig] || difficultyConfig.moderado;
            const resolvedTitle = day.title?.[language] || ((day as any).items?.[0]?.product_name ? (day as any).items[0].product_name : `Dia ${idx + 1}`);
            
            const productTypeToCategory: Record<string, string> = {
              waterfall: "Cachoeira",
              experience: "Experiência",
              accommodation: "Hospedagem",
              service: "Serviço",
              transfer: "Transfer",
              meal: "Refeição",
              guide: "Guia"
            };

            const guideNames = ((day as any).items || [])
              .filter((i: any) => i.product_type === 'guide')
              .map((i: any) => i.product_name);

            const visibleItems = ((day as any).items || []).filter((item: any) => item.product_type !== 'guide');
            const isEven = idx % 2 === 0;

            return (
              <motion.section 
                key={idx} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                id={`day-${idx + 1}`}
                className="relative scroll-mt-32"
              >
                {/* ══════ FULL-WIDTH DAY BANNER (parallax photo) ══════ */}
                <DayBanner 
                  number={idx + 1} 
                  title={resolvedTitle} 
                  bgImage={day.images && day.images.length > 0 ? getDayImage(day.images[0], resolvedTitle) : undefined}
                >
                  <div className="flex flex-col gap-2 items-end justify-end">
                    {guideNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {guideNames.map((name: string, gi: number) => (
                          <span key={gi} className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                            style={{ background: "#744404", color: "#fff" }}>
                            <Compass className="w-3.5 h-3.5" />
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 justify-end">
                      {day.difficulty && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                          <Mountain className="w-3.5 h-3.5" />
                          {diff[language as keyof typeof diff] || diff.pt}
                        </span>
                      )}
                      {day.trailDistanceKm && day.trailDistanceKm !== "0" && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                          <Footprints className="w-3.5 h-3.5" />
                          {day.trailDistanceKm}km Trilha
                        </span>
                      )}
                    </div>
                  </div>
                </DayBanner>

                {/* ══════ TWO-COLUMN BODY: items left, carousel right ══════ */}
                <div style={{ background: isEven ? "#fff" : "#fcfaf7" }} className="border-b border-[#e4dbcc]">
                  <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
                      {/* LEFT — scrollable items */}
                      <div className="flex-1 min-w-0">
                        <ScrollArea type="always" className="proposal-itinerary-scroll md:h-[600px]">
                          <div className="md:pr-10 space-y-12">
                            {day.description && (
                              <div className="mb-12">
                                <p className="text-xl md:text-2xl font-light leading-relaxed text-[#5c4a32] italic border-l-4 border-[#c4a97d] pl-8 py-2">
                                  {typeof day.description === 'string' ? day.description : day.description?.[language] || ""}
                                </p>
                              </div>
                            )}

                            <div className="space-y-8">
                              {visibleItems.map((item: any, localIdx: number) => {
                                const catKey = productTypeToCategory[item.product_type] || "Experiência";
                                const Icon = CATEGORY_ICONS[catKey] || MapPin;
                                const catLabel = CATEGORY_LABELS[catKey]?.[language] || catKey;
                                const itemTitle = item.product_name || item.name?.[language] || item.title?.[language] || "";
                                const itemDesc = item.product_description || item.description?.[language] || "";
                                
                                return (
                                  <div key={localIdx} className="flex items-start gap-4">
                                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#2e2019" }}>
                                      <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] uppercase tracking-[0.3em] font-black mb-1" style={{ color: "#c4a97d" }}>
                                        {catLabel}
                                      </p>
                                      <span className="text-xl font-black font-outfit uppercase tracking-tight text-[#2e2019]">
                                        {itemTitle}
                                      </span>
                                      {itemDesc && (
                                        <div className="mt-2 pl-4 py-2 pr-2 text-base italic border-l-2 border-[#c4a97d] text-[#5c4a32] leading-relaxed">
                                          {itemDesc}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>

                      {/* RIGHT — sticky image gallery */}
                      {day.images && day.images.length > 0 && (
                        <div className="w-full lg:w-[40%] flex-shrink-0">
                          <div className="lg:sticky lg:top-28 self-start">
                            <div className="aspect-square lg:aspect-auto lg:h-[700px] overflow-hidden shadow-2xl rounded-2xl relative group">
                              <ImageCarousel 
                                images={day.images.map((img: string) => getDayImage(img, resolvedTitle))} 
                                alt={resolvedTitle} 
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2e2019]/80 opacity-60 pointer-events-none" />
                              <div className="absolute bottom-10 left-10 right-10 pointer-events-none">
                                <h4 className="text-white font-display text-2xl mb-2 uppercase font-outfit tracking-tighter">A essência do {idx + 1}º Dia</h4>
                                <p className="text-white/60 text-xs font-light">Uma jornada curada para conectar você com a alma da Chapada.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Pricing Cards - Premium Style */}
        <section className="py-32 md:py-48 bg-[#2e2019] text-[#FDFCFB] relative overflow-hidden">
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
                <span className="text-[10px] uppercase font-black tracking-[0.6em] text-[#c4a97d]">Investimento</span>
                <h2 className="text-6xl md:text-9xl font-display font-outfit uppercase tracking-tight leading-[0.8]">{l.pricing}</h2>
                <p className="text-white/40 text-sm font-light uppercase tracking-widest pt-4">{l.priceNote}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-32">
                {/* 4x4 Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-10 md:p-16 relative overflow-hidden group backdrop-blur-sm"
                >
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#c4a97d]/10 blur-[100px] rounded-full group-hover:bg-[#c4a97d]/20 transition-colors duration-700" />
                  
                  <div className="flex items-center gap-6 mb-16">
                    <div className="w-20 h-20 rounded-lg bg-[#c4a97d]/20 flex items-center justify-center text-[#c4a97d] border border-[#c4a97d]/20">
                      <Truck className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white font-outfit uppercase tracking-tight">{l.atmos4x4}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#c4a97d]/60">{l.guideIncluded}</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.individual}</span>
                      <span className="text-5xl font-display text-white font-outfit">{formatPrice(itinerary.pricing.atmos4x4.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.dupla}</span>
                      <span className="text-5xl font-display text-white font-outfit">{formatPrice(itinerary.pricing.atmos4x4.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/30 uppercase text-[10px] font-black tracking-widest">{l.trioPlus}</span>
                      <span className="text-5xl font-display text-[#c4a97d] font-outfit">{formatPrice(itinerary.pricing.atmos4x4.trio)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Own Vehicle Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-10 md:p-16 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="flex items-center gap-6 mb-16">
                    <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                      <Car className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white font-outfit uppercase tracking-tight">{l.carroProprio}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Seu ritmo, sua jornada</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.individual}</span>
                      <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.individual)}</span>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.dupla}</span>
                      <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.dupla)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/20 uppercase text-[10px] font-black tracking-widest">{l.trioPlus}</span>
                      <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.trio)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Extra Costs & Inclusions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20 lg:gap-32 pt-24 border-t border-white/10">
                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#c4a97d]" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.extraCosts}</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-8 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-lg bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d]">
                          <Ticket className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-display font-outfit uppercase tracking-tight">{l.entranceFees}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest">{l.chargedSeparately}</p>
                        </div>
                      </div>
                      <span className="text-3xl font-display text-[#c4a97d] font-outfit">{formatPrice(itinerary.extraCosts.entranceFees)}</span>
                    </div>
                    {itinerary.extraCosts.equipmentFees && (
                      <div className="flex items-center justify-between p-8 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-lg bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d]">
                            <HelmetIcon size={24} />
                          </div>
                          <div>
                            <p className="text-lg font-display font-outfit uppercase tracking-tight">{l.equipmentFees}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">
                              {typeof itinerary.extraCosts.equipmentItems === 'string' ? itinerary.extraCosts.equipmentItems : itinerary.extraCosts.equipmentItems?.[language as keyof typeof itinerary.extraCosts.equipmentItems] || ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-3xl font-display text-[#c4a97d] font-outfit">{formatPrice(itinerary.extraCosts.equipmentFees)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#c4a97d]" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.inclusiveExp}</h4>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6">
                    {(itinerary.inclusions[language as keyof typeof itinerary.inclusions] || []).map((inc, i) => (
                      <li key={i} className="flex items-start gap-6 text-white/70 group">
                        <div className="w-8 h-8 rounded-full bg-[#c4a97d]/10 flex items-center justify-center flex-shrink-0 border border-[#c4a97d]/20 group-hover:bg-[#c4a97d]/30 transition-colors">
                          <Check className="h-4 w-4 text-[#c4a97d]" />
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
        <section className="py-32 bg-[#fcfaf7] text-center border-t border-[#e4dbcc]">
          <div className="container px-4">
            <div className="max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl md:text-5xl font-display text-[#2e2019] font-outfit uppercase tracking-tight">{l.bespokeTitle}</h2>
              <p className="text-[#2e2019]/60 text-lg font-light leading-relaxed">
                {l.bespokeDesc}
              </p>
              <Button 
                onClick={() => navigate("/monte-seu-roteiro")}
                className="rounded-none px-12 py-8 bg-[#c4a97d] hover:bg-[#b09366] text-white text-sm font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-[#c4a97d]/20"
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
