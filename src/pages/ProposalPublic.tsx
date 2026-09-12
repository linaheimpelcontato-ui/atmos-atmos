import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl, optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { fetchStorageImages } from "@/hooks/useStorageImages";
import { getDayImage } from "@/components/itineraries/dayImages";
import { trackProposalView } from "@/lib/analytics";
import { parsePublicProposal, canShowPriceBreakdown, type PublicProposal } from "@/lib/publicProposal";
import { isProposalExpired } from "@/lib/dateRules";
import { buildProposalEditsPayload, resolveItemDescription } from "@/lib/proposalEdits";
import { createLatestRequestGuard } from "@/lib/requestGuard";
import {
  Check, MapPin, Users, CalendarDays,
  Sunrise, Mountain, Compass, Sparkles, Leaf, MessageCircle,
  ChevronLeft, ChevronRight, ChevronDown, Home, Car, Footprints, Truck,
  Pencil, Save, Globe, Link, FileSignature, GripVertical, Eye, EyeOff,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ProposalFeedbackDialog from "@/components/proposal/ProposalFeedbackDialog";
/* dnd-kit reordering */
const logoAtmos = optimizedUrl("home/logo-atmos.png", IMAGE_PRESETS.card);
const heroImage = optimizedUrl("proposta-visual-cliente/propostavisualbg.jpg", IMAGE_PRESETS.large);
const dividerImage = optimizedUrl("home/nature-divider.jpg", IMAGE_PRESETS.large);
const leafTexture = optimizedUrl("proposta-visual-cliente/leaf-texture - horizontal.jpg", IMAGE_PRESETS.large);
const leafTextureAlt = optimizedUrl("proposta-visual-cliente/leaf-texture.jpg", IMAGE_PRESETS.large);


/* ───── types ─────
 * Proposal is the RPC-shaped public projection (see src/lib/publicProposal.ts);
 * this page never queries proposals/proposal_day_items/etc. directly. */
type Proposal = PublicProposal;
type DayItem = {
  id?: string;
  day_number: number; day_label: string; category: string;
  item_name: string | null; value: number; description: string | null;
  catalog_item_id: string | null; quantity: number; vehicle_type: string | null;
  start_time: string | null; end_time: string | null;
  item_index: number;
  value_text?: string | null;
};
type Product = { id: string; source_id: string | null; type: string; name: string; variables: any };

/* ───── experience source_id → storage key overrides ───── */
const EXP_STORAGE_KEY: Record<string, string> = {
  "astro-turismo": "Astro Turismo",
  "aula-forro": "Aula de Forró",
  "massagem-bem-estar": "Massagem e Bem Estar",
  "noturna-imersiva": "Experiencia Noturna Imersiva",
  "voo-balao": "Voo de Balao",
  "voo-paramotor": "Voo de Paramotor",
  "yoga-meditacao": "Yoga e Meditacao",
  "passeio-cavalo": "Passeio a Cavalo",
  "feira-produtores": "Feira Dos Produtores Locais",
  "canionismo": "Canionismo",
  "rafting": "Rafting",
  "rapel": "Rapel",
  "tirolesa": "Tirolesa Fazenda Sao Bento",
  "danca-fogo": "Dança com Fogo",
  "gota-sat-som": "Gota Sat Som",
  "mesa-lira": "Mesa Lira",
  "celestial-garden": "Celestial Garden",
  // Waterfalls mapping
  "almecegas-i-e-ii-sao-bento": "Almecegas",
  "almecegas-i": "Almecegas",
  "almecegas-ii": "Almecegas",
  "alpes-goianos": "Alpes Goianos",
  "anjos-e-arcanjos": "Anjos e Arcanjos",
  "agua-fria": "Água fria",
  "bocaina-do-farias": "Bocaina do Farias",
  "bona-espero": "Bona espero",
  "boqueirao": "Boqueirão",
  "candaru": "Candaru",
  "canjica-aguas-lindas": "Canjica e Águas lindas",
  "caracol": "Caracol",
  "catoa": "Catoá",
  // Services & Transfers mappings
  "diaria-captacao-drone": "Drone",
  "diaria-captacao-edicao-drone": "Drone",
  "lanche-trilha": "Lanche",
  "transfer-compartilhado": "Transfer",
  "transfer-particular": "Transfer",
  "van-particular": "Transfer",
};

/* ───── i18n ───── */
const labels: Record<string, Record<string, string>> = {
  pt: {
    proposal: "Proposta", client: "Cliente", seller: "Consultor", dates: "Datas",
    people: "Pessoas", days: "dias", subtotal: "Subtotal roteiro", discount: "Desconto",
    tax: "Imposto", total: "Total", perPerson: "Por pessoa", validUntil: "Válida até",
    notes: "Observações", day: "Dia", poweredBy: "Powered by ATMOS",
    atmosService: "Serviço ATMOS", atmosIncludes: "O que inclui",
    yourTrip: "Sua Viagem", inspirational: "A natureza não espera. A Chapada te chama.",
    brandTitle: "Curadoria de Experiências na Chapada dos Veadeiros",
    brandText1: "Somos mais que uma agência de turismo. Somos um convite para viver a Chapada de forma autêntica, profunda e transformadora.",
    brandText2: "Cada roteiro é desenhado para conectar você à essência do Cerrado.",
    investmentTitle: "Investimento",
    packagesValues: "Pacotes & Valores",
    notIncluded: "Não incluso",
    notIncludedText: "Passagens aéreas, despesas pessoais, seguro viagem e refeições opcionais que não estejam descritas no roteiro.",
    includedInService: "Incluso no Serviço ATMOS",
    yourAccommodation: "Sua Hospedagem",
    contractTitle: "Contrato de Prestação de Serviços",
    contractText: "Para confirmar sua viagem, solicitamos a assinatura digital do contrato de prestação de serviços. Ao assinar, você garante sua reserva e todos os detalhes do roteiro acima.",
    contractButton: "Assinar Contrato",
  },
  en: {
    proposal: "Proposal", client: "Client", seller: "Consultant", dates: "Dates",
    people: "People", days: "days", subtotal: "Itinerary subtotal", discount: "Discount",
    tax: "Tax", total: "Total", perPerson: "Per person", validUntil: "Valid until",
    notes: "Notes", day: "Day", poweredBy: "Powered by ATMOS",
    atmosService: "ATMOS Service", atmosIncludes: "What's included",
    yourTrip: "Your Journey", inspirational: "Nature doesn't wait. Chapada is calling.",
    brandTitle: "Curated Experiences in Chapada dos Veadeiros",
    brandText1: "We are more than a travel agency. We are an invitation to experience Chapada in an authentic, deep and transformative way.",
    brandText2: "Each itinerary is designed to connect you to the essence of the Cerrado.",
    investmentTitle: "Investment",
    packagesValues: "Packages & Values",
    notIncluded: "Not included",
    notIncludedText: "Airfare, personal expenses, travel insurance and optional meals not described in the itinerary.",
    includedInService: "Included in ATMOS Service",
    yourAccommodation: "Your Accommodation",
    contractTitle: "Service Agreement",
    contractText: "To confirm your trip, we kindly request the digital signature of the service agreement. By signing, you secure your reservation and all the itinerary details above.",
    contractButton: "Sign Contract",
  },
  es: {
    proposal: "Propuesta", client: "Cliente", seller: "Consultor", dates: "Fechas",
    people: "Personas", days: "días", subtotal: "Subtotal itinerario", discount: "Descuento",
    tax: "Impuesto", total: "Total", perPerson: "Por persona", validUntil: "Válida hasta",
    notes: "Observaciones", day: "Día", poweredBy: "Powered by ATMOS",
    atmosService: "Servicio ATMOS", atmosIncludes: "Qué incluye",
    yourTrip: "Tu Viaje", inspirational: "La naturaleza no espera. Chapada te llama.",
    brandTitle: "Curaduría de Experiencias en Chapada dos Veadeiros",
    brandText1: "Somos más que una agencia de turismo. Somos una invitación a vivir Chapada de forma auténtica, profunda y transformadora.",
    brandText2: "Cada itinerario está diseñado para conectarte con la esencia del Cerrado.",
    investmentTitle: "Inversión",
    packagesValues: "Paquetes y Valores",
    notIncluded: "No incluido",
    notIncludedText: "Pasajes aéreos, gastos personales, seguro de viaje y comidas opcionales no descritas en el itinerario.",
    includedInService: "Incluido en el Servicio ATMOS",
    yourAccommodation: "Tu Hospedaje",
    contractTitle: "Contrato de Prestación de Servicios",
    contractText: "Para confirmar tu viaje, solicitamos la firma digital del contrato de prestación de servicios. Al firmar, aseguras tu reserva y todos los detalles del itinerario.",
    contractButton: "Firmar Contrato",
  },
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

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  Cachoeira: Mountain, Ingresso: Mountain, "Cachoeira / Ingresso": Mountain,
  Guia: Compass, "Diária Guia ATMOS": Compass, Hospedagem: MapPin,
  Lanche: Leaf, "Lanche Trilha": Leaf, Transfer: Sunrise, "Refeição": Leaf,
  "Experiência": Sparkles,
};

/* ───── difficulty config ───── */
const DIFFICULTY_CONFIG: Record<string, { pt: string; en: string; es: string; color: string; bg: string }> = {
  facil: { pt: "Fácil", en: "Easy", es: "Fácil", color: "#166534", bg: "#dcfce7" },
  moderado: { pt: "Moderado", en: "Moderate", es: "Moderado", color: "#92400e", bg: "#fef3c7" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil", color: "#991b1b", bg: "#fee2e2" },
  muito_facil: { pt: "Muito Fácil", en: "Very Easy", es: "Muy Fácil", color: "#166534", bg: "#dcfce7" },
  moderado_dificil: { pt: "Moderado/Difícil", en: "Moderate/Hard", es: "Moderado/Difícil", color: "#991b1b", bg: "#fee2e2" },
};

/* ───── DayBanner (with dynamic background) ───── */
function DayBanner({ children, bgImage }: { children: React.ReactNode; bgImage?: string }) {
  return (
    <div className="relative w-full px-6 md:px-12 py-20 md:py-32 overflow-hidden bg-[#2e2019]">
      {/* Base layer: the leaf pattern pattern */}
      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${bgImage ? 'opacity-20 mix-blend-overlay' : 'opacity-100'}`}
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
        {children}
      </div>
    </div>
  );
}


/* ───── Carousel sub-component (lazy: only renders current + adjacent) ───── */
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());
  if (images.length === 0) return null;
  const goNext = () => setCurrent(p => (p + 1) % images.length);
  const goPrev = () => setCurrent(p => (p - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((url, idx) => {
        const isVisible = idx === current;
        const isAdjacent = Math.abs(idx - current) <= 1 || (current === 0 && idx === images.length - 1) || (current === images.length - 1 && idx === 0);
        if (!isVisible && !isAdjacent) return null;
        if (errored.has(idx)) return null;
        return (
          <img
            key={url}
            src={url}
            alt={`${alt} — ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
            loading={isVisible ? "eager" : "lazy"}
            onError={() => setErrored(prev => new Set(prev).add(idx))}
          />
        );
      })}
      {images.length > 1 && (
        <>
          <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#2e2019]/60 hover:bg-[#2e2019]/80 backdrop-blur-sm text-white p-2 transition-all z-10" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#2e2019]/60 hover:bg-[#2e2019]/80 backdrop-blur-sm text-white p-2 transition-all z-10" aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1 transition-all ${idx === current ? "bg-white w-8" : "bg-white/40 w-4 hover:bg-white/60"}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ───── sortable wrapper ───── */
function SortableDayItemWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-start gap-4">
      {children}
    </div>
  );
}


