import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, Copy, Check, Car, ChevronDown, ChevronRight, GripVertical, LayoutGrid, List, ExternalLink, AlertCircle, AlertTriangle, Route, Heart, ClipboardList, MessageSquare, HelpCircle, PenLine, Info, CalendarIcon, ChevronsUpDown, Eye } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ProposalCostChecklist, { ProposalCostChecklistButton } from "@/components/admin/ProposalCostChecklist";
import ManualWishlistForm from "@/components/admin/ManualWishlistForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { itineraries } from "@/data/itineraries";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addDays, format, parse, isValid, eachDayOfInterval, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProposalAccommodationsSection, { calcAccommodationTotals, getAccommodationVariants, type ProposalAccommodation, type ProposalRoom } from "@/components/admin/proposals/ProposalAccommodationsSection";
import { normalizeRoomConfigs } from "@/components/admin/products/RoomModalitiesEditor";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function NumericCell({ value, onCommit, inputMode = "decimal", className, ...props }: {
  value: number | string;
  onCommit: (v: number) => void;
  inputMode?: "decimal" | "numeric";
  className?: string;
  [k: string]: any;
}) {
  const [text, setText] = useState(String(value || ""));
  useEffect(() => { setText(String(value || "")); }, [value]);
  return (
    <Input
      {...props}
      type="text"
      inputMode={inputMode}
      className={className}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(parseFloat(text.replace(",", ".")) || 0)}
    />
  );
}

