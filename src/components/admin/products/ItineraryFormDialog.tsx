import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ChevronDown, Pencil, Search, Package, RefreshCw, ImageIcon, UsersRound, X, Compass, GripVertical, Copy, Check, ChevronsUpDown, Route, Info, LayoutGrid, List, AlertCircle, CalendarIcon, Truck, Car, CalendarDays, CircleDollarSign, TrendingUp, AlertTriangle, Calculator, Percent, Map } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Product } from "./shared";
import { productTypeLabels, slugify, getStorageInfo } from "./shared";
import { ProductMediaTab } from "./ProductMediaTab";
import { normalize } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "@/hooks/use-toast";

type DayItem = {
  day_number: number;
  day_label: string;
  category: string;
  item_name: string;
  value: number;
  cost: number;
  comissao: number;
  value_text: string;
  description: string;
  catalog_item_id: string | null;
  variation_id: string | null;
  item_index: number;
  _uid: string;
  vehicle_type?: string;
  qty: number;
  supplier_id?: string | null;
  product_id?: string; // for compatibility with existing code during transition
  product_name?: string;
  product_type?: string;
};

type Day = {
  dayNumber: number;
  items: DayItem[];
  guidePricing?: Pricing;
  attractions: string;
  description: string;
  imageKey?: string;
};

// Type for database persistence (with translation objects)
type SavedDay = {
  dayNumber: number;
  items: DayItem[];
  guidePricing: Pricing | {};
  attractions: { pt: string[] };
  description: { pt: string };
  imageKey?: string;
  vehicle_type?: string;
  hasGuide?: boolean;
};

import { regionLabels } from "./shared";

type PricingTier = { individual?: number; dupla?: number; trio?: number };
type Pricing = { atmos4x4?: PricingTier; carroProprio?: PricingTier };

type ItineraryVars = {
  duration: number;
  subcategory: string;
  days: SavedDay[];
  seo_slug: string;
  seo_title: string;
  seo_description: string;
  favorites: string[];
  pricing?: Pricing;
  atmosRevenue?: number;
  taxPercent?: number;
  markupPercent?: number;
  partnerCommission?: number;
  guidePricingTiers?: { 
    atmos4x4: { p1: number; p2: number; p3plus: number };
    carroProprio: { p1: number; p2: number; p3plus: number };
  };
  activeModalities?: { atmos4x4: boolean; carroProprio: boolean };
  guide_id?: string | null;
  // Standard fields (for generic product compatibility)
  pricingType?: "total" | "per_person";
  limitPeople?: number;
  fiscal_cnpj?: string;
  fiscal_ncm?: string;
  fiscal_tax_rate?: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null; // null = new
  allProducts: Product[];
  onSave: (data: {
    name: string;
    description: string;
    category: string;
    region: string;
    is_active: boolean;
    duration_days: number;
    variables: ItineraryVars;
  }) => void;
  onDelete?: (id: string) => void;
  isSaving: boolean;
}

