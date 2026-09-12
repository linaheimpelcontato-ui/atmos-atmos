import { CatalogStatus } from "@/components/CatalogStatus";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trackItineraryView } from "@/lib/analytics";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalize, optimizedUrl, heroUrl, IMAGE_PRESETS } from "@/lib/storage";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ItineraryReservationForm from "@/components/itineraries/ItineraryReservationForm";

import { publicText as getLangVal } from "@/lib/publicText";

const leafTexture = optimizedUrl("proposta-visual-cliente/leaf-texture - horizontal.jpg", IMAGE_PRESETS.large);
const leafTextureAlt = optimizedUrl("proposta-visual-cliente/leaf-texture.jpg", IMAGE_PRESETS.large);
const logoAtmos = optimizedUrl("home/logo-atmos.png", IMAGE_PRESETS.card);
const dividerImage = optimizedUrl("home/nature-divider.jpg", IMAGE_PRESETS.large);

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
    guideSuggested: "Guia Sugerido",
    importantToKnow: "Importante saber",
    accommodationNotice: "As hospedagens não estão inclusas no valor do roteiro. Recomendamos reservar 1 noite antes e 1 noite após o roteiro para chegada e retorno. A ATMOS oferece curadoria completa de hospedagens para organizar essas etapas com praticidade e conforto."
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
    guideSuggested: "Suggested Guide",
    importantToKnow: "Important to know",
    accommodationNotice: "Accommodations are not included in the itinerary price. We recommend booking 1 night before and 1 night after the itinerary for arrival and departure. ATMOS offers a complete curation of accommodations to organize these steps with convenience and comfort."
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
    guideSuggested: "Guía Sugerido",
    importantToKnow: "Importante saber",
    accommodationNotice: "El alojamiento no está incluido en el precio del itinerario. Recomendamos reservar 1 noche antes y 1 noche después del itinerario para la llegada y el regreso. ATMOS ofrece una curaduría completa de alojamientos para organizar estas etapas con comodidad y practicidad."
  },
};

