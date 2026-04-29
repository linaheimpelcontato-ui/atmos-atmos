import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl } from "@/lib/storage";
import { fetchStorageImages } from "@/hooks/useStorageImages";
import { trackProposalView } from "@/lib/analytics";
import {
  Check, MapPin, Users, CalendarDays,
  Sunrise, Mountain, Compass, Sparkles, Leaf, MessageCircle,
  ChevronLeft, ChevronRight, ChevronDown, Home, Car, Footprints, Truck,
  Pencil, Save, Globe, Link, FileSignature, GripVertical,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProposalFeedbackDialog from "@/components/proposal/ProposalFeedbackDialog";
/* dnd-kit reordering */
const logoAtmos = storageUrl("home/logo-atmos.png");
const heroImage = "/assets/proposta-visual-cliente/propostavisualbg.jpg";
const dividerImage = storageUrl("roteiros/hero-roteiros.jpg");
const db = supabase as any;


/* ───── types ───── */
type Proposal = {
  id: string; title: string; status: string; notes: string | null;
  num_people: number; num_days: number; start_date: string | null; end_date: string | null;
  subtotal: number; discount_percent: number; discount_fixed: number; tax_percent: number; total: number;
  valid_until: string | null; language: string; published_at: string | null;
  share_token?: string | null;
  prospects?: { name: string; email: string | null } | null;
  sellers?: { name: string; phone: string | null } | null;
  atmos_service?: { price_per_person_day: number; description: string; internal_costs?: any[]; num_courtesies?: number } | null;
  payment_terms?: { installments: { label: string; percent: number; due_rule: string }[] } | null;
  contract_url?: string | null;
};
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
  "astro-turismo": "astro",
  "aula-forro": "forro",
  "massagem-bem-estar": "massagem",
  "noturna-imersiva": "noturna",
  "voo-balao": "balao",
  "voo-paramotor": "paramotor",
  "yoga-meditacao": "yoga",
  "passeio-cavalo": "cavalo",
  "feira-produtores": "feira",
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
};