function SearchableCatalogCombobox({ value, onSelect, options, placeholder, className, size = "sm" }: {
  value: string | null;
  onSelect: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const h = size === "xs" ? "h-7" : "h-8";
  const textSize = size === "xs" ? "text-xs" : "text-xs";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn(`${h} ${textSize} w-full justify-between font-normal`, className)}>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 z-[9999] max-h-[320px]" align="start" onWheel={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
          <CommandList className="max-h-[250px]">
            <CommandEmpty className="py-3 text-xs text-center">Nenhum resultado</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.id} value={o.label} onSelect={() => { onSelect(o.id); setOpen(false); }} className="text-xs">
                  {value === o.id && <Check className="mr-1.5 h-3 w-3 shrink-0" />}
                  <span className={value !== o.id ? "pl-[18px]" : ""}>{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function VariationSelect({ productId, value, onSelect, catalogItems, className }: {
  productId: string;
  value: string | null;
  onSelect: (vId: string) => void;
  catalogItems: any[];
  className?: string;
}) {
  const product = catalogItems.find(c => c.id === productId);
  const variations = (product?.variables?.variations || []) as any[];
  if (variations.length === 0) return null;

  return (
    <Select value={value || ""} onValueChange={onSelect}>
      <SelectTrigger className={cn("h-8 text-[10px] uppercase font-bold", className)}>
        <SelectValue placeholder="Escolher opção..." />
      </SelectTrigger>
      <SelectContent>
        {variations.map(v => (
          <SelectItem key={v.id} value={v.id} className="text-xs">
            {v.name} — R$ {Number(v.unit_price).toFixed(0)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TextCell({ value, onCommit, className, ...props }: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  [k: string]: any;
}) {
  const [text, setText] = useState(value || "");
  useEffect(() => { setText(value || ""); }, [value]);
  return (
    <Input
      {...props}
      type="text"
      className={className}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
    />
  );
}

type DayItem = {
  day_number: number;
  day_label: string;
  category: string;
  item_name: string;
  value: number;
  cost: number; // internal cost (what ATMOS pays)
  comissao: number; // commission % for this item
  value_text: string;
  description: string;
  catalog_item_id: string | null;
  variation_id: string | null;
  item_index: number;
  vehicle_type?: string;
  qty: number;
  supplier_id?: string | null;
};

type CostItem = {
  id?: string;
  description: string;
  amount: number;
  days: number;
  unit_amount: number;
  account_id: string | null;
};

type AtmosInternalCost = { description: string; amount: number; days: number; unit_amount: number };

type AtmosService = {
  price_per_person_day: number;
  description: string;
  internal_costs: AtmosInternalCost[];
};

type Prospect = { id: string; name: string };

type GuidePriceRow = {
  guide_id: string;
  product_id: string;
  is_active: boolean;
  price_car_1: number;
  price_car_2: number;
  price_car_3plus: number;
  price_4x4_1: number;
  price_4x4_2: number;
  price_4x4_3plus: number;
};

const DEFAULT_CATEGORIES = ["Cachoeira / Ingresso", "Diária Guia ATMOS", "Experiência", "Transfer", "Lanche Trilha", "Gastronomia"];

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviada" },
  { value: "negotiating", label: "Negociando" },
  { value: "approved", label: "Aprovada" },
  { value: "rejected", label: "Rejeitada" },
  { value: "expired", label: "Expirada" },
];

const contractStatusOptions = [
  { value: "none", label: "—" },
  { value: "pending", label: "Pendente" },
  { value: "sent", label: "Enviado" },
  { value: "signed", label: "Assinado" },
];

const paymentStatusOptions = [
  { value: "none", label: "—" },
  { value: "pending", label: "Pendente" },
  { value: "partial", label: "Parcial" },
  { value: "paid", label: "Pago" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Cachoeira / Ingresso": "bg-blue-600",
  "Diária Guia ATMOS": "bg-yellow-500",
  Hospedagem: "bg-emerald-600",
  "Lanche Trilha": "bg-orange-500",
  Transfer: "bg-violet-600",
  "Gastronomia": "bg-rose-600",
  "Experiência": "bg-teal-500",
};

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "Ingresso": "Cachoeira / Ingresso",
  "Cachoeira": "Cachoeira / Ingresso",
  "Guia": "Diária Guia ATMOS",
  "Refeição": "Gastronomia",
  "Hospedagem": "Hospedagem",  // keep legacy items working
};

const paxKey = (n: number): "1" | "2" | "3plus" => (n >= 3 ? "3plus" : String(n) as "1" | "2");

const getGuidePrice = (gwp: GuidePriceRow, vehicleType: string, qty: number): number => {
  const pk = paxKey(qty);
  if (vehicleType === "4x4Atmos") {
    if (pk === "1") return Number(gwp.price_4x4_1);
    if (pk === "2") return Number(gwp.price_4x4_2);
    return Number(gwp.price_4x4_3plus);
  }
  if (pk === "1") return Number(gwp.price_car_1);
  if (pk === "2") return Number(gwp.price_car_2);
  return Number(gwp.price_car_3plus);
};

// Get SALE price for guide from product (waterfall) guidePrices
const getGuideSalePrice = (product: any, vehicleType: string, qty: number): number => {
  const guidePrices = product?.variables?.guidePrices;
  if (!guidePrices) return 0;
  const pk = paxKey(qty);
  const vtKey = vehicleType === "4x4Atmos" ? "4x4Atmos" : "carroTurista";
  const tier = guidePrices[vtKey];
  if (!tier) return 0;
  return Number(tier[pk]) || 0;
};

const newDayItem = (dayNum: number, cat: string, itemIdx: number, numPeople: number): DayItem => ({
  day_number: dayNum, day_label: `Dia ${dayNum}`, category: cat,
  item_name: "", value: 0, cost: 0, comissao: 0, value_text: "", description: "",
  catalog_item_id: null, variation_id: null, item_index: itemIdx, qty: numPeople,
});

export default function ProposalFormDialog({
  open,
  onOpenChange,
  proposalId,
  segment,
  initialProspectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposalId: string | null;
  segment: "b2c" | "b2b";
  initialProspectId?: string | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [numPeople, setNumPeople] = useState(1);
  const [numCourtesies, setNumCourtesies] = useState(0);
  const [numDays, setNumDays] = useState(3);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [grid, setGrid] = useState<DayItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [language, setLanguage] = useState("pt");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});
  const [itineraryType, setItineraryType] = useState<"personalizado" | "pronto">("personalizado");
  const [costCheckOpen, setCostCheckOpen] = useState(false);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [dayDescriptions, setDayDescriptions] = useState<Record<number, string>>({});
  const [wishlistSheetOpen, setWishlistSheetOpen] = useState(false);
  const [feedbackSheetOpen, setFeedbackSheetOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wishlistData, setWishlistData] = useState<any>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [proposalAccommodations, setProposalAccommodations] = useState<ProposalAccommodation[]>([]);

  const [dayVehicleType, setDayVehicleType] = useState<Record<number, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  type PaymentInstallment = { label: string; percent: number; due_rule: string };
  const DEFAULT_B2B_PAYMENT_TERMS: PaymentInstallment[] = [
    { label: "Pré Reserva", percent: 10, due_rule: "on_booking" },
    { label: "Confirmação da Reserva", percent: 40, due_rule: "3_months_before" },
    { label: "Pagamento Final", percent: 50, due_rule: "5_days_before" },
  ];
  const [paymentTerms, setPaymentTerms] = useState<PaymentInstallment[]>([]);

  const [partnerCommission, setPartnerCommission] = useState(0);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [costAccounts, setCostAccounts] = useState<{ id: string; code: string; name: string }[]>([]);

  const [atmosService, setAtmosService] = useState<AtmosService>({
    price_per_person_day: 0,
    description: "",
    internal_costs: [],
  });

  // Track previous numPeople to detect changes
  const [prevNumPeople, setPrevNumPeople] = useState(1);
  // Skip normalization on initial grid load from DB
  const gridJustLoadedRef = useRef(false);
  // Track items whose sale value was manually edited (key = `${day_number}_${item_index}`)
  const manualValueKeysRef = useRef<Set<string>>(new Set());

  // Initialize days: open for new proposals, collapsed for existing
  useEffect(() => {
    const map: Record<number, boolean> = {};
    for (let d = 1; d <= numDays; d++) map[d] = !proposalId;
    setOpenDays(map);
  }, [numDays, proposalId]);

  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects-segment", segment],
    queryFn: async () => {
      const { data } = await supabase.from("prospects").select("id, name").eq("segment", segment).order("name");
      return (data || []) as Prospect[];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers-active"],
    queryFn: async () => {
      const { data } = await db.from("sellers").select("id, name").eq("is_active", true).order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catalogItems = [] } = useQuery<any[]>({
    queryKey: ["products-catalog"],
    queryFn: async () => {
      const { data } = await db.from("products").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Fetch guide_waterfall_prices
  const { data: guideWaterfallPrices = [] } = useQuery<GuidePriceRow[]>({
    queryKey: ["guide-waterfall-prices-all"],
    queryFn: async () => {
      const { data } = await db.from("guide_waterfall_prices").select("guide_id, product_id, is_active, price_car_1, price_car_2, price_car_3plus, price_4x4_1, price_4x4_2, price_4x4_3plus").eq("is_active", true);
      return data || [];
    },
  });

  useEffect(() => {
    db.from("chart_of_accounts").select("id, code, name").eq("is_active", true).order("code").then(({ data }: any) => {
      setCostAccounts(data || []);
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guides = [] } = useQuery<any[]>({
    queryKey: ["guides-active-full"],
    queryFn: async () => {
      const { data } = await db.from("guides").select("id, name, daily_rate, has_4x4").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Feedback messages for this proposal
  const { data: feedbackMessages = [] } = useQuery<{ id: string; type: string; content: string; created_at: string; is_resolved: boolean }[]>({
    queryKey: ["proposal-feedback-messages", proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data } = await db.from("proposal_feedback").select("id, type, content, created_at, is_resolved").eq("proposal_id", proposalId).order("created_at", { ascending: true });
      return (data || []) as any[];
    },
  });

  // Auto-calculate numDays when both trip dates are set
  useEffect(() => {
    if (!startDate || !endDate) return;
    const s = parse(startDate, "yyyy-MM-dd", new Date());
    const e = parse(endDate, "yyyy-MM-dd", new Date());
    if (!isValid(s) || !isValid(e) || e <= s) return;
    const days = differenceInDays(e, s) + 1; // +1: includes both start and end day
    if (days >= 1 && days !== numDays) {
      if (days < numDays) {
        setGrid(g => g.filter(cell => cell.day_number <= days));
      }
      setNumDays(days);
    }
  }, [startDate, endDate]);

  // Cost checks — used to resolve effective cost (validated actual_cost vs catalog cost)
  const { data: costChecks = [] } = useQuery<{ day_number: number; item_index: number; actual_cost: number; is_verified: boolean }[]>({
    queryKey: ["cost-checks", proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      const { data } = await db.from("proposal_cost_checks").select("day_number, item_index, actual_cost, is_verified").eq("proposal_id", proposalId);
      return (data || []) as any[];
    },
  });

  const toggleFeedbackResolved = async (feedbackId: string, resolved: boolean) => {
    await db.from("proposal_feedback").update({ is_resolved: resolved }).eq("id", feedbackId);
    qc.invalidateQueries({ queryKey: ["proposal-feedback-messages", proposalId] });
    qc.invalidateQueries({ queryKey: ["proposal-feedback-counts"] });
    qc.invalidateQueries({ queryKey: ["pill-feedback-groups"] });
  };

  const gwpMap = useMemo(() => {
    const m = new Map<string, GuidePriceRow>();
    guideWaterfallPrices.forEach((r) => m.set(`${r.guide_id}__${r.product_id}`, r));
    return m;
  }, [guideWaterfallPrices]);

  const getEffectiveCost = useCallback((cell: { day_number: number; item_index: number; cost: number; catalog_item_id?: string | null; variation_id?: string | null; category?: string; qty?: number }) => {
    // 1. Checklist verified → definitive source of truth
    const check = costChecks.find(c => c.day_number === cell.day_number && c.item_index === cell.item_index && c.is_verified);
    if (check) {
      // For "total" pricing items, actual_cost is the group total
      // Normalize to per-unit so downstream code (× qty) works correctly
      if (cell.catalog_item_id) {
        const product = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
        if (product) {
          const vars = (product.variables || {}) as Record<string, unknown>;
          const isTransferOrDrone = product.category === "transfer" || product.category === "drone";
          const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
          if (pricingType === "total" && (cell.qty || 1) > 0) {
            return Math.round((Number(check.actual_cost) / (cell.qty || 1)) * 100) / 100;
          }
        }
      }
      return Number(check.actual_cost);
    }

    // 2. Proposal's own cost → source of truth for existing proposals
    if (cell.cost > 0) return cell.cost;

    // 3. Catalog fallback (only useful for brand-new items with no cost yet)
    if (cell.catalog_item_id) {
      if (cell.category === "Diária Guia ATMOS") {
        const waterfallId = (() => {
          const cachoeiraItems = grid.filter(
            (c) => c.day_number === cell.day_number && c.category === "Cachoeira / Ingresso" && c.catalog_item_id
          );
          return cachoeiraItems.length > 0 ? cachoeiraItems[0].catalog_item_id : null;
        })();
        if (waterfallId) {
          const gwp = gwpMap.get(`${cell.catalog_item_id}__${waterfallId}`);
          if (gwp) {
            const vt = dayVehicleType[cell.day_number] || "carroTurista";
            const liveCost = getGuidePrice(gwp, vt, cell.qty || 1);
            if (liveCost > 0) return liveCost;
          }
        }
      } else {
        const product = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
        if (product) {
          if (cell.variation_id) {
            const vars = (product.variables || {}) as Record<string, any>;
            const variation = (vars.variations || []).find((v: any) => v.id === cell.variation_id);
            if (variation && Number(variation.cost_price) > 0) return Number(variation.cost_price);
          }
          const vars = (product.variables || {}) as Record<string, unknown>;
          const isTransferOrDrone = product.category === "transfer" || product.category === "drone";
          const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
          let cost = Number(product.cost_price) || 0;
          if (pricingType === "total" && numPeople > 0 && cost > 0) {
            cost = Math.round((cost / numPeople) * 100) / 100;
          }
          if (cost > 0) return cost;
        }
      }
    }

    // 4. Final fallback
    return cell.cost;
  }, [costChecks, catalogItems, gwpMap, dayVehicleType, numPeople, grid]);

  // Build lookup: productId → Set of guideIds that serve it
  const waterfallGuideMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    guideWaterfallPrices.forEach((r) => {
      if (!m.has(r.product_id)) m.set(r.product_id, new Set());
      m.get(r.product_id)!.add(r.guide_id);
    });
    return m;
  }, [guideWaterfallPrices]);

  const getCellItems = useCallback(
    (dayNum: number, cat: string) =>
      grid.filter((c) => c.day_number === dayNum && c.category === cat).sort((a, b) => a.item_index - b.item_index),
    [grid]
  );

  // Get the waterfall product_id selected in a given day
  const getWaterfallForDay = useCallback(
    (dayNum: number): string | null => {
      const cachoeiraItems = grid.filter(
        (c) => c.day_number === dayNum && c.category === "Cachoeira / Ingresso" && c.catalog_item_id
      );
      return cachoeiraItems.length > 0 ? cachoeiraItems[0].catalog_item_id : null;
    },
    [grid]
  );

  const initializeGrid = useCallback(() => {
    // For new proposals, don't pre-populate — just trim grid to current numDays
    setGrid(g => g.filter(item => item.day_number <= numDays));
  }, [numDays]);

  useEffect(() => {
    if (!open) return;
    if (!proposalId) {
      const prospectName = initialProspectId ? prospects.find(p => p.id === initialProspectId)?.name : null;
      setTitle(prospectName ? `Proposta — ${prospectName}` : ""); setStatus("draft"); setContractStatus(null); setPaymentStatus(null); setProspectId(initialProspectId || null); setSellerId(null);
      setNumPeople(1); setPrevNumPeople(1); setNumCourtesies(0); setNumDays(3); setNotes(""); setValidUntil("");
      setStartDate(""); setEndDate("");
      setDiscountPercent(0); setDiscountFixed(0); setTaxPercent(0);
      setCategories(DEFAULT_CATEGORIES);
      setGrid([]); setDayVehicleType({});
      setPartnerCommission(0);
      setLanguage("pt"); setShareToken(null); setCopied(false);
      setCostItems([]);
      setAtmosService({ price_per_person_day: 0, description: "", internal_costs: [] });
      setDayDescriptions({});
      setPaymentTerms(segment === "b2b" ? [...DEFAULT_B2B_PAYMENT_TERMS] : []);
      setProposalAccommodations([]);
      setIsDirty(false);
      return;
    }
    (async () => {
      const { data: prop } = await supabase.from("proposals").select("*").eq("id", proposalId).single();
      if (prop) {
        setTitle(prop.title);
        setStatus(prop.status);
        setContractStatus((prop as any).contract_status || null);
        setPaymentStatus((prop as any).payment_status || null);
        setProspectId(prop.prospect_id);
        setSellerId((prop as any).seller_id || null);
        const np = (prop as any).num_people || 1;
        setNumPeople(np);
        setPrevNumPeople(np);
        setNumDays((prop as any).num_days || 3);
        setNotes(prop.notes || "");
        setValidUntil(prop.valid_until || "");
        setStartDate((prop as any).start_date || "");
        setEndDate((prop as any).end_date || "");
        setDiscountPercent(Number(prop.discount_percent));
        setDiscountFixed(Number(prop.discount_fixed));
        setTaxPercent(Number(prop.tax_percent));
        setLanguage((prop as any).language || "pt");
        setShareToken((prop as any).share_token || null);
        const pt2 = (prop as any).payment_terms;
        if (pt2 && pt2.installments) {
          setPaymentTerms(pt2.installments);
        } else if (segment === "b2b") {
          setPaymentTerms([...DEFAULT_B2B_PAYMENT_TERMS]);
        } else {
          setPaymentTerms([]);
        }
        const as = (prop as any).atmos_service;
        if (as) {
          setAtmosService({ price_per_person_day: as.price_per_person_day || 0, description: as.description || "", internal_costs: (as.internal_costs || []).map((ic: any) => ({ description: ic.description || "", amount: Number(ic.amount) || 0, days: ic.days || 1, unit_amount: ic.unit_amount !== undefined ? Number(ic.unit_amount) : (Number(ic.amount) || 0) })) });
          setNumCourtesies(as.num_courtesies || 0);
        }
      }
      const { data: dayItems } = await db.from("proposal_day_items").select("*").eq("proposal_id", proposalId).order("day_number, item_index");
      if (dayItems && dayItems.length > 0) {
        const cats = [...new Set(dayItems.map((d: any) => d.category))] as string[];
        // Map legacy categories to new names
        const mappedCats = cats.map((c) => LEGACY_CATEGORY_MAP[c] || c);
        const merged = [...new Set([...mappedCats, ...DEFAULT_CATEGORIES])];
        setCategories(merged);
        const vtMap: Record<number, string> = {};
        dayItems.forEach((d: any) => {
          if (d.vehicle_type && d.vehicle_type !== 'carroTurista') {
            vtMap[d.day_number] = d.vehicle_type;
          }
        });
        setDayVehicleType(vtMap);
        const loaded = dayItems.map((d: any) => ({
          day_number: d.day_number,
          day_label: d.day_label || `Dia ${d.day_number}`,
          category: LEGACY_CATEGORY_MAP[d.category] || d.category,
          item_name: d.item_name || "",
          value: Number(d.value) || 0,
          cost: Number(d.cost_price) || 0,
          comissao: Number(d.commission_percent) || 0,
          value_text: d.value_text || "",
          description: d.description || "",
          catalog_item_id: d.catalog_item_id,
          variation_id: d.variation_id || null,
          item_index: d.item_index || 0,
          vehicle_type: d.vehicle_type || undefined,
          qty: d.quantity || 1,
          supplier_id: d.supplier_id || null,
        }));
        // Re-index items to be globally sequential per day
        const byDay = new Map<number, typeof loaded>();
        loaded.forEach(item => {
          if (!byDay.has(item.day_number)) byDay.set(item.day_number, []);
          byDay.get(item.day_number)!.push(item);
        });
        byDay.forEach(items => {
          items.sort((a, b) => a.item_index - b.item_index);
          items.forEach((item, i) => { item.item_index = i; });
        });
        gridJustLoadedRef.current = true;
        // Detect manually-edited values: compare saved value vs catalog expected value
        const manualKeys = new Set<string>();
        if (catalogItems.length > 0) {
          loaded.forEach(item => {
            if (!item.catalog_item_id) return;
            const prod = catalogItems.find((c: any) => c.id === item.catalog_item_id);
            if (!prod) return;
            const vars = (prod.variables || {}) as Record<string, unknown>;
            const isTransferOrDrone = (prod.category === "transfer" || prod.category === "drone");
            const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
            const savedValue = item.value || 0;
            if (pricingType === "total" && numPeople > 0) {
              const expectedValue = Math.round((Number(prod.unit_price) / numPeople) * 100) / 100;
              if (Math.abs(savedValue - expectedValue) > 0.01) {
                manualKeys.add(`${item.day_number}_${item.item_index}`);
              }
            } else if (item.category === "Diária Guia ATMOS") {
              // Guide items: mark as manual if value differs from catalog default
              const catalogValue = Number(prod.unit_price) || 0;
              if (Math.abs(savedValue - catalogValue) > 0.01) {
                manualKeys.add(`${item.day_number}_${item.item_index}`);
              }
            }
          });
        }
        manualValueKeysRef.current = manualKeys;
        setGrid(loaded);
      }
      const { data: costsData } = await db.from("proposal_costs").select("*").eq("proposal_id", proposalId);
      if (costsData && costsData.length > 0) {
        setCostItems(costsData.map((c: any) => ({ id: c.id, description: c.description, amount: Number(c.amount), days: 1, unit_amount: Number(c.amount), account_id: c.account_id })));
      }
      // Load day descriptions
      const { data: dayDescs } = await db.from("proposal_days").select("day_number, description").eq("proposal_id", proposalId);
      if (dayDescs && dayDescs.length > 0) {
        const map: Record<number, string> = {};
        dayDescs.forEach((d: any) => { map[d.day_number] = d.description || ""; });
        setDayDescriptions(map);
      } else {
        setDayDescriptions({});
      }
      // Load proposal accommodations
      const { data: accData } = await db.from("proposal_accommodations").select("*").eq("proposal_id", proposalId);
      if (accData && accData.length > 0) {
        const loadedAccs: ProposalAccommodation[] = accData.map((a: any) => {
          const product = catalogItems.find((c: any) => c.id === a.product_id);
          const catalogConfigs = product ? normalizeRoomConfigs((product.variables || {}).room_modalities) : [];
          const roomsRaw = a.rooms || {};
          // New multi-unit format: array of unit configs
          let unit_configs: any[] = [];
          if (Array.isArray(roomsRaw)) {
            // Could be array of unit configs (new) or old flat modality array
            if (roomsRaw.length > 0 && roomsRaw[0].rooms) {
              unit_configs = roomsRaw.map((u: any) => ({
                unit_label: u.unit_label || "",
                total_units: u.total_units || 0,
                max_capacity: u.max_capacity || 1,
                rooms: (u.rooms || []).map((r: any) => ({
                  type: r.type || "", capacity: r.capacity || 1, units: r.units || 0,
                  price: r.price || 0, cost: r.cost || 0, pricing_type: r.pricing_type || "per_room",
                  available: r.available !== false,
                })),
              }));
            } else {
              // Old flat array of rooms
              unit_configs = [{
                unit_label: "", total_units: 0, max_capacity: 1,
                rooms: roomsRaw.map((r: any) => ({
                  type: r.type || "", capacity: r.capacity || 1, units: r.units || 0,
                  price: r.price || 0, cost: r.cost || 0, pricing_type: r.pricing_type || "per_room",
                  available: r.available !== false,
                })),
              }];
            }
          } else if (roomsRaw.modalities) {
            // Old single-unit wrapped format
            unit_configs = [{
              unit_label: roomsRaw.unit_label || "",
              total_units: roomsRaw.total_units || 0,
              max_capacity: roomsRaw.max_capacity || 1,
              rooms: (roomsRaw.modalities as any[]).map((r: any) => ({
                type: r.type || "", capacity: r.capacity || 1, units: r.units || 0,
                price: r.price || 0, cost: r.cost || 0, pricing_type: r.pricing_type || "per_room",
                available: r.available !== false,
              })),
            }];
          }
          const vars = (product?.variables || {}) as Record<string, unknown>;
          const commPct = Number(vars.comissao) || 0;
          return {
            id: a.id,
            product_id: a.product_id,
            product_name: product?.name || "Hospedagem",
            checkin_date: a.checkin_date || "",
            checkout_date: a.checkout_date || "",
            num_nights: a.num_nights || 1,
            unit_configs,
            notes: a.notes || "",
            is_selected: a.is_selected !== false,
            payment_type: (a as any).payment_type === "atmos" ? "atmos" as const : "hospedagem" as const,
            _catalog_configs: catalogConfigs,
            _commission_percent: commPct,
          };
        });
        setProposalAccommodations(loadedAccs);
      } else {
        setProposalAccommodations([]);
      }
      setIsDirty(false);
    })();
  }, [open, proposalId, initialProspectId]);

  useEffect(() => {
    if (open && !proposalId) initializeGrid();
  }, [numDays, categories, open, proposalId, initializeGrid]);

  // Enrich grid items with missing costs after catalog data loads (for existing proposals)
  // Use a separate ref to track if we already enriched once after loading from DB
  const enrichedOnceRef = useRef(false);
  useEffect(() => {
    if (!open) { enrichedOnceRef.current = false; return; }
    // For existing proposals, the saved data is truth — never enrich from catalog
    if (proposalId) { enrichedOnceRef.current = true; return; }
    enrichedOnceRef.current = true;
  }, [open, proposalId]);

  // Normalize legacy/wrong qty for "total" pricing items (transfer/drone): qty must track group size
  // This effect ONLY runs for NEW proposals (no proposalId). For existing proposals,
  // the numPeople change effect (below) handles recalculation.
  useEffect(() => {
    if (!open || numPeople <= 0 || grid.length === 0 || catalogItems.length === 0) return;
    // Never run for existing proposals — their grid was loaded from DB and is the source of truth
    if (proposalId) return;

    let changed = false;
    setGrid((prev) => {
      const normalized = prev.map((cell) => {
        if (!cell.catalog_item_id) return cell;
        const prod = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
        if (!prod) return cell;

        const vars = (prod.variables || {}) as Record<string, unknown>;
        const isTransferOrDrone = (prod.category === "transfer" || prod.category === "drone");
        const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
        if (pricingType !== "total") return cell;

        const nextQty = numPeople;
        const costBase = Number(prod.cost_price) || Number(prod.unit_price);
        const nextCost = Math.round((costBase / numPeople) * 100) / 100;
        const nextValue = Math.round((Number(prod.unit_price) / numPeople) * 100) / 100;
        if (
          cell.qty === nextQty &&
          Math.abs((cell.value || 0) - nextValue) < 0.005 &&
          Math.abs((cell.cost || 0) - nextCost) < 0.005
        ) {
          return cell;
        }

        changed = true;
        return { ...cell, qty: nextQty, value: nextValue, cost: nextCost };
      });

      return changed ? normalized : prev;
    });
  }, [open, numPeople, catalogItems, grid.length, proposalId]);

  // When numPeople changes, update qty AND recalculate "valor total" items
  useEffect(() => {
    if (numPeople === prevNumPeople) return;
    const totalGrupo = numPeople + numCourtesies;
    let limitWarning = false;
    setGrid((g) =>
      g.map((cell) => {
        // Always update qty to match numPeople, except guide items (they have vehicle-based logic)
        const skipQtySync = cell.category === "Diária Guia ATMOS";
        const updated = skipQtySync ? { ...cell } : { ...cell, qty: numPeople };
        if (cell.catalog_item_id) {
          const prod = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
          if (prod) {
            const vars = (prod.variables || {}) as Record<string, unknown>;
            const isTransferOrDrone = (prod.category === "transfer" || prod.category === "drone");
            const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
            if (pricingType === "total" && numPeople > 0) {
              const limite = Number(vars.limitePessoas) || Number(vars.maxPessoas) || 0;
              if (limite > 0 && numPeople > limite) limitWarning = true;
              updated.qty = numPeople;
              const cellKey = `${cell.day_number}_${cell.item_index}`;
              const isManualByRef = manualValueKeysRef.current.has(cellKey);
              // Also detect manual inline: if current value doesn't match what catalog would give for prevNumPeople
              const expectedPrevValue = prevNumPeople > 0 ? Math.round((Number(prod.unit_price) / prevNumPeople) * 100) / 100 : 0;
              const isManualInline = prevNumPeople > 0 && Math.abs((cell.value || 0) - expectedPrevValue) > 0.01;
              const isManual = isManualByRef || isManualInline;
              if (!isManual) {
                updated.value = Math.round((Number(prod.unit_price) / numPeople) * 100) / 100;
              }
              const currentCostTotal = (cell.cost || 0) * (cell.qty || 1);
              updated.cost = currentCostTotal > 0 ? Math.round((currentCostTotal / numPeople) * 100) / 100 : Math.round(((Number(prod.cost_price) || Number(prod.unit_price)) / numPeople) * 100) / 100;
            }
          }
        }
        // Recalculate guide prices based on new group size
        if (cell.category === "Diária Guia ATMOS" && cell.catalog_item_id) {
          const cellKey = `${cell.day_number}_${cell.item_index}`;
          const isManualByRef = manualValueKeysRef.current.has(cellKey);
          // Inline detection for guides: if value differs from what guide sale price would have been for prev group
          const waterfallId = getWaterfallForDay(cell.day_number);
          let isManualInline = false;
          if (waterfallId && prevNumPeople > 0) {
            const waterfallProductPrev = catalogItems.find((c: any) => c.id === waterfallId);
            const vtPrev = dayVehicleType[cell.day_number] || "carroTurista";
            const prevExpectedSale = getGuideSalePrice(waterfallProductPrev, vtPrev, prevNumPeople);
            if (prevExpectedSale > 0 && Math.abs((cell.value || 0) - prevExpectedSale) > 0.01) {
              isManualInline = true;
            }
          }
          const isManualGuide = isManualByRef || isManualInline;
          if (waterfallId) {
            const waterfallProduct = catalogItems.find((c: any) => c.id === waterfallId);
            const vt = dayVehicleType[cell.day_number] || "carroTurista";
            if (!isManualGuide) {
              const salePrice = getGuideSalePrice(waterfallProduct, vt, numPeople);
              if (salePrice > 0) updated.value = salePrice;
            }
            const gwp = gwpMap.get(`${cell.catalog_item_id}__${waterfallId}`);
            if (gwp) {
              const guideCost = getGuidePrice(gwp, vt, numPeople);
              if (guideCost > 0) updated.cost = guideCost;
            }
          }
        }
        return updated;
      })
    );
    if (limitWarning) {
      toast({ title: "Atenção", description: `O número de pessoas no grupo (${numPeople}) excede o limite permitido de algum produto.`, variant: "destructive" });
    }
    // Check accommodation mismatch
    if (proposalAccommodations.length > 0) {
      const accPeople = proposalAccommodations
        .filter(a => a.is_selected)
        .reduce((s, a) => s + a.unit_configs.reduce((us, u) =>
          us + u.rooms.filter(r => r.available).reduce((rs, r) => rs + r.units * r.capacity, 0), 0), 0);
      if (accPeople > 0 && accPeople !== numPeople) {
        toast({
          title: "⚠️ Hospedagem desatualizada",
          description: `A hospedagem está configurada para ${accPeople} pessoas, mas a proposta agora tem ${numPeople}. Reconfigure os quartos.`,
          variant: "destructive",
        });
      }
    }
    setPrevNumPeople(numPeople);
  }, [numPeople]);

  // When numCourtesies changes, recalculate "valor total" items
  useEffect(() => {
    const totalGrupo = numPeople + numCourtesies;
    if (totalGrupo <= 0) return;
    let limitWarning = false;
    setGrid((g) =>
      g.map((cell) => {
        if (!cell.catalog_item_id) return cell;
        const prod = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
        if (!prod) return cell;
        const vars = (prod.variables || {}) as Record<string, any>;
        const isTransferOrDrone = (prod.category === "transfer" || prod.category === "drone");
        const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
        if (pricingType !== "total" || numPeople <= 0) return cell;

        let basePrice = Number(prod.unit_price);
        let baseCost = Number(prod.cost_price) || basePrice;

        if (cell.variation_id) {
          const v = (vars.variations || []).find((vx: any) => vx.id === cell.variation_id);
          if (v) {
            basePrice = Number(v.unit_price);
            baseCost = Number(v.cost_price);
          }
        }

        const limite = Number(vars.limitePessoas) || Number(vars.maxPessoas) || 0;
        if (limite > 0 && numPeople > limite) limitWarning = true;
        
        return { 
          ...cell, 
          value: Math.round((basePrice / numPeople) * 100) / 100, 
          cost: Math.round((baseCost / numPeople) * 100) / 100 
        };
      })
    );
    if (limitWarning) {
      toast({ title: "Atenção", description: `O número de pessoas no grupo (${numPeople}) excede o limite permitido de algum produto.`, variant: "destructive" });
    }
  }, [numCourtesies]);

  // ─── Cell operations ──────────────────────────────────────────────
  const updateCell = (dayNum: number, cat: string, itemIdx: number, patch: Partial<DayItem>, isUserEdit = false) => {
    setIsDirty(true);
    // Track manual value edits — only when the user actually types a value
    if (isUserEdit && 'value' in patch) {
      manualValueKeysRef.current.add(`${dayNum}_${itemIdx}`);
    }
    setGrid((g) =>
      g.map((cell) => {
        if (cell.day_number !== dayNum || cell.category !== cat || cell.item_index !== itemIdx) return cell;
        const updated = { ...cell, ...patch };
        // When user manually changes qty on a "total" priced item, recalculate value & cost per new qty
        if (isUserEdit && 'qty' in patch && cell.catalog_item_id) {
          const prod = catalogItems.find((c: any) => c.id === cell.catalog_item_id);
          if (prod) {
              const vars = (prod.variables || {}) as Record<string, any>;
              const isTransferOrDrone = (prod.category === "transfer" || prod.category === "drone");
              const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
              if (pricingType === "total" && updated.qty > 0) {
                const cellKey = `${dayNum}_${itemIdx}`;
                const isManual = manualValueKeysRef.current.has(cellKey);
                
                let basePrice = Number(prod.unit_price);
                let baseCost = Number(prod.cost_price) || basePrice;

                if (cell.variation_id) {
                  const v = (vars.variations || []).find((vx: any) => vx.id === cell.variation_id);
                  if (v) {
                    basePrice = Number(v.unit_price);
                    baseCost = Number(v.cost_price);
                  }
                }

                if (!isManual) {
                  updated.value = Math.round((basePrice / updated.qty) * 100) / 100;
                }
                const currentCostTotal = (cell.cost || 0) * (cell.qty || 1);
                updated.cost = currentCostTotal > 0 ? Math.round((currentCostTotal / updated.qty) * 100) / 100 : Math.round((baseCost / updated.qty) * 100) / 100;
            }
          }
        }
        return updated;
      })
    );
  };

  const addCellItem = (dayNum: number, cat: string, blockLastIndex?: number) => {
    setIsDirty(true);
    setGrid((prev) => {
      const dayItems = prev.filter(c => c.day_number === dayNum);
      const maxIdx = dayItems.length > 0 ? Math.max(...dayItems.map(e => e.item_index)) : -1;

      if (blockLastIndex !== undefined) {
        // Insert right after the block's last item — shift everything after it
        const shifted = prev.map(c => {
          if (c.day_number === dayNum && c.item_index > blockLastIndex) {
            return { ...c, item_index: c.item_index + 1 };
          }
          return c;
        });
        return [...shifted, newDayItem(dayNum, cat, blockLastIndex + 1, numPeople)];
      } else {
        // Append at the end of the day (new block)
        return [...prev, newDayItem(dayNum, cat, maxIdx + 1, numPeople)];
      }
    });
  };

  const removeCellItem = (dayNum: number, cat: string, itemIdx: number) => {
    setIsDirty(true);
    setGrid((g) => g.filter((c) => !(c.day_number === dayNum && c.category === cat && c.item_index === itemIdx)));
  };

  const reorderItems = (dayNum: number, oldIndex: number, newIndex: number) => {
    setGrid((g) => {
      const dayItems = g.filter((c) => c.day_number === dayNum).sort((a, b) => a.item_index - b.item_index);
      const otherItems = g.filter((c) => c.day_number !== dayNum);
      const reordered = arrayMove(dayItems, oldIndex, newIndex);
      reordered.forEach((item, i) => { item.item_index = i; });
      return [...otherItems, ...reordered];
    });
  };

  const applyItemToDays = (cell: DayItem, targetDays: number[]) => {
    setGrid((g) => {
      let updated = [...g];
      for (const d of targetDays) {
        if (d === cell.day_number) continue;
        const dayItems = updated.filter((c) => c.day_number === d);
        const maxIdx = dayItems.length > 0 ? Math.max(...dayItems.map((e) => e.item_index)) : -1;
        updated.push({
          ...cell,
          day_number: d,
          day_label: `Dia ${d}`,
          item_index: maxIdx + 1,
        });
      }
      return updated;
    });
  };

  const selectVariation = (dayNum: number, cat: string, itemIdx: number, vId: string) => {
    const current = grid.find(c => c.day_number === dayNum && c.category === cat && c.item_index === itemIdx);
    if (!current?.catalog_item_id) return;
    const product = catalogItems.find(c => c.id === current.catalog_item_id);
    if (!product) return;
    const variations = (product.variables?.variations || []) as any[];
    const v = variations.find(x => x.id === vId);
    if (!v) return;

    updateCell(dayNum, cat, itemIdx, {
      variation_id: vId,
      item_name: v.name,
      value: Number(v.unit_price),
      cost: Number(v.cost_price),
      supplier_id: v.supplier_id || product.supplier_id
    });
  };

  const selectCatalogItem = (dayNum: number, cat: string, itemIdx: number, catalogId: string) => {
    const vt = dayVehicleType[dayNum] || "carroTurista";
    const currentItem = grid.find((c) => c.day_number === dayNum && c.category === cat && c.item_index === itemIdx);
    const itemQty = currentItem?.qty || numPeople;

    if (cat === "Diária Guia ATMOS") {
      const guide = guides.find((g: any) => g.id === catalogId);
      if (!guide) return;
      const waterfallId = getWaterfallForDay(dayNum);
      let salePrice = Number(guide.daily_rate) || 0;
      let guideCost = salePrice;
      if (waterfallId) {
        const waterfallProduct = catalogItems.find((c: any) => c.id === waterfallId);
        salePrice = getGuideSalePrice(waterfallProduct, vt, itemQty) || salePrice;
        const gwp = gwpMap.get(`${catalogId}__${waterfallId}`);
        if (gwp) {
          guideCost = getGuidePrice(gwp, vt, itemQty);
        }
      }
      updateCell(dayNum, cat, itemIdx, { catalog_item_id: catalogId, item_name: guide.name, value: salePrice, cost: guideCost });
      return;
    }

    if (cat === "Cachoeira / Ingresso") {
      const item = catalogItems.find((c: any) => c.id === catalogId);
      if (!item) return;
      updateCell(dayNum, cat, itemIdx, { catalog_item_id: catalogId, item_name: item.name, value: Number(item.unit_price), cost: Number(item.unit_price) });
      // Recalculate guide prices for this day
      const guiaItems = grid.filter((c) => c.day_number === dayNum && c.category === "Diária Guia ATMOS");
      guiaItems.forEach((gi) => {
        const salePrice = getGuideSalePrice(item, vt, gi.qty) || gi.value;
        if (gi.catalog_item_id) {
          const gwp = gwpMap.get(`${gi.catalog_item_id}__${catalogId}`);
          const guideCost = gwp ? getGuidePrice(gwp, vt, gi.qty) : gi.cost;
          updateCell(dayNum, "Diária Guia ATMOS", gi.item_index, { value: salePrice, cost: guideCost });
        } else {
          updateCell(dayNum, "Diária Guia ATMOS", gi.item_index, { value: salePrice });
        }
      });
      return;
    }

    const item = catalogItems.find((c: any) => c.id === catalogId);
    if (item) {
      // Handle variations if present
      const variations = (item.variables?.variations || []) as any[];
      if (variations.length > 0) {
        const v = variations[0];
        updateCell(dayNum, cat, itemIdx, {
          catalog_item_id: catalogId,
          variation_id: v.id,
          item_name: v.name,
          value: Number(v.unit_price),
          cost: Number(v.cost_price),
          comissao: Number(item.variables?.comissao) || 0,
          supplier_id: v.supplier_id || item.supplier_id
        });
        return;
      }

      const vars = (item.variables || {}) as Record<string, unknown>;
      const limite = Number(vars.limitePessoas) || Number(vars.maxPessoas) || 0;
      if (limite > 0 && numPeople > limite) {
        toast({ title: "Ação bloqueada", description: `Número de pessoas no grupo (${numPeople}) excede o limite permitido (${limite}).`, variant: "destructive" });
        return;
      }

      const isTransferOrDrone = (item.category === "transfer" || item.category === "drone");
      const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
      const unitPrice = Number(item.unit_price);
      const costPrice = Number(item.cost_price) || 0;
      const costBase = costPrice > 0 ? costPrice : unitPrice;
      const saleValue = pricingType === "total" && numPeople > 0
        ? Math.round((unitPrice / numPeople) * 100) / 100
        : unitPrice;
      const itemCost = pricingType === "total" && numPeople > 0
        ? Math.round((costBase / numPeople) * 100) / 100
        : costBase;

      const comissao = Number(vars.comissao) || 0;
      updateCell(dayNum, cat, itemIdx, { catalog_item_id: catalogId, item_name: item.name, value: saleValue, cost: itemCost, comissao });
    }
  };

  const handleVehicleTypeChange = (dayNum: number, vt: string) => {
    setDayVehicleType((prev) => ({ ...prev, [dayNum]: vt }));
    const waterfallId = getWaterfallForDay(dayNum);
    if (waterfallId) {
      const waterfallProduct = catalogItems.find((c: any) => c.id === waterfallId);
      setGrid((g) =>
        g.map((cell) => {
          if (cell.day_number === dayNum && cell.category === "Diária Guia ATMOS" && cell.catalog_item_id) {
            const salePrice = getGuideSalePrice(waterfallProduct, vt, cell.qty) || cell.value;
            const gwp = gwpMap.get(`${cell.catalog_item_id}__${waterfallId}`);
            const guideCost = gwp ? getGuidePrice(gwp, vt, cell.qty) : cell.cost;
            return { ...cell, value: salePrice, cost: guideCost };
          }
          return cell;
        })
      );
    }
  };

  const addCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    setCategories([...categories, newCategory.trim()]);
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
    setGrid((g) => g.filter((cell) => cell.category !== cat));
  };

  const addDay = () => {
    const newDay = numDays + 1;
    setNumDays(newDay);
    // Don't pre-populate — user adds items on demand
  };

  const removeDay = () => {
    if (numDays <= 1) return;
    setGrid((g) => g.filter((cell) => cell.day_number !== numDays));
    setNumDays(numDays - 1);
  };

  const applyReadyItinerary = (itineraryId: string) => {
    const itin = itineraries.find((it) => it.id === itineraryId);
    if (!itin) return;
    setSelectedItineraryId(itineraryId);
    setNumDays(itin.duration);

    const newGrid: DayItem[] = [];
    for (let d = 1; d <= itin.duration; d++) {
      const day = itin.days[d - 1];
      // Find matching waterfall product by imageKey (source_id)
      const waterfallProduct = catalogItems.find(
        (c: any) => c.type === "waterfall" && c.source_id === day.imageKey
      );

      let idx = 0;

      // Add Cachoeira / Ingresso — always
      newGrid.push({
        day_number: d,
        day_label: day.title.pt,
        category: "Cachoeira / Ingresso",
        item_name: waterfallProduct?.name || day.title.pt,
        value: day.entranceFee,
        cost: day.entranceFee,
        comissao: 0,
        value_text: "",
        description: "",
        catalog_item_id: waterfallProduct?.id || null,
        item_index: idx++,
        qty: numPeople,
      });

      // Add Diária Guia ATMOS — always (pre-fill sale price if waterfall known)
      if (waterfallProduct) {
        const vt = dayVehicleType[d] || "carroTurista";
        const guideSalePrice = getGuideSalePrice(waterfallProduct, vt, numPeople);
        newGrid.push({
          ...newDayItem(d, "Diária Guia ATMOS", idx++, numPeople),
          day_label: day.title.pt,
          value: guideSalePrice,
        });
      } else {
        newGrid.push({
          ...newDayItem(d, "Diária Guia ATMOS", idx++, numPeople),
          day_label: day.title.pt,
        });
      }

      // Do NOT add other categories (Hospedagem, Lanche, Transfer, etc.)
      // unless explicitly part of this itinerary. User adds them on demand.
    }
    setGrid(newGrid);
  };

  const dayTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let d = 1; d <= numDays; d++) {
      totals[d] = grid.filter((c) => c.day_number === d).reduce((s, c) => s + c.value * c.qty, 0);
    }
    return totals;
  }, [grid, numDays]);

  const catTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    categories.forEach((cat) => {
      totals[cat] = grid.filter((c) => c.category === cat).reduce((s, c) => s + c.value * c.qty, 0);
    });
    return totals;
  }, [grid, categories]);

  const subtotal = useMemo(() => grid.reduce((s, c) => {
    return s + c.value * c.qty;
  }, 0), [grid]);
  const discountValue = subtotal * (discountPercent / 100) + discountFixed;
  const afterDiscount = subtotal - discountValue;
  const numPaying = Math.max(numPeople - numCourtesies, 0);

  // Atmos revenue on FULL group
  const atmosRevenue = atmosService.price_per_person_day * numPeople * numDays;

  // Accommodation totals + variants
  const accTotals = useMemo(() => calcAccommodationTotals(proposalAccommodations), [proposalAccommodations]);
  const accVariants = useMemo(() => getAccommodationVariants(proposalAccommodations), [proposalAccommodations]);

  // Group total before tax: items + atmos + ATMOS-type accommodation revenue - discounts
  const groupTotalPreTax = afterDiscount + atmosRevenue + accTotals.atmosRevenue;
  const pricePerPersonPreTax = numPeople > 0 ? (afterDiscount + atmosRevenue) / numPeople : (afterDiscount + atmosRevenue);
  const courtesyCost = pricePerPersonPreTax * numCourtesies;

  // Base per person WITHOUT accommodation (for variant calculation)
  const basePerPerson = numPeople > 0 ? (afterDiscount + atmosRevenue) / numPeople : 0;

  // NF base = what paying clients actually pay before tax
  const nfBase = numPaying > 0
    ? (accVariants.length > 0
      ? (basePerPerson * numPaying) + accTotals.atmosRevenue - (pricePerPersonPreTax * numCourtesies)
      : pricePerPersonPreTax * numPaying)
    : 0;

  // Tax "por dentro": incide sobre o faturamento total (padrão NF Brasil)
  // Total = Base ÷ (1 - taxa%)  →  taxValue = Total - Base
  const totalCharged = taxPercent > 0 ? nfBase / (1 - taxPercent / 100) : nfBase;
  const taxValue = totalCharged - nfBase;

  // For backward compat: total saved to DB = NF value
  const total = totalCharged;
  const totalWithAtmosFull = groupTotalPreTax; // for UI category breakdown
  const pricePerPerson = numPaying > 0 ? totalCharged / numPaying : pricePerPersonPreTax;

  const atmosInternalCosts = atmosService.internal_costs.reduce((s, c) => s + c.amount, 0);

  // ─── Unified profit analysis ──────────────────────────────────────
  type ItemProfit = { cell: DayItem; revenue: number; cost: number; commission: number; profit: number };

  const profitAnalysis = useMemo(() => {
    let totalItemRevenue = 0;
    let totalItemCost = 0;
    let totalCommission = 0;
    const perItem: ItemProfit[] = [];

    for (const cell of grid) {
      // Skip "Hospedagem" items — they are accounted for via accTotals
      if (cell.category === "Hospedagem") continue;
      const effCost = getEffectiveCost(cell);
      const rev = cell.value * cell.qty;
      const cost = effCost * cell.qty;
      const comm = cost * (cell.comissao / 100);
      const profit = rev - cost + comm;

      totalItemRevenue += rev;
      totalItemCost += cost;
      totalCommission += comm;

      perItem.push({ cell, revenue: rev, cost, commission: comm, profit });
    }

    return { totalItemRevenue, totalItemCost, totalCommission, perItem };
  }, [grid, getEffectiveCost]);

  const totalCosts = costItems.reduce((s, c) => s + c.amount, 0);
  const commissionValue = totalCharged * (partnerCommission / 100);
  const grossProfit = profitAnalysis.totalItemRevenue + atmosRevenue
    - profitAnalysis.totalItemCost + profitAnalysis.totalCommission
    + (accTotals.atmosRevenue - accTotals.atmosCost + accTotals.atmosCommission)
    + accTotals.hospedagemCommission
    - atmosInternalCosts - totalCosts - commissionValue - courtesyCost - discountValue;
  const totalRevenue = totalCharged;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const atmosInsufficient = atmosRevenue < (totalCosts + taxValue) && (totalCosts + taxValue) > 0;

  // ─── Save ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Generate slug from title
      const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      const baseSlug = slugify(title);
      const mainGuideId = grid.find(c => c.category === "Diária Guia ATMOS" && c.catalog_item_id)?.catalog_item_id || null;

      const payload: Record<string, unknown> = {
        title, status, segment,
        contract_status: contractStatus || null,
        payment_status: paymentStatus || null,
        prospect_id: prospectId || null,
        seller_id: sellerId || null,
        guide_id: mainGuideId,
        subtotal, discount_percent: discountPercent, discount_fixed: discountFixed,
        tax_percent: taxPercent, total,
        notes: notes || null, valid_until: validUntil || null,
        num_people: numPeople, num_days: numDays,
        start_date: startDate || null,
        end_date: endDate || null,
        language,
        atmos_service: { ...atmosService, num_courtesies: numCourtesies },
        slug: baseSlug || null,
        payment_terms: paymentTerms.length > 0 ? { installments: paymentTerms } : null,
      };

      let propId = proposalId;
      if (propId) {
        const { error } = await db.from("proposals").update(payload).eq("id", propId);
        if (error) throw error;
        await db.from("proposal_day_items").delete().eq("proposal_id", propId);
      } else {
        const { data, error } = await db.from("proposals").insert(payload).select("id").single();
        if (error) throw error;
        propId = data.id;
      }

      if (grid.length > 0) {
        const itemsPayload = grid
          .filter((c) => c.value > 0 || (c.item_name && c.item_name.trim()))
          .map((c) => ({
            proposal_id: propId!,
            day_number: c.day_number,
            day_label: c.day_label,
            category: c.category,
            item_name: c.item_name || "",
            value: c.value,
            value_text: c.value_text || null,
            description: c.description || null,
            catalog_item_id: c.catalog_item_id || null,
            variation_id: c.variation_id || null,
            item_index: c.item_index,
            vehicle_type: dayVehicleType[c.day_number] || "carroTurista",
            quantity: c.qty,
            cost_price: c.cost,
            commission_percent: c.comissao,
            supplier_id: c.supplier_id || null,
          }));
        if (itemsPayload.length > 0) {
          const { error } = await db.from("proposal_day_items").insert(itemsPayload);
          if (error) throw error;
        }
      }

      await db.from("proposal_costs").delete().eq("proposal_id", propId);
      if (costItems.length > 0) {
        const costsPayload = costItems.filter((c) => c.amount > 0 || c.description).map((c) => ({
          proposal_id: propId!,
          description: c.description,
          amount: c.amount,
          account_id: c.account_id || null,
        }));
        if (costsPayload.length > 0) {
          const { error } = await db.from("proposal_costs").insert(costsPayload);
          if (error) throw error;
        }
      }

      // Save day descriptions
      await db.from("proposal_days").delete().eq("proposal_id", propId);
      const dayDescsPayload = Object.entries(dayDescriptions)
        .filter(([, desc]) => desc && desc.trim())
        .map(([dayNum, description]) => ({
          proposal_id: propId!,
          day_number: parseInt(dayNum),
          description,
        }));
      if (dayDescsPayload.length > 0) {
        const { error } = await db.from("proposal_days").insert(dayDescsPayload);
        if (error) throw error;
      }

      // Save proposal accommodations
      await db.from("proposal_accommodations").delete().eq("proposal_id", propId);
      if (proposalAccommodations.length > 0) {
        const accPayload = proposalAccommodations.map((a) => ({
          proposal_id: propId!,
          product_id: a.product_id,
          checkin_date: a.checkin_date || null,
          checkout_date: a.checkout_date || null,
          num_nights: a.num_nights,
          notes: a.notes || "",
          is_selected: a.is_selected,
          payment_type: a.payment_type || "hospedagem",
          rooms: a.unit_configs,
        }));
        const { error } = await db.from("proposal_accommodations").insert(accPayload);
        if (error) throw error;
      }

      // Create financial transactions for "hospedagem" type commissions
      // First delete existing commission transactions for this proposal's accommodations
      await db.from("financial_transactions").delete()
        .eq("proposal_id", propId)
        .like("description", "Comissão hospedagem:%");

      const hospedagemAccs = proposalAccommodations.filter(a => a.is_selected && a.payment_type === "hospedagem" && (a._commission_percent || 0) > 0);
      if (hospedagemAccs.length > 0) {
        const code = (await db.from("proposals").select("code").eq("id", propId).single()).data?.code || "";
        const txPayload = hospedagemAccs.map(a => {
          let accCost = 0;
          for (const unit of a.unit_configs) {
            for (const room of unit.rooms) {
              if (!room.available) continue;
              if (room.pricing_type === "per_person") {
                accCost += room.units * room.capacity * room.cost * a.num_nights;
              } else {
                accCost += room.units * room.cost * a.num_nights;
              }
            }
          }
          const commission = accCost * ((a._commission_percent || 0) / 100);
          return {
            type: "receivable",
            description: `Comissão hospedagem: ${a.product_name} — ${code}`,
            amount: commission,
            due_date: a.checkin_date || startDate || new Date().toISOString().slice(0, 10),
            proposal_id: propId!,
            prospect_id: prospectId || null,
            status: "pending",
          };
        }).filter(t => t.amount > 0);
        if (txPayload.length > 0) {
          await db.from("financial_transactions").insert(txPayload);
        }
      }

      if (prospectId) {
        // Update prospect name if title follows pattern "Proposta — Name"
        const prospectUpdate: Record<string, unknown> = {};
        const match = title.match(/^Proposta\s*[—–-]\s*(.+)$/i);
        if (match) prospectUpdate.name = match[1].trim();
        if (Object.keys(prospectUpdate).length > 0) {
          await db.from("prospects").update(prospectUpdate).eq("id", prospectId);
        }

        // Update linked quote_request or imersao_lead with proposal data
        const { data: prospect } = await db.from("prospects").select("email, segment").eq("id", prospectId).maybeSingle();
        if (prospect?.email) {
          if (prospect.segment === "b2c") {
            const { data: qr } = await db.from("quote_requests")
              .select("id, answers")
              .eq("user_email", prospect.email)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (qr) {
              const existingAnswers = (typeof qr.answers === "object" && qr.answers) ? qr.answers : {};
              const updatedAnswers = {
                ...existingAnswers,
                groupSize: String(numPeople),
                startDate: startDate || (existingAnswers as any).startDate || "",
                endDate: endDate || (existingAnswers as any).endDate || "",
                numDays: String(numDays),
              };
              await db.from("quote_requests").update({ answers: updatedAnswers }).eq("id", qr.id);
            }
          } else {
            const { data: il } = await db.from("imersao_leads")
              .select("id")
              .eq("email", prospect.email)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (il) {
              await db.from("imersao_leads").update({
                num_participantes: String(numPeople),
                data_especifica: startDate || null,
                data_especifica_fim: endDate || null,
              }).eq("id", il.id);
            }
          }
        }
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["admin-proposals", segment] });
      onOpenChange(false);
      toast({ title: proposalId ? "Proposta atualizada" : "Proposta criada" });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : (typeof err === "object" && err !== null && "message" in err) ? (err as any).message : JSON.stringify(err);
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    },
  });

  const catalogForCategory = (cat: string) => {
    switch (cat) {
      case "Cachoeira / Ingresso":
        return catalogItems.filter((c: any) => c.type === "waterfall");
      case "Lanche Trilha":
        return catalogItems.filter((c: any) => c.type === "service" && c.category === "lanche");
      case "Transfer":
        return catalogItems.filter((c: any) => c.type === "service" && c.category === "transfer");
      case "Hospedagem":
        return catalogItems.filter((c: any) => c.type === "accommodation");
      case "Experiência":
        return catalogItems.filter((c: any) => c.type === "experience");
      case "Gastronomia":
        return catalogItems.filter((c: any) => c.type === "service" && c.category === "gastronomia");
      default:
        return [];
    }
  };

  // ─── Busy guides (already allocated in other proposals on same date) ───
  const { data: busyGuideData = [] } = useQuery({
    queryKey: ["busy-guides", startDate, proposalId],
    enabled: !!startDate,
    queryFn: async () => {
      const { data } = await db
        .from("proposal_day_items")
        .select("day_number, catalog_item_id, proposal_id, proposals!inner(start_date, id)")
        .eq("category", "Diária Guia ATMOS")
        .not("catalog_item_id", "is", null);
      return data || [];
    },
  });

  const busyGuidesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    busyGuideData.forEach((item: any) => {
      if (item.proposal_id === proposalId) return;
      const propStart = item.proposals?.start_date;
      if (!propStart) return;
      const dateKey = format(addDays(new Date(propStart), item.day_number - 1), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, new Set());
      map.get(dateKey)!.add(item.catalog_item_id);
    });
    return map;
  }, [busyGuideData, proposalId]);

  // Get guides available for a given day (filtered by waterfall + busy check)
  const guidesForDay = useCallback((dayNum: number) => {
    const waterfallId = getWaterfallForDay(dayNum);
    if (!waterfallId) return [];
    const guideIds = waterfallGuideMap.get(waterfallId);
    if (!guideIds) return [];
    const vt = dayVehicleType[dayNum] || "carroTurista";

    // Calculate real date for this day
    let busySet: Set<string> | undefined;
    if (startDate) {
      const dateKey = format(addDays(new Date(startDate), dayNum - 1), "yyyy-MM-dd");
      busySet = busyGuidesMap.get(dateKey);
    }

    return guides.filter((g: any) => {
      if (!guideIds.has(g.id)) return false;
      if (vt === "4x4Atmos" && !g.has_4x4) return false;
      if (busySet && busySet.has(g.id)) return false;
      return true;
    });
  }, [guides, waterfallGuideMap, getWaterfallForDay, dayVehicleType, startDate, busyGuidesMap]);

  // ─── Category totals bar ─────────────────────────────────────────
  const renderCategoryBar = () => {
    const totalWithAtmos = subtotal + atmosRevenue + accTotals.atmosRevenue;
    if (totalWithAtmos === 0) return null;
    return (
      <div className="flex h-3 rounded-full overflow-hidden w-full">
        {categories.map((cat) => {
          const pct = totalWithAtmos > 0 ? ((catTotals[cat] || 0) / totalWithAtmos) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={cat}
              className={`${CATEGORY_COLORS[cat] || "bg-muted-foreground"} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${cat}: R$ ${(catTotals[cat] || 0).toFixed(0)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
        {atmosRevenue > 0 && (
          <div
            className="bg-primary transition-all"
            style={{ width: `${(atmosRevenue / totalWithAtmos) * 100}%` }}
            title={`Serviço ATMOS: R$ ${atmosRevenue.toFixed(0)} (${((atmosRevenue / totalWithAtmos) * 100).toFixed(0)}%)`}
          />
        )}
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ─── Sortable Item Component ──────────────────────────────────────
  const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div className="flex items-center gap-1">
          <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 p-1 text-muted-foreground hover:text-foreground touch-none">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    );
  };

  // ─── Multi-select Replicate Popover ───────────────────────────────
  const ReplicatePopover = ({ cell, numDays, dayNum }: { cell: DayItem; numDays: number; dayNum: number }) => {
    const [selected, setSelected] = useState<number[]>([]);
    const otherDays = Array.from({ length: numDays }, (_, i) => i + 1).filter((d) => d !== dayNum);
    const allSelected = otherDays.length > 0 && otherDays.every((d) => selected.includes(d));
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" title="Aplicar a outros dias">
            <Copy className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={() => setSelected(allSelected ? [] : [...otherDays])} />
            <span className="text-xs font-medium">Todos os dias</span>
          </label>
          <div className="border-t border-border pt-1 space-y-1">
            {otherDays.map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selected.includes(d)} onCheckedChange={() => setSelected((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d])} />
                <span className="text-xs">Dia {d}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <Button type="button" size="sm" className="w-full text-xs" onClick={() => { applyItemToDays(cell, selected); setSelected([]); }}>
              Aplicar ({selected.length})
            </Button>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // ─── Vehicle Replicate Popover ────────────────────────────────────
  const VehicleReplicatePopover = ({ dayNum, vehicleType }: { dayNum: number; vehicleType: string }) => {
    const [selected, setSelected] = useState<number[]>([]);
    const otherDays = Array.from({ length: numDays }, (_, i) => i + 1).filter((d) => d !== dayNum);
    const allSelected = otherDays.length > 0 && otherDays.every((d) => selected.includes(d));
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Replicar veículo para outros dias" onClick={(e) => e.stopPropagation()}>
            <Copy className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={() => setSelected(allSelected ? [] : [...otherDays])} />
            <span className="text-xs font-medium">Todos os dias</span>
          </label>
          <div className="border-t border-border pt-1 space-y-1">
            {otherDays.map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selected.includes(d)} onCheckedChange={() => setSelected((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d])} />
                <span className="text-xs">Dia {d}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <Button type="button" size="sm" className="w-full text-xs" onClick={() => { selected.forEach((d) => handleVehicleTypeChange(d, vehicleType)); setSelected([]); }}>
              Aplicar ({selected.length})
            </Button>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // ─── Day Card View ────────────────────────────────────────────────
  const renderDayCard = (dayNum: number) => {
    const isOpen = openDays[dayNum] ?? true;
    const dayTotal = dayTotals[dayNum] || 0;
    const dayItems = grid.filter((c) => c.day_number === dayNum).sort((a, b) => a.item_index - b.item_index);
    const filledCategories = [...new Set(dayItems.filter((it) => it.item_name || it.value > 0).map((it) => it.category))];
    const hasWaterfall = !!getWaterfallForDay(dayNum);

    // Build blocks of consecutive same-category items
    type Block = { category: string; items: DayItem[] };
    const blocks: Block[] = [];
    for (const item of dayItems) {
      if (blocks.length === 0 || blocks[blocks.length - 1].category !== item.category) {
        blocks.push({ category: item.category, items: [item] });
      } else {
        blocks[blocks.length - 1].items.push(item);
      }
    }

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = dayItems.findIndex((it) => `${dayNum}-${it.item_index}` === active.id);
      const newIndex = dayItems.findIndex((it) => `${dayNum}-${it.item_index}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderItems(dayNum, oldIndex, newIndex);
      }
    };

    const sortableIds = dayItems.map((it) => `${dayNum}-${it.item_index}`);

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={(v) => setOpenDays((prev) => ({ ...prev, [dayNum]: v }))}
      >
        <Card className="border-border">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="font-semibold text-sm">Dia {dayNum}{startDate ? (() => { const d = new Date(startDate + "T12:00:00"); d.setDate(d.getDate() + dayNum - 1); return ` — ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`; })() : ""}</span>
                {!isOpen && filledCategories.length > 0 && (
                  <div className="flex gap-1">
                    {filledCategories.map((cat) => (
                      <span key={cat} className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || "bg-muted-foreground"} shrink-0`} title={cat} />
                    ))}
                  </div>
                )}
                {(() => {
                  const hasGuide = grid.some(c => c.day_number === dayNum && c.category === "Diária Guia ATMOS" && c.catalog_item_id);
                  const hasAnyItem = grid.some(c => c.day_number === dayNum && (c.catalog_item_id || c.item_name));
                  if (hasAnyItem && !hasGuide) {
                    return (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Guia não atribuído
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={dayVehicleType[dayNum] || "carroTurista"}
                    onValueChange={(v) => handleVehicleTypeChange(dayNum, v)}
                  >
                    <SelectTrigger
                      className="h-7 text-xs w-[150px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Car className="h-3 w-3 mr-1 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carroTurista">Carro Turista</SelectItem>
                      <SelectItem value="4x4Atmos">4×4 ATMOS</SelectItem>
                    </SelectContent>
                  </Select>
                  <VehicleReplicatePopover dayNum={dayNum} vehicleType={dayVehicleType[dayNum] || "carroTurista"} />
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="tabular-nums text-xs">
                    Total: R$ {dayTotal.toFixed(0)}
                  </Badge>
                  {numPeople > 1 && (
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      R$ {(dayTotal / numPeople).toFixed(0)}/pessoa
                    </div>
                  )}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-3">
              <Textarea
                className="text-sm min-h-[48px] resize-none"
                placeholder="Descreva o dia: roteiro, horários, o que esperar..."
                rows={2}
                value={dayDescriptions[dayNum] || ""}
                onChange={(e) => setDayDescriptions(prev => ({ ...prev, [dayNum]: e.target.value }))}
              />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {blocks.map((block, blockIdx) => {
                    const cat = block.category;
                    const cellItems = block.items;
                    const isGuia = cat === "Diária Guia ATMOS";
                    const catCatalog = isGuia ? [] : catalogForCategory(cat);
                    const dayGuides = isGuia ? guidesForDay(dayNum) : [];
                    const catColor = CATEGORY_COLORS[cat] || "bg-muted-foreground";
                    const lastItemIndex = cellItems[cellItems.length - 1].item_index;

                    return (
                      <div key={blockIdx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${catColor} shrink-0`} />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{cat}</span>
                          {isGuia && !hasWaterfall && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Escolha a Cachoeira primeiro
                            </span>
                          )}
                        </div>
                        {blockIdx === 0 && cellItems.length > 0 && (
                          <div className="grid grid-cols-[1fr_1fr_60px_100px] gap-2 pl-6 pr-[60px]">
                            <span className="text-[10px] text-muted-foreground">Produto</span>
                            <span className="text-[10px] text-muted-foreground">Detalhe</span>
                            <span className="text-[10px] text-muted-foreground text-center">Qtd</span>
                            <span className="text-[10px] text-muted-foreground text-right">Valor R$</span>
                          </div>
                        )}

                        {cellItems.map((cell) => (
                          <SortableItem key={cell.item_index} id={`${dayNum}-${cell.item_index}`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <div className="grid grid-cols-[1fr_1fr_60px_100px] gap-2 items-center flex-1">
                                {isGuia ? (
                                  hasWaterfall ? (
                                    <SearchableCatalogCombobox
                                      value={cell.catalog_item_id}
                                      placeholder="Selecionar guia"
                                      options={[
                                        { id: "custom", label: "Atribuir Guia" },
                                        ...dayGuides.map((g: any) => {
                                          const waterfallId = getWaterfallForDay(dayNum);
                                          const waterfallProduct = waterfallId ? catalogItems.find((c: any) => c.id === waterfallId) : null;
                                          const vt = dayVehicleType[dayNum] || "carroTurista";
                                          const salePrice = getGuideSalePrice(waterfallProduct, vt, cell.qty) || Number(g.daily_rate);
                                          return { id: g.id, label: `${g.name} — R$ ${salePrice.toFixed(0)}` };
                                        })
                                      ]}
                                      onSelect={(v) => v === "custom"
                                        ? updateCell(dayNum, cat, cell.item_index, { catalog_item_id: null, value: 0 })
                                        : selectCatalogItem(dayNum, cat, cell.item_index, v)
                                      }
                                    />
                                  ) : <span />
                                ) : catCatalog.length > 0 ? (
                                  <SearchableCatalogCombobox
                                    value={cell.catalog_item_id}
                                    placeholder="Selecionar do catálogo"
                                    options={[
                                      { id: "custom", label: "Livre" },
                                      ...catCatalog.map((c: any) => ({ id: c.id, label: `${c.name} — R$ ${Number(c.unit_price).toFixed(0)}` }))
                                    ]}
                                    onSelect={(v) => v === "custom"
                                      ? updateCell(dayNum, cat, cell.item_index, { catalog_item_id: null })
                                      : selectCatalogItem(dayNum, cat, cell.item_index, v)
                                    }
                                  />
                                ) : (
                                  <TextCell
                                    className="h-8 text-xs"
                                    placeholder="Nome do item"
                                    value={cell.item_name}
                                    onCommit={(v) => updateCell(dayNum, cat, cell.item_index, { item_name: v })}
                                  />
                                )}

                                {cell.catalog_item_id && (catalogItems.find(c => c.id === cell.catalog_item_id)?.variables?.variations || []).length > 0 ? (
                                  <VariationSelect
                                    productId={cell.catalog_item_id}
                                    value={cell.variation_id}
                                    onSelect={(vId) => selectVariation(dayNum, cat, cell.item_index, vId)}
                                    catalogItems={catalogItems}
                                  />
                                ) : (
                                  <TextCell
                                    className="h-8 text-xs"
                                    placeholder={catCatalog.length > 0 || isGuia ? "Nome / detalhe" : "Detalhe"}
                                    value={cell.item_name}
                                    onCommit={(v) => updateCell(dayNum, cat, cell.item_index, { item_name: v })}
                                  />
                                )}

                                <NumericCell
                                  className="h-8 text-xs tabular-nums text-center"
                                  inputMode="numeric"
                                  title="Qtd"
                                  value={cell.qty}
                                  onCommit={(newQty) => {
                                    const q = Math.max(Math.round(newQty), 1);
                                    if (isGuia && cell.catalog_item_id) {
                                      const waterfallId = getWaterfallForDay(dayNum);
                                      if (waterfallId) {
                                        const waterfallProduct = catalogItems.find((c: any) => c.id === waterfallId);
                                        const vt = dayVehicleType[dayNum] || "carroTurista";
                                        const salePrice = getGuideSalePrice(waterfallProduct, vt, q) || cell.value;
                                        const gwp = gwpMap.get(`${cell.catalog_item_id}__${waterfallId}`);
                                        const guideCost = gwp ? getGuidePrice(gwp, vt, q) : cell.cost;
                                        updateCell(dayNum, cat, cell.item_index, { qty: q, value: salePrice, cost: guideCost });
                                      }
                                    } else {
                                      updateCell(dayNum, cat, cell.item_index, { qty: q }, true);
                                    }
                                  }}
                                />

                                <NumericCell
                                  className="h-8 text-sm text-right tabular-nums"
                                  placeholder="R$ 0"
                                  value={cell.value || ""}
                                  onCommit={(raw) => {
                                    const effCost = getEffectiveCost(cell);
                                    if (raw < effCost && effCost > 0) {
                                      toast({ title: "Valor de venda menor que custo real", variant: "destructive" });
                                    }
                                    const v = effCost > 0 ? Math.max(raw, effCost) : raw;
                                    updateCell(dayNum, cat, cell.item_index, { value: v }, true);
                                  }}
                                />
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <ReplicatePopover cell={cell} numDays={numDays} dayNum={dayNum} />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => removeCellItem(dayNum, cat, cell.item_index)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <TextCell
                                className="h-6 text-[11px] text-muted-foreground pl-10"
                                placeholder="Horários, observações..."
                                value={cell.description || ""}
                                onCommit={(v) => updateCell(dayNum, cat, cell.item_index, { description: v })}
                              />
                            </div>
                          </SortableItem>
                    ))}

                        <button
                          type="button"
                          className="text-xs text-primary hover:underline pl-4"
                          onClick={() => addCellItem(dayNum, cat, lastItemIndex)}
                        >
                          + adicionar item
                        </button>
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* Add item dropdown — creates a NEW block at the end */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full mt-1">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar item ao Dia {dayNum}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {categories.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => addCellItem(dayNum, cat)}>
                      <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || "bg-muted-foreground"} shrink-0 mr-2`} />
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  // ─── Table View (legacy) ──────────────────────────────────────────
  const renderTableView = () => (
    <div className="border border-border rounded-lg overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left font-medium sticky left-0 bg-muted/50 min-w-[100px]">Dia</th>
            {categories.map((cat) => (
              <th key={cat} className="p-2 text-center font-medium min-w-[170px]">{cat}</th>
            ))}
            <th className="p-2 text-right font-medium min-w-[90px]">Total dia</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: numDays }, (_, i) => i + 1).map((dayNum) => (
            <tr key={dayNum} className="border-t border-border">
              <td className="p-2 font-medium sticky left-0 bg-background align-top">
                <div className="font-medium text-sm">Dia {dayNum}{startDate ? (() => { const d = new Date(startDate + "T12:00:00"); d.setDate(d.getDate() + dayNum - 1); return ` — ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`; })() : ""}</div>
                <div className="mt-1">
                  <Select
                    value={dayVehicleType[dayNum] || "carroTurista"}
                    onValueChange={(v) => handleVehicleTypeChange(dayNum, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-full">
                      <Car className="h-3 w-3 mr-0.5 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carroTurista">Carro Turista</SelectItem>
                      <SelectItem value="4x4Atmos">4×4 ATMOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </td>
              {categories.map((cat) => {
                const cellItems = getCellItems(dayNum, cat);
                const isGuia = cat === "Diária Guia ATMOS";
                const catCatalog = isGuia ? [] : catalogForCategory(cat);
                const dayGuides = isGuia ? guidesForDay(dayNum) : [];
                const hasWaterfall = !!getWaterfallForDay(dayNum);
                return (
                  <td key={cat} className="p-1.5 align-top">
                    <div className="space-y-1.5">
                      {isGuia && !hasWaterfall && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                          <AlertCircle className="h-3 w-3" /> Escolha cachoeira
                        </span>
                      )}
                      {cellItems.map((cell) => (
                        <div key={cell.item_index} className="space-y-1 border-b border-border/30 pb-1.5 last:border-0">
                          {isGuia ? (
                            hasWaterfall ? (
                              <SearchableCatalogCombobox
                                size="xs"
                                value={cell.catalog_item_id}
                                placeholder="Guia"
                                options={[
                                  { id: "custom", label: "Atribuir Guia" },
                                  ...dayGuides.map((g: any) => {
                                    const wId = getWaterfallForDay(dayNum);
                                    const waterfallProduct = wId ? catalogItems.find((c: any) => c.id === wId) : null;
                                    const vt = dayVehicleType[dayNum] || "carroTurista";
                                    const salePrice = getGuideSalePrice(waterfallProduct, vt, cell.qty) || Number(g.daily_rate);
                                    return { id: g.id, label: `${g.name} — R$${salePrice.toFixed(0)}` };
                                  })
                                ]}
                                onSelect={(v) => v === "custom"
                                  ? updateCell(dayNum, cat, cell.item_index, { catalog_item_id: null, value: 0 })
                                  : selectCatalogItem(dayNum, cat, cell.item_index, v)
                                }
                              />
                            ) : null
                          ) : catCatalog.length > 0 ? (
                            <SearchableCatalogCombobox
                              size="xs"
                              value={cell.catalog_item_id}
                              placeholder="Catálogo"
                              options={[
                                { id: "custom", label: "Livre" },
                                ...catCatalog.map((c: any) => ({ id: c.id, label: `${c.name} — R$${Number(c.unit_price).toFixed(0)}` }))
                              ]}
                              onSelect={(v) => v === "custom"
                                ? updateCell(dayNum, cat, cell.item_index, { catalog_item_id: null })
                                : selectCatalogItem(dayNum, cat, cell.item_index, v)
                              }
                            />
                          ) : null}
                          <div className="flex gap-1 items-center">
                            <TextCell
                              className="h-7 text-xs flex-1"
                              placeholder="Item"
                              value={cell.item_name}
                              onCommit={(v) => updateCell(dayNum, cat, cell.item_index, { item_name: v })}
                            />
                            <Input
                              className="h-7 text-xs w-12 tabular-nums text-center"
                              type="number"
                              min={1}
                              title="Qtd"
                              value={cell.qty}
                              onChange={(e) => updateCell(dayNum, cat, cell.item_index, { qty: Math.max(parseInt(e.target.value) || 1, 1) }, true)}
                            />
                            <Input
                              className="h-7 text-xs w-20 tabular-nums"
                              type="number"
                              step="0.01"
                              placeholder="R$"
                              value={cell.value || ""}
                              onChange={(e) => updateCell(dayNum, cat, cell.item_index, { value: parseFloat(e.target.value) || 0 }, true)}
                            />
                            {cellItems.length > 1 && (
                              <button type="button" className="text-destructive shrink-0" onClick={() => removeCellItem(dayNum, cat, cell.item_index)}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <TextCell
                            className="h-6 text-[11px] text-muted-foreground"
                            placeholder="Horários, observações..."
                            value={cell.description || ""}
                            onCommit={(v) => updateCell(dayNum, cat, cell.item_index, { description: v })}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => addCellItem(dayNum, cat)}
                      >
                        + item
                      </button>
                    </div>
                  </td>
                );
              })}
              <td className="p-2 text-right font-semibold align-top text-sm">
                R$ {(dayTotals[dayNum] || 0).toFixed(0)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-muted/30 font-medium">
            <td className="p-2 sticky left-0 bg-muted/30 text-sm">Totais</td>
            {categories.map((cat) => (
              <td key={cat} className="p-2 text-center text-sm">R$ {(catTotals[cat] || 0).toFixed(0)}</td>
            ))}
            <td className="p-2 text-right font-bold text-sm">R$ {subtotal.toFixed(0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ─── Sticky Financial Summary ─────────────────────────────────────
  const renderFinancialSummary = () => {
    const totalWithAtmos = subtotal + atmosRevenue + accTotals.atmosRevenue;
    return (
      <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
        {/* ── BLOCO 1: Orçamento do Cliente ── */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Orçamento do Cliente</h4>

          {renderCategoryBar()}

          {/* Category breakdown with % */}
          <div className="space-y-1">
            {categories.map((cat) => {
              const val = catTotals[cat] || 0;
              if (val === 0) return null;
              const pct = totalWithAtmos > 0 ? (val / totalWithAtmos) * 100 : 0;
              return (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || "bg-muted-foreground"}`} />
                    {cat}
                  </span>
                  <span className="tabular-nums">R$ {val.toFixed(0)} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                </div>
              );
            })}
            {atmosRevenue > 0 && (
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Serviço ATMOS
                </span>
                <span className="tabular-nums">R$ {atmosRevenue.toFixed(0)} <span className="text-muted-foreground">({totalWithAtmos > 0 ? ((atmosRevenue / totalWithAtmos) * 100).toFixed(0) : 0}%)</span></span>
              </div>
            )}
            {accTotals.atmosRevenue > 0 && (
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Hospedagem (ATMOS)
                </span>
                <span className="tabular-nums">R$ {accTotals.atmosRevenue.toFixed(0)} <span className="text-muted-foreground">({totalWithAtmos > 0 ? ((accTotals.atmosRevenue / totalWithAtmos) * 100).toFixed(0) : 0}%)</span></span>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal roteiro</span>
              <span className="tabular-nums">R$ {(subtotal + atmosRevenue).toFixed(2)}</span>
            </div>
            {accTotals.atmosRevenue > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Hospedagem (ATMOS)</span>
                <span className="tabular-nums">R$ {accTotals.atmosRevenue.toFixed(2)}</span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span className="tabular-nums">- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total grupo ({numPeople} pax)</span>
              <span className="tabular-nums">R$ {groupTotalPreTax.toFixed(2)}</span>
            </div>
            {numPeople > 1 && accVariants.length === 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Por pessoa</span>
                <span className="tabular-nums">R$ {pricePerPersonPreTax.toFixed(2)}</span>
              </div>
            )}
            {numPeople > 1 && accVariants.length > 0 && (
              <div className="space-y-1 mt-1 p-2 rounded-md border border-primary/20 bg-primary/5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Por pessoa (com hospedagem)</p>
                {accVariants.map(v => (
                  <div key={v.type} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{v.label}</span>
                    <span className="tabular-nums font-medium">R$ {(basePerPerson + v.revenuePerPerson).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Base (sem hosp.)</span>
                  <span className="tabular-nums">R$ {basePerPerson.toFixed(2)}</span>
                </div>
              </div>
            )}
            {numCourtesies > 0 && (
              <div className="flex justify-between text-xs text-amber-600">
                <span>Cortesias ({numCourtesies})</span>
                <span className="tabular-nums">- R$ {courtesyCost.toFixed(2)}</span>
              </div>
            )}
            {(numCourtesies > 0 || taxPercent > 0) && (
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL SEM NF</span>
                <span className="tabular-nums">R$ {nfBase.toFixed(2)}</span>
              </div>
            )}
            {taxValue > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Imposto ({taxPercent}%)</span>
                <span className="tabular-nums">+ R$ {taxValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-foreground/20">
              <span>Total cobrado</span>
              <span className="tabular-nums">R$ {totalCharged.toFixed(2)}</span>
            </div>
            {numPaying > 0 && taxValue > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Por pessoa (c/ imposto)</span>
                <span className="tabular-nums">R$ {pricePerPerson.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Discount/Tax inputs */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Desc. %</Label>
              <Input className="h-8 text-sm tabular-nums" type="number" step="0.01" min={0} max={100} value={discountPercent || ""} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desc. R$</Label>
              <Input className="h-8 text-sm tabular-nums" type="number" step="0.01" min={0} value={discountFixed || ""} onChange={(e) => setDiscountFixed(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Imp. %</Label>
              <Input className="h-8 text-sm tabular-nums" type="number" step="0.01" min={0} value={taxPercent || ""} onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* ── BLOCO 2: DRE — Análise de Lucro ATMOS ── */}
        <div className="space-y-2 border-t-2 border-primary/30 pt-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            DRE — Análise de Lucro
          </h4>

            {/* Revenue */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-medium">
                <span>Receita dos itens</span>
                <span className="tabular-nums">R$ {profitAnalysis.totalItemRevenue.toFixed(0)}</span>
              </div>
              {atmosRevenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Receita Serviço ATMOS</span>
                  <span className="tabular-nums">R$ {atmosRevenue.toFixed(0)}</span>
                </div>
              )}
              {accTotals.totalRevenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Receita Hospedagem</span>
                  <span className="tabular-nums">R$ {accTotals.totalRevenue.toFixed(0)}</span>
                </div>
              )}

            {/* Costs */}
            <div className="border-t border-border mt-2 pt-2 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Custos</p>
              {(() => {
                // Dynamic cost grouping by category (mirrors budget section)
                // Exclude "Hospedagem" — it has its own dedicated section (accTotals)
                const costsByCategory: Record<string, number> = {};
                grid.filter(c => c.category !== "Hospedagem").forEach(c => {
                  const cost = getEffectiveCost(c) * c.qty;
                  if (cost > 0) {
                    costsByCategory[c.category] = (costsByCategory[c.category] || 0) + cost;
                  }
                });
                const itemsWithZeroCost = grid.filter(c => c.category !== "Hospedagem" && getEffectiveCost(c) === 0 && c.value > 0);
                const itemsWithCostNoSale = grid.filter(c => c.category !== "Hospedagem" && getEffectiveCost(c) > 0 && c.value === 0);
                return (
                  <>
                    {categories.filter(cat => (costsByCategory[cat] || 0) > 0).map(cat => (
                      <div key={cat} className="flex justify-between text-xs text-destructive">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || "bg-muted-foreground"}`} />
                          {cat}
                        </span>
                        <span className="tabular-nums">− R$ {(costsByCategory[cat]).toFixed(0)}</span>
                      </div>
                    ))}
                    {totalCosts > 0 && (
                      <div className="flex justify-between text-destructive text-xs">
                        <span>Custos operacionais</span>
                        <span className="tabular-nums">− R$ {totalCosts.toFixed(0)}</span>
                      </div>
                    )}

                    {segment === "b2b" && commissionValue > 0 && (
                      <div className="flex justify-between text-destructive text-xs">
                        <span>Comissão Vendedor ({partnerCommission}%)</span>
                        <span className="tabular-nums">− R$ {commissionValue.toFixed(0)}</span>
                      </div>
                    )}
                    {discountValue > 0 && (
                      <div className="flex justify-between text-destructive text-xs">
                        <span>Desconto concedido</span>
                        <span className="tabular-nums">− R$ {discountValue.toFixed(0)}</span>
                      </div>
                    )}
                    {courtesyCost > 0 && (
                      <div className="flex justify-between text-destructive text-xs">
                        <span>Cortesias ({numCourtesies})</span>
                        <span className="tabular-nums">− R$ {courtesyCost.toFixed(0)}</span>
                      </div>
                    )}

                    {itemsWithZeroCost.length > 0 && (
                      <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{itemsWithZeroCost.length} {itemsWithZeroCost.length === 1 ? "item" : "itens"} sem custo cadastrado — lucro pode estar superestimado:</span>
                        </div>
                        <ul className="list-disc list-inside pl-1 space-y-0.5">
                          {itemsWithZeroCost.map((c, idx) => (
                            <li key={idx}>D{c.day_number} — {c.item_name || c.category}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {itemsWithCostNoSale.length > 0 && (
                      <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{itemsWithCostNoSale.length} {itemsWithCostNoSale.length === 1 ? "item" : "itens"} com custo mas sem valor de venda — podem inflar os custos:</span>
                        </div>
                        <ul className="list-disc list-inside pl-1 space-y-0.5">
                          {itemsWithCostNoSale.map((c, idx) => (
                            <li key={idx}>D{c.day_number} — {c.item_name || c.category} (custo: R$ {(getEffectiveCost(c) * c.qty).toFixed(0)})</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </>
                );
              })()}
            </div>

            {/* Commission revenue */}
            {(profitAnalysis.totalCommission > 0 || accTotals.totalCommission > 0) && (
              <div className="border-t border-border mt-2 pt-2 space-y-1">
                {profitAnalysis.totalCommission > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comissões fornecedores (itens)</span>
                    <span className="tabular-nums text-green-600">+ R$ {profitAnalysis.totalCommission.toFixed(0)}</span>
                  </div>
                )}
                {accTotals.totalCommission > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comissões fornecedores (hospedagem)</span>
                    <span className="tabular-nums text-green-600">+ R$ {accTotals.totalCommission.toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Final profit */}
            <div className={`flex justify-between font-bold text-sm pt-2 mt-2 border-t-2 border-border ${grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
              <span>Lucro ATMOS</span>
              <span className="tabular-nums">R$ {grossProfit.toFixed(0)} ({margin.toFixed(1)}%)</span>
            </div>
            {margin < 20 && totalRevenue > 0 && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Margem abaixo de 20%. Ajuste Serviço ATMOS ou custos operacionais.</span>
              </div>
            )}
          </div>

          {/* Item breakdown — grouped by category */}
          {(() => {
            const itemsWithProfit = profitAnalysis.perItem.filter(p => p.profit > 0);
            const itemsNoRevenue = profitAnalysis.perItem.filter(p => p.profit <= 0 && (p.cell.item_name || p.cell.category));

            type GroupedCat = { items: typeof itemsWithProfit; rev: number; cost: number; comm: number; profit: number };
            const groupByCategory = (items: typeof itemsWithProfit) => {
              const map = new Map<string, GroupedCat>();
              for (const p of items) {
                const cat = p.cell.category || "Outros";
                const g = map.get(cat) || { items: [], rev: 0, cost: 0, comm: 0, profit: 0 };
                g.items.push(p);
                g.rev += p.revenue;
                g.cost += p.cost;
                g.comm += p.commission;
                g.profit += p.profit;
                map.set(cat, g);
              }
              return Array.from(map.entries()).sort((a, b) => b[1].rev - a[1].rev);
            };

            const renderCategoryGroup = (groups: ReturnType<typeof groupByCategory>, showRevenue: boolean) => (
              <div className="mt-2 space-y-1 text-[11px] max-h-72 overflow-y-auto">
                {groups.map(([cat, g]) => (
                  <Collapsible key={cat}>
                    <CollapsibleTrigger className="w-full">
                      {showRevenue ? (
                        <div className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 py-1 px-1 rounded hover:bg-muted/50 font-medium">
                          <span className="truncate flex items-center gap-1.5 text-left">
                            <ChevronRight className="h-3 w-3 shrink-0 transition-transform [[data-state=open]>&]:rotate-90" />
                            <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[cat] || "bg-muted-foreground"}`} />
                            {cat} <span className="text-muted-foreground font-normal">({g.items.length})</span>
                          </span>
                          <span className="tabular-nums text-right whitespace-nowrap">R$ {g.rev.toFixed(0)}</span>
                          <span className="tabular-nums text-right whitespace-nowrap">R$ {g.cost.toFixed(0)}</span>
                          <span className="tabular-nums text-right whitespace-nowrap">{g.comm > 0 ? `R$ ${g.comm.toFixed(0)}` : "—"}</span>
                          <span className={`tabular-nums text-right whitespace-nowrap ${g.profit >= 0 ? "text-green-600" : "text-destructive"}`}>R$ {g.profit.toFixed(0)}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 py-1 px-1 rounded hover:bg-muted/50 font-medium">
                          <span className="truncate flex items-center gap-1.5 text-left">
                            <ChevronRight className="h-3 w-3 shrink-0 transition-transform [[data-state=open]>&]:rotate-90" />
                            <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[cat] || "bg-muted-foreground"}`} />
                            {cat} <span className="text-muted-foreground font-normal">({g.items.length})</span>
                          </span>
                          <span className="tabular-nums text-right whitespace-nowrap">R$ {g.cost.toFixed(0)}</span>
                          <span className="tabular-nums text-right whitespace-nowrap">{g.comm > 0 ? `R$ ${g.comm.toFixed(0)}` : "—"}</span>
                        </div>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-6 space-y-0.5 pb-1">
                        {g.items
                          .sort((a, b) => a.cell.day_number - b.cell.day_number)
                          .map((p, i) =>
                            showRevenue ? (
                              <div key={i} className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 py-0.5 text-muted-foreground">
                                <span className="truncate">
                                  D{p.cell.day_number} {p.cell.item_name || p.cell.category}
                                  {p.cell.qty > 1 && <span className="ml-0.5">×{p.cell.qty}</span>}
                                </span>
                                <span className="tabular-nums text-right whitespace-nowrap">R$ {p.revenue.toFixed(0)}</span>
                                <span className="tabular-nums text-right whitespace-nowrap">R$ {p.cost.toFixed(0)}</span>
                                <span className="tabular-nums text-right whitespace-nowrap">{p.commission > 0 ? `R$ ${p.commission.toFixed(0)}` : "—"}</span>
                                <span className="tabular-nums text-right whitespace-nowrap">R$ {p.profit.toFixed(0)}</span>
                              </div>
                            ) : (
                              <div key={i} className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 py-0.5 text-muted-foreground">
                                <span className="truncate flex items-center gap-1">
                                  D{p.cell.day_number} {p.cell.item_name || p.cell.category}
                                  {p.cell.qty > 1 && <span className="ml-0.5">×{p.cell.qty}</span>}
                                  {p.cost === 0 && p.cell.value > 0 && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" /></TooltipTrigger><TooltipContent><p className="text-xs">Custo não cadastrado</p></TooltipContent></Tooltip></TooltipProvider>
                                  )}
                                </span>
                                <span className="tabular-nums text-right whitespace-nowrap">R$ {p.cost.toFixed(0)}</span>
                                <span className="tabular-nums text-right whitespace-nowrap">{p.commission > 0 ? `R$ ${p.commission.toFixed(0)}` : "—"}</span>
                              </div>
                            )
                          )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            );

            const profitGroups = groupByCategory(itemsWithProfit);
            const noRevenueGroups = groupByCategory(itemsNoRevenue);

            return (
              <>
                {profitGroups.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                      <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
                      Itens com lucro ({itemsWithProfit.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border mt-2">
                        <span>Categoria</span>
                        <span className="text-right">Venda</span>
                        <span className="text-right">Custo</span>
                        <span className="text-right">Comissão</span>
                        <span className="text-right">Lucro</span>
                      </div>
                      {renderCategoryGroup(profitGroups, true)}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {noRevenueGroups.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-1">
                      <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
                      Itens sem receita ({itemsNoRevenue.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-[1fr_minmax(56px,auto)_minmax(56px,auto)] gap-x-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border mt-2">
                        <span>Categoria</span>
                        <span className="text-right">Custo</span>
                        <span className="text-right">Comissão</span>
                      </div>
                      {renderCategoryGroup(noRevenueGroups, false)}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  const handleDialogClose = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setShowExitConfirm(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
          <DialogTitle>{proposalId ? "Editar Proposta" : "Nova Proposta"}</DialogTitle>
          <div className="flex items-center gap-2">
            {prospectId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  setWishlistSheetOpen(true);
                  if (wishlistData) return;
                  setWishlistLoading(true);
                  const { data: prosp } = await db.from("prospects").select("email").eq("id", prospectId).maybeSingle();
                  if (prosp?.email) {
                    const { data: qr } = await db.from("quote_requests").select("*").eq("user_email", prosp.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
                    setWishlistData(qr || null);
                  } else {
                    setWishlistData(null);
                  }
                  setWishlistLoading(false);
                }}
              >
              <Heart className="h-3.5 w-3.5" />
                Ver Wishlist
              </Button>
            )}
            {proposalId && shareToken && (() => {
              const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
              const linkKey = slugify(title) || shareToken;
              return (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => window.open(`/proposta/${linkKey}?edit=1`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Editar Proposta Visual
                </Button>
              );
            })()}
            {proposalId && feedbackMessages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setFeedbackSheetOpen(true)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Ajustes/Dúvidas
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px] flex items-center justify-center leading-none">{feedbackMessages.filter((f: any) => !f.is_resolved).length}</Badge>
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 md:px-6 py-4">
        <DialogHeader className="sr-only"><DialogTitle>{proposalId ? "Editar Proposta" : "Nova Proposta"}</DialogTitle></DialogHeader>
        <form className="space-y-5" onChangeCapture={() => setIsDirty(true)} onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>

          {/* ── Section 1: Dados Gerais ─────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados Gerais</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-xs">Título *</Label>
                <Input className="h-8 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prospect</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-8 text-sm w-full justify-between font-normal">
                      {prospectId ? prospects.find(p => p.id === prospectId)?.name ?? "Selecionar..." : "Nenhum"}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0 max-h-[320px]" align="start" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                      <CommandInput placeholder="Buscar prospect..." className="h-8 text-sm" />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="__none__" onSelect={() => setProspectId(null)}>
                            <Check className={cn("mr-2 h-3.5 w-3.5", !prospectId ? "opacity-100" : "opacity-0")} />
                            Nenhum
                          </CommandItem>
                          {prospects.map((p) => (
                            <CommandItem key={p.id} value={p.name} onSelect={() => setProspectId(p.id)}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", prospectId === p.id ? "opacity-100" : "opacity-0")} />
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendedor</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-8 text-sm w-full justify-between font-normal">
                      {sellerId ? sellers.find(s => s.id === sellerId)?.name ?? "Selecionar..." : "Nenhum"}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0 max-h-[320px]" align="start" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                      <CommandInput placeholder="Buscar vendedor..." className="h-8 text-sm" />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="__none__" onSelect={() => setSellerId(null)}>
                            <Check className={cn("mr-2 h-3.5 w-3.5", !sellerId ? "opacity-100" : "opacity-0")} />
                            Nenhum
                          </CommandItem>
                          {sellers.map((s) => (
                            <CommandItem key={s.id} value={s.name} onSelect={() => setSellerId(s.id)}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", sellerId === s.id ? "opacity-100" : "opacity-0")} />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contrato</Label>
                <Select value={contractStatus || "none"} onValueChange={(v) => setContractStatus(v === "none" ? null : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contractStatusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pagamento</Label>
                <Select value={paymentStatus || "none"} onValueChange={(v) => setPaymentStatus(v === "none" ? null : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Válida até</Label>
                <DatePicker size="sm" value={validUntil} onChange={setValidUntil} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Share link — use slug if available */}
          {shareToken && (() => {
            const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
            const displaySlug = slugify(title);
            const linkKey = displaySlug || shareToken;
            const fullLink = `${window.location.origin}/proposta/${linkKey}`;
            return (
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Badge variant="secondary" className="text-xs">Link ativo</Badge>
                <span className="text-xs text-muted-foreground truncate flex-1">{fullLink}</span>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                  navigator.clipboard.writeText(fullLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" asChild>
                  <a href={`/proposta/${linkKey}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            );
          })()}

          {/* ── Section 2: Configuração do Roteiro ─────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuração do Roteiro</h3>

            {/* Itinerary type toggle */}
            <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/20">
              <Route className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex gap-1 border border-border rounded-md p-0.5">
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${itineraryType === "personalizado" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setItineraryType("personalizado"); setSelectedItineraryId(null); }}
                >
                  Personalizado
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${itineraryType === "pronto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setItineraryType("pronto")}
                >
                  Roteiro Pronto
                </button>
              </div>

              {itineraryType === "pronto" && (
                <Select
                  value={selectedItineraryId || "none"}
                  onValueChange={(v) => { if (v !== "none") applyReadyItinerary(v); }}
                >
                  <SelectTrigger className="h-8 text-sm w-[260px]">
                    <SelectValue placeholder="Selecionar roteiro..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecionar roteiro...</SelectItem>
                    <SelectItem value="__classico_header" disabled className="font-semibold text-xs text-muted-foreground uppercase">── Clássico ──</SelectItem>
                    {itineraries.filter((it) => it.category === "classico").map((it) => (
                      <SelectItem key={it.id} value={it.id}>{it.name.pt}</SelectItem>
                    ))}
                    <SelectItem value="__jurassico_header" disabled className="font-semibold text-xs text-muted-foreground uppercase">── Jurássico ──</SelectItem>
                    {itineraries.filter((it) => it.category === "jurassico").map((it) => (
                      <SelectItem key={it.id} value={it.id}>{it.name.pt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Total Grupo</Label>
                <Input className="h-8 text-sm" type="number" min={1} value={numPeople === 0 ? "" : numPeople} onChange={(e) => { const v = e.target.value; if (v === "") { setNumPeople(0); return; } const n = parseInt(v); if (!isNaN(n) && n >= 0) setNumPeople(n); }} onBlur={() => { if (numPeople < 1) setNumPeople(1); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Cortesias</Label>
                <Input className="h-8 text-sm" type="number" min={0} max={numPeople - 1} value={numCourtesies} onChange={(e) => { const v = e.target.value; if (v === "") { setNumCourtesies('' as any); return; } const n = parseInt(v); if (!isNaN(n) && n >= 0) setNumCourtesies(Math.min(n, numPeople - 1)); }} onBlur={() => { if (numCourtesies === '' as any || numCourtesies < 0) setNumCourtesies(0); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Pagantes</Label>
                <Input className="h-8 text-sm tabular-nums bg-muted" type="number" value={numPaying} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº de dias</Label>
                <div className="flex gap-1">
                  <Input className="h-8 text-sm flex-1 tabular-nums" type="number" min={1} value={numDays === 0 ? "" : numDays} onChange={(e) => { const v = e.target.value; if (v === "") { setNumDays(0 as any); return; } const n = parseInt(v); if (!isNaN(n) && n >= 1) { if (n < numDays) { setGrid(g => g.filter(cell => cell.day_number <= n)); } setNumDays(n); } }} onBlur={() => { if (!numDays || numDays < 1) setNumDays(1); }} />
                  <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addDay}><Plus className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={removeDay} disabled={numDays <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Início da viagem</Label>
                <DatePicker size="sm" value={startDate} onChange={setStartDate} defaultMonth={format(new Date(), "yyyy-MM-dd")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim da viagem</Label>
                {(() => {
                  const startParsed = startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined;
                  const endParsed = endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined;
                  const validStart = startParsed && isValid(startParsed) ? startParsed : undefined;
                  const validEnd = endParsed && isValid(endParsed) ? endParsed : undefined;
                  const rangeDays = validStart && validEnd && validEnd > validStart ? eachDayOfInterval({ start: validStart, end: validEnd }) : [];
                  const mods: Record<string, Date | Date[]> = {};
                  if (validStart) mods.tripStart = validStart;
                  if (rangeDays.length > 2) mods.tripRange = rangeDays.slice(1, -1);
                  const modStyles = {
                    tripStart: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "50%" },
                    tripRange: { backgroundColor: "hsl(var(--primary) / 0.15)", borderRadius: "0" },
                  };
                  const nights = validStart && validEnd && validEnd > validStart ? differenceInDays(validEnd, validStart) : null;
                  const displayLabel = validEnd ? `${format(validEnd, "dd/MM/yyyy", { locale: ptBR })}${nights ? ` (${nights} noite${nights !== 1 ? "s" : ""})` : ""}` : null;
                  const defaultMo = validEnd || validStart || new Date();
                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal w-full h-8 text-xs px-2.5 gap-1.5", !validEnd && "text-muted-foreground")}>
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          {displayLabel || "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={validEnd}
                          onSelect={(day) => { if (day) setEndDate(format(day, "yyyy-MM-dd")); else setEndDate(""); }}
                          defaultMonth={defaultMo}
                          locale={ptBR}
                          className="pointer-events-auto"
                          disabled={validStart ? (date) => date <= validStart : undefined}
                          modifiers={mods}
                          modifiersStyles={modStyles}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>
            </div>
          </div>


          {/* ── Section 3: Itens do Roteiro (with sidebar) ──────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens do Roteiro</h3>
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  type="button"
                  className={`p-1.5 rounded transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("cards")}
                  title="Ver por dia"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("table")}
                  title="Ver como tabela"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
                {viewMode === "cards" ? (
                  Array.from({ length: numDays }, (_, i) => i + 1).map((dayNum) => (
                    <div key={dayNum}>{renderDayCard(dayNum)}</div>
                  ))
                ) : (
                  renderTableView()
                )}
            </div>
          </div>

          {/* ── Section 3.5: Hospedagens do Roteiro ─────────────── */}
          <ProposalAccommodationsSection
            accommodations={proposalAccommodations}
            onChange={(accs) => { setProposalAccommodations(accs); setIsDirty(true); }}
            catalogItems={catalogItems}
            numPeople={numPeople}
            startDate={startDate}
            proposalId={proposalId}
          />

          {/* ── Section 4: Serviço ATMOS ───────────────────────── */}
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Serviço ATMOS (obrigatório)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor por pessoa/dia (R$) *</Label>
                <Input className="h-8 text-sm tabular-nums" type="number" step="0.01" min={0} value={atmosService.price_per_person_day || ""} onChange={(e) => setAtmosService((s) => ({ ...s, price_per_person_day: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Receita Serviço</Label>
                <p className="text-sm font-semibold mt-1 tabular-nums">R$ {atmosRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{numPeople} pax × {numDays} dias × R$ {atmosService.price_per_person_day.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição do Serviço ATMOS (visível na proposta)</Label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Curadoria 360, planejamento personalizado, suporte 24h..." value={atmosService.description} onChange={(e) => setAtmosService((s) => ({ ...s, description: e.target.value }))} />
            </div>


            {atmosInsufficient && (
              <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Serviço ATMOS precisa ser maior que custos operacionais + impostos (mínimo: R$ {(numPeople * numDays > 0 ? (totalCosts + taxValue) / (numPeople * numDays) : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /pessoa/dia)
              </div>
            )}
          </div>

          {/* ── Section 5: Custos Operacionais ──────── */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-accent/10">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Custos Operacionais
              <ProposalCostChecklistButton proposalId={proposalId} grid={grid} onClick={() => setCostCheckOpen(true)} />
            </h4>

            <div className="space-y-2">
              {costItems.length > 0 && (
                <div className="grid grid-cols-[1fr_60px_100px_80px_160px_auto] gap-2 text-[10px] text-muted-foreground px-1">
                  <span>Descrição</span>
                  <span className="text-center">Dias</span>
                  <span className="text-center">Valor/dia</span>
                  <span className="text-center">Total</span>
                  <span>Conta</span>
                  <span></span>
                </div>
              )}
              {costItems.map((ci, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_60px_100px_80px_160px_auto] gap-2 items-end">
                  <Input className="h-8 text-sm" placeholder="Descrição do custo" value={ci.description} onChange={(e) => {
                    const arr = [...costItems]; arr[idx] = { ...arr[idx], description: e.target.value }; setCostItems(arr);
                  }} />
                  <Input className="h-8 text-sm tabular-nums text-center" type="number" min={0.5} step="0.5" placeholder="Dias" value={ci.days || 1} onChange={(e) => {
                    const d = parseFloat(e.target.value) || 1;
                    const arr = [...costItems]; arr[idx] = { ...arr[idx], days: d, amount: d * arr[idx].unit_amount }; setCostItems(arr);
                  }} />
                  <Input className="h-8 text-sm tabular-nums" type="number" step="0.01" placeholder="R$/dia" value={ci.unit_amount || ""} onChange={(e) => {
                    const ua = parseFloat(e.target.value) || 0;
                    const arr = [...costItems]; arr[idx] = { ...arr[idx], unit_amount: ua, amount: (arr[idx].days || 1) * ua }; setCostItems(arr);
                  }} />
                  <span className="h-8 flex items-center text-xs tabular-nums text-muted-foreground">= R$ {ci.amount.toFixed(0)}</span>
                  <Select value={ci.account_id || "none"} onValueChange={(v) => {
                    const arr = [...costItems]; arr[idx] = { ...arr[idx], account_id: v === "none" ? null : v }; setCostItems(arr);
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Conta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem conta</SelectItem>
                      {costAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setCostItems(costItems.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setCostItems([...costItems, { description: "", amount: 0, days: 1, unit_amount: 0, account_id: null }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar custo
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {segment === "b2b" && (
                <div className="space-y-1">
                  <Label className="text-xs">Comissão Vendedor (%)</Label>
                  <Input className="h-8 text-sm tabular-nums" type="number" step="0.1" min={0} max={100} value={partnerCommission || ""} onChange={(e) => setPartnerCommission(parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border">
              <span>Total custos operacionais</span>
              <span className="tabular-nums">R$ {totalCosts.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Orçamento do Cliente (inline) ──────────────────── */}
          {renderFinancialSummary()}

          {/* ── Section 6: Condições de Pagamento ──────────────── */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/10">
            <h4 className="font-semibold text-sm">Condições de Pagamento</h4>
            {paymentTerms.map((inst, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_1fr_auto] gap-2 items-end">
                <Input className="h-8 text-sm" placeholder="Descrição" value={inst.label} onChange={(e) => {
                  const arr = [...paymentTerms]; arr[idx] = { ...arr[idx], label: e.target.value }; setPaymentTerms(arr);
                }} />
                <Input className="h-8 text-sm font-mono text-center" type="number" min={0} max={100} step="1" value={inst.percent} onChange={(e) => {
                  const arr = [...paymentTerms]; arr[idx] = { ...arr[idx], percent: parseFloat(e.target.value) || 0 }; setPaymentTerms(arr);
                }} />
                <Select value={inst.due_rule} onValueChange={(v) => {
                  const arr = [...paymentTerms]; arr[idx] = { ...arr[idx], due_rule: v }; setPaymentTerms(arr);
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_booking">Na reserva</SelectItem>
                    <SelectItem value="3_months_before">3 meses antes</SelectItem>
                    <SelectItem value="5_days_before">5 dias antes</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setPaymentTerms(paymentTerms.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPaymentTerms([...paymentTerms, { label: "", percent: 0, due_rule: "custom" }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Parcela
              </Button>
              {paymentTerms.length === 0 && segment === "b2b" && (
                <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setPaymentTerms([...DEFAULT_B2B_PAYMENT_TERMS])}>
                  Usar padrão B2B (10/40/50)
                </Button>
              )}
            </div>
            {paymentTerms.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Total: {paymentTerms.reduce((s, p) => s + p.percent, 0)}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending || atmosInsufficient}>
              {saveMutation.isPending ? "Salvando..." : "Salvar Proposta"}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>

      <ProposalCostChecklist
        proposalId={proposalId}
        grid={grid}
        open={costCheckOpen}
        onOpenChange={setCostCheckOpen}
        catalogCostResolver={(item) => {
          // For guides: look up guide_waterfall_prices
          if (item.category === "Diária Guia ATMOS" && item.catalog_item_id) {
            const waterfallId = getWaterfallForDay(item.day_number);
            if (waterfallId) {
              const gwp = gwpMap.get(`${item.catalog_item_id}__${waterfallId}`);
              if (gwp) {
                const vt = dayVehicleType[item.day_number] || "carroTurista";
                return getGuidePrice(gwp, vt, item.qty);
              }
            }
            return item.cost;
          }
          // For other items: look up cost_price from products table
          if (item.catalog_item_id) {
            const product = catalogItems.find((c: any) => c.id === item.catalog_item_id);
            if (product) {
              let cost = Number(product.cost_price) || 0;
              return cost > 0 ? cost : item.cost;
            }
          }
          return item.cost;
        }}
        isTotalCostResolver={(item) => {
          if (!item.catalog_item_id) return false;
          const product = catalogItems.find((c: any) => c.id === item.catalog_item_id);
          if (!product) return false;
          const vars = (product.variables || {}) as Record<string, unknown>;
          const isTransferOrDrone = product.category === "transfer" || product.category === "drone";
          const pricingType = (vars.pricingType as string) || (isTransferOrDrone ? "total" : "");
          return pricingType === "total";
        }}
        catalogSalePriceResolver={(item) => {
          if (!item.catalog_item_id) return Number(item.value || 0) * (item.qty || 1);
          const product = catalogItems.find((c: any) => c.id === item.catalog_item_id);
          if (!product) return Number(item.value || 0) * (item.qty || 1);
          return Number(product.unit_price) || 0;
        }}
      />
      {/* Wishlist Sheet */}
      <Sheet open={wishlistSheetOpen} onOpenChange={setWishlistSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist do Cliente
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6">
            {wishlistLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !wishlistData ? (
              <ManualWishlistForm
                prospectId={prospectId!}
                prospectEmail={null}
                onCreated={(data) => setWishlistData(data)}
              />
            ) : (
              <>
                {/* Wishlist items grouped by type */}
                {wishlistData.items && Array.isArray(wishlistData.items) && wishlistData.items.length > 0 && (() => {
                  const typeLabel: Record<string, string> = {
                    itinerary: "Roteiro", waterfall: "Cachoeira", experience: "Experiência",
                    accommodation: "Hospedagem", service: "Serviço",
                  };
                  const items = wishlistData.items as { name: string; type: string; details?: string }[];
                  const groups: Record<string, { name: string; details?: string }[]> = {};
                  items.forEach(item => {
                    const label = typeLabel[item.type] || item.type;
                    if (!groups[label]) groups[label] = [];
                    groups[label].push({ name: item.name, details: item.details });
                  });
                  return (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                        <Heart className="h-4 w-4 text-accent" />
                        Itens da Wishlist
                      </div>
                      <div className="space-y-4">
                        {Object.entries(groups).map(([type, gItems]) => (
                          <div key={type}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{type}</p>
                            <div className="space-y-1">
                              {gItems.map((item, i) => (
                                <div key={i} className="text-sm bg-muted rounded px-3 py-1.5">
                                  {item.name}
                                  {item.details && <span className="text-muted-foreground"> — {item.details}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* Questionnaire answers - matching AdminQuotes style */}
                {wishlistData.answers && typeof wishlistData.answers === "object" && Object.keys(wishlistData.answers).length > 0 && (() => {
                  const answerLabels: Record<string, string> = {
                    status: "Situação", startDate: "Início da viagem", endDate: "Fim da viagem",
                    numDays: "Nº Diárias",
                    groupSize: "Pessoas no grupo", children: "Crianças", mobility: "Mobilidade",
                    mobilityDetails: "Detalhes de mobilidade", transport: "Transporte",
                    hasAccommodation: "Hospedagem reservada", accommodationLocation: "Local da hospedagem",
                    notes: "Observações", profileType: "Perfil",
                  };
                  const answerKeyOrder = [
                    "status", "startDate", "endDate", "numDays", "groupSize", "children",
                    "mobility", "mobilityDetails", "transport", "hasAccommodation",
                    "accommodationLocation", "notes",
                  ];
                  const answers = wishlistData.answers as Record<string, unknown>;
                  return (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                        <ClipboardList className="h-4 w-4 text-accent" />
                        Respostas do Questionário
                      </div>
                      <div className="space-y-2">
                        {answerKeyOrder.map((key) => {
                          const value = answers[key];
                          if (!value) return null;
                          const displayValue = (key === "startDate" || key === "endDate")
                            ? new Date(String(value)).toLocaleDateString("pt-BR")
                            : String(value);
                          return (
                            <div key={key} className="text-sm bg-muted rounded px-3 py-2">
                              <span className="text-muted-foreground text-xs">{answerLabels[key] || key}: </span>
                              <span className="text-foreground">{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div className="text-xs text-muted-foreground">
                  Solicitação em {new Date(wishlistData.created_at).toLocaleDateString("pt-BR")}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {/* Feedback Sheet */}
      <Sheet open={feedbackSheetOpen} onOpenChange={setFeedbackSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle>Ajustes e Dúvidas do Cliente</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            {(() => {
              const changes = feedbackMessages.filter(f => f.type === "change_request");
              const questions = feedbackMessages.filter(f => f.type === "question");
              return (
                <>
                  {changes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <PenLine className="h-3 w-3" /> Solicitações de Ajustes ({changes.length})
                      </p>
                      {changes.map((m) => (
                        <div key={m.id} className={`flex items-start gap-3 rounded-md px-3 py-2.5 text-sm ${m.is_resolved ? "bg-muted/30" : "bg-muted/60"}`}>
                          <Checkbox
                            checked={m.is_resolved}
                            onCheckedChange={(checked) => toggleFeedbackResolved(m.id, !!checked)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className={m.is_resolved ? "line-through opacity-50" : ""}>
                            <p>{m.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {questions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3" /> Dúvidas ({questions.length})
                      </p>
                      {questions.map((m) => (
                        <div key={m.id} className={`flex items-start gap-3 rounded-md px-3 py-2.5 text-sm ${m.is_resolved ? "bg-muted/30" : "bg-muted/60"}`}>
                          <Checkbox
                            checked={m.is_resolved}
                            onCheckedChange={(checked) => toggleFeedbackResolved(m.id, !!checked)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className={m.is_resolved ? "line-through opacity-50" : ""}>
                            <p>{m.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {feedbackMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum ajuste ou dúvida recebido.</p>
                  )}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que ainda não foram salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setShowExitConfirm(false);
                setIsDirty(false);
                onOpenChange(false);
              }}
            >
              Sair sem salvar
            </Button>
            <AlertDialogAction
              onClick={() => {
                setShowExitConfirm(false);
                saveMutation.mutate();
              }}
            >
              Salvar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