/* ───── main page ───── */
export default function ProposalPublic() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<DayItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dayObservations, setDayObservations] = useState<Record<number, string>>({});
  const [dayDescriptions, setDayDescriptions] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editLabels, setEditLabels] = useState<Record<number, string>>({});
  const [editObservations, setEditObservations] = useState<Record<number, string>>({});
  const [editDescriptions, setEditDescriptions] = useState<Record<string, string>>({});
  const [editItemOrder, setEditItemOrder] = useState<DayItem[]>([]);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [savingContract, setSavingContract] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [togglingBreakdown, setTogglingBreakdown] = useState(false);
  const proposalIdRef = useRef<string | null>(null);
  const requestGuardRef = useRef(createLatestRequestGuard());
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractUrlInput, setContractUrlInput] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [dynamicDayGalleries, setDynamicDayGalleries] = useState<Record<number, string[]>>({});
  const [dynamicAccImages, setDynamicAccImages] = useState<Record<string, string[]>>({});
  const [heroImageUrl, setHeroImageUrl] = useState<string>(heroImage);
  const [approving, setApproving] = useState(false);
  const [clicksignKey, setClicksignKey] = useState<string | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const clicksignContainerRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check admin status. Guarded against stale/out-of-order responses (e.g.
  // user A's check resolves after logout/switch to user B) and always sets
  // isAdmin explicitly either way -- a previous `true` must not survive a
  // false/error response for the new user.
  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data: roleOk, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (cancelled) return;
      if (!error && roleOk) {
        setIsAdmin(true);
        if (searchParams.get("edit") === "1") setEditMode(true);
      } else {
        setIsAdmin(false);
      }
    })();
    return () => { cancelled = true; };
    // Also re-runs on token change: navigating to a different proposal
    // shouldn't leave a previous token's admin check standing in for the
    // new one (see the token effect below, which clears isAdmin
    // synchronously the moment the token changes -- this re-establishes it
    // once freshly verified).
  }, [user, searchParams, token]);

  useEffect(() => {
    // Started unconditionally, before the `!token` early return, so that
    // path also invalidates cleanly (and still returns a cleanup) instead
    // of skipping the guard entirely.
    const request = requestGuardRef.current.start();

    // Reset immediately, synchronously -- before the `!token` early return,
    // not after it -- so navigating away from a valid token doesn't leave
    // the previous proposal/admin controls/edit buffer on screen. isAdmin
    // is cleared here rather than waiting on the admin-check effect's RPC
    // round trip -- that effect also re-runs on token change (see its
    // dependency array) and re-establishes it once freshly verified.
    setLoading(true);
    setError(false);
    setProposal(null);
    setItems([]);
    setIsAdmin(false);
    setEditMode(false);
    setEditLabels({});
    setEditObservations({});
    setEditDescriptions({});
    setEditItemOrder([]);
    setExpandedDays([]);
    setSaving(false);
    setPublishing(false);
    setTogglingBreakdown(false);
    setSavingContract(false);
    setApproving(false);
    setContractDialogOpen(false);
    setContractUrlInput("");
    setFeedbackOpen(false);
    setClicksignKey(null);
    setLoadingContract(false);
    proposalIdRef.current = null;
    if (!token) {
      request.invalidate();
      return () => request.invalidate();
    }

    // get_public_proposal's result depends on who's calling (auth.uid()
    // inside the RPC decides admin-only visibility), not just the URL
    // token -- so a request started while logged in as an admin must be
    // discarded if it resolves after logout/switching users for the same
    // token. Tracked by generation, not by comparing a token+user "key":
    // navigating token A -> B -> back to A must not let the first (now
    // twice-stale) A response become "current" again just because a later
    // request happens to share its key.
    (async () => {
      // Public/shared reads go exclusively through this RPC: it enforces
      // published_at for non-admins and returns an explicit, public-safe
      // column projection (never proposal_costs, sellers, cost_price,
      // commission_percent, supplier_id or atmos_service.internal_costs).
      const { data, error: rpcError } = await supabase.rpc("get_public_proposal", { p_token: token });
      if (!request.isCurrent()) return;

      const finalProp = parsePublicProposal(data);
      if (rpcError || !finalProp) {
        setLoading(false);
        setError(true);
        return;
      }

      setProposal(finalProp);
      proposalIdRef.current = finalProp.id;

      const sortedItems = (finalProp.proposal_day_items || [])
        .slice()
        .sort((a, b) => {
          if (a.day_number !== b.day_number) return a.day_number - b.day_number;
          return (a.item_index || 0) - (b.item_index || 0);
        });
      setItems(sortedItems);

      const obsMap: Record<number, string> = {};
      const descMap: Record<number, string> = {};
      (finalProp.proposal_days || []).forEach((d) => {
        obsMap[d.day_number] = d.observation || "";
        descMap[d.day_number] = d.description || "";
      });
      setDayObservations(obsMap);
      setDayDescriptions(descMap);

      // Public catalog read: goes through get_public_products (safe, explicit
      // projection -- id/source_id/name/type/category/segment/description/
      // unit_price/currency/is_active/variables, no cost_price/supplier_id).
      // No direct `.from("products")` select and no insecure fallback: if the
      // RPC errors (e.g. not deployed yet), we fail closed to an empty list
      // rather than reading the unrestricted table.
      // TODO(codex): drop the `as any` casts once get_public_products lands
      // in the generated Supabase types.
      const { data: prods, error: prodsError } = await (supabase.rpc as any)("get_public_products", { p_type: null });
      if (!request.isCurrent()) return;
      if (prodsError) {
        console.error("Error loading public products:", prodsError);
        setProducts([]);
      } else {
        setProducts((prods as Product[]) || []);
      }

      trackProposalView(finalProp.id);
      setLoading(false);
    })();
    return () => request.invalidate();
  }, [token, user?.id]);

  // Sync edit state when items load after edit mode was already activated via URL
  useEffect(() => {
    if (editMode && items.length > 0 && editItemOrder.length === 0) {
      const lbls: Record<number, string> = {};
      const descs: Record<string, string> = {};
      const dayNums = [...new Set(items.map(i => i.day_number))];
      dayNums.forEach(d => {
        const first = items.find(i => i.day_number === d);
        lbls[d] = first?.day_label || `Dia ${d}`;
      });
      // Keyed by the stable row id, not array position: position shifts
      // under drag-and-drop reordering (and handleDayDragEnd now clones
      // items instead of mutating in place, so `items.indexOf(item)` on a
      // reordered clone would return -1 and silently drop the edit).
      items.forEach((item) => {
        if (item.id) descs[item.id] = item.description || "";
      });
      setEditLabels(lbls);
      setEditDescriptions(descs);
      setEditItemOrder([...items]);
      setEditObservations({ ...dayObservations });
    }
  }, [editMode, items, dayObservations]);

  const enterEditMode = () => {
    setEditObservations({ ...dayObservations });
    const lbls: Record<number, string> = {};
    const descs: Record<string, string> = {};
    const dayNums = [...new Set(items.map(i => i.day_number))];
    dayNums.forEach(d => {
      const first = items.find(i => i.day_number === d);
      lbls[d] = first?.day_label || `Dia ${d}`;
    });
    items.forEach((item) => {
      if (item.id) descs[item.id] = item.description || "";
    });
    setEditLabels(lbls);
    setEditDescriptions(descs);
    setEditItemOrder([...items]);
    setEditMode(true);
  };

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDayDragEnd = (dayNum: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditItemOrder(prev => {
      const dayItems2 = prev.filter(i => i.day_number === dayNum);
      const otherItems = prev.filter(i => i.day_number !== dayNum);
      const oldIdx = dayItems2.findIndex(i => `${dayNum}-${i.item_index}` === active.id);
      const newIdx = dayItems2.findIndex(i => `${dayNum}-${i.item_index}` === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      // New objects, not mutated in place: these items are the same
      // references as in `items`/`renderItems` elsewhere, and item_index is
      // read when building the save payload -- mutating shared objects here
      // would silently corrupt state outside of this reorder.
      const reordered = arrayMove(dayItems2, oldIdx, newIdx).map((item, i) => ({ ...item, item_index: i }));
      return [...otherItems, ...reordered];
    });
  };

  const saveEdits = async () => {
    const propId = proposalIdRef.current;
    if (!propId) return;
    // Snapshot, not a new fetch: if the admin navigates to a different
    // proposal before this resolves, the write already happened (or will)
    // server-side regardless -- it just must not then mutate whatever is
    // now on screen for a different token/proposal.
    const context = requestGuardRef.current.snapshot();
    setSaving(true);
    try {
      // Single atomic call: save_public_proposal_edits (admin RPC, role +
      // proposal-ownership checked + transactional server-side). Replaces
      // the previous sequence of unchecked delete/insert/update calls,
      // which could wipe every day's description (admin-authored via the
      // other editor) or leave partial writes on a mid-sequence failure.
      // Snapshotted from state up front so nothing here depends on item
      // object identity/mutation during drag-and-drop reordering.
      const { p_days, p_items } = buildProposalEditsPayload({
        editItemOrder,
        editObservations,
        editLabels,
        editDescriptions,
        fallbackDayLabel: (d) => `${t.day} ${d}`,
      });

      const { data, error } = await supabase.rpc(
        "save_public_proposal_edits",
        { p_proposal_id: propId, p_days, p_items }
      );
      if (!context.isCurrent()) return;

      if (error || data !== true) {
        console.error("Error saving edits:", error);
        toast({ title: "Erro ao salvar", description: "As alterações não foram salvas. Tente novamente.", variant: "destructive" });
        return;
      }

      setDayObservations({ ...editObservations });
      const updatedItems: DayItem[] = editItemOrder.map(item => ({
        ...item,
        description: resolveItemDescription(item, editDescriptions),
        day_label: editLabels[item.day_number] || item.day_label,
      }));
      setItems(updatedItems);
      setEditMode(false);
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Error saving edits:", e);
      toast({ title: "Erro ao salvar", description: "As alterações não foram salvas. Tente novamente.", variant: "destructive" });
    } finally {
      if (context.isCurrent()) setSaving(false);
    }
  };

  const togglePublish = async () => {
    const propId = proposalIdRef.current;
    if (!propId || !proposal) return;
    const context = requestGuardRef.current.snapshot();
    setPublishing(true);
    try {
      const newVal = proposal.published_at ? null : new Date().toISOString();
      const { data, error } = await supabase
        .from("proposals")
        .update({ published_at: newVal })
        .eq("id", propId)
        .select("published_at, status")
        .single();
      if (!context.isCurrent()) return;

      if (error || !data) {
        console.error("Error toggling publish:", error);
        toast({ title: "Erro ao publicar/recolher", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
        return;
      }
      setProposal((prev: Proposal | null) => prev ? { ...prev, published_at: data.published_at, status: data.status } : prev);
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Error toggling publish:", e);
      toast({ title: "Erro ao publicar/recolher", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
    } finally {
      if (context.isCurrent()) setPublishing(false);
    }
  };

  const toggleShowBreakdown = async () => {
    const propId = proposalIdRef.current;
    if (!propId || !proposal) return;
    const context = requestGuardRef.current.snapshot();
    setTogglingBreakdown(true);
    try {
      const newVal = !proposal.show_price_breakdown;
      const { data, error } = await supabase
        .from("proposals")
        .update({ show_price_breakdown: newVal })
        .eq("id", propId)
        .select("show_price_breakdown")
        .single();
      if (!context.isCurrent()) return;

      if (error || !data) {
        console.error("Error toggling price breakdown:", error);
        toast({ title: "Erro ao alterar detalhamento", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
        return;
      }
      setProposal((prev: Proposal | null) => prev ? { ...prev, show_price_breakdown: data.show_price_breakdown } : prev);
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Error toggling price breakdown:", e);
      toast({ title: "Erro ao alterar detalhamento", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
    } finally {
      if (context.isCurrent()) setTogglingBreakdown(false);
    }
  };

  const saveContractUrl = async () => {
    const propId = proposalIdRef.current;
    if (!propId) return;
    const context = requestGuardRef.current.snapshot();
    setSavingContract(true);
    try {
      const url = contractUrlInput.trim() || null;
      const { data, error } = await supabase
        .from("proposals")
        .update({ contract_url: url })
        .eq("id", propId)
        .select("contract_url")
        .single();
      if (!context.isCurrent()) return;

      if (error || !data) {
        console.error("Error saving contract URL:", error);
        toast({ title: "Erro ao vincular contrato", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
        return;
      }
      setProposal((prev: Proposal | null) => prev ? { ...prev, contract_url: data.contract_url } : prev);
      setContractDialogOpen(false);
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Error saving contract URL:", e);
      toast({ title: "Erro ao vincular contrato", description: "A alteração não foi salva. Tente novamente.", variant: "destructive" });
    } finally {
      if (context.isCurrent()) setSavingContract(false);
    }
  };

  const handleApprove = async () => {
    if (!proposal || approving) return;
    const context = requestGuardRef.current.snapshot();
    setApproving(true);
    try {
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/approve-proposal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal_id: proposal.id, share_token: proposal.share_token }),
        }
      );
      if (!context.isCurrent()) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Approve error:", body);
        return;
      }
      setProposal((prev: Proposal | null) => prev ? { ...prev, status: "approved" } : prev);
      // Scroll to contract section
      requestAnimationFrame(() => {
        document.getElementById("contract-section")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Approve error:", e);
    } finally {
      if (context.isCurrent()) setApproving(false);
    }
  };


  const initClicksignContract = async () => {
    if (!proposal || loadingContract) return;
    if (proposal.contract_url?.startsWith("clicksign:")) {
      setClicksignKey(proposal.contract_url.replace("clicksign:", ""));
      return;
    }
    const context = requestGuardRef.current.snapshot();
    setLoadingContract(true);
    try {
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/clicksign-create-document`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal_id: proposal.id, share_token: proposal.share_token }),
        }
      );
      if (!context.isCurrent()) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Clicksign error:", body);
        return;
      }
      const data = await res.json();
      if (!context.isCurrent()) return;
      if (data.widget_key) {
        setClicksignKey(data.widget_key);
        setProposal((prev: Proposal | null) =>
          prev ? { ...prev, contract_url: `clicksign:${data.widget_key}` } : prev
        );
      }
    } catch (e) {
      if (!context.isCurrent()) return;
      console.error("Clicksign error:", e);
    } finally {
      if (context.isCurrent()) setLoadingContract(false);
    }
  };

  useEffect(() => {
    if (!clicksignKey || !clicksignContainerRef.current) return;
    const container = clicksignContainerRef.current;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://app.clicksign.com/js/widget.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).Clicksign) {
        (window as any).Clicksign.configure({
          container: "clicksign-widget-container",
          key: clicksignKey,
          signer: { display_name: proposal?.prospects?.name || "Cliente" },
          onSigned: () => {
            setProposal((prev: Proposal | null) =>
              prev ? { ...prev, contract_status: "signed" } : prev
            );
          },
        });
      }
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch (_) {} };
  }, [clicksignKey]);

  useEffect(() => {
    if (proposal?.status === "approved" && proposal.contract_url?.startsWith("clicksign:")) {
      setClicksignKey(proposal.contract_url.replace("clicksign:", ""));
    }
  }, [proposal?.status, proposal?.contract_url]);

  const findProductRef = useCallback((item: DayItem): Product | undefined => {
    if (item.catalog_item_id) {
      const byId = products.find(p => p.id === item.catalog_item_id);
      if (byId) return byId;
    }
    if (item.item_name) {
      const name = item.item_name.toLowerCase();
      let found = products.find(p => p.name === item.item_name);
      if (found) return found;
      
      const fuzzy = products.find(p => 
        p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())
      );
      if (fuzzy) return fuzzy;
      
      if (item.category.includes("Transfer")) return products.find(p => p.type === "transfer" || p.type === "service");
      if (item.category.includes("Guia")) return products.find(p => p.type === "service" && p.name.includes("Guia"));
    }
    return undefined;
  }, [products]);

  useEffect(() => {
    if (items.length === 0 || products.length === 0) return;
    const dayNums = [...new Set(items.map(i => i.day_number))];
    const sortedDays = [...dayNums].sort((a, b) => a - b);

    (async () => {
      const dayGalleries: Record<number, string[]> = {};
      
      // Query all day galleries in parallel!
      await Promise.all(sortedDays.map(async (dayNum) => {
        const dayItems2 = items
          .filter(i => i.day_number === dayNum)
          .sort((a, b) => {
            const priority: Record<string, number> = { 
              "waterfall": 0, 
              "experience": 1, 
              "accommodation": 2, 
              "service": 3, 
              "transfer": 4 
            };
            const prodA = findProductRef(a);
            const prodB = findProductRef(b);
            const prioA = prodA ? (priority[prodA.type] ?? 10) : 10;
            const prioB = prodB ? (priority[prodB.type] ?? 10) : 10;
            return prioA - prioB;
          });

        const urls: string[] = [];
        
        // Query all items for this day in parallel!
        const itemsImgs = await Promise.all(dayItems2.map(async (item) => {
          const product = findProductRef(item);
          if (!product?.source_id) return [];
          
          const normType = product.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const typeMap: Record<string, string> = {
            "waterfall": "CACHOEIRAS",
            "experience": "EXPERIENCIAS",
            "experiencia": "EXPERIENCIAS",
            "accommodation": "HOSPEDAGENS",
            "hospedagem": "HOSPEDAGENS",
            "service": "SERVICOS",
            "servico": "SERVICOS",
            "transfer": "SERVICOS"
          };
          
          const folder = typeMap[normType] || "SERVICOS";
          const key = (normType === "experience" || normType === "experiencia")
            ? (EXP_STORAGE_KEY[product.source_id] || product.source_id)
            : (EXP_STORAGE_KEY[product.source_id] || product.source_id);
            
          try {
            return await fetchStorageImages(folder as any, key);
          } catch (e) {
            return [];
          }
        }));

        for (const imgs of itemsImgs) {
          const optimizedImgs = imgs.map(url => optimizedUrl(url, IMAGE_PRESETS.card));
          urls.push(...optimizedImgs);
        }
        dayGalleries[dayNum] = urls;
      }));

      setDynamicDayGalleries(dayGalleries);

      // Set first day's first image as hero if available — use LARGE preset
      const firstDay = sortedDays[0];
      if (firstDay && dayGalleries[firstDay]?.length > 0) {
        setHeroImageUrl(optimizedUrl(dayGalleries[firstDay][0], IMAGE_PRESETS.large));
      }

      const accImgs: Record<string, string[]> = {};
      const seen = new Set<string>();
      const accToFetch: { sourceId: string; productName: string }[] = [];

      // Collect accommodations from items
      for (const item of items) {
        if (item.category !== "Hospedagem") continue;
        const product = findProductRef(item);
        const sourceId = product?.source_id;
        if (!sourceId || seen.has(sourceId)) continue;
        seen.add(sourceId);
        accToFetch.push({ sourceId, productName: product.name });
      }

      // Collect dedicated accommodations
      if (proposal?.proposal_accommodations) {
        for (const acc of proposal.proposal_accommodations) {
          const product = products.find(p => p.id === acc.product_id);
          const sourceId = product?.source_id;
          if (!sourceId || seen.has(sourceId)) continue;
          seen.add(sourceId);
          accToFetch.push({ sourceId, productName: product?.name || "Hospedagem" });
        }
      }

      // Fetch all accommodation images in parallel!
      await Promise.all(accToFetch.map(async ({ sourceId, productName }) => {
        try {
          const imgs = await fetchStorageImages("HOSPEDAGENS", sourceId);
          accImgs[sourceId] = imgs.length > 0
            ? imgs.map(url => optimizedUrl(url, IMAGE_PRESETS.card))
            : Array.from({ length: 6 }, (_, i) => {
                const folderName = productName || sourceId;
                return optimizedUrl(`HOSPEDAGENS/${folderName}/${folderName}-${i + 1}.jpg`, IMAGE_PRESETS.card);
              });
        } catch (e) {
          accImgs[sourceId] = Array.from({ length: 6 }, (_, i) => {
            const folderName = productName || sourceId;
            return optimizedUrl(`HOSPEDAGENS/${folderName}/${folderName}-${i + 1}.jpg`, IMAGE_PRESETS.card);
          });
        }
      }));

      setDynamicAccImages(accImgs);
    })();
  }, [items, products, findProductRef, proposal?.proposal_accommodations]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fcfaf7" }}>
      <div className="flex flex-col items-center gap-4">
        <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-10 animate-pulse" />
        <p className="text-sm" style={{ color: "#8d7b63" }}>Carregando...</p>
      </div>
    </div>
  );

  if (!isAdmin && (!proposal || !proposal.published_at)) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fcfaf7" }}>
      <p style={{ color: "#8d7b63" }}>Proposta não disponível.</p>
    </div>
  );

  if (error || !proposal) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fcfaf7" }}>
      <p style={{ color: "#8d7b63" }}>Proposta não encontrada.</p>
    </div>
  );

  const lang = proposal.language || "pt";
  const t = labels[lang] || labels.pt;
  const currency = lang === "en" ? "USD" : "BRL";
  const fmt = (v: number) => v.toLocaleString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", { style: "currency", currency });
  const atmos = proposal.atmos_service;
  const atmosPPD = atmos?.price_per_person_day || 0;
  const days = [...new Set(items.map(i => i.day_number))].sort((a, b) => a - b);
  // Itemized per-line pricing is hidden from clients by default; only staff
  // can flip show_price_breakdown on for a given proposal (admins always see it).
  const showBreakdown = canShowPriceBreakdown(proposal, isAdmin);
  // Same rule approve-proposal enforces server-side (Sao Paulo calendar
  // date, inclusive of the whole named day) -- kept in sync so the button
  // isn't shown as clickable only to fail once the request reaches the server.
  const proposalExpired = isProposalExpired(proposal.valid_until);

  // Public aggregates come from the RPC (get_public_proposal). There is no
  // day-level or per-person rollup of raw item values here on purpose: the
  // admin-side pricing pipeline (atmos/accommodation revenue, courtesy-
  // adjusted allocation, tax) isn't something this page can safely
  // reconstruct, so only the already-persisted, unambiguous numbers are
  // used. items_subtotal/items_discount_amount are GROUP-level and
  // items-only -- never divided by num_people. net_per_person is the one
  // per-person figure, derived from the authoritative persisted `total`.
  const numCourtesies = proposal.num_courtesies;
  const numPaying = proposal.num_paying;
  const grandTotal = proposal.total;
  const netPerPerson = proposal.net_per_person;
  const itemsSubtotal = proposal.items_subtotal;
  const itemsDiscountAmount = proposal.items_discount_amount;

  const getDayWaterfallInfo = (dayNum: number) => {
    const dayItems2 = items.filter(i => i.day_number === dayNum);
    // Find first item that is a waterfall or experience to pull technical info
    const mainItem = dayItems2.find(i => 
      ["Cachoeira", "Ingresso", "Cachoeira / Ingresso", "Cachoeira/Ingressos", "Experiência", "Experiencia"].includes(i.category)
    );
    if (!mainItem) return null;
    const product = findProduct(mainItem);
    const vars = product?.variables || {};
    return {
      difficulty: vars.difficulty as string | undefined,
      distanceKm: vars.distanceKm as number | undefined,
      distanceCarKm: vars.distanceCarKm as number | undefined,
      vehicleType: mainItem.vehicle_type || "carroTurista",
    };
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", { day: "2-digit", month: "short" });
  };
  const formatDateFull = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const findProduct = (item: DayItem): Product | undefined => {
    if (item.catalog_item_id) {
      const byId = products.find(p => p.id === item.catalog_item_id);
      if (byId) return byId;
    }
    if (item.item_name) {
      const name = item.item_name.toLowerCase();
      // Try exact match first
      let found = products.find(p => p.name === item.item_name);
      if (found) return found;
      
      // Try fuzzy match as a last resort
      const fuzzy = products.find(p => 
        p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())
      );
      if (fuzzy) return fuzzy;
      
      // Try matching the category to find a generic product if name is a variation
      if (item.category.includes("Transfer")) return products.find(p => p.type === "transfer" || p.type === "service");
      if (item.category.includes("Guia")) return products.find(p => p.type === "service" && p.name.includes("Guia"));
    }
    return undefined;
  };



  const getDayGallery = (dayNum: number): string[] => {
    const dynamic = dynamicDayGalleries[dayNum];
    if (dynamic && dynamic.length > 0) return dynamic;

    const dayItems = items.filter(i => i.day_number === dayNum);
    const sortedForGallery = [...dayItems].sort((a, b) => {
      const aCat = a.category.toLowerCase();
      const bCat = b.category.toLowerCase();
      const aIsMain = aCat.includes("cachoeira") || aCat.includes("experi");
      const bIsMain = bCat.includes("cachoeira") || bCat.includes("experi");
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return 0;
    });

    const fallbackUrls: string[] = [];
    
    for (const item of sortedForGallery) {
      const product = findProduct(item);
      const sourceId = product?.source_id;
      const name = item.item_name || product?.name;
      
      if (sourceId || name) {
        const url = getDayImage(sourceId || "", name);
        if (url && !fallbackUrls.includes(url)) {
          fallbackUrls.push(url);
        }
      }
    }

    if (fallbackUrls.length === 0) {
      fallbackUrls.push("https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80");
    }

    return fallbackUrls;
  };

  const getAccommodations = (): { name: string; sourceId: string; images: string[] }[] => {
    const seen = new Set<string>();
    const accs: { name: string; sourceId: string; images: string[] }[] = [];
    
    // First, add from dedicated proposal_accommodations
    if (proposal?.proposal_accommodations) {
      for (const acc of proposal.proposal_accommodations) {
        if (acc.is_selected === false) continue;
        const product = products.find(p => p.id === acc.product_id);
        const sourceId = product?.source_id;
        const name = product?.name || "Hospedagem";
        const key = sourceId || name;
        if (seen.has(key)) continue;
        seen.add(key);
        const images = sourceId ? (dynamicAccImages[sourceId] || []) : [];
        accs.push({ name, sourceId: sourceId || "", images });
      }
    }

    // Then, add from items if not already added
    for (const item of items) {
      if (item.category !== "Hospedagem") continue;
      const product = findProduct(item);
      const sourceId = product?.source_id;
      const name = item.item_name || product?.name || "Hospedagem";
      const key = sourceId || name;
      if (seen.has(key)) continue;
      seen.add(key);
      const images = sourceId
        ? (dynamicAccImages[sourceId] || [])
        : [];
      accs.push({ name, sourceId: sourceId || "", images });
    }
    return accs;
  };

  const accommodations = getAccommodations();

  // For rendering, use editItemOrder in edit mode, items otherwise
  const renderItems = editMode ? editItemOrder : items;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen" 
      style={{ background: "#fcfaf7", fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ══════════════════════ STICKY HEADER — client only ══════════════════════ */}
      {proposal.published_at && !isAdmin && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-2"
          style={{ background: "rgba(0,0,0,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-16 md:h-20 brightness-0 invert drop-shadow-xl" />
          <div className="flex items-center gap-2">
            {["sent", "negotiating"].includes(proposal.status) && !proposalExpired && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg"
                style={{ background: "#16a34a", color: "#fff", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {approving
                    ? "..."
                    : lang === "en" ? "Approve Proposal" : lang === "es" ? "Aprobar Propuesta" : "Aprovar Proposta"}
                </span>
              </button>
            )}
            {["sent", "negotiating"].includes(proposal.status) && proposalExpired && (
              <span
                className="flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-widest shadow-lg"
                style={{ background: "#7a1f1f", color: "#fff" }}
              >
                {lang === "en" ? "Proposal Expired" : lang === "es" ? "Propuesta Vencida" : "Proposta Expirada"}
              </span>
            )}
            {proposal.status === "approved" && (
              <>
                <span
                  className="flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-widest shadow-lg"
                  style={{ background: "#16a34a", color: "#fff", boxShadow: "0 4px 20px rgba(22,163,74,0.3)", opacity: 0.9 }}
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {lang === "en" ? "Proposal Accepted" : lang === "es" ? "Propuesta Aceptada" : "Proposta Aceita"}
                  </span>
                </span>
                <button
                  onClick={() => {
                    initClicksignContract();
                    document.getElementById("contract-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg"
                  style={{ background: "#2e2019", color: "#fff", boxShadow: "0 4px 20px rgba(46,32,25,0.3)" }}
                >
                  <FileSignature className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {lang === "en" ? "Sign Contract" : lang === "es" ? "Firmar Contrato" : "Assinar Contrato"}
                  </span>
                </button>
              </>
            )}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg"
              style={{ background: "#556952", color: "#fff", boxShadow: "0 4px 20px rgba(85,105,82,0.3)" }}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === "en" ? "Request Adjustments" : lang === "es" ? "Solicitar Ajustes" : "Solicitar Ajustes"}
              </span>
            </button>
          </div>
        </header>
      )}

      {/* ══════════════════════ ADMIN EDIT BAR ══════════════════════ */}
      {isAdmin && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-2"
          style={{ background: "rgba(255,255,255,0.9)", borderBottom: "1px solid #e4dbcc", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", isolation: "isolate" }}>
          <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-12 md:h-16 shrink-0" />
          <div className="flex flex-wrap justify-end gap-1">
            <button
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/admin"); }}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-black/5"
              style={{ color: "#2e2019", border: "1px solid #e4dbcc" }}
            >
              ← Voltar
            </button>
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all"
                  style={{ background: "#fff", color: "#2e2019", border: "1px solid #e4dbcc" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setContractUrlInput(proposal.contract_url || ""); setContractDialogOpen(true); }}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: proposal.contract_url ? "#556952" : "#fff", color: proposal.contract_url ? "#fff" : "#2e2019", border: proposal.contract_url ? "none" : "1px solid #e4dbcc" }}
                >
                  {proposal.contract_url ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                  {proposal.contract_url ? "Contrato" : "Vincular"}
                </button>
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: "#556952", color: "#fff" }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "..." : "Salvar"}
                </button>
                <button
                  onClick={togglePublish}
                  disabled={publishing}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: proposal.published_at ? "#b45309" : "#1d4ed8", color: "#fff" }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {publishing ? "..." : proposal.published_at ? "Recolher" : "Publicar"}
                </button>
                <button
                  onClick={toggleShowBreakdown}
                  disabled={togglingBreakdown}
                  title="Mostrar/ocultar o detalhamento de preços por item para o cliente"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: proposal.show_price_breakdown ? "#556952" : "#fff", color: proposal.show_price_breakdown ? "#fff" : "#2e2019", border: proposal.show_price_breakdown ? "none" : "1px solid #e4dbcc" }}
                >
                  {proposal.show_price_breakdown ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {togglingBreakdown ? "..." : proposal.show_price_breakdown ? "Detalhamento Visível" : "Detalhamento Oculto"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={enterEditMode}
                  className="px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: "#2e2019", color: "#fff" }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={togglePublish}
                  disabled={publishing}
                  className="px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: proposal.published_at ? "#b45309" : "#1d4ed8", color: "#fff" }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {publishing ? "..." : proposal.published_at ? "Recolher" : "Publicar"}
                </button>
                <button
                  onClick={toggleShowBreakdown}
                  disabled={togglingBreakdown}
                  title="Mostrar/ocultar o detalhamento de preços por item para o cliente"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5"
                  style={{ background: proposal.show_price_breakdown ? "#556952" : "#fff", color: proposal.show_price_breakdown ? "#fff" : "#2e2019", border: proposal.show_price_breakdown ? "none" : "1px solid #e4dbcc" }}
                >
                  {proposal.show_price_breakdown ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {togglingBreakdown ? "..." : proposal.show_price_breakdown ? "Detalhamento Visível" : "Detalhamento Oculto"}
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {/* ══════════════════════ CONTRACT URL DIALOG ══════════════════════ */}
      {contractDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setContractDialogOpen(false)}>
          <div className="bg-white rounded-none p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: "#2e2019" }}>Vincular Contrato</h3>
            <p className="text-xs mb-4" style={{ color: "#8d7b63" }}>Cole o link do contrato online (ex: ClickSign, DocuSign, etc.)</p>
            <input
              type="url"
              value={contractUrlInput}
              onChange={e => setContractUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-none px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-amber-300"
              style={{ borderColor: "#e4dbcc" }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setContractDialogOpen(false)} className="px-4 py-2 text-sm rounded-none" style={{ color: "#8d7b63" }}>
                Cancelar
              </button>
              <button
                onClick={saveContractUrl}
                disabled={savingContract}
                className="px-4 py-2 text-sm rounded-none font-medium text-white"
                style={{ background: "#556952" }}
              >
                {savingContract ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative h-screen min-h-[650px] overflow-hidden bg-[#2e2019]">
        <motion.img 
          key={heroImageUrl}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          src={heroImageUrl} 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover" 
          fetchPriority="high" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2e2019] via-[#2e2019]/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-20 md:px-16 md:pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-3 mb-6 animate-fade-in-up">
              <div className="w-8 h-[1px] bg-white/60" />
              <span className="text-white/80 text-[10px] md:text-xs uppercase tracking-[0.5em] font-bold">
                {t.proposal}
              </span>
            </div>
            
            <h1 className="text-white text-5xl md:text-8xl lg:text-[10rem] font-black leading-[0.85] tracking-tighter drop-shadow-2xl mb-10 max-w-5xl font-outfit uppercase">
              {proposal.title}
            </h1>

            <div className="flex flex-wrap gap-4 md:gap-8 items-center">
              {proposal.prospects?.name && (
                <div className="flex flex-col">
                  <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-bold">{t.client}</span>
                  <span className="text-white text-lg font-medium">{proposal.prospects.name}</span>
                </div>
              )}
              {(proposal.start_date || proposal.end_date) && (
                <div className="flex flex-col">
                  <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-bold">{t.dates}</span>
                  <span className="text-white text-lg font-medium">
                    {formatDate(proposal.start_date)} — {formatDate(proposal.end_date)}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-bold">{t.people} & {t.days}</span>
                <span className="text-white text-lg font-medium">
                  {proposal.num_people} {t.people.toLowerCase()} · {proposal.num_days} {t.days}
                </span>
              </div>
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
        className="py-12 md:py-16 px-6 bg-white border-y border-[#e4dbcc]"
      >
        <div className="max-w-4xl mx-auto text-center">
          <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-16 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-5xl font-black leading-none mb-6 font-outfit uppercase tracking-tighter" style={{ color: "#2e2019" }}>
            {t.brandTitle}
          </h2>
          <div className="w-16 h-[1px] bg-[#c4a97d] mx-auto mb-6" />
          <p className="text-base md:text-xl leading-relaxed max-w-3xl mx-auto mb-4 font-light italic" style={{ color: "#2e2019" }}>
            {t.brandText1}
          </p>
          <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto uppercase tracking-widest font-bold" style={{ color: "#8d7b63" }}>
            {t.brandText2}
          </p>
        </div>
      </motion.section>
      {/* ══════════════════════ DAY SECTIONS ══════════════════════ */}
      <div
        style={{
          backgroundImage: `url(${storageUrl("home/day-banner-bg.jpg")})`,
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
      {days.map((dayNum, dayIdx) => {
        const dayItemsSorted = items
          .filter(i => i.day_number === dayNum)
          .sort((a, b) => (a.item_index ?? 0) - (b.item_index ?? 0));
        const dayLabel = dayItemsSorted[0]?.day_label || `${t.day} ${dayNum}`;
        const gallery = getDayGallery(dayNum);
        const isEven = dayIdx % 2 === 0;
        const wInfo = getDayWaterfallInfo(dayNum);

        return (
          <motion.section 
            key={dayNum} 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* ══════ FULL-WIDTH DAY BANNER (parallax photo) ══════ */}
            <DayBanner>
              <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-end gap-6 md:gap-10">
                  <span className="text-8xl md:text-[12rem] font-black leading-[0.7] flex-shrink-0 text-white/10 font-outfit">
                    {String(dayNum).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pb-2">
                    <p className="text-[12px] uppercase tracking-[0.4em] font-bold mb-3" style={{ color: "#c4a97d" }}>
                      {t.day} {dayNum}
                    </p>
                    {(() => {
                      const dateStr = proposal.start_date
                        ? (() => { const d = new Date(proposal.start_date + "T12:00:00"); d.setDate(d.getDate() + dayNum - 1); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`; })()
                        : null;
                      return (
                        <h3 className="text-3xl md:text-6xl font-black text-white leading-[0.9] font-outfit uppercase tracking-tighter">
                          {dateStr || dayLabel}
                        </h3>
                      );
                    })()}
                  </div>
                </div>

                {/* ── Badges: difficulty, distances, vehicle ── */}
                {(() => {
                  const guideNames = dayItemsSorted
                    .filter(i => {
                      const cat = i.category.toLowerCase();
                      const name = (i.item_name || "").toLowerCase();
                      return (cat.includes("guia") || cat.includes("monitor") || name.includes("drone")) && i.item_name;
                    })
                    .map(i => i.item_name!);
                  const snackItems = dayItemsSorted
                    .filter(i => {
                      const cat = i.category.toLowerCase();
                      return cat.includes("lanche") && i.item_name;
                    });
                  const showBadges = wInfo || guideNames.length > 0 || snackItems.length > 0;
                  return showBadges ? (
                  <div className="flex flex-col gap-2 items-end justify-end">
                      {/* Row 1 — Guides */}
                      {guideNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {guideNames.map((name, gi) => (
                            <span key={gi} className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                              style={{ background: "#744404", color: "#fff" }}>
                              <Compass className="w-3.5 h-3.5" />
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Row 2 — Technical info */}
                      {wInfo && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {wInfo.difficulty && DIFFICULTY_CONFIG[wInfo.difficulty] && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                              style={{ background: "#556952", color: "#fff" }}>
                              <Mountain className="w-3.5 h-3.5" />
                              {DIFFICULTY_CONFIG[wInfo.difficulty][lang] || wInfo.difficulty}
                            </span>
                          )}
                          {wInfo.distanceKm != null && wInfo.distanceKm > 0 && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                              style={{ background: "#556952", color: "#fff" }}>
                              <Footprints className="w-3.5 h-3.5" />
                              {wInfo.distanceKm} km {lang === "pt" ? "trilha" : lang === "es" ? "sendero" : "trail"}
                            </span>
                          )}
                          {wInfo.distanceCarKm != null && wInfo.distanceCarKm > 0 && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                              style={{ background: "#556952", color: "#fff" }}>
                              <Car className="w-3.5 h-3.5" />
                              {wInfo.distanceCarKm} km
                            </span>
                          )}
                          <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                            style={{ background: "#556952", color: "#fff" }}>
                            <Truck className="w-3.5 h-3.5" />
                            {(() => {
                              const v = wInfo.vehicleType;
                              if (v === "4x4Atmos") return "ATMOS 4×4";
                              if (v === "vanParticular") return "Van Particular";
                              if (v === "carroTurista") return (lang === "pt" ? "Carro próprio" : lang === "es" ? "Coche propio" : "Own car");
                              return v || "ATMOS 4×4";
                            })()}
                          </span>
                        </div>
                      )}
                      {/* Row 3 — Trail snacks */}
                      {snackItems.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {snackItems.map((s, si) => (
                            <span key={si} className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-black"
                              style={{ background: "#556952", color: "#fff" }}>
                              <Leaf className="w-3.5 h-3.5" />
                              {s.item_name}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  ) : null;
                })()}
              </div>
            </DayBanner>

            {/* ══════ DAY BODY: image bleeds left, content right ══════ */}
            <div style={{ background: isEven ? "#fff" : "#fcfaf7" }} className="py-8 md:py-12 border-b border-[#e4dbcc] overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[420px]">

                {/* LEFT — image bleeds to screen edge (no left padding/margin) */}
                {gallery.length > 0 && (
                  <div className="w-full lg:w-[48%] flex-shrink-0 lg:ml-0">
                    <div className="lg:sticky lg:top-20 self-start relative overflow-hidden w-full" style={{ aspectRatio: '4/3', maxHeight: '520px' }}>
                      <ImageCarousel images={gallery} alt={dayLabel} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                        <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">{t.day} {dayNum}</p>
                        <h4 className="text-white font-black text-2xl md:text-3xl uppercase font-outfit tracking-tighter leading-none">
                          {dayLabel}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}

                {/* RIGHT — content with generous padding */}
                <div className="flex-1 min-w-0 px-8 md:px-14 lg:px-16 py-10 md:py-12 flex flex-col justify-center">
                  
                  {/* Day description */}
                  {dayDescriptions[dayNum] && (
                    <div className="mb-10">
                      <p className="text-lg md:text-xl font-light leading-relaxed text-[#5c4a32] italic border-l-4 border-[#c4a97d] pl-6 py-1">
                        {dayDescriptions[dayNum]}
                      </p>
                    </div>
                  )}

                  {/* Day Items List */}
                  {(() => {
                    const visibleItems = dayItemsSorted.filter(i => {
                      const cat = i.category.toLowerCase();
                      const name = (i.item_name || "").toLowerCase();
                      return (i.item_name || i.value > 0) && 
                             !cat.includes("guia") && 
                             !cat.includes("monitor") &&
                             !cat.includes("lanche") &&
                             !name.includes("drone");
                    });
                    const itemContent = visibleItems.map((item, localIdx) => {
                      const Icon = CATEGORY_ICONS[item.category] || MapPin;
                      const catLabel = CATEGORY_LABELS[item.category]?.[lang] || item.category;
                      // Stable row id, not array position: position breaks
                      // under drag-and-drop reordering elsewhere on the page.
                      const descKey = item.id ?? "";
                      const sortableId = `${dayNum}-${item.item_index}`;

                      const inner = (
                        <>
                          {editMode && (
                            <div className="cursor-grab active:cursor-grabbing pt-1 touch-none" data-drag-handle>
                              <GripVertical className="w-4 h-4" style={{ color: "#8d7b63" }} />
                            </div>
                          )}
                          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#2e2019" }}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.3em] font-black mb-1" style={{ color: "#c4a97d" }}>{catLabel}</p>
                            <span className="text-xl font-black font-outfit uppercase tracking-tight" style={{ color: "#2e2019" }}>
                              {(() => {
                                const prod = findProduct(item);
                                const baseName = prod?.name;
                                const varName = item.item_name || item.category;
                                const catLower = item.category.toLowerCase();
                                const isMainType = catLower.includes("cachoeira") || catLower.includes("experiencia") || catLower.includes("experiência");
                                
                                if (baseName && varName && baseName !== varName) {
                                  return (
                                    <span className="flex flex-col">
                                      <span className="block text-sm font-bold opacity-60 mb-0.5" style={{ color: "#8d7b63" }}>{baseName}</span>
                                      <span className="leading-tight">{varName}</span>
                                    </span>
                                  );
                                }
                                if (baseName && isMainType) return baseName;
                                return varName;
                              })()}
                              {item.value === 0 && (
                                <span className="ml-3 text-[10px] bg-[#c4a97d] text-white px-2 py-0.5 align-middle tracking-widest font-black">CORTESIA</span>
                              )}
                            </span>
                            {editMode ? (
                              <input
                                className="block w-full text-sm mt-2 bg-white border border-dashed px-3 py-2 outline-none"
                                style={{ color: "#8d7b63", borderColor: "#e4dbcc" }}
                                placeholder="Ex: 12H - Saída do Aeroporto..."
                                value={editDescriptions[descKey] ?? item.description ?? ""}
                                onChange={(e) => setEditDescriptions(prev => ({ ...prev, [descKey]: e.target.value }))}
                              />
                            ) : (
                              item.description && (
                                <div className="mt-2 pl-4 py-2 pr-2 text-base italic border-l-2 border-[#c4a97d]" style={{ color: "#5c4a32" }}>
                                  {item.description}
                                </div>
                              )
                            )}
                          </div>
                        </>
                      );

                      if (editMode) {
                        return <SortableDayItemWrapper key={sortableId} id={sortableId}>{inner}</SortableDayItemWrapper>;
                      }
                      return <div key={`${item.day_number}-${localIdx}`} className="flex items-start gap-4">{inner}</div>;
                    });

                    if (editMode) {
                      return (
                        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd(dayNum)}>
                          <SortableContext items={visibleItems.map(i => `${dayNum}-${i.item_index}`)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-8">{itemContent}</div>
                          </SortableContext>
                        </DndContext>
                      );
                    }
                    return <div className="space-y-8">{itemContent}</div>;
                  })()}

                  {/* Extra Observation at end of day */}
                  {editMode ? (
                    <textarea
                      className="w-full text-sm leading-relaxed mt-10 bg-white border border-dashed p-4 outline-none resize-none min-h-[60px]"
                      style={{ color: "#5c4a32", borderColor: "#e4dbcc" }}
                      placeholder="Observação extra do dia (opcional)..."
                      value={editObservations[dayNum] || ""}
                      onChange={(e) => setEditObservations(prev => ({ ...prev, [dayNum]: e.target.value }))}
                    />
                  ) : (
                    dayObservations[dayNum] && (
                      <p className="text-base italic leading-relaxed mt-10 border-t border-[#e4dbcc] pt-6" style={{ color: "#8d7b63" }}>
                        {dayObservations[dayNum]}
                      </p>
                    )
                  )}

                </div>
              </div>
            </div>
          </motion.section>
        );
      })}
      </div>

      {/* ══════════════════════ ACCOMMODATION SECTION ══════════════════════ */}
      {accommodations.length > 0 && (
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="bg-[#fcfaf7] py-24 md:py-32 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 mb-16">
            <p className="text-[12px] uppercase tracking-[0.5em] font-bold mb-4" style={{ color: "#c4a97d" }}>
              {lang === "pt" ? "Sua Estadia" : lang === "es" ? "Tu Estadía" : "Your Stay"}
            </p>
            <h2 className="text-4xl md:text-7xl font-black font-outfit uppercase tracking-tighter leading-none" style={{ color: "#2e2019" }}>
              {t.yourAccommodation}
            </h2>
          </div>

          <div className="relative">
            <ScrollArea className="w-full pb-12">
              <div className="flex gap-8 px-6 md:px-24">
                {accommodations.map((acc, idx) => (
                  <div key={acc.sourceId || acc.name} className="flex-shrink-0 w-[85vw] md:w-[800px] group">
                    <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden rounded-2xl shadow-2xl mb-8">
                      <ImageCarousel images={acc.images} alt={acc.name} />
                      <div className="absolute top-6 left-6 z-20">
                        <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-[#2e2019]">
                          Opção {idx + 1}
                        </span>
                      </div>
                    </div>
                    <div className="max-w-2xl">
                      <h3 className="text-3xl md:text-5xl font-black font-outfit uppercase tracking-tight mb-6" style={{ color: "#2e2019" }}>
                        {acc.name}
                      </h3>
                      <div className="w-12 h-[2px] bg-[#c4a97d] mb-8 group-hover:w-24 transition-all duration-500" />
                      <p className="text-lg leading-relaxed font-light italic max-w-xl" style={{ color: "#5c4a32" }}>
                        {lang === "pt" 
                          ? "Um refúgio de paz e sofisticação, escolhido a dedo para que seu descanso seja tão extraordinário quanto suas aventuras na Chapada."
                          : "A haven of peace and sophistication, handpicked to ensure your rest is as extraordinary as your adventures in Chapada."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            {/* Custom scroll indicators or fade effects could be added here */}
          </div>
        </motion.section>
      )}


      {/* ══════════════════════ UNIFIED INVESTMENT ══════════════════════ */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="py-24 md:py-32 px-6" 
        style={{ background: "#2e2019" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[12px] uppercase tracking-[0.5em] font-bold mb-4" style={{ color: "#c4a97d" }}>
              {t.packagesValues}
            </p>
            <h2 className="text-5xl md:text-8xl font-black text-white font-outfit uppercase tracking-tighter leading-none">{t.investmentTitle}</h2>
          </div>

          <div className="border border-white/10 p-8 md:p-16 text-left bg-[#1a130f]">
            {/* ATMOS service checklist */}
            {atmos && atmos.description && (
              <div className="mb-12 pb-12 border-b border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-8" style={{ color: "#c4a97d" }}>
                  {t.includedInService}
                </p>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                  {atmos.description.split("\n").filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-[#c4a97d] mt-1 flex-shrink-0" />
                      <span className="text-base text-white/70">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-by-day breakdown — more impact, less 'webby'. Hidden entirely
                (not just the itemized list) when showBreakdown is off: the
                per-day rolled-up total itself is computed client-side from raw
                item values, which are only present in the payload when the
                breakdown is actually meant to be visible. */}
            {showBreakdown && (
            <div className="space-y-8 mb-16">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-white/40">
                {lang === "pt" ? "Resumo Financeiro Diário" : lang === "es" ? "Resumen Financiero Diario" : "Daily Financial Summary"}
              </p>
              {days.map(dayNum => {
                const dayItemsSorted = items
                  .filter(i => i.day_number === dayNum)
                  .sort((a, b) => (a.item_index ?? 0) - (b.item_index ?? 0));
                const dayLabel = dayItemsSorted[0]?.day_label || `${t.day} ${dayNum}`;
                const isExpanded = expandedDays.includes(dayNum);
                
                return (
                  <div key={dayNum} className="border-b border-white/5">
                    <button
                      onClick={() => setExpandedDays(prev =>
                        prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
                      )}
                      className="w-full flex flex-col md:flex-row md:items-center justify-between py-8 gap-4 hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-baseline gap-6">
                        <span className="text-xl font-black font-outfit text-[#c4a97d] w-12 group-hover:scale-110 transition-transform">{String(dayNum).padStart(2, "0")}</span>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase tracking-[0.2em] font-black text-white/40 mb-1">
                            {proposal.start_date
                              ? (() => { const d = new Date(proposal.start_date + "T12:00:00"); d.setDate(d.getDate() + dayNum - 1); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`; })()
                              : `${t.day} ${dayNum}`}
                          </span>
                          <span className="text-xl text-white/80 uppercase tracking-tight font-outfit">{dayLabel}</span>
                          <span className="text-[9px] uppercase tracking-widest text-[#c4a97d] font-black mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isExpanded ? "Clique para recolher" : "Clique para ver detalhes"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className={`p-2 border border-white/10 transition-all ${isExpanded ? "bg-[#c4a97d] border-[#c4a97d]" : "group-hover:border-[#c4a97d]"}`}>
                          <ChevronDown className={`w-4 h-4 ${isExpanded ? "text-white rotate-180" : "text-[#c4a97d]"} transition-transform duration-500`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="pb-10 pl-16 pr-10 space-y-4 animate-fade-in">
                        {dayItemsSorted
                          .filter(i => i.item_name || i.value > 0)
                          .map((item, idx) => (
                            <div key={idx} className="flex justify-between items-end text-sm border-b border-white/[0.05] pb-3 group/item">
                              <div className="flex flex-col">
                                <span className="text-white/80 font-medium uppercase tracking-tight text-base font-outfit group-hover/item:text-[#c4a97d] transition-colors">
                                  {item.item_name || item.category}
                                </span>
                                <span className="text-[10px] text-[#c4a97d]/60 uppercase tracking-[0.2em] font-black mt-1">
                                  {CATEGORY_LABELS[item.category]?.[lang] || item.category}
                                </span>
                              </div>
                              <span className="text-white/40 tabular-nums font-light">
                                {item.value > 0 ? fmt(item.value) : <span className="text-[#c4a97d] font-black tracking-widest text-[10px]">CORTESIA</span>}
                              </span>
                            </div>
                          ))}
                        {/* ATMOS SERVICE proportional daily */}
                        {atmosPPD > 0 && (
                          <div className="flex justify-between items-end text-sm border-b border-white/[0.05] pb-3 group/item">
                            <div className="flex flex-col">
                              <span className="text-white/80 font-medium uppercase tracking-tight text-base font-outfit group-hover/item:text-[#c4a97d] transition-colors">{t.atmosService}</span>
                              <span className="text-[10px] text-[#c4a97d]/60 uppercase tracking-[0.2em] font-black mt-1">Curadoria & Logística</span>
                            </div>
                            <span className="text-white/40 tabular-nums font-light">{fmt(atmosPPD)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Summary totals — items_subtotal/items_discount_amount are
                GROUP-level and items-only (exclude atmos/accommodation
                revenue), labeled as such; net_per_person below is the one
                unambiguous per-person figure, from the authoritative total. */}
            <div className="space-y-4 pt-10 border-t border-white/20">
              <div className="flex justify-between items-center text-white/40 uppercase tracking-widest text-[10px] font-black">
                <span>{lang === "pt" ? "Subtotal dos itens (grupo)" : lang === "es" ? "Subtotal de los ítems (grupo)" : "Items subtotal (group)"}</span>
                <span className="tabular-nums text-sm">{fmt(itemsSubtotal)}</span>
              </div>
              {itemsDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-red-400 uppercase tracking-widest text-[10px] font-black">
                  <span>
                    {lang === "pt" ? "Desconto dos itens (grupo)" : lang === "es" ? "Descuento de los ítems (grupo)" : "Items discount (group)"}
                    {proposal.discount_percent > 0 ? ` (${proposal.discount_percent}%)` : ""}
                  </span>
                  <span className="tabular-nums text-sm">- {fmt(itemsDiscountAmount)}</span>
                </div>
              )}
            </div>

            {/* ── FINAL PRICE ── */}
            <div className="mt-12 pt-10 border-t-4 border-[#c4a97d]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-[0.4em] font-black mb-4 block">
                    {/* Average, not an exact per-person price: with heterogeneous
                        room/accommodation splits, individual amounts can differ
                        from total/num_paying. Per-person apportionment across
                        mixed modalities is explicitly not solved here. */}
                    {lang === "pt" ? "Valor Médio por Pagante" : lang === "es" ? "Valor Medio por Pagante" : "Average per Paying Guest"}
                  </span>
                  <span className="text-6xl md:text-8xl font-black text-[#c4a97d] font-outfit tabular-nums leading-none tracking-tighter">
                    {/* null (not a fabricated 0/free) when there's no valid
                        paying headcount -- e.g. courtesies >= num_people. */}
                    {netPerPerson === null
                      ? (lang === "pt" ? "Indisponível" : lang === "es" ? "No disponible" : "Unavailable")
                      : fmt(netPerPerson)}
                  </span>
                </div>
                  <div className="text-left md:text-right">
                    <div className="flex flex-col md:items-end gap-1 mb-4">
                      <span className="text-white/30 text-[10px] uppercase tracking-widest font-black">
                        {lang === "pt" ? "Participantes" : lang === "es" ? "Participantes" : "Participants"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/80 font-bold text-sm">
                          {numPaying} {lang === "pt" ? "Pagantes" : lang === "es" ? "Pagantes" : "Paying"}
                        </span>
                        {numCourtesies > 0 && (
                          <span className="bg-[#c4a97d] text-white text-[9px] px-2 py-0.5 font-black uppercase tracking-widest">
                            {numCourtesies} {lang === "pt" ? "Cortesias" : lang === "es" ? "Cortesias" : "Courtesies"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">
                      {lang === "pt" ? "Total do grupo" : lang === "es" ? "Total del grupo" : "Group total"}
                    </span>
                    <span className="text-2xl font-black text-white/80 tabular-nums font-outfit uppercase tracking-tight">{fmt(grandTotal)}</span>
                  </div>
              </div>
            </div>

            {/* Payment Terms */}
            {proposal.payment_terms?.installments && proposal.payment_terms.installments.length > 0 && (
              <div className="mt-20 pt-10 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-[#c4a97d]">
                  {lang === "pt" ? "Condições de Pagamento" : lang === "es" ? "Condiciones de Pago" : "Payment Terms"}
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  {proposal.payment_terms.installments.map((inst, i) => {
                    const dueLabels: Record<string, Record<string, string>> = {
                      on_booking: { pt: "Na reserva", en: "On booking", es: "Al reservar" },
                      "3_months_before": { pt: "3 meses antes", en: "3 months before", es: "3 meses antes" },
                      "5_days_before": { pt: "5 dias antes", en: "5 days before", es: "5 días antes" },
                    };
                    const dueText = dueLabels[inst.due_rule]?.[lang] || inst.due_rule;
                    const instValue = grandTotal * (inst.percent / 100);
                    return (
                      <div key={i} className="border border-white/10 p-6 bg-white/5">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{inst.label}</span>
                        <span className="block text-2xl font-black text-[#c4a97d] font-outfit mb-4">{inst.percent}%</span>
                        <div className="space-y-1">
                          <span className="block text-sm font-bold text-white/80">{fmt(instValue)}</span>
                          <span className="block text-[10px] uppercase tracking-widest text-white/30">{dueText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {proposal.valid_until && (
              <div className="mt-16 text-center">
                <span className="inline-block text-[10px] px-6 py-2 border border-white/20 uppercase tracking-[0.3em] font-black" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {t.validUntil}: {formatDateFull(proposal.valid_until)}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.section>


      {/* ══════════════════════ CONTRACT (always visible) ══════════════════════ */}
      <section id="contract-section" className="py-24 md:py-32 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <FileSignature className="w-12 h-12 mx-auto mb-6" style={{ color: "#c4a97d" }} />
          <h3 className="text-3xl md:text-5xl font-black font-outfit uppercase tracking-tighter mb-6" style={{ color: "#2e2019" }}>{t.contractTitle}</h3>
          <p className="text-base leading-relaxed mb-12" style={{ color: "#8d7b63" }}>{t.contractText}</p>

          {/* Clicksign embedded widget */}
          {clicksignKey ? (
            <div
              id="clicksign-widget-container"
              ref={clicksignContainerRef}
              className="w-full overflow-hidden border border-[#e4dbcc]"
              style={{ minHeight: 600 }}
            />
          ) : proposal.status === "approved" && !proposal.contract_url?.startsWith("clicksign:") ? (
            /* Show button to init Clicksign contract */
            proposal.contract_url ? (
              <a
                href={proposal.contract_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-4 px-10 py-5 text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-105"
                style={{ background: "#2e2019", color: "#fff" }}
              >
                <FileSignature className="w-4 h-4" />
                {t.contractButton}
              </a>
            ) : (
              <button
                onClick={initClicksignContract}
                disabled={loadingContract}
                className="inline-flex items-center gap-4 px-10 py-5 text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "#2e2019", color: "#fff" }}
              >
                <FileSignature className="w-4 h-4" />
                {loadingContract
                  ? (lang === "pt" ? "Preparando contrato..." : lang === "es" ? "Preparando contrato..." : "Preparing contract...")
                  : t.contractButton}
              </button>
            )
          ) : proposal.status !== "approved" ? (
            <span
              className="inline-flex items-center gap-4 px-10 py-5 text-[12px] font-black uppercase tracking-[0.4em] opacity-40 cursor-not-allowed"
              style={{ background: "#2e2019", color: "#fff" }}
            >
              <FileSignature className="w-4 h-4" />
              {t.contractButton}
            </span>
          ) : null}
        </div>
      </section>

      {/* ══════════════════════ NOT INCLUDED ══════════════════════ */}
      <section className="py-20 md:py-24 px-6 border-y border-[#e4dbcc]" style={{ background: "#fcfaf7" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-[12px] uppercase tracking-[0.5em] font-black mb-6" style={{ color: "#2e2019" }}>{t.notIncluded}</h3>
          <p className="text-base leading-relaxed italic" style={{ color: "#8d7b63" }}>{t.notIncludedText}</p>
        </div>
      </section>

      {/* ══════════════════════ NOTES ══════════════════════ */}
      {proposal.notes && (
        <section className="py-20 md:py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="p-10 border border-[#e4dbcc]" style={{ background: "#fcfaf7" }}>
              <h3 className="text-[12px] uppercase tracking-[0.5em] font-black mb-6" style={{ color: "#2e2019" }}>{t.notes}</h3>
              <p className="text-base whitespace-pre-line leading-relaxed" style={{ color: "#8d7b63" }}>{proposal.notes}</p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="py-24 md:py-48 px-6 text-center border-t border-white/5" style={{ background: "#1a130f" }}>
        <div className="max-w-xl mx-auto">
          <p className="italic text-2xl md:text-4xl font-light mb-16 leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>
            "{t.inspirational}"
          </p>
          <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-12 mx-auto mb-8 brightness-0 invert opacity-40" />
          <div className="w-12 h-[1px] bg-white/10 mx-auto mb-8" />
          <p className="text-[10px] uppercase tracking-[0.5em] font-black" style={{ color: "rgba(255,255,255,0.2)" }}>{t.poweredBy}</p>
        </div>
      </footer>



      {/* ══════════════════════ FEEDBACK DIALOG ══════════════════════ */}
      <ProposalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        proposalId={proposal.id}
        shareToken={proposal.share_token}
        lang={lang}
      />
      {/* ══════════════════════ VERSION MARKER ══════════════════════ */}
      <div className="py-4 text-center text-[8px] text-gray-500 opacity-20">
        v2.6.0 - Immersive UI & Asset Sync Live
      </div>
    </motion.div>
  );
}