const fmtBRL = (v: number | undefined, maxFrac = 2) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: maxFrac })}` : "—";

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

function VariationSelect({ productId, value, onSelect, allProducts, className }: {
  productId: string;
  value: string | null;
  onSelect: (vId: string) => void;
  allProducts: any[];
  className?: string;
}) {
  const product = allProducts.find(c => c.id === productId);
  const variations = (product?.variations || []) as any[];
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

function SearchableCatalogCombobox({ value, onSelect, options, placeholder, className, size = "sm" }: {
  value: string | null;
  onSelect: (v: string) => void;
  options: { id: string; label: string; price?: number | string; type?: string }[];
  placeholder: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const h = size === "xs" ? "h-7" : "h-8";
  const textSize = size === "xs" ? "text-xs" : "text-xs";

  const groupedOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    const groups: Record<string, typeof options> = {};
    sorted.forEach(o => {
      const type = o.type || 'outros';
      if (!groups[type]) groups[type] = [];
      groups[type].push(o);
    });
    return groups;
  }, [options]);

  const typeLabels: Record<string, string> = {
    waterfall: "Cachoeiras",
    experience: "Experiências",
    accommodation: "Hospedagens",
    logistics: "Logística",
    service: "Serviços",
    outros: "Outros"
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn(`${h} ${textSize} w-full justify-between font-normal bg-background`, className)}>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 z-[9999] max-h-[400px] overflow-hidden" align="start" onWheel={(e) => e.stopPropagation()}>
        <Command className="flex flex-col">
          <CommandInput placeholder="Buscar no catálogo..." className="h-8 text-xs" />
          <CommandList className="max-h-[350px] overflow-y-auto custom-scrollbar">
            <CommandEmpty className="py-3 text-xs text-center">Nenhum produto encontrado</CommandEmpty>
            {Object.entries(groupedOptions).map(([type, group]) => (
              <CommandGroup key={type} heading={typeLabels[type] || type.toUpperCase()}>
                {group.map(o => (
                  <CommandItem key={o.id} value={`${o.label} ${o.id}`} onSelect={() => { onSelect(o.id); setOpen(false); }} className="text-xs">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {value === o.id && <Check className="h-3 w-3 shrink-0 text-primary" />}
                        <span className={cn("font-medium", value === o.id ? "text-primary" : "")}>{o.label}</span>
                      </div>
                      {o.price !== undefined && (
                        <span className="text-[10px] font-bold text-muted-foreground ml-2">
                          R$ {typeof o.price === 'number' ? o.price.toFixed(0) : o.price}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


const ReplicatePopover = ({ numDays, dayNum, onReplicate }: { 
  numDays: number; 
  dayNum: number;
  onReplicate: (targetDays: number[]) => void;
}) => {
  const [selected, setSelected] = useState<number[]>([]);
  const otherDays = Array.from({ length: numDays }, (_, i) => i + 1).filter((d) => d !== dayNum);
  const allSelected = otherDays.length > 0 && otherDays.every((d) => selected.includes(d));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
          <Copy className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Replicar para:</span>
            <Button type="button" variant="link" className="h-auto p-0 text-[10px]" onClick={() => setSelected(allSelected ? [] : otherDays)}>
              {allSelected ? "Limpar" : "Todos"}
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {otherDays.map((d) => (
              <Button key={d} type="button" variant={selected.includes(d) ? "default" : "outline"} size="sm" className="h-7 text-[10px]" onClick={() => setSelected((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}>
                D{d}
              </Button>
            ))}
          </div>
        </div>
        {selected.length > 0 && (
          <Button type="button" size="sm" className="w-full text-xs" onClick={() => { onReplicate(selected); setSelected([]); }}>
            Aplicar ({selected.length})
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const DEFAULT_CATEGORIES = ["Cachoeira/Ingressos", "Experiências", "Hospedagens", "Serviços", "Guia ATMOS"];

const CATEGORY_COLORS: Record<string, string> = {
  "Cachoeira/Ingressos": "bg-blue-600",
  "Experiências": "bg-teal-500",
  "Hospedagens": "bg-purple-600",
  "Serviços": "bg-rose-500",
  "Guia ATMOS": "bg-amber-500",
};

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "Ingresso": "Cachoeira/Ingressos",
  "Cachoeira": "Cachoeira/Ingressos",
  "Cachoeira / Ingressos": "Cachoeira/Ingressos",
  "Cachoeira / Ingresso": "Cachoeira/Ingressos",
  "Guia": "Guia ATMOS",
  "Guia ATMOS": "Guia ATMOS",
  "Refeição": "Serviços",
  "Gastronomia": "Serviços",
  "Lanche Trilha": "Serviços",
  "Transfer": "Serviços",
  "Experiência": "Experiências",
  "Hospedagem": "Hospedagens",
};

const typeFilter = ["waterfall", "experience", "service", "accommodation", "gastronomia"];

// ─── Sortable Item Component ──────────────────────────────────────
const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      <div className="flex items-center gap-1">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 p-1 text-muted-foreground/20 hover:text-primary transition-colors touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};


export default function ItineraryFormDialog({ open, onOpenChange, product, allProducts, onSave, onDelete, isSaving }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: guides = [] } = useQuery({
    queryKey: ["active-guides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guides").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const isEdit = !!product;

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [category, setCategory] = useState("classico");
  const [subcategory, setSubcategory] = useState("");
  const [region, setRegion] = useState("");
  const [duration, setDuration] = useState(1);
  const [description, setDescription] = useState("");
  
  // Itinerary Logic State
  const [days, setDays] = useState<SavedDay[]>([
    { dayNumber: 1, items: [], guidePricing: {}, attractions: { pt: [] }, description: { pt: "" }, vehicle_type: "atmos4x4" }
  ]);
  const [openDays, setOpenDays] = useState<number[]>([1]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(20);
  const [atmosRevenue, setAtmosRevenue] = useState(0);
  const [guidePricingTiers, setGuidePricingTiers] = useState({
    atmos4x4: { p1: 0, p2: 0, p3plus: 0 },
    carroProprio: { p1: 0, p2: 0, p3plus: 0 }
  });
  const [activeModalities, setActiveModalities] = useState({ atmos4x4: true, carroProprio: true });
  const [guideId, setGuideId] = useState<string | null>(null);
  
  // SEO & Technical
  const [seoSlug, setSeoSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [galleryOrder, setGalleryOrder] = useState<string[]>([]);
  const [tempId, setTempId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const vars = (product?.variables || {}) as any;
    
    setName(product?.name || "");
    setIsActive(product?.is_active ?? true);
    setCategory(product?.category || "roteiro");
    setSubcategory("");
    setRegion("");
    setDuration((product as any)?.duration_days || 1);
    setDescription(product?.description || "");
    
    setSeoSlug(vars?.seo_slug || "");
    setSeoTitle(vars?.seo_title || "");
    setSeoDescription(vars?.seo_description || "");
    setFavorites(vars?.favorites || []);
    setGalleryOrder(vars?.gallery_order || []);
    if (product) {
      setTempId("");
    } else {
      setTempId(crypto.randomUUID());
    }
    setAtmosRevenue(vars?.atmosRevenue || 0);
    setTaxPercent(vars?.taxPercent || 0);
    setMarkupPercent(vars?.markupPercent || 20);
    const rawTiers = vars?.guidePricingTiers;
    if (rawTiers && (rawTiers.p1 !== undefined || rawTiers.p2 !== undefined)) {
      setGuidePricingTiers({
        atmos4x4: { p1: rawTiers.p1 || 0, p2: rawTiers.p2 || 0, p3plus: rawTiers.p3plus || 0 },
        carroProprio: { p1: rawTiers.p1 || 0, p2: rawTiers.p2 || 0, p3plus: rawTiers.p3plus || 0 }
      });
    } else {
      setGuidePricingTiers(vars?.guidePricingTiers || {
        atmos4x4: { p1: 0, p2: 0, p3plus: 0 },
        carroProprio: { p1: 0, p2: 0, p3plus: 0 }
      });
    }
    setActiveModalities(vars?.activeModalities || { atmos4x4: true, carroProprio: true });
    setGuideId(vars?.guide_id || null);

    if (vars?.days && Array.isArray(vars.days)) {
      setDays(vars.days.map((d: any, i: number) => {
        // Normalize attractions
        let normAttractions = { pt: [] as string[] };
        if (d.attractions?.pt) normAttractions = d.attractions;
        else if (Array.isArray(d.attractions)) normAttractions = { pt: d.attractions };
        else if (typeof d.attractions === 'string') normAttractions = { pt: [d.attractions] };

        // Normalize description
        let normDescription = { pt: "" };
        if (d.description?.pt) normDescription = d.description;
        else if (typeof d.description === 'string') normDescription = { pt: d.description };

        return {
          ...d,
          dayNumber: d.dayNumber || i + 1,
          vehicle_type: d.vehicle_type || "atmos4x4",
          hasGuide: d.hasGuide !== undefined ? d.hasGuide : true,
          attractions: normAttractions,
          description: normDescription,
          items: (d.items || []).map((it: any) => ({
            ...it,
            _uid: it._uid || Math.random().toString(36).substr(2, 9),
            category: LEGACY_CATEGORY_MAP[it.category] || it.category || "Serviços",
            qty: Number(it.qty) || 1,
            cost: Number(it.cost) || 0,
            value: Number(it.value) || 0
          }))
        };
      }));
      setOpenDays([1]);
    } else {
      setDays([{ dayNumber: 1, items: [], guidePricing: {}, attractions: { pt: [] }, description: { pt: "" }, vehicle_type: "atmos4x4" }]);
    }
  }, [open, product]);

  const addItem = (dayIdx: number, catalogItem: any) => {
    if (!catalogItem) return;
    const isGuide = catalogItem.daily_rate !== undefined;
    
    // Normalize variations/pricing
    const variations = (catalogItem.variables as any)?.variations || 
                      catalogItem.variations || 
                      (isGuide ? [{ id: catalogItem.id, unit_price: catalogItem.daily_rate, name: 'Diária' }] : []);
                      
    const defaultVariation = variations[0];
    const category = isGuide ? "Guia ATMOS" : (LEGACY_CATEGORY_MAP[catalogItem.category] || catalogItem.category || "Serviços");
    
    const getPrice = (item: any) => {
      if (isGuide) return item.daily_rate || 0;
      return Number(defaultVariation?.unit_price || item.unit_price || item.variables?.unit_price || 0);
    };

    const getCost = (item: any) => {
      if (isGuide) return item.daily_rate || 0;
      return Number(defaultVariation?.cost_price || item.cost_price || item.variables?.cost_price || 0);
    };

    const newItem: DayItem = {
      _uid: Math.random().toString(36).substr(2, 9),
      day_number: dayIdx + 1,
      day_label: `Dia ${dayIdx + 1}`,
      category,
      item_name: catalogItem.name,
      value: getPrice(catalogItem),
      cost: getCost(catalogItem),
      comissao: 0,
      value_text: "",
      description: catalogItem.description || "",
      catalog_item_id: catalogItem.id,
      variation_id: defaultVariation?.id || null,
      item_index: days[dayIdx].items.length,
      qty: 1,
      supplier_id: catalogItem.supplier_id,
      product_id: catalogItem.id,
      product_name: catalogItem.name,
      product_type: isGuide ? 'guide' : catalogItem.type
    };

    const newDays = [...days];
    newDays[dayIdx].items = [...newDays[dayIdx].items, newItem];
    setDays(newDays);

    // Virtual Gallery Logic
    const storageInfo = getStorageInfo(catalogItem);
    if (storageInfo) {
      const folder = (storageInfo as any).productFolder || storageInfo.folder;
      const estimatedImages = [
        `${folder}/${storageInfo.prefix}-1.jpg`,
        `${folder}/${storageInfo.prefix}-2.jpg`,
        `${folder}/${storageInfo.prefix}-3.jpg`,
        `${folder}/${storageInfo.prefix}-4.jpg`,
        `${folder}/${storageInfo.prefix}-5.jpg`,
      ];
      
      // Also check for explicit media in variables
      const existingMedia = (catalogItem.variables as any)?.media || (catalogItem.variables as any)?.favorites || [];
      
      setFavorites(prev => {
        const next = [...prev];
        [...estimatedImages, ...existingMedia].forEach(img => {
          if (img && !next.includes(img)) next.push(img);
        });
        return next.slice(0, 15); // Keep top 15
      });

      if (!newDays[dayIdx].imageKey) {
        newDays[dayIdx].imageKey = estimatedImages[0];
        setDays([...newDays]);
      }
    }
  };

  const removeItem = (dayIdx: number, itemUid: string) => {
    const newDays = [...days];
    newDays[dayIdx].items = newDays[dayIdx].items.filter(it => it._uid !== itemUid);
    setDays(newDays);
  };

  const updateItem = (dayIdx: number, itemUid: string, updates: Partial<DayItem>) => {
    const newDays = [...days];
    newDays[dayIdx].items = newDays[dayIdx].items.map(it => 
      it._uid === itemUid ? { ...it, ...updates } : it
    );
    setDays(newDays);
  };

  const replicateItems = (sourceDayIdx: number, targetDays: number[]) => {
    const itemsToCopy = days[sourceDayIdx].items.map(it => ({
      ...it,
      _uid: Math.random().toString(36).substr(2, 9)
    }));
    
    const newDays = [...days];
    targetDays.forEach(dNum => {
      const idx = dNum - 1;
      if (newDays[idx]) {
        newDays[idx].items = [...newDays[idx].items, ...itemsToCopy];
      }
    });
    setDays(newDays);
    toast({ title: "Itens replicados", description: `Copiados para os dias: ${targetDays.join(", ")}` });
  };

  const handleDragEnd = (event: any, dayIdx: number) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const newDays = [...days];
      const oldIndex = newDays[dayIdx].items.findIndex((it) => it._uid === active.id);
      const newIndex = newDays[dayIdx].items.findIndex((it) => it._uid === over.id);
      newDays[dayIdx].items = arrayMove(newDays[dayIdx].items, oldIndex, newIndex);
      setDays(newDays);
    }
  };

  const addDay = () => {
    const nextNum = days.length + 1;
    setDays([...days, { dayNumber: nextNum, items: [], guidePricing: {}, attractions: { pt: [] }, description: { pt: "" }, vehicle_type: "atmos4x4", hasGuide: true }]);
    setOpenDays([...openDays, nextNum]);
  };

  const removeDay = (idx: number) => {
    const newDays = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setDays(newDays.length > 0 ? newDays : [{ dayNumber: 1, items: [], guidePricing: {}, attractions: { pt: [] }, description: { pt: "" }, vehicle_type: "atmos4x4" }]);
  };

  const toggleDay = (dayNum: number) => {
    setOpenDays(prev => prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]);
  };

  const financialAnalysis = useMemo(() => {
    const guidedDays = days.filter(d => d.hasGuide !== false).length;

    const calculateForModality = (mod: 'atmos4x4' | 'carroProprio') => {
      const tiers = guidePricingTiers?.[mod] || { p1: 0, p2: 0, p3plus: 0 };
      
      const calculateForPax = (pax: number, guideRate: number) => {
        const guideRevenue = guideRate * pax * guidedDays;
        const atmosServiceRevenue = atmosRevenue * pax * days.length;
        
        let totalItemsCost = 0;
        let totalItemsRevenue = 0;
        
        days.forEach(day => {
          day.items.forEach(it => {
            const qty = it.qty || 1;
            totalItemsCost += (it.cost || 0) * qty;
            totalItemsRevenue += (it.value || 0) * qty;
          });
        });

        const revenuePreTax = totalItemsRevenue + guideRevenue + atmosServiceRevenue;
        const finalPrice = taxPercent > 0 ? revenuePreTax / (1 - taxPercent / 100) : revenuePreTax;

        return {
          guideRevenue,
          atmosServiceRevenue,
          totalItemsRevenue,
          totalCost: totalItemsCost,
          finalPrice,
          finalPricePerPax: finalPrice / pax
        };
      };

      return {
        p1: calculateForPax(1, tiers.p1),
        p2: calculateForPax(2, tiers.p2),
        p3: calculateForPax(3, tiers.p3plus),
        guidedDays
      };
    };

    return {
      atmos4x4: calculateForModality('atmos4x4'),
      carroProprio: calculateForModality('carroProprio'),
      itemList: days.flatMap(d => d.items.map(it => ({ ...it, dayNumber: d.dayNumber })))
    };
  }, [days, guidePricingTiers, atmosRevenue, taxPercent, markupPercent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      category,
      region,
      is_active: isActive,
      duration_days: days.length,
      variables: {
        duration: days.length,
        subcategory,
        days: days.map(d => ({
          ...d,
          attractions: { pt: d.attractions.pt },
          description: { pt: d.description.pt }
        })),
        seo_slug: seoSlug,
        seo_title: seoTitle,
        seo_description: seoDescription,
        favorites,
        gallery_order: galleryOrder,
        storage_id: tempId || product?.variables?.storage_id,
        atmosRevenue,
        taxPercent,
        markupPercent,
        guidePricingTiers,
        activeModalities,
        guide_id: guideId,
        pricing: {
          atmos4x4: {
            individual: financialAnalysis.atmos4x4.p1.finalPricePerPax,
            dupla: financialAnalysis.atmos4x4.p2.finalPricePerPax,
            trio: financialAnalysis.atmos4x4.p3.finalPricePerPax
          },
          carroProprio: {
            individual: financialAnalysis.carroProprio.p1.finalPricePerPax,
            dupla: financialAnalysis.carroProprio.p2.finalPricePerPax,
            trio: financialAnalysis.carroProprio.p3.finalPricePerPax
          }
        },
        guidedDays: financialAnalysis.atmos4x4.guidedDays // Saving this metadata too
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                {isEdit ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
              </div>
              <div>
                <span className="block text-primary">{isEdit ? "Editar Roteiro Atmos" : "Novo Roteiro Atmos"}</span>
                {isEdit && <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-50">Ref: {product.id.slice(0,8)}</span>}
              </div>
            </DialogTitle>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Status do Produto</span>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className={cn("text-xs font-bold uppercase tracking-tighter transition-colors", isActive ? "text-emerald-600" : "text-muted-foreground")}>
                    {isActive ? "Ativo no Site" : "Inativo / Rascunho"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form className="flex-1 flex flex-col min-h-0 bg-[#FDFCFB]" onSubmit={handleSubmit}>
          <Tabs defaultValue="definition" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b bg-white/50 backdrop-blur-sm z-10 sticky top-0">
              <TabsList className="bg-transparent h-14 w-full justify-start gap-8 rounded-none p-0">
                <TabsTrigger value="definition" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 px-1 text-sm font-bold uppercase tracking-widest transition-all">
                  <LayoutGrid className="h-4 w-4 mr-2 opacity-50" /> Definição
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 px-1 text-sm font-bold uppercase tracking-widest transition-all">
                  <CircleDollarSign className="h-4 w-4 mr-2 opacity-50" /> Precificação
                </TabsTrigger>
                <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 px-1 text-sm font-bold uppercase tracking-widest transition-all">
                  <ImageIcon className="h-4 w-4 mr-2 opacity-50" /> Mídia & Galeria
                </TabsTrigger>
                <TabsTrigger value="seo" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 px-1 text-sm font-bold uppercase tracking-widest transition-all">
                  <Search className="h-4 w-4 mr-2 opacity-50" /> SEO & Técnico
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <TabsContent value="definition" className="mt-0 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    <section className="space-y-4 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Informações Gerais</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-tight ml-1">Título do Roteiro</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12 text-lg font-sans rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20" placeholder="Ex: Chapada das Águas" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-primary/[0.02] rounded-2xl border border-primary/5">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Ativo no Site</Label>
                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">Exibir este roteiro para os clientes</p>
                          </div>
                          <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-tight ml-1">Descrição Comercial (Curta)</Label>
                          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[140px] rounded-[1.5rem] bg-muted/30 border-none resize-none text-sm leading-relaxed p-4" placeholder="Uma breve introdução que encante o cliente..." />
                        </div>
                      </div>
                    </section>
                    <section className="bg-primary/5 p-4 rounded-3xl border border-primary/10 flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-sans text-primary">Duração da Jornada</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">Atualmente configurado para</p>
                      </div>
                      <div className="text-4xl font-sans text-primary leading-none">{days.length} <span className="text-xs font-black uppercase tracking-widest opacity-40">Dias</span></div>
                      <Button type="button" onClick={addDay} className="w-full h-10 rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-md">
                        Adicionar Novo Dia
                      </Button>
                    </section>
                  </div>
                  <div className="col-span-12 lg:col-span-8 space-y-4">
                    {days.map((day, dIdx) => (
                      <Collapsible key={day.dayNumber} open={openDays.includes(day.dayNumber)} onOpenChange={() => toggleDay(day.dayNumber)}>
                        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md">
                          <CollapsibleTrigger asChild>
                            <div className="p-6 flex items-center justify-between cursor-pointer group select-none">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex flex-col items-center justify-center text-[#1A261B] group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">DIA</span>
                                  <span className="text-2xl font-sans leading-none">{day.dayNumber}</span>
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xl font-sans text-primary leading-tight">
                                    {day.attractions.pt?.[0] || "Dia Vazio"}
                                  </h4>
                                    <Badge variant="outline" className="text-[8px] font-black uppercase border-black/10 text-muted-foreground/60 tracking-widest">
                                      {day.items.length} Itens
                                    </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ReplicatePopover numDays={days.length} dayNum={day.dayNumber} onReplicate={(targets) => replicateItems(dIdx, targets)} />
                                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                  <ChevronDown className={cn("h-5 w-5 transition-transform duration-500", openDays.includes(day.dayNumber) && "rotate-180")} />
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-6 pt-1 space-y-6 animate-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 ml-1">Título do Dia</Label>
                                    <Input value={day.attractions.pt?.[0] || ""} onChange={(e) => {
                                      const newDays = [...days];
                                      newDays[dIdx].attractions.pt = [e.target.value];
                                      setDays(newDays);
                                    }} className="h-11 rounded-xl bg-muted/20 border-none font-medium" placeholder="Ex: Complexo do Macacão" />
                                  </div>
                                  <div className="flex items-center justify-between p-4 bg-muted/5 rounded-2xl border border-black/5 self-end">
                                    <div className="flex items-center gap-3">
                                      <div className={cn("p-2 rounded-lg transition-colors", day.hasGuide !== false ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground opacity-30")}>
                                        <UsersRound className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] font-black uppercase tracking-tighter leading-none">Guia Atmos</p>
                                        <p className="text-[9px] text-muted-foreground opacity-60 font-medium">Incluir custo no dia</p>
                                      </div>
                                    </div>
                                    <Switch checked={day.hasGuide !== false} onCheckedChange={(v) => {
                                      const newDays = [...days];
                                      newDays[dIdx].hasGuide = v;
                                      setDays(newDays);
                                    }} />
                                  </div>
                                </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 ml-1">Descrição Detalhada do Dia</Label>
                                <Textarea 
                                  value={day.description.pt || ""} 
                                  onChange={(e) => {
                                    const newDays = [...days];
                                    newDays[dIdx].description.pt = e.target.value;
                                    setDays(newDays);
                                  }} 
                                  className="min-h-[100px] rounded-2xl bg-muted/20 border-none resize-none text-sm leading-relaxed p-4" 
                                  placeholder="Descreva a experiência deste dia em detalhes..." 
                                />
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Itens & Experiências</Label>
                                  <SearchableCatalogCombobox 
                                    value={null} 
                                    onSelect={(pid) => {
                                      const item = allProducts.find(p => p.id === pid) || guides.find(g => g.id === pid);
                                      addItem(dIdx, item);
                                    }} 
                                    options={[
                                      ...allProducts.filter(p => typeFilter.includes(p.type)).map(p => ({ 
                                        id: p.id, 
                                        label: p.name, 
                                        price: (p.variables as any)?.variations?.[0]?.unit_price, 
                                        type: p.type 
                                      })),
                                      ...guides.map(g => ({ 
                                        id: g.id, 
                                        label: `GUIA: ${g.name}`, 
                                        price: g.daily_rate, 
                                        type: 'experience' // Using experience type for styling
                                      }))
                                    ]} 
                                    placeholder="Buscar no catálogo..." 
                                    className="w-56" 
                                  />
                                </div>
                                <div className="space-y-2 min-h-[50px] bg-muted/10 rounded-3xl p-4 border border-dashed border-black/5">
                                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, dIdx)}>
                                    <SortableContext items={day.items.map(it => it._uid)} strategy={verticalListSortingStrategy}>
                                      {day.items.map((item) => (
                                        <SortableItem key={item._uid} id={item._uid}>
                                          <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-black/5 shadow-sm group/item">
                                            <div className="flex items-center gap-3">
                                              <div className={cn("w-1.5 h-10 rounded-full shrink-0", CATEGORY_COLORS[item.category] || "bg-muted")} />
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-bold text-primary truncate">{item.item_name}</span>
                                                  <Badge variant="outline" className="text-[9px] h-4 font-black uppercase border-black/5 text-muted-foreground/40 tracking-widest">{item.category}</Badge>
                                                </div>
                                                <VariationSelect 
                                                  productId={item.product_id || item.catalog_item_id || ""} 
                                                  value={item.variation_id} 
                                                  onSelect={(vid) => {
                                                    const prod = allProducts.find(p => p.id === (item.product_id || item.catalog_item_id));
                                                    const variation = (prod?.variables as any)?.variations?.find((v: any) => v.id === vid);
                                                    if (variation) {
                                                      updateItem(dIdx, item._uid, { 
                                                        variation_id: vid, 
                                                        value: variation.unit_price, 
                                                        cost: variation.cost_price 
                                                      });
                                                    }
                                                  }} 
                                                  allProducts={allProducts}
                                                  className="mt-1 w-fit min-w-[150px] h-7"
                                                />
                                              </div>
                                              <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[8px] font-black text-muted-foreground/40 uppercase mb-0.5 tracking-tighter">Qtd</span>
                                                  <NumericCell value={item.qty} onCommit={(v) => updateItem(dIdx, item._uid, { qty: v })} className="w-12 h-7 text-center text-xs font-bold rounded-lg border-none bg-muted/40 p-0" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="text-[8px] font-black text-muted-foreground/40 uppercase mb-0.5 tracking-tighter">Venda</span>
                                                  <NumericCell 
                                                    value={item.value} 
                                                    onCommit={(v) => updateItem(dIdx, item._uid, { value: v })} 
                                                    className="w-20 h-7 text-right text-xs font-mono font-bold text-[#C5A267] bg-[#C5A267]/5 border-none rounded-lg p-0 pr-2" 
                                                  />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="text-[8px] font-black text-muted-foreground/40 uppercase mb-0.5 tracking-tighter">Custo</span>
                                                  <NumericCell 
                                                    value={item.cost} 
                                                    onCommit={(v) => updateItem(dIdx, item._uid, { cost: v })} 
                                                    className="w-20 h-7 text-right text-xs font-mono font-bold text-primary bg-muted/40 border-none rounded-lg p-0 pr-2" 
                                                  />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover/item:opacity-100" onClick={() => removeItem(dIdx, item._uid)}>
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="px-4 py-2 bg-muted/20 rounded-xl">
                                               <Textarea 
                                                value={item.description} 
                                                onChange={(e) => updateItem(dIdx, item._uid, { description: e.target.value })}
                                                className="min-h-[40px] text-[10px] leading-relaxed border-none bg-transparent p-0 resize-none focus-visible:ring-0" 
                                                placeholder="Observação específica para este item..." 
                                              />
                                            </div>
                                          </div>
                                        </SortableItem>
                                      ))}
                                    </SortableContext>
                                  </DndContext>
                                  {day.items.length === 0 && (
                                    <div className="py-6 text-center text-muted-foreground/30 font-medium italic text-xs">Arraste itens aqui ou use a busca acima</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end pt-4 border-t border-dashed border-black/5">
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeDay(dIdx)} className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl px-4">
                                  <Trash2 className="h-3 w-3 mr-2" /> Remover Dia Completo
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    <Button type="button" variant="outline" onClick={addDay} className="w-full h-16 rounded-[2.5rem] border-dashed border-2 border-black/5 hover:border-primary/20 hover:bg-primary/5 transition-all text-muted-foreground font-sans text-lg">
                      <Plus className="h-5 w-5 mr-3" /> Clique para expandir a jornada
                    </Button>
                  </div>
                </div>
              </TabsContent>
               <TabsContent value="pricing" className="mt-0 p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="max-w-5xl mx-auto space-y-8">
                  
                  {/* ── SEÇÃO 1: CONFIGURAÇÕES GERAIS DE MARGEM ── */}
                  <section className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-primary italic tracking-tight uppercase">Configurações de Venda</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Defina as margens e serviços base para o roteiro</p>
                      </div>
                      
                      <div className="bg-[#FDFCFB] p-1.5 rounded-full border border-black/5 flex items-center gap-2 shadow-inner">
                        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500", activeModalities.atmos4x4 ? "bg-primary text-white shadow-lg" : "opacity-40 grayscale")}>
                          <Switch checked={activeModalities.atmos4x4} onCheckedChange={(v) => setActiveModalities(p => ({ ...p, atmos4x4: v }))} className="scale-75" />
                          <span className="text-[9px] font-black uppercase tracking-tighter leading-none">Atmos 4x4</span>
                        </div>
                        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500", activeModalities.carroProprio ? "bg-orange-600 text-white shadow-lg" : "opacity-40 grayscale")}>
                          <Switch checked={activeModalities.carroProprio} onCheckedChange={(v) => setActiveModalities(p => ({ ...p, carroProprio: v }))} className="scale-75" />
                          <span className="text-[9px] font-black uppercase tracking-tighter leading-none">Carro Próprio</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-black/5">
                      <div className="space-y-2 p-4 bg-muted/5 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <UsersRound className="h-3 w-3 text-primary opacity-40" />
                          <Label className="text-[9px] font-black uppercase tracking-widest">Serviço Atmos (p/ dia/pax)</Label>
                        </div>
                        <div className="relative">
                          <NumericCell value={atmosRevenue} onCommit={setAtmosRevenue} className="h-11 bg-white border-none text-base font-bold rounded-xl shadow-sm pl-10" />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary opacity-20">R$</span>
                        </div>
                      </div>

                      <div className="space-y-2 p-4 bg-muted/5 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Percent className="h-3 w-3 text-primary opacity-40" />
                          <Label className="text-[9px] font-black uppercase tracking-widest">Impostos (%)</Label>
                        </div>
                        <div className="relative">
                          <NumericCell value={taxPercent} onCommit={setTaxPercent} className="h-11 bg-white border-none text-base font-bold rounded-xl shadow-sm pr-10" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary opacity-20">%</span>
                        </div>
                      </div>

                      <div className="space-y-2 p-4 bg-muted/5 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <TrendingUp className="h-3 w-3 text-primary opacity-40" />
                          <Label className="text-[9px] font-black uppercase tracking-widest">Markup (%)</Label>
                        </div>
                        <div className="relative">
                          <NumericCell value={markupPercent} onCommit={setMarkupPercent} className="h-11 bg-white border-none text-base font-bold rounded-xl shadow-sm pr-10" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary opacity-20">%</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ── SEÇÃO 2: DETALHAMENTO POR MODALIDADE ── */}
                  <div className="grid grid-cols-1 gap-12">
                    {(['atmos4x4', 'carroProprio'] as const).map(mod => {
                      if (!activeModalities[mod]) return null;
                      const analysis = financialAnalysis[mod];
                      const label = mod === 'atmos4x4' ? 'Atmos 4x4' : 'Carro Próprio';
                      const colorClass = mod === 'atmos4x4' ? 'text-primary' : 'text-orange-600';
                      const bgClass = mod === 'atmos4x4' ? 'bg-primary/5' : 'bg-orange-50';

                      return (
                        <section key={mod} className="animate-in fade-in zoom-in duration-500">
                          <div className="bg-white rounded-[2rem] border border-black/5 shadow-2xl overflow-hidden">
                            <div className={cn("p-6 flex items-center justify-between", bgClass)}>
                              <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-2xl bg-white shadow-sm", colorClass)}>
                                  {mod === 'atmos4x4' ? <Truck className="h-6 w-6" /> : <Car className="h-6 w-6" />}
                                </div>
                                <h4 className="text-2xl font-black italic tracking-tighter uppercase">{label}</h4>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Análise de Faturamento</p>
                                <p className="text-xl font-black text-primary italic leading-none">{days.length} DIAS ({analysis.guidedDays} GUIADOS)</p>
                              </div>
                            </div>

                            <div className="p-6 space-y-8">
                              {/* Configuração do Guia */}
                              <div className="space-y-6">
                                <div className="flex items-center gap-3 pb-3 border-b border-black/5">
                                   <UsersRound className="h-5 w-5 opacity-40" />
                                  <h5 className="text-sm font-black uppercase tracking-widest">Diária Guia Atmos ({label})</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {[
                                    { k: 'p1', label: '1 Pessoa' },
                                    { k: 'p2', label: '2 Pessoas' },
                                    { k: 'p3plus', label: '3 ou +' }
                                  ].map(pax => (
                                    <div key={pax.k} className="space-y-1.5">
                                      <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">{pax.label} (R$)</Label>
                                      <NumericCell 
                                        value={guidePricingTiers[mod][pax.k as keyof typeof guidePricingTiers['atmos4x4']]} 
                                        onCommit={(v) => setGuidePricingTiers(p => ({ ...p, [mod]: { ...p[mod], [pax.k]: v } }))} 
                                        className="h-10 bg-muted/10 border-none font-bold text-base rounded-lg"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Tabela de Itens Integrada */}
                              <div className="space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                                  <div className="flex items-center gap-3">
                                     <LayoutGrid className="h-5 w-5 opacity-40" />
                                    <h5 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Composição de Preços</h5>
                                  </div>
                                </div>
                                
                                <div className="overflow-hidden rounded-2xl border border-black/5">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-muted/10 text-left">
                                        <th className="p-4 font-black uppercase tracking-widest">Item</th>
                                        <th className="p-4 font-black uppercase tracking-widest text-center">Dia</th>
                                        <th className="p-4 font-black uppercase tracking-widest text-right">Custo</th>
                                        <th className="p-4 font-black uppercase tracking-widest text-right">Venda</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                      {financialAnalysis.itemList.map((it) => (
                                        <tr key={it._uid} className="hover:bg-muted/5 transition-colors">
                                          <td className="p-4 font-bold">{it.item_name}</td>
                                          <td className="p-4 text-center opacity-60 italic">{it.dayNumber}</td>
                                          <td className="p-4 text-right font-mono opacity-60">{fmtBRL((it.cost || 0) * (it.qty || 1))}</td>
                                          <td className="p-4 text-right font-bold">{fmtBRL((it.value || 0) * (it.qty || 1))}</td>
                                        </tr>
                                      ))}
                                      <tr className="bg-primary/[0.02]">
                                        <td colSpan={3} className="p-4 text-right font-bold uppercase tracking-widest opacity-40">Custo Total Itens</td>
                                        <td className="p-4 text-right font-black text-primary">{fmtBRL(analysis.p1.totalCost)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* RESULTADO FINAL POR VARIAÇÃO */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {(['p1', 'p2', 'p3'] as const).map(tier => {
                                  const data = analysis[tier];
                                  const tierLabel = tier === 'p1' ? '1 Pessoa' : tier === 'p2' ? '2 Pessoas' : '3+ Pessoas';
                                  
                                  return (
                                    <div key={tier} className="p-5 rounded-[2rem] border border-black/5 bg-white flex flex-col items-center text-center space-y-3 shadow-md transition-all hover:scale-105 hover:border-primary/20 hover:shadow-xl">
                                      <div className="p-2 rounded-xl bg-muted/5 shadow-sm mb-1">
                                         <UsersRound className="h-5 w-5 text-muted-foreground opacity-60" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{tierLabel}</p>
                                        <h6 className="text-2xl font-black italic tracking-tighter text-primary">{fmtBRL(data.finalPricePerPax, 0)}<span className="text-xs not-italic opacity-40 ml-1">/PAX</span></h6>
                                      </div>
                                      <div className="w-full pt-4 border-t border-black/5 space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                          <span className="opacity-40">Total Itens</span>
                                          <span>{fmtBRL(data.totalItemsRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                          <span className="opacity-40">Guia Atmos</span>
                                          <span>{fmtBRL(data.guideRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                          <span className="opacity-40">Serviço Atmos</span>
                                          <span>{fmtBRL(data.atmosServiceRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pt-2 text-primary">
                                          <span>Total Venda</span>
                                          <span>{fmtBRL(data.finalPrice)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="media" className="mt-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {product || name.trim() ? (
                  <div className="max-w-5xl mx-auto">
                    <ProductMediaTab 
                      product={{ 
                        ...product, 
                        name, 
                        type: "itinerary", 
                        id: product?.id || "",
                        variables: { 
                          ...product?.variables, 
                          favorites, 
                          gallery_order: galleryOrder,
                          storage_id: tempId || product?.variables?.storage_id 
                        } 
                      } as any} 
                      onFavoriteToggle={(file) => setFavorites(prev => prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file])}
                      onOrderChange={(newOrder) => setGalleryOrder(newOrder)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-[3rem] border-2 border-dashed border-black/5 text-center">
                    <ImageIcon className="h-16 w-16 mb-6 opacity-10" />
                    <h4 className="text-xl font-sans text-primary">Identidade Visual do Roteiro</h4>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="seo" className="mt-0 p-8 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                  <section className="space-y-8">
                    <div className="flex items-center gap-3 pb-3 border-b border-black/5">
                      <Search className="h-5 w-5 text-primary" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Visibilidade & SEO</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-amber-600/80">URL Slug</Label>
                        <Input value={seoSlug} onChange={(e) => setSeoSlug(e.target.value)} className="h-11 bg-muted/20 border-none font-mono text-xs text-amber-700" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-tight">Meta Title</Label>
                        <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="h-11 bg-muted/20 border-none" />
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>
            </div>
            <DialogFooter className="p-8 bg-[#FDFCFB] border-t flex items-center justify-between z-20">
              <div className="flex gap-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving || !name.trim()} className="h-12 px-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 min-w-[200px]">
                  {isSaving ? "Sincronizando..." : isEdit ? "Salvar Alterações" : "Criar Roteiro Atmos"}
                </Button>
              </div>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