function ImageCarousel({ images, alt }: { images: string[], alt: string }) {
  const [activeImages, setActiveImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images) {
      setActiveImages(images.filter(img => typeof img === "string" && img.trim() !== ""));
    } else {
      setActiveImages([]);
    }
    setCurrentIndex(0);
  }, [images]);

  if (!activeImages || activeImages.length === 0) return null;
  
  if (activeImages.length === 1) {
    return (
      <OptimizedImage
        src={activeImages[0]}
        alt={alt}
        className="w-full h-full object-cover"
        containerClassName="w-full h-full"
        onError={() => {
          setActiveImages([]);
        }}
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
            src={activeImages[currentIndex]}
            alt={`${alt} - ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            containerClassName="absolute inset-0"
            onError={() => {
              const failedUrl = activeImages[currentIndex];
              setActiveImages(prev => {
                const filtered = prev.filter(img => img !== failedUrl);
                if (currentIndex >= filtered.length) {
                  setCurrentIndex(Math.max(0, filtered.length - 1));
                }
                return filtered;
              });
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 z-10">
        {activeImages.map((_, i) => (
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
        onClick={() => setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % activeImages.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function DayBanner({ number, title, bgImage, children }: { number: number, title: string, bgImage?: string, children?: React.ReactNode }) {
  return (
    <div className="relative w-full px-6 md:px-12 py-20 md:py-32 overflow-hidden bg-black">
      {/* Base layer: the leaf pattern */}
      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${bgImage ? 'opacity-20 mix-blend-overlay' : 'opacity-60 mix-blend-screen'}`}
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
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

const EMPTY_PRODUCTS: any[] = [];

export default function ItineraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language = "pt" } = useLanguage();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const allProductsQuery = useProducts();
  const { data: allProducts = EMPTY_PRODUCTS } = allProductsQuery;
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  const mergedItineraries = useMemo(() => {
    // Se houver produtos no banco, eles são a fonte da verdade.
    const itinerariesOnly = allProducts.filter(p => p.type === 'itinerary');
    
    // Transform into a flat list of items (one section per product)
    const dbMapped = itinerariesOnly.map(dbProduct => {
      const supabaseVars = (dbProduct.variables || {}) as any;
      const allItineraryImages: string[] = [];
      
      const enrichedDays = (supabaseVars.days || []).map((day: any) => {
        const enrichedItems = (day.items || []).filter((item: any) => item.product_type !== 'guide').map((item: any, itemIdx: number) => {
          const childProduct = allProducts.find(p => p.id === (item.catalog_item_id || item.product_id));
          let itemImages: string[] = [];

          if (childProduct) {
            const vars = childProduct.variables as any || {};
            
            if (vars.gallery && Array.isArray(vars.gallery) && vars.gallery.length > 0) {
              const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
              let folder = "experiencias";
              if (childProduct.type === "accommodation") folder = "hospedagens";
              else if (childProduct.type === "service") folder = "servicos";
              else if (childProduct.category && childProduct.category.toLowerCase() === "cachoeiras") folder = "cachoeiras";

              itemImages = vars.gallery.map((fileName: string) => {
                if (fileName.includes('/')) return fileName;
                return `produtos/${folder}/${prefix}/${fileName}`;
              });
            } else if (vars.gallery_order && Array.isArray(vars.gallery_order) && vars.gallery_order.length > 0) {
              const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
              let folder = "experiencias";
              if (childProduct.type === "accommodation") folder = "hospedagens";
              else if (childProduct.type === "service") folder = "servicos";
              else if (childProduct.category && childProduct.category.toLowerCase() === "cachoeiras") folder = "cachoeiras";
              
              itemImages = vars.gallery_order.map((fileName: string) => {
                if (fileName.includes('/')) return fileName;
                return `produtos/${folder}/${prefix}/${fileName}`;
              });
            } else {
              const prefix = vars.storage_id || normalize(childProduct.name) || childProduct.id;
              const lookupId = childProduct.source_id || vars.imageKey || prefix || childProduct.id;
              const keyNormalized = normalize(lookupId);
              
              let folder = "experiencias";
              if (childProduct.type === "accommodation") folder = "hospedagens";
              else if (childProduct.type === "service") folder = "servicos";
              else if (childProduct.category && childProduct.category.toLowerCase() === "cachoeiras") folder = "cachoeiras";

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

              // Helper to check if two slugs share a significant word (length > 3)
              const sharesSignificantWord = (slug1: string, slug2: string) => {
                const words1 = slug1.split('-');
                const words2 = slug2.split('-');
                return words1.some(w1 => 
                  w1.length > 3 && words2.some(w2 => w2 === w1 || w2.includes(w1) || w1.includes(w2))
                );
              };

              let foundPath = "";
              const nameNormalized = normalize(childProduct.name || "");

              // 1. Try smart matching on static maps
              if (childProduct.type === "waterfall") {
                if (waterfallMap[keyNormalized]) {
                  foundPath = waterfallMap[keyNormalized];
                } else if (waterfallMap[prefix]) {
                  foundPath = waterfallMap[prefix];
                } else {
                  const matchedKey = Object.keys(waterfallMap).find(k => 
                    nameNormalized.includes(k) || keyNormalized.includes(k) || k.includes(keyNormalized) || k.includes(prefix) || prefix.includes(k) || sharesSignificantWord(nameNormalized, k)
                  );
                  if (matchedKey) foundPath = waterfallMap[matchedKey];
                }
              } else if (childProduct.type === "experience") {
                if (experienceMap[keyNormalized]) {
                  foundPath = experienceMap[keyNormalized];
                } else if (experienceMap[prefix]) {
                  foundPath = experienceMap[prefix];
                } else {
                  const matchedKey = Object.keys(experienceMap).find(k => 
                    nameNormalized.includes(k) || keyNormalized.includes(k) || k.includes(keyNormalized) || k.includes(prefix) || prefix.includes(k) || sharesSignificantWord(nameNormalized, k)
                  );
                  if (matchedKey) foundPath = experienceMap[matchedKey];
                }
              } else if (childProduct.type === "accommodation") {
                if (accMap[keyNormalized]) {
                  foundPath = accMap[keyNormalized];
                } else if (accMap[prefix]) {
                  foundPath = accMap[prefix];
                } else {
                  const matchedKey = Object.keys(accMap).find(k => 
                    nameNormalized.includes(k) || keyNormalized.includes(k) || k.includes(keyNormalized) || k.includes(prefix) || prefix.includes(k) || sharesSignificantWord(nameNormalized, k)
                  );
                  if (matchedKey) foundPath = accMap[matchedKey];
                }
              } else if (childProduct.type === "service") {
                if (serviceMap[keyNormalized]) {
                  foundPath = serviceMap[keyNormalized];
                } else if (serviceMap[prefix]) {
                  foundPath = serviceMap[prefix];
                } else {
                  const matchedKey = Object.keys(serviceMap).find(k => 
                    nameNormalized.includes(k) || keyNormalized.includes(k) || k.includes(keyNormalized) || k.includes(prefix) || prefix.includes(k) || sharesSignificantWord(nameNormalized, k)
                  );
                  if (matchedKey) foundPath = serviceMap[matchedKey];
                }
              }

              if (foundPath) {
                candidates.push(foundPath);
                
                // Extract directory and base name to generate sequential images
                const match = foundPath.match(/(.+)\/\d+\.(jpg|png|webp|avif)$/) || foundPath.match(/(.+)-1\.(jpg|png|webp|avif)$/);
                if (match) {
                  const base = match[1];
                  const ext = match[2];
                  // Try to load up to 10 images if they exist on Cloudflare
                  for (let i = 2; i <= 10; i++) {
                    candidates.push(`${base}-${i}.${ext}`);
                  }
                }
              } else {
                // 2. No static match: Add candidates with multiple extensions (.jpg, .png) for fallback
                const extensions = [".jpg", ".png"];
                for (let n = 1; n <= 10; n++) {
                  extensions.forEach(ext => {
                    if (prefix === "lanche-de-trilha" || prefix === "lanche-de-trilha-atmos") {
                      candidates.push(`produtos/${folder}/lanche-de-trilha-atmos-${n}${ext}`);
                    } else {
                      candidates.push(`produtos/${folder}/${prefix}/${prefix}-${n}${ext}`);
                    }
                  });
                }
              }

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
            ...item,
            id: `${dbProduct.id}-item-${itemIdx}`,
            dayNumber: day.day ?? day.dayNumber,
            itemNumber: itemIdx + 1,
            title: { 
              pt: getLangVal(item.product_name ?? item.item_name, 'pt'),
              en: getLangVal(item.product_name ?? item.item_name, 'en'),
              es: getLangVal(item.product_name ?? item.item_name, 'es')
            },
            trailDistanceKm: item.product_variables?.trailDistanceKm,
            difficulty: (item.product_variables?.difficulty || "moderado") as any,
            resolvedTitle: getLangVal(item.product_name ?? item.item_name, 'pt'),
            attractions: { 
              pt: [getLangVal(item.product_name ?? item.item_name, 'pt')],
              en: [getLangVal(item.product_name ?? item.item_name, 'en')],
              es: [getLangVal(item.product_name ?? item.item_name, 'es')]
            },
            description: { 
              pt: getLangVal(item.product_description ?? item.description, 'pt'),
              en: getLangVal(item.product_description ?? item.description, 'en'),
              es: getLangVal(item.product_description ?? item.description, 'es')
            },
            hasGuide: day.items.some((it: any) => it.product_type === 'guide'),
            images: itemImages
          };
        });

        const dayProductImages = Array.from(new Set(
          enrichedItems
            .flatMap((item: any) => item.images || [])
            .filter((img: any) => typeof img === "string" && img.trim() !== "")
        ));

        return {
          ...day,
          title: { pt: `Dia ${day.dayNumber}`, en: `Day ${day.dayNumber}`, es: `Día ${day.dayNumber}` },
          items: enrichedItems,
          images: dayProductImages.length > 0 
            ? dayProductImages 
            : ((day.images && day.images.length > 0) ? day.images : (day.imageKey ? [day.imageKey] : []))
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
        name: { 
          pt: getLangVal(dbProduct.name, 'pt'), 
          en: getLangVal(dbProduct.name, 'en'), 
          es: getLangVal(dbProduct.name, 'es') 
        },
        description: { 
          pt: getLangVal(dbProduct.description || "", 'pt'), 
          en: getLangVal(dbProduct.description || "", 'en'), 
          es: getLangVal(dbProduct.description || "", 'es') 
        },
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

    return dbMapped;
  }, [allProducts]);

  const itinerary = id ? getItineraryById(id, mergedItineraries) : undefined;
  const l = labels[language as keyof typeof labels] || labels.pt;

  useEffect(() => {
    if (itinerary) {
      // 1. Collect all images from the days and items
      const dayImagesList: string[] = [];
      (itinerary.days || []).forEach(day => {
        if (day.images && day.images.length > 0) {
          (day.images || []).forEach(img => {
            if (img && !dayImagesList.includes(img)) dayImagesList.push(img);
          });
        }
        (day.items || []).forEach(item => {
          if (item.images && item.images.length > 0) {
            (item.images || []).forEach(img => {
              if (img && !dayImagesList.includes(img)) dayImagesList.push(img);
            });
          }
        });
      });

      // 2. Select initial raw images candidates
      let candidates = (itinerary.favorites && itinerary.favorites.length > 0)
        ? itinerary.favorites
        : dayImagesList;

      candidates = candidates.filter(Boolean);

      // 3. Map candidates to optimized URLs, converting thumbnail preset to large preset for crisp hero display
      let mapped = candidates.slice(0, 5).map(img => {
        const resolved = getDayImage(img, itinerary.name.pt);
        return resolved.includes("presets/thumbnail")
          ? resolved.replace("presets/thumbnail", "presets/large")
          : resolved;
      });

      // 4. Static itinerary cover covers as high priority fallback
      const staticItineraryImages: Record<string, string> = {
        "2d-classico": "produtos/cachoeiras/segredo/segredo-1.jpg",
        "2d-jurassico": "produtos/cachoeiras/macacao/macacao-1.jpg",
        "3d-classico": "produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg",
        "3d-jurassico": "produtos/cachoeiras/macaquinhos/macaquinhos-1.jpg",
        "4d-classico": "produtos/cachoeiras/couros/couros-1.jpg",
        "4d-jurassico": "produtos/cachoeiras/dragao/dragao-1.jpg",
        "5d-classico": "produtos/cachoeiras/couros/couros-1.jpg",
        "5d-jurassico": "produtos/cachoeiras/dragao/dragao-1.jpg",
      };

      let staticKey = itinerary.id;
      if (staticKey.includes("-") && staticKey.length > 20) {
        // It's a dynamic UUID! Resolve based on category and duration from the name.
        const nameSlug = normalize(itinerary.name.pt || "");
        if (nameSlug.includes("jurassico")) {
          if (nameSlug.includes("2")) staticKey = "2d-jurassico";
          else if (nameSlug.includes("3")) staticKey = "3d-jurassico";
          else if (nameSlug.includes("4")) staticKey = "4d-jurassico";
          else if (nameSlug.includes("5")) staticKey = "5d-jurassico";
        } else {
          if (nameSlug.includes("2")) staticKey = "2d-classico";
          else if (nameSlug.includes("3")) staticKey = "3d-classico";
          else if (nameSlug.includes("4")) staticKey = "4d-classico";
          else if (nameSlug.includes("5")) staticKey = "5d-classico";
        }
      }

      if (staticItineraryImages[staticKey]) {
        // Use heroUrl() for R2 CDN at full 1920px resolution — never local thumbnail
        const staticHeroUrl = heroUrl(staticItineraryImages[staticKey]);
        mapped = [staticHeroUrl]; // Use only the high-quality static image as the hero
      }

      // 5. Ultimate hard fallback if no images resolved correctly
      if (mapped.length === 0) {
        mapped = [
          heroUrl("produtos/cachoeiras/segredo/segredo-1.jpg"),
        ];
      }

      // De-duplicate array
      const uniqueMapped = Array.from(new Set(mapped));
      setHeroImages(uniqueMapped);
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
      <CatalogStatus queries={[allProductsQuery]} />
        <div className="bg-white min-h-screen container px-4 py-24 text-center">
          {!allProductsQuery.isPending && !allProductsQuery.isError && <p className="text-[#1A261B]/40 text-lg">{l.notFound}</p>}
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
    <Layout hideWishlist>
      <CatalogStatus queries={[allProductsQuery]} />
      <PageSEO 
        title={`${itinerary.name[language as keyof typeof itinerary.name]} | ATMOS`}
        description={itinerary.description[language as keyof typeof itinerary.description]}
        path={`/roteiros/${itinerary.id}`}
      />

      <div className="bg-[#fcfaf7]">
        {/* Cinematic Hero */}
        <section
          className="relative min-h-screen flex flex-col justify-end pt-36 pb-20 md:pb-24 px-6 md:px-16 overflow-hidden bg-black"
          style={heroImages.length > 0 ? {
            backgroundImage: `url(${heroImages[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          </div>
          
          <div className="max-w-7xl mx-auto w-full z-10 relative flex-1 flex flex-col justify-between pt-12">
            <button
              onClick={() => navigate("/roteiros")}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.3em] self-start mb-12"
            >
              <ArrowLeft className="h-4 w-4" />
              {l.back}
            </button>

            <div className="w-full">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-8 h-[1px] bg-white/60" />
                <span className="text-white/80 text-[10px] md:text-xs uppercase tracking-[0.5em] font-bold">
                  {language === "pt" ? "Roteiro Atmos" : language === "es" ? "Itinerario Atmos" : "Atmos Itinerary"}
                </span>
              </div>
              
              <h1 className="text-white text-4xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter drop-shadow-2xl mb-8 max-w-5xl font-outfit uppercase">
                {itinerary.name[language as keyof typeof itinerary.name]}
              </h1>

              <p className="text-xl md:text-3xl text-white/80 max-w-3xl font-light leading-relaxed mb-12">
                {itinerary.description[language as keyof typeof itinerary.description]}
              </p>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-t border-white/10 pt-8">
                <div className="flex flex-wrap gap-8 md:gap-12 items-center">
                  <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-bold">Destino</span>
                    <span className="text-white text-lg font-medium">Chapada dos Veadeiros</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-bold">Duração</span>
                    <span className="text-white text-lg font-medium">{itinerary.duration} {l.days}</span>
                  </div>
                </div>

                <Button
                  onClick={toggleWishlist}
                  className={`rounded-none px-8 py-6 gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                    inWishlist ? "bg-white text-[#2e2019]" : "bg-[#c4a97d] text-white hover:scale-105"
                  }`}
                  style={{ boxShadow: inWishlist ? "none" : "0 4px 20px rgba(196,169,125,0.3)" }}
                >
                  <Heart className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} />
                  {inWishlist ? l.removeWishlist : l.addWishlist}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ BRAND INTRO ══════════════════════ */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="py-16 md:py-20 px-6 bg-[#f5f0e8] border-y border-[#e4dbcc]"
        >
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] font-black mb-4" style={{ color: "#c4a97d" }}>atmos.</p>
            <h2 className="text-4xl md:text-5xl font-black leading-none mb-6 font-outfit uppercase tracking-tighter" style={{ color: "#2e2019" }}>
              {language === "pt" ? "A Experiência Atmos" : language === "es" ? "La Experiencia Atmos" : "The Atmos Experience"}
            </h2>
            <div className="w-12 h-[2px] bg-[#c4a97d] mx-auto mb-6" />
            <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-4 font-light italic" style={{ color: "#5c4a32" }}>
              {language === "pt" 
                ? "Desenhamos expedições singulares na Chapada dos Veadeiros, combinando o espírito de aventura selvagem com a sofisticação de serviços exclusivos."
                : language === "es"
                ? "Diseñamos expediciones singulares en la Chapada dos Veadeiros, combinando el espíritu de la aventura salvaje con la sofisticación de servicios exclusivos."
                : "We design unique expeditions in Chapada dos Veadeiros, combining the spirit of wild adventure with the sophistication of exclusive services."}
            </p>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "#c4a97d" }}>
              {language === "pt" 
                ? "Sua expedição personalizada começa aqui" 
                : language === "es"
                ? "Tu expedición personalizada comienza aquí"
                : "Your custom expedition begins here"}
            </p>
          </div>
        </motion.section>



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
            const resolvedTitle = getLangVal(day.title, language) || getLangVal((day as any).items?.[0]?.product_name ?? (day as any).items?.[0]?.item_name, language) || `Dia ${idx + 1}`;
            
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
              .map((i: any) => getLangVal(i.product_name ?? i.item_name, language)).filter(Boolean);

            const visibleItems = ((day as any).items || []).filter((item: any) => item.product_type !== 'guide');
            const isEven = idx % 2 === 0;

            // 1. Dificuldade Dinâmica (Dia -> Itens -> Catalog/Variables -> Moderado)
            const resolvedDifficulty = day.difficulty || ((day as any).items || []).reduce((found: string, item: any) => {
              if (found) return found;
              const childProduct = allProducts.find((p: any) => p.id === (item.catalog_item_id || item.product_id));
              const vars = (childProduct?.variables || {}) as any;
              return item.difficulty || item.product_variables?.difficulty || vars.difficulty || "";
            }, "") || "moderado";

            const diff = difficultyConfig[resolvedDifficulty as keyof typeof difficultyConfig] || difficultyConfig.moderado;

            // 2. Distância de Trilha Dinâmica (Dia -> Itens -> Catalog/Variables -> Fallback Cachoeira)
            const hasWaterfall = ((day as any).items || []).some((item: any) => item.product_type === 'waterfall');
            const resolvedTrailDistance = day.trailDistanceKm || ((day as any).items || []).reduce((acc: number, item: any) => {
              const childProduct = allProducts.find((p: any) => p.id === (item.catalog_item_id || item.product_id));
              const vars = (childProduct?.variables || {}) as any;
              const dist = item.trailDistanceKm || item.product_variables?.trailDistanceKm || vars.distanceKm || 0;
              return acc + Number(String(dist).replace(",", "."));
            }, 0);
            const finalTrailDistance = resolvedTrailDistance > 0 ? resolvedTrailDistance : (hasWaterfall ? 3 : 0);

            // 3. Distância de Carro Dinâmica (Itens -> Catalog/Variables -> Fallback Cachoeira)
            const dayCarDistance = ((day as any).items || []).reduce((acc: number, item: any) => {
              const childProduct = allProducts.find((p: any) => p.id === (item.catalog_item_id || item.product_id));
              const vars = (childProduct?.variables || {}) as any;
              const dist = item.product_variables?.distanceCarKm || vars.distanceCarKm || 0;
              return acc + Number(dist);
            }, 0);
            const finalCarDistance = dayCarDistance > 0 ? dayCarDistance : (hasWaterfall ? 45 : 0);

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
                  {guideNames.length > 0 && (
                    <div className="flex flex-col gap-2 items-end justify-end">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {guideNames.map((name: string, gi: number) => (
                          <span key={gi} className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                            style={{ background: "#744404", color: "#fff" }}>
                            <Compass className="w-3.5 h-3.5" />
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </DayBanner>

                {/* ══════ DAY BODY: image bleeds left, content right ══════ */}
                <div style={{ background: isEven ? "#fff" : "#fcfaf7" }} className="py-8 md:py-12 border-b border-[#e4dbcc] overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[420px]">

                    {/* LEFT — image bleeds to screen edge (no left padding/margin) */}
                    {day.images && day.images.length > 0 && (
                      <div className="w-full lg:w-[48%] flex-shrink-0 lg:ml-0">
                        <div className="lg:sticky lg:top-20 self-start relative overflow-hidden w-full" style={{ aspectRatio: '4/3', maxHeight: '520px' }}>
                          <ImageCarousel 
                            images={day.images.map((img: string) => getDayImage(img, resolvedTitle))} 
                            alt={resolvedTitle} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">Dia {idx + 1}</p>
                            <h4 className="text-white font-black text-2xl md:text-3xl uppercase font-outfit tracking-tighter leading-none">
                              {resolvedTitle}
                            </h4>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RIGHT — content with generous padding */}
                    <div className="flex-1 min-w-0 px-8 md:px-14 lg:px-16 py-10 md:py-12 flex flex-col justify-center">
                      {/* Elegant Column Header: Nome do Roteiro & Dia */}
                      <div className="mb-8 pb-6 border-b border-[#e4dbcc]/60">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#c4a97d]">
                            {itinerary?.name?.[language] || itinerary?.name?.pt || "Roteiro Atmos"}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c4a97d]/40" />
                          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#5c4a32]">
                            {language === "en" ? `Day ${idx + 1}` : language === "es" ? `Día ${idx + 1}` : `Dia ${idx + 1}`}
                          </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black font-outfit uppercase tracking-tight text-[#2e2019] leading-tight">
                          {resolvedTitle}
                        </h3>
                      </div>

                      {(() => {
                        const descText = typeof day.description === 'string' 
                          ? day.description 
                          : day.description?.[language] || "";
                        if (!descText.trim()) return null;
                        return (
                          <p className="text-lg md:text-xl font-light leading-relaxed text-[#5c4a32] italic border-l-4 border-[#c4a97d] pl-6 py-1 mb-10">
                            {descText}
                          </p>
                        );
                      })()}

                      <div className="space-y-8">
                        {visibleItems.map((item: any, localIdx: number) => {
                          const catKey = productTypeToCategory[item.product_type] || "Experiência";
                          const Icon = CATEGORY_ICONS[catKey] || MapPin;
                          const catLabel = CATEGORY_LABELS[catKey]?.[language] || catKey;
                          const itemTitle = getLangVal(item.product_name ?? item.item_name ?? item.name ?? item.title, language);
                          const itemDesc = getLangVal(item.product_description ?? item.description, language);
                          
                          return (
                            <div key={localIdx} className="flex items-start gap-4 pb-8 border-b border-[#e4dbcc] last:border-0 last:pb-0">
                              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-black">
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
                                  <div className="mt-2 pl-4 py-2 pr-2 text-sm italic border-l-2 border-[#c4a97d] text-[#5c4a32] leading-relaxed">
                                    {itemDesc}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Day meta badges */}
                      {(resolvedDifficulty || finalTrailDistance > 0 || finalCarDistance > 0 || hasWaterfall) && (
                        <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-[#e4dbcc]">
                          {hasWaterfall && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                              <Compass className="w-3.5 h-3.5" />
                              {language === "en" ? "SPECIALIZED GUIDE" : language === "es" ? "GUÍA ESPECIALIZADO" : "GUIA ESPECIALIZADO"}
                            </span>
                          )}
                          {resolvedDifficulty && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                              <Mountain className="w-3.5 h-3.5" />
                              {resolvedDifficulty === "facil" ? (language === "en" ? "Easy" : language === "es" ? "Fácil" : "Fácil") : resolvedDifficulty === "dificil" ? (language === "en" ? "Difficult" : language === "es" ? "Difícil" : "Difícil") : (language === "en" ? "Moderate" : language === "es" ? "Moderado" : "Moderado")}
                            </span>
                          )}
                          {finalTrailDistance > 0 && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                              <Footprints className="w-3.5 h-3.5" />
                              {finalTrailDistance} {language === "en" ? "KM TRAIL" : language === "es" ? "KM SENDERO" : "KM TRILHA"}
                            </span>
                          )}
                          {finalCarDistance > 0 && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black bg-[#556952] text-white">
                              <Car className="w-3.5 h-3.5" />
                              {finalCarDistance} KM
                            </span>
                          )}
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
        <section 
          className="py-32 md:py-48 text-[#FDFCFB] relative overflow-hidden bg-[#160f0c]"
          style={{
            backgroundImage: `url(${heroImages[0] || heroUrl("produtos/cachoeiras/segredo/segredo-1.jpg")})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Elegant dark background overlay to ensure premium visual integration */}
          <div className="absolute inset-0 bg-black/70 z-0" />
          
          <div className="container px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center space-y-6 mb-24 relative z-10">
                <span className="text-[10px] uppercase font-black tracking-[0.6em] text-[#c4a97d]">Investimento</span>
                <h2 className="text-3xl md:text-5xl font-display font-outfit uppercase tracking-tight leading-tight">{l.pricing}</h2>
                <p className="text-white/40 text-sm font-light uppercase tracking-widest pt-4">{l.priceNote}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-16 relative z-10">
                {/* 4x4 Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-[#1a130f] border border-white/10 rounded-none p-10 md:p-16 relative overflow-hidden group backdrop-blur-sm"
                >
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#c4a97d]/10 blur-[100px] rounded-full group-hover:bg-[#c4a97d]/20 transition-colors duration-700" />
                  
                  <div className="flex items-center gap-6 mb-16 relative z-10">
                    <div className="w-20 h-20 rounded-none bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d] border border-[#c4a97d]/20">
                      <Truck className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white font-outfit uppercase tracking-tight">{l.atmos4x4}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#c4a97d]/60">{l.guideIncluded}</p>
                    </div>
                  </div>

                  <div className="space-y-10 relative z-10">
                    {/* Legenda Superior Explicativa */}
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-[#c4a97d]/50 border-b border-white/5 pb-4">
                      <span>Qtd de pessoas no grupo</span>
                      <span>Valor por pessoa</span>
                    </div>

                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">1 pessoa</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-white font-outfit">{formatPrice(itinerary.pricing.atmos4x4.individual)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-1">por pessoa</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10 group-hover:border-white/20 transition-colors">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">2 pessoas</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-white font-outfit">{formatPrice(itinerary.pricing.atmos4x4.dupla)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-1">por pessoa</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">3 pessoas ou mais</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-[#c4a97d] font-outfit">{formatPrice(itinerary.pricing.atmos4x4.trio)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-[#c4a97d]/40 mt-1">por pessoa</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Own Vehicle Option */}
                <motion.div 
                  whileHover={{ y: -15 }}
                  className="bg-[#1a130f] border border-white/10 rounded-none p-10 md:p-16 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="flex items-center gap-6 mb-16 relative z-10">
                    <div className="w-20 h-20 rounded-none bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                      <Car className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display text-white font-outfit uppercase tracking-tight">{l.carroProprio}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Seu ritmo, sua jornada</p>
                    </div>
                  </div>

                  <div className="space-y-10 relative z-10">
                    {/* Legenda Superior Explicativa */}
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5 pb-4">
                      <span>Qtd de pessoas no grupo</span>
                      <span>Valor por pessoa</span>
                    </div>

                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">1 pessoa</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.individual)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-1">por pessoa</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pb-8 border-b border-white/10">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">2 pessoas</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.dupla)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-1">por pessoa</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-white/60 uppercase text-[10px] font-black tracking-widest">3 pessoas ou mais</span>
                      <div className="text-right">
                        <span className="text-5xl font-display text-white/80 font-outfit">{formatPrice(itinerary.pricing.carroProprio.trio)}</span>
                        <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-1">por pessoa</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Exclusive Groups Guarantee Notice Banner */}
              <div className="mb-32 relative z-10 text-center max-w-2xl mx-auto border border-[#c4a97d]/30 bg-[#c4a97d]/5 p-8 backdrop-blur-md">
                <p className="text-[#c4a97d] text-xs font-black uppercase tracking-[0.3em] mb-2">Exclusividade Garantida</p>
                <p className="text-white/80 text-sm font-light leading-relaxed">
                  Todos os nossos roteiros são operados com <strong className="font-bold text-white">grupos exclusivos e 100% privativos</strong>. 
                  Você terá a expedição inteiramente dedicada a você, sua família ou seus amigos, sem compartilhamento com outros clientes.
                </p>
              </div>

              {/* Extra Costs & Inclusions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20 lg:gap-32 pt-24 border-t border-white/10">
                {/* Left Column: Extra Costs (if present) & Importante Saber */}
                <div className="space-y-16">
                  {((itinerary.extraCosts?.entranceFees > 0) || (itinerary.extraCosts?.equipmentFees > 0)) && (
                    <div className="space-y-12">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-[#c4a97d] rounded-none" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.extraCosts}</h4>
                      </div>
                      <div className="space-y-6">
                        {itinerary.extraCosts.entranceFees > 0 && (
                          <div className="flex items-center justify-between p-8 bg-[#1a130f] rounded-none border border-white/10 hover:bg-[#1a130f]/80 transition-colors">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-none bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d] border border-[#c4a97d]/20">
                                <Ticket className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-lg font-display font-outfit uppercase tracking-tight">{l.entranceFees}</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">{l.chargedSeparately}</p>
                              </div>
                            </div>
                            <span className="text-3xl font-display text-[#c4a97d] font-outfit">{formatPrice(itinerary.extraCosts.entranceFees)}</span>
                          </div>
                        )}
                        {itinerary.extraCosts.equipmentFees > 0 && (
                          <div className="flex items-center justify-between p-8 bg-[#1a130f] rounded-none border border-white/10 hover:bg-[#1a130f]/80 transition-colors">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-none bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d] border border-[#c4a97d]/20">
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
                  )}

                  <div className="space-y-12">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-[#c4a97d] rounded-none" />
                      <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.importantToKnow}</h4>
                    </div>
                    <div className="p-8 bg-[#1a130f] rounded-none border border-white/10 hover:bg-[#1a130f]/80 transition-colors">
                      <p className="text-white/80 text-sm font-light leading-relaxed">
                        {l.accommodationNotice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Inclusions */}
                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-[#c4a97d] rounded-none" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">{l.inclusiveExp}</h4>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6">
                    {(() => {
                      const defaultInclusions = {
                        pt: [
                          "Guiamento ATMOS especializado",
                          "Curadoria completa do roteiro",
                          "Registros fotográficos",
                          "Assistência ATMOS 360° durante toda a viagem"
                        ],
                        en: [
                          "Specialized ATMOS guiding",
                          "Complete itinerary curation",
                          "Photographic records",
                          "ATMOS 360° assistance throughout the journey"
                        ],
                        es: [
                          "Guía especializado de ATMOS",
                          "Curaduría completa del itinerario",
                          "Registros fotográficos",
                          "Asistencia ATMOS 360° durante todo el viaje"
                        ]
                      };

                      const inclusionsList = (itinerary.inclusions && itinerary.inclusions[language as keyof typeof itinerary.inclusions] && itinerary.inclusions[language as keyof typeof itinerary.inclusions].length > 0)
                        ? itinerary.inclusions[language as keyof typeof itinerary.inclusions]
                        : defaultInclusions[language as keyof typeof defaultInclusions] || defaultInclusions.pt;

                      return inclusionsList.map((inc, i) => (
                        <li key={i} className="flex items-start gap-6 text-white/70 group">
                          <div className="w-8 h-8 rounded-none bg-[#c4a97d]/10 flex items-center justify-center flex-shrink-0 border border-[#c4a97d]/20 group-hover:bg-[#c4a97d]/30 transition-colors">
                            <Check className="h-4 w-4 text-[#c4a97d]" />
                          </div>
                          <span className="text-xl font-light leading-snug">{inc}</span>
                        </li>
                      ));
                    })()}
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
              <h2 className="text-4xl md:text-5xl font-display text-[#2e2019] font-outfit uppercase tracking-tight">
                {language === "en" 
                  ? `Secure your spot on: ${getLangVal(itinerary.name, 'en')}`
                  : language === "es"
                  ? `Reserve su lugar en: ${getLangVal(itinerary.name, 'es')}`
                  : `Garanta sua vaga no: ${getLangVal(itinerary.name, 'pt')}`
                }
              </h2>
              <p className="text-[#2e2019]/60 text-lg font-light leading-relaxed">
                {language === "en"
                  ? "Ready to embark on this extraordinary journey? Let us build the perfect experience for you. Request your reservation now."
                  : language === "es"
                  ? "¿Listo para embarcarse en este viaje extraordinario? Déjenos construir la experiencia perfecta para usted. Solicite su reserva ahora."
                  : "Pronto para embarcar nessa jornada extraordinária? Deixe-nos estruturar a experiência perfeita para você. Solicite sua reserva agora."
                }
              </p>
              <Button 
                onClick={() => setIsReservationOpen(true)}
                className="rounded-none px-12 py-8 bg-[#c4a97d] hover:bg-[#b09366] text-white text-sm font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-[#c4a97d]/20"
              >
                {language === "en" ? "Request reservation" : language === "es" ? "Solicitar reserva" : "Solicitar reserva"}
                <ArrowRight className="h-4 w-4 ml-3" />
              </Button>
            </div>
          </div>
        </section>

        {/* Itinerary Reservation Dialog */}
        <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
          <DialogContent className="max-w-lg p-8 sm:p-12 overflow-y-auto max-h-[90vh] rounded-none border border-[#e4dbcc] bg-[#fcfaf7]">
            <ItineraryReservationForm
              itinerary={itinerary}
              language={language}
              onClose={() => setIsReservationOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