/* ───── DayBanner (overlay-only, background comes from parent) ───── */
function DayBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full px-6 md:px-12 py-16 md:py-20 overflow-hidden bg-[#1a1411]">
      {/* Background Texture - Sharp and prominent */}
      <div 
        className="absolute inset-0 bg-cover bg-center contrast-[1.2] brightness-[0.5] opacity-80"
        style={{ backgroundImage: "url('/assets/home/leaf-texture - horizontal.jpg')" }}
      />
      
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
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<DayItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dayObservations, setDayObservations] = useState<Record<number, string>>({});
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
  const proposalIdRef = useRef<string | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractUrlInput, setContractUrlInput] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [dynamicDayGalleries, setDynamicDayGalleries] = useState<Record<number, string[]>>({});
  const [dynamicAccImages, setDynamicAccImages] = useState<Record<string, string[]>>({});
  const [approving, setApproving] = useState(false);
  const [clicksignKey, setClicksignKey] = useState<string | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const clicksignContainerRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check admin status
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data: roleOk } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (roleOk) {
        setIsAdmin(true);
        if (searchParams.get("edit") === "1") setEditMode(true);
      }
    })();
  }, [user, searchParams]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      let prop: any = null;
      let err: any = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
      if (!isUUID) {
        const res = await db
          .from("proposals")
          .select("*, prospects(name, email), sellers(name, phone)")
          .eq("slug", token).single();
        prop = res.data;
        err = res.error;
      }
      if (!prop) {
        const res = await db
          .from("proposals")
          .select("*, prospects(name, email), sellers(name, phone)")
          .eq("share_token", token).single();
        prop = res.data;
        err = res.error;
      }
      if (err || !prop) { setError(true); setLoading(false); return; }
      setProposal(prop);
      proposalIdRef.current = prop.id;
      const { data: dayItems } = await db
        .from("proposal_day_items").select("*")
        .eq("proposal_id", prop.id).order("day_number, item_index");
      setItems(dayItems || []);

      const { data: dayDescs } = await db
        .from("proposal_days").select("day_number, description, observation")
        .eq("proposal_id", prop.id);
      if (dayDescs) {
        const obsMap: Record<number, string> = {};
        dayDescs.forEach((d: any) => { obsMap[d.day_number] = d.observation || ""; });
        setDayObservations(obsMap);
      }

      const { data: prods } = await db
        .from("products")
        .select("id, source_id, type, name, variables")
        .in("type", ["waterfall", "experience", "accommodation"]);
      setProducts(prods || []);
      trackProposalView(prop.id);
      setLoading(false);
    })();
  }, [token]);

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
      items.forEach((item, idx) => {
        descs[`${item.day_number}-${idx}`] = item.description || "";
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
    items.forEach((item, idx) => {
      descs[`${item.day_number}-${idx}`] = item.description || "";
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
      const reordered = arrayMove(dayItems2, oldIdx, newIdx);
      reordered.forEach((item, i) => { item.item_index = i; });
      return [...otherItems, ...reordered];
    });
  };

  const saveEdits = async () => {
    const propId = proposalIdRef.current;
    if (!propId) return;
    setSaving(true);
    try {
      // Save observations
      await db.from("proposal_days").delete().eq("proposal_id", propId);
      const allDayNums = [...new Set(Object.keys(editObservations).map(Number))];
      const obsPayload = allDayNums
        .filter(d => editObservations[d] && editObservations[d].trim())
        .map(d => ({
          proposal_id: propId,
          day_number: d,
          description: "",
          observation: editObservations[d] || "",
        }));
      if (obsPayload.length > 0) {
        await db.from("proposal_days").insert(obsPayload);
      }
      setDayObservations({ ...editObservations });

      // Save day labels
      for (const [dayNumStr, label] of Object.entries(editLabels)) {
        const dayNum = parseInt(dayNumStr);
        await db.from("proposal_day_items")
          .update({ day_label: label })
          .eq("proposal_id", propId)
          .eq("day_number", dayNum);
      }

      // Save descriptions and item_index per item
      const updatedItems: DayItem[] = [];
      for (let idx = 0; idx < editItemOrder.length; idx++) {
        const item = editItemOrder[idx];
        const descKey = `${item.day_number}-${items.indexOf(item)}`;
        const origIdx = items.indexOf(item);
        const altDescKey = `${item.day_number}-${origIdx}`;
        const desc = editDescriptions[descKey] ?? editDescriptions[altDescKey] ?? item.description;
        
        if (item.id) {
          await db.from("proposal_day_items")
            .update({ description: desc || null, item_index: item.item_index })
            .eq("id", item.id);
        }
        updatedItems.push({
          ...item,
          description: desc || null,
          day_label: editLabels[item.day_number] || item.day_label,
        });
      }

      setItems(updatedItems);
      setEditMode(false);
    } catch (e) {
      console.error("Error saving edits:", e);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const propId = proposalIdRef.current;
    if (!propId) return;
    setPublishing(true);
    try {
      const newVal = proposal?.published_at ? null : new Date().toISOString();
      await db.from("proposals").update({ published_at: newVal }).eq("id", propId);
      setProposal((prev: Proposal | null) => prev ? { ...prev, published_at: newVal, status: newVal ? 'sent' : prev.status } : prev);
    } catch (e) {
      console.error("Error toggling publish:", e);
    } finally {
      setPublishing(false);
    }
  };

  const saveContractUrl = async () => {
    const propId = proposalIdRef.current;
    if (!propId) return;
    setSavingContract(true);
    try {
      const url = contractUrlInput.trim() || null;
      await db.from("proposals").update({ contract_url: url }).eq("id", propId);
      setProposal((prev: Proposal | null) => prev ? { ...prev, contract_url: url } : prev);
      setContractDialogOpen(false);
    } catch (e) {
      console.error("Error saving contract URL:", e);
    } finally {
      setSavingContract(false);
    }
  };

  const handleApprove = async () => {
    if (!proposal || approving) return;
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
      console.error("Approve error:", e);
    } finally {
      setApproving(false);
    }
  };


  const initClicksignContract = async () => {
    if (!proposal || loadingContract) return;
    if (proposal.contract_url?.startsWith("clicksign:")) {
      setClicksignKey(proposal.contract_url.replace("clicksign:", ""));
      return;
    }
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Clicksign error:", body);
        return;
      }
      const data = await res.json();
      if (data.widget_key) {
        setClicksignKey(data.widget_key);
        setProposal((prev: Proposal | null) =>
          prev ? { ...prev, contract_url: `clicksign:${data.widget_key}` } : prev
        );
      }
    } catch (e) {
      console.error("Clicksign error:", e);
    } finally {
      setLoadingContract(false);
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
      return products.find(p => p.name === item.item_name);
    }
    return undefined;
  }, [products]);

  useEffect(() => {
    if (items.length === 0 || products.length === 0) return;
    const dayNums = [...new Set(items.map(i => i.day_number))];

    (async () => {
      const dayGalleries: Record<number, string[]> = {};
      for (const dayNum of dayNums) {
        const dayItems2 = items.filter(i => i.day_number === dayNum);
        const urls: string[] = [];
        for (const item of dayItems2) {
          const product = findProductRef(item);
          if (!product?.source_id) continue;
          if (product.type === "waterfall") {
            const imgs = await fetchStorageImages("cachoeiras", product.source_id);
            if (imgs.length > 0) urls.push(...imgs);
            else for (let n = 1; n <= 3; n++) urls.push(storageUrl(`cachoeiras/${product.source_id}-${n}.jpg`));
          } else if (product.type === "experience") {
            const key = EXP_STORAGE_KEY[product.source_id] || product.source_id;
            const imgs = await fetchStorageImages("experiencias", key);
            if (imgs.length > 0) urls.push(...imgs);
            else urls.push(storageUrl(`experiencias/${key}-1.jpg`));
          }
        }
        dayGalleries[dayNum] = urls;
      }
      setDynamicDayGalleries(dayGalleries);

      const accImgs: Record<string, string[]> = {};
      const seen = new Set<string>();
      for (const item of items) {
        if (item.category !== "Hospedagem") continue;
        const product = findProductRef(item);
        const sourceId = product?.source_id;
        if (!sourceId || seen.has(sourceId)) continue;
        seen.add(sourceId);
        const imgs = await fetchStorageImages("hospedagens", sourceId);
        accImgs[sourceId] = imgs.length > 0
          ? imgs
          : Array.from({ length: 6 }, (_, i) => storageUrl(`hospedagens/${sourceId}-${i + 1}.jpg`));
      }
      setDynamicAccImages(accImgs);
    })();
  }, [items, products, findProductRef]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fcfaf7" }}>
      <div className="flex flex-col items-center gap-4">
        <img src={logoAtmos} alt="ATMOS" className="h-10 animate-pulse" />
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

  const dayPerPersonTotal = (dayNum: number) => {
    const dayItems2 = items.filter(i => i.day_number === dayNum);
    const nonGuide = dayItems2.filter(i => i.category !== "Diária Guia ATMOS");
    const guideItems = dayItems2.filter(i => i.category === "Diária Guia ATMOS");
    let perPerson = 0;
    for (const i of nonGuide) perPerson += i.value;
    if (guideItems.length > 0) {
      const guideTotal = guideItems.reduce((s, i) => s + i.value * (i.quantity || 1), 0);
      perPerson += guideTotal / (proposal.num_people || 1);
    }
    return perPerson + atmosPPD;
  };

  // Use saved proposal values as source of truth
  const numCourtesies = (atmos as any)?.num_courtesies || 0;
  const numPaying = Math.max(1, proposal.num_people - numCourtesies);
  const grandTotal = proposal.total;
  const netPerPerson = numPaying > 0 ? grandTotal / numPaying : 0;
  const subtotalPerPerson = proposal.subtotal > 0
    ? proposal.subtotal / proposal.num_people + atmosPPD * (proposal.num_days || days.length)
    : days.reduce((sum, d) => sum + dayPerPersonTotal(d), 0);
  const discountAmt = proposal.discount_percent > 0
    ? subtotalPerPerson * (proposal.discount_percent / 100)
    : proposal.discount_fixed > 0
      ? proposal.discount_fixed / proposal.num_people
      : 0;

  const getDayWaterfallInfo = (dayNum: number) => {
    const dayItems2 = items.filter(i => i.day_number === dayNum);
    const waterfallItem = dayItems2.find(i => i.category === "Cachoeira" || i.category === "Ingresso" || i.category === "Cachoeira / Ingresso");
    if (!waterfallItem) return null;
    const product = findProduct(waterfallItem);
    const vars = product?.variables || {};
    return {
      difficulty: vars.difficulty as string | undefined,
      distanceKm: vars.distanceKm as number | undefined,
      distanceCarKm: vars.distanceCarKm as number | undefined,
      vehicleType: waterfallItem.vehicle_type || "carroTurista",
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
      return products.find(p => p.name === item.item_name);
    }
    return undefined;
  };



  const getDayGallery = (dayNum: number): string[] => {
    return dynamicDayGalleries[dayNum] || [];
  };

  const getAccommodations = (): { name: string; sourceId: string; images: string[] }[] => {
    const seen = new Set<string>();
    const accs: { name: string; sourceId: string; images: string[] }[] = [];
    for (const item of items) {
      if (item.category !== "Hospedagem") continue;
      const product = findProduct(item);
      const sourceId = product?.source_id;
      const name = item.item_name || product?.name || "Hospedagem";
      const key = sourceId || name;
      if (seen.has(key)) continue;
      seen.add(key);
      const images = sourceId
        ? (dynamicAccImages[sourceId] || Array.from({ length: 6 }, (_, i) => storageUrl(`hospedagens/${sourceId}-${i + 1}.jpg`)))
        : [];
      accs.push({ name, sourceId: sourceId || "", images });
    }
    return accs;
  };

  const accommodations = getAccommodations();

  // For rendering, use editItemOrder in edit mode, items otherwise
  const renderItems = editMode ? editItemOrder : items;

  return (
    <div className="min-h-screen" style={{ background: "#fcfaf7", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════════════════════ STICKY HEADER — client only ══════════════════════ */}
      {proposal.published_at && !isAdmin && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-2"
          style={{ background: "rgba(0,0,0,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <img src={logoAtmos} alt="ATMOS" className="h-16 md:h-20 brightness-0 invert drop-shadow-xl" />
          <div className="flex items-center gap-2">
            {["sent", "negotiating"].includes(proposal.status) && (
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
          <img src={logoAtmos} alt="ATMOS" className="h-12 md:h-16 shrink-0" />
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
        <img 
          src={heroImage} 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover scale-105 transition-opacity duration-1000 opacity-0" 
          onLoad={(e) => (e.currentTarget.style.opacity = "1")}
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
      <section className="py-32 md:py-48 px-6 bg-white border-y border-[#e4dbcc]">
        <div className="max-w-4xl mx-auto text-center">
          <img src={logoAtmos} alt="ATMOS" className="h-20 mx-auto mb-12 opacity-80" />
          <h2 className="text-3xl md:text-6xl font-black leading-none mb-10 font-outfit uppercase tracking-tighter" style={{ color: "#2e2019" }}>
            {t.brandTitle}
          </h2>
          <div className="w-16 h-[1px] bg-[#c4a97d] mx-auto mb-10" />
          <p className="text-lg md:text-2xl leading-relaxed max-w-3xl mx-auto mb-6 font-light italic" style={{ color: "#2e2019" }}>
            {t.brandText1}
          </p>
          <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto uppercase tracking-widest font-bold" style={{ color: "#8d7b63" }}>
            {t.brandText2}
          </p>
        </div>
      </section>


      {/* ══════════════════════ DIVIDER ══════════════════════ */}
      <div className="h-[40vh] md:h-[50vh] overflow-hidden">
        <img src={dividerImage} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>

      {/* ══════════════════════ ITINERARY SECTION TITLE ══════════════════════ */}
      {days.length > 0 && (
        <section className="py-24 md:py-32 text-center" style={{ background: "#2e2019" }}>
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-12 h-[1px] bg-[#c4a97d]/40" />
            <p className="text-[12px] uppercase tracking-[0.5em] font-bold" style={{ color: "#c4a97d" }}>
              {lang === "pt" ? "Cronograma" : lang === "es" ? "Cronograma" : "Schedule"}
            </p>
            <div className="w-12 h-[1px] bg-[#c4a97d]/40" />
          </div>
          <h2 className="text-5xl md:text-8xl font-black text-white font-outfit uppercase tracking-tighter leading-none">{t.yourTrip}</h2>
        </section>
      )}


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
          <section key={dayNum} className="relative">
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
                    .filter(i => i.category === "Diária Guia ATMOS" && i.item_name)
                    .map(i => i.item_name!);
                  const snackItems = dayItemsSorted
                    .filter(i => (i.category === "Lanche" || i.category === "Lanche Trilha") && i.item_name);
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
                            {wInfo.vehicleType === "4x4Atmos" ? "ATMOS 4×4" : (lang === "pt" ? "Carro próprio" : lang === "es" ? "Coche propio" : "Own car")}
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

            {/* ══════ TWO-COLUMN BODY: items left, carousel right ══════ */}
            <div style={{ background: isEven ? "#fff" : "#fcfaf7" }} className="border-b border-[#e4dbcc]">
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
              <div className="flex flex-col md:flex-row gap-12 md:gap-20">
                {/* LEFT — scrollable items */}
                <div className="flex-1 min-w-0">
                  <ScrollArea type="always" className="proposal-itinerary-scroll md:h-[600px]">
                    <div className="md:pr-10">
                    {(() => {
                      const visibleItems = dayItemsSorted.filter(i => (i.item_name || i.value > 0) && i.category !== "Diária Guia ATMOS" && i.category !== "Lanche" && i.category !== "Lanche Trilha");
                      const itemContent = visibleItems.map((item, localIdx) => {
                        const Icon = CATEGORY_ICONS[item.category] || MapPin;
                        const catLabel = CATEGORY_LABELS[item.category]?.[lang] || item.category;
                        const globalIdx = items.indexOf(item);
                        const descKey = `${item.day_number}-${globalIdx}`;
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
                                {item.item_name || item.category}
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

                    {/* ── Observation at end of day ── */}
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
                  </ScrollArea>
                </div>

                {/* RIGHT — sticky vertical carousel */}
                {gallery.length > 0 && (
                  <div className="w-full md:w-[45%] flex-shrink-0">
                    <div className="md:sticky md:top-28 self-start">
                      <div className="aspect-[3/4] overflow-hidden shadow-2xl">
                        <ImageCarousel images={gallery} alt={dayLabel} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </section>
        );
      })}
      </div>

      {/* ══════════════════════ ACCOMMODATION SECTION ══════════════════════ */}
      {accommodations.length > 0 && (
        <section className="py-24 md:py-32 px-6 bg-white border-b border-[#e4dbcc]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <p className="text-[12px] uppercase tracking-[0.5em] font-bold mb-4" style={{ color: "#c4a97d" }}>
                {lang === "pt" ? "Estadia" : lang === "es" ? "Estadía" : "Stays"}
              </p>
              <h2 className="text-4xl md:text-7xl font-black font-outfit uppercase tracking-tighter leading-none" style={{ color: "#2e2019" }}>
                {t.yourAccommodation}
              </h2>
            </div>

            <div className={`grid gap-12 ${accommodations.length > 1 ? "md:grid-cols-2" : "max-w-4xl mx-auto"}`}>
              {accommodations.map((acc) => (
                <div key={acc.sourceId || acc.name} className="overflow-hidden border border-[#e4dbcc]" style={{ background: "#fff" }}>
                  {acc.images.length > 0 && (
                    <div className="aspect-[16/9] relative">
                      <ImageCarousel images={acc.images} alt={acc.name} />
                    </div>
                  )}
                  <div className="p-8">
                    <p className="text-[10px] uppercase tracking-widest font-black mb-2" style={{ color: "#c4a97d" }}>
                      {lang === "pt" ? "Hospedagem Selecionada" : lang === "es" ? "Hospedaje Seleccionado" : "Selected Stay"}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-black font-outfit uppercase tracking-tight" style={{ color: "#2e2019" }}>{acc.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ══════════════════════ UNIFIED INVESTMENT ══════════════════════ */}
      <section className="py-24 md:py-32 px-6" style={{ background: "#2e2019" }}>
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

            {/* Day-by-day breakdown — more impact, less 'webby' */}
            <div className="space-y-8 mb-16">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-white/40">
                {lang === "pt" ? "Resumo Financeiro Diário" : lang === "es" ? "Resumen Financiero Diario" : "Daily Financial Summary"}
              </p>
              {days.map(dayNum => {
                const dayPP = dayPerPersonTotal(dayNum);
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
                        <span className="text-2xl font-black font-outfit text-white tabular-nums tracking-tighter">{fmt(dayPP)}</span>
                        <div className={`p-2 border border-white/10 transition-all ${isExpanded ? "bg-[#c4a97d] border-[#c4a97d]" : "group-hover:border-[#c4a97d]"}`}>
                          <ChevronDown className={`w-4 h-4 ${isExpanded ? "text-white rotate-180" : "text-[#c4a97d]"} transition-transform duration-500`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="pb-8 pl-16 pr-10 space-y-3 animate-fade-in">
                        {dayItemsSorted
                          .filter(i => i.item_name || i.value > 0)
                          .map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-white/[0.03] pb-2">
                              <div className="flex flex-col">
                                <span className="text-white/60 font-medium uppercase tracking-wider text-[11px]">{item.item_name || item.category}</span>
                                <span className="text-[9px] text-[#c4a97d] uppercase tracking-widest font-black">
                                  {CATEGORY_LABELS[item.category]?.[lang] || item.category}
                                </span>
                              </div>
                              <span className="text-white/40 tabular-nums">
                                {item.value > 0 ? fmt(item.value) : <span className="text-[#c4a97d] font-black tracking-widest text-[10px]">CORTESIA</span>}
                              </span>
                            </div>
                          ))}
                        {/* ATMOS SERVICE proportional daily */}
                        {atmosPPD > 0 && (
                          <div className="flex justify-between items-center text-sm border-b border-white/[0.03] pb-2">
                            <div className="flex flex-col">
                              <span className="text-white/60 font-medium uppercase tracking-wider text-[11px]">{t.atmosService}</span>
                              <span className="text-[9px] text-[#c4a97d] uppercase tracking-widest font-black">Curadoria & Logística</span>
                            </div>
                            <span className="text-white/40 tabular-nums">{fmt(atmosPPD)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary totals */}
            <div className="space-y-4 pt-10 border-t border-white/20">
              <div className="flex justify-between items-center text-white/40 uppercase tracking-widest text-[10px] font-black">
                <span>{lang === "pt" ? "Subtotal por pessoa" : lang === "es" ? "Subtotal por persona" : "Subtotal per person"}</span>
                <span className="tabular-nums text-sm">{fmt(subtotalPerPerson)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between items-center text-red-400 uppercase tracking-widest text-[10px] font-black">
                  <span>
                    {t.discount}
                    {proposal.discount_percent > 0 ? ` (${proposal.discount_percent}%)` : ""}
                  </span>
                  <span className="tabular-nums text-sm">- {fmt(discountAmt)}</span>
                </div>
              )}
            </div>

            {/* ── FINAL PRICE ── */}
            <div className="mt-12 pt-10 border-t-4 border-[#c4a97d]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-[0.4em] font-black mb-4 block">
                    {lang === "pt" ? "Valor Final por Pessoa" : lang === "es" ? "Valor Final por Persona" : "Final Per Person"}
                  </span>
                  <span className="text-6xl md:text-8xl font-black text-[#c4a97d] font-outfit tabular-nums leading-none tracking-tighter">
                    {fmt(netPerPerson)}
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
      </section>


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
          <img src={logoAtmos} alt="ATMOS" className="h-12 mx-auto mb-8 brightness-0 invert opacity-40" />
          <div className="w-12 h-[1px] bg-white/10 mx-auto mb-8" />
          <p className="text-[10px] uppercase tracking-[0.5em] font-black" style={{ color: "rgba(255,255,255,0.2)" }}>{t.poweredBy}</p>
        </div>
      </footer>



      {/* ══════════════════════ FEEDBACK DIALOG ══════════════════════ */}
      <ProposalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        proposalId={proposal.id}
        lang={lang}
      />
    </div>
  );
}
