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
import { Trash2, Plus, ChevronDown, Pencil, Search, Package, RefreshCw, ImageIcon, UsersRound, X, Compass, GripVertical, Copy, Check, ChevronsUpDown, Route, Info, LayoutGrid, List, AlertCircle, CalendarIcon, Truck, Car, CalendarDays, CircleDollarSign, TrendingUp, AlertTriangle, Calculator, Percent } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Product } from "./shared";
import { productTypeLabels, slugify, getStorageInfo } from "./shared";
import { ProductMediaTab } from "./ProductMediaTab";
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
  pricing: Pricing;
  atmosRevenue?: number;
  taxPercent?: number;
  markupPercent?: number;
  partnerCommission?: number;
  extraCosts?: {
    entranceFees: number;
    equipmentFees: number;
  };
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
          <CommandList className="max-h-[350px] overflow-y-auto">
            <CommandEmpty className="py-3 text-xs text-center">Nenhum produto encontrado</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.id} value={`${o.label} ${o.id}`} onSelect={() => { onSelect(o.id); setOpen(false); }} className="text-xs">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {value === o.id && <Check className="h-3 w-3 shrink-0 text-primary" />}
                      <div className={cn("px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter", 
                        o.type === 'waterfall' ? 'bg-blue-100 text-blue-700' : 
                        o.type === 'experience' ? 'bg-teal-100 text-teal-700' : 'bg-muted text-muted-foreground'
                      )}>
                        {o.type}
                      </div>
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
  const [numPeople, setNumPeople] = useState(2);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(20);
  const [atmosRevenue, setAtmosRevenue] = useState(0);
  const [partnerCommission, setPartnerCommission] = useState(0);
  const [extraCosts, setExtraCosts] = useState({ entranceFees: 0, equipmentFees: 0 });
  const [guideId, setGuideId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing>({
    atmos4x4: { individual: 0, dupla: 0, trio: 0 },
    carroProprio: { individual: 0, dupla: 0, trio: 0 }
  });
  
  // SEO & Technical
  const [seoSlug, setSeoSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const vars = (product?.variables || {}) as any;
    
    setName(product?.name || "");
    setIsActive(product?.is_active ?? true);
    setCategory(product?.category || "classico");
    setSubcategory(vars?.subcategory || "");
    setRegion((product as any)?.region || "");
    setDuration((product as any)?.duration_days || 1);
    setDescription(product?.description || "");
    
    setSeoSlug(vars?.seo_slug || "");
    setSeoTitle(vars?.seo_title || "");
    setSeoDescription(vars?.seo_description || "");
    setFavorites(vars?.favorites || []);
    setAtmosRevenue(vars?.atmosRevenue || 0);
    setTaxPercent(vars?.taxPercent || 0);
    setMarkupPercent(vars?.markupPercent || 20);
    setPartnerCommission(vars?.partnerCommission || 0);
    setExtraCosts(vars?.extraCosts || { entranceFees: 0, equipmentFees: 0 });
    setGuideId(vars?.guide_id || null);

    if (vars?.pricing) {
      setPricing({
        atmos4x4: { 
          individual: vars.pricing.atmos4x4?.individual || 0,
          dupla: vars.pricing.atmos4x4?.dupla || 0,
          trio: vars.pricing.atmos4x4?.trio || 0
        },
        carroProprio: {
          individual: vars.pricing.carroProprio?.individual || 0,
          dupla: vars.pricing.carroProprio?.dupla || 0,
          trio: vars.pricing.carroProprio?.trio || 0
        }
      });
    } else {
      setPricing({
        atmos4x4: { individual: 0, dupla: 0, trio: 0 },
        carroProprio: { individual: 0, dupla: 0, trio: 0 }
      });
    }

    if (vars?.days && vars.days.length > 0) {
      setDays(vars.days.map((d: any, i: number) => ({
        ...d,
        dayNumber: d.dayNumber || i + 1,
        vehicle_type: d.vehicle_type || "atmos4x4",
        items: (d.items || []).map((it: any) => ({
          ...it,
          _uid: it._uid || Math.random().toString(36).substr(2, 9),
          category: LEGACY_CATEGORY_MAP[it.category] || it.category || "Serviços"
        }))
      })));
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
    setDays([...days, { dayNumber: nextNum, items: [], guidePricing: {}, attractions: { pt: [] }, description: { pt: "" }, vehicle_type: "atmos4x4" }]);
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
    const analysis = {
      atmos4x4: { totalCost: 0, totalCommission: 0, itemRevenue: 0 },
      carroProprio: { totalCost: 0, totalCommission: 0, itemRevenue: 0 }
    };

    days.forEach(day => {
      day.items.forEach(it => {
        const qty = it.qty || 1;
        const cost = (it.cost || 0) * qty;
        const rev = (it.value || 0) * qty;
        const comm = cost * ((it.comissao || 0) / 100);

        // For itineraries, we typically sum costs for both modes unless specified
        analysis.atmos4x4.totalCost += cost;
        analysis.atmos4x4.totalCommission += comm;
        analysis.atmos4x4.itemRevenue += rev;

        analysis.carroProprio.totalCost += cost;
        analysis.carroProprio.totalCommission += comm;
        analysis.carroProprio.itemRevenue += rev;
      });
    });

    // Add extra costs
    analysis.atmos4x4.totalCost += (extraCosts.entranceFees || 0) + (extraCosts.equipmentFees || 0);
    analysis.carroProprio.totalCost += (extraCosts.entranceFees || 0) + (extraCosts.equipmentFees || 0);

    return analysis;
  }, [days, extraCosts]);

  const calculateSuggestedPrice = (modality: 'atmos4x4' | 'carroProprio', pax: number) => {
    const data = financialAnalysis[modality];
    const baseCost = data.totalCost / (pax || 1);
    const revPerPax = data.itemRevenue / (pax || 1);
    const atmosRevPerPax = atmosRevenue / (pax || 1);
    
    // The total value is the sum of item revenues + atmos service
    // If we want a suggested price based on costs and markup, we can do it differently,
    // but usually in itineraries, the items have their own sale prices.
    const nfBase = revPerPax + atmosRevPerPax;
    const total = taxPercent > 0 ? nfBase / (1 - taxPercent / 100) : nfBase;
    
    return total * (1 + markupPercent / 100);
  };

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
        pricing,
        atmosRevenue,
        taxPercent,
        markupPercent,
        partnerCommission,
        extraCosts,
        guide_id: guideId
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
              <TabsContent value="definition" className="mt-0 p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section className="space-y-6 bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Informações Gerais</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-tight ml-1">Título do Roteiro</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12 text-lg font-display rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20" placeholder="Ex: Chapada das Águas" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-tight ml-1">Região</Label>
                            <Select value={region} onValueChange={setRegion}>
                              <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-medium text-xs">
                                <SelectValue placeholder="Escolher" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(regionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-tight ml-1">Categoria</Label>
                            <Select value={category} onValueChange={setCategory}>
                              <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-medium text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classico">Clássico</SelectItem>
                                <SelectItem value="jurassico">Jurássico</SelectItem>
                                <SelectItem value="expedicao">Expedição</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <Label className="text-xs font-bold uppercase tracking-tight ml-1">Guia Sugerido</Label>
                          <Select value={guideId || "none"} onValueChange={(v) => setGuideId(v === "none" ? null : v)}>
                            <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-medium text-xs text-primary">
                              <SelectValue placeholder="Selecione um guia..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                              <SelectItem value="none" className="text-muted-foreground italic">Nenhum selecionado</SelectItem>
                              {guides.map(g => (
                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                    <section className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <CalendarDays className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-lg font-display text-primary">Duração da Jornada</h4>
                        <p className="text-xs text-muted-foreground font-medium">Atualmente configurado para</p>
                      </div>
                      <div className="text-5xl font-display text-primary leading-none">{days.length} <span className="text-sm font-black uppercase tracking-widest opacity-40">Dias</span></div>
                      <Button type="button" onClick={addDay} className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-md">
                        Adicionar Novo Dia
                      </Button>
                    </section>
                  </div>
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    {days.map((day, dIdx) => (
                      <Collapsible key={day.dayNumber} open={openDays.includes(day.dayNumber)} onOpenChange={() => toggleDay(day.dayNumber)}>
                        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md">
                          <CollapsibleTrigger asChild>
                            <div className="p-6 flex items-center justify-between cursor-pointer group select-none">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex flex-col items-center justify-center text-[#1A261B] group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">DIA</span>
                                  <span className="text-2xl font-display leading-none">{day.dayNumber}</span>
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xl font-display text-primary leading-tight">
                                    {day.attractions.pt?.[0] || "Dia Vazio"}
                                  </h4>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-[8px] font-black uppercase border-black/10 text-muted-foreground/60 tracking-widest">
                                      {day.items.length} Itens
                                    </Badge>
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                      {day.vehicle_type === 'atmos4x4' ? <Truck className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                                      {day.vehicle_type === 'atmos4x4' ? 'Atmos 4x4' : 'Veículo Próprio'}
                                    </div>
                                  </div>
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
                            <div className="p-8 pt-2 space-y-8 animate-in slide-in-from-top-4 duration-500">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 ml-1">Título do Dia</Label>
                                  <Input value={day.attractions.pt?.[0] || ""} onChange={(e) => {
                                    const newDays = [...days];
                                    newDays[dIdx].attractions.pt = [e.target.value];
                                    setDays(newDays);
                                  }} className="h-11 rounded-xl bg-muted/20 border-none font-medium" placeholder="Ex: Complexo do Macacão" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 ml-1">Logística do Dia</Label>
                                  <Select value={day.vehicle_type} onValueChange={(v) => {
                                    const newDays = [...days];
                                    newDays[dIdx].vehicle_type = v;
                                    setDays(newDays);
                                  }}>
                                    <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-semibold text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="atmos4x4">ATMOS 4x4 (Expedição)</SelectItem>
                                      <SelectItem value="carroProprio">Carro Próprio (Turista)</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                    <Button type="button" variant="outline" onClick={addDay} className="w-full h-16 rounded-[2.5rem] border-dashed border-2 border-black/5 hover:border-primary/20 hover:bg-primary/5 transition-all text-muted-foreground font-display text-lg">
                      <Plus className="h-5 w-5 mr-3" /> Clique para expandir a jornada
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="pricing" className="mt-0 p-8 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* ── SEÇÃO 1: SIMULADOR DE VENDA ── */}
                  <section className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm space-y-8 relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="space-y-1">
                        <h3 className="text-3xl font-display text-primary leading-tight italic">Simulador de Venda</h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">Ajuste as margens para calcular o preço final</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted/30 p-1 rounded-xl flex">
                          {[1, 2, 4, 6].map(n => (
                            <button key={n} type="button" onClick={() => setNumPeople(n)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black transition-all", numPeople === n ? "bg-white text-primary shadow-sm" : "text-muted-foreground/60 hover:text-primary")}>
                              {n}P
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                      <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-black/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Serviço ATMOS (R$)</Label>
                        <NumericCell value={atmosRevenue} onCommit={setAtmosRevenue} className="h-10 text-lg font-display bg-white border-black/5 rounded-xl" />
                      </div>
                      <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-black/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Imposto (%)</Label>
                        <NumericCell value={taxPercent} onCommit={setTaxPercent} className="h-10 text-lg font-display bg-white border-black/5 rounded-xl" />
                      </div>
                      <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-black/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Margem Alvo (%)</Label>
                        <NumericCell value={markupPercent} onCommit={setMarkupPercent} className="h-10 text-lg font-display bg-white border-black/5 rounded-xl" />
                      </div>
                      <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-black/5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Comissão Parceiro (%)</Label>
                        <NumericCell value={partnerCommission} onCommit={setPartnerCommission} className="h-10 text-lg font-display bg-white border-black/5 rounded-xl" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="space-y-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-amber-700/60">Ingressos (Custo Total R$)</Label>
                        <NumericCell value={extraCosts.entranceFees} onCommit={(v) => setExtraCosts(prev => ({ ...prev, entranceFees: v }))} className="h-10 text-lg font-display bg-white border-amber-100 rounded-xl" />
                      </div>
                      <div className="space-y-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-amber-700/60">Equipamentos (Custo Total R$)</Label>
                        <NumericCell value={extraCosts.equipmentFees} onCommit={(v) => setExtraCosts(prev => ({ ...prev, equipmentFees: v }))} className="h-10 text-lg font-display bg-white border-amber-100 rounded-xl" />
                      </div>
                    </div>
                  </section>

                  {/* ── SEÇÃO 2: DRE / ANÁLISE FINANCEIRA ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Atmos 4x4 Analysis */}
                    <section className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white">
                          <Truck className="h-5 w-5" />
                        </div>
                        <h4 className="font-display text-xl text-primary">Análise 4x4</h4>
                      </div>
                      
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Venda de Itens (Total)</span>
                            <span className="text-[#C5A267]">{fmtBRL(financialAnalysis.atmos4x4.itemRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Custo de Itens (Total)</span>
                            <span>{fmtBRL(financialAnalysis.atmos4x4.totalCost)}</span>
                          </div>
                        <div className="flex justify-between text-xs font-medium text-emerald-600">
                          <span>Comissões Fornecedores (+)</span>
                          <span>{fmtBRL(financialAnalysis.atmos4x4.totalCommission)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                          <span>Imposto ({taxPercent}%)</span>
                          <span className="text-rose-500">- {fmtBRL((calculateSuggestedPrice('atmos4x4', numPeople) * (taxPercent/100)))}</span>
                        </div>
                        <div className="pt-3 border-t border-black/5 flex justify-between items-end">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block">Sugestão de Venda /pax</span>
                            <div className="text-2xl font-display text-primary">{fmtBRL(calculateSuggestedPrice('atmos4x4', numPeople))}</div>
                          </div>
                          <Badge className="bg-primary/10 text-primary border-none text-[10px] h-6 px-3">
                            Lucro: {markupPercent}%
                          </Badge>
                        </div>
                      </div>
                    </section>

                    {/* Carro Próprio Analysis */}
                    <section className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                          <Car className="h-5 w-5" />
                        </div>
                        <h4 className="font-display text-xl text-orange-600">Análise Carro Próprio</h4>
                      </div>
                      
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Venda de Itens (Total)</span>
                            <span className="text-[#C5A267]">{fmtBRL(financialAnalysis.carroProprio.itemRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Custo de Itens (Total)</span>
                            <span>{fmtBRL(financialAnalysis.carroProprio.totalCost)}</span>
                          </div>
                        <div className="flex justify-between text-xs font-medium text-emerald-600">
                          <span>Comissões Fornecedores (+)</span>
                          <span>{fmtBRL(financialAnalysis.carroProprio.totalCommission)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                          <span>Imposto ({taxPercent}%)</span>
                          <span className="text-rose-500">- {fmtBRL((calculateSuggestedPrice('carroProprio', numPeople) * (taxPercent/100)))}</span>
                        </div>
                        <div className="pt-3 border-t border-black/5 flex justify-between items-end">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block">Sugestão de Venda /pax</span>
                            <div className="text-2xl font-display text-orange-600">{fmtBRL(calculateSuggestedPrice('carroProprio', numPeople))}</div>
                          </div>
                          <Badge className="bg-orange-50 text-orange-600 border-none text-[10px] h-6 px-3">
                            Lucro: {markupPercent}%
                          </Badge>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* ── SEÇÃO 3: TABELA FINAL DE PREÇOS ── */}
                  <section className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-3xl font-display text-primary">Preço de Venda Final</h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest italic">Ajuste os valores finais que aparecerão no site</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Preços por Pessoa</span>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-muted/5">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/10 border-b border-black/5">
                            <th className="text-left p-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground/50">Modalidade</th>
                            <th className="text-center p-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground/50">Solo (1p)</th>
                            <th className="text-center p-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground/50">Duo (2p)</th>
                            <th className="text-center p-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground/50">Group (3p+)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          <tr className="hover:bg-primary/[0.02] transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-display text-lg text-primary leading-none uppercase tracking-tighter">Expedição 4x4</span>
                              </div>
                            </td>
                            {(['individual', 'dupla', 'trio'] as const).map((type, idx) => {
                              const pax = idx === 0 ? 1 : idx === 1 ? 2 : 4;
                              const suggested = calculateSuggestedPrice('atmos4x4', pax);
                              return (
                                <td key={type} className="p-4 text-center">
                                  <div className="space-y-1.5">
                                    <NumericCell 
                                      value={pricing.atmos4x4?.[type] || 0} 
                                      onCommit={(v) => setPricing(prev => ({ ...prev, atmos4x4: { ...prev.atmos4x4, [type]: v } }))}
                                      className="w-28 mx-auto h-12 text-center text-lg font-display bg-white border-black/5 rounded-2xl focus:ring-primary/20 shadow-sm" 
                                    />
                                    <div className="text-[10px] font-medium text-muted-foreground/40">Sugerido: {fmtBRL(suggested, 0)}</div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="hover:bg-orange-50/30 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="font-display text-lg text-orange-600 leading-none uppercase tracking-tighter">Carro Próprio</span>
                              </div>
                            </td>
                            {(['individual', 'dupla', 'trio'] as const).map((type, idx) => {
                              const pax = idx === 0 ? 1 : idx === 1 ? 2 : 4;
                              const suggested = calculateSuggestedPrice('carroProprio', pax);
                              return (
                                <td key={type} className="p-4 text-center">
                                  <div className="space-y-1.5">
                                    <NumericCell 
                                      value={pricing.carroProprio?.[type] || 0} 
                                      onCommit={(v) => setPricing(prev => ({ ...prev, carroProprio: { ...prev.carroProprio, [type]: v } }))}
                                      className="w-28 mx-auto h-12 text-center text-lg font-display bg-white border-black/5 rounded-2xl focus:ring-orange-500/20 shadow-sm" 
                                    />
                                    <div className="text-[10px] font-medium text-muted-foreground/40">Sugerido: {fmtBRL(suggested, 0)}</div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </TabsContent>
              <TabsContent value="media" className="mt-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {product || name.trim() ? (
                  <div className="max-w-5xl mx-auto">
                    <ProductMediaTab 
                      product={{ ...product, name, type: "itinerary", variables: { ...product?.variables, favorites } } as any} 
                      onFavoriteToggle={(file) => setFavorites(prev => prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file])}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-[3rem] border-2 border-dashed border-black/5 text-center">
                    <ImageIcon className="h-16 w-16 mb-6 opacity-10" />
                    <h4 className="text-xl font-display text-primary">Identidade Visual do Roteiro</h4>
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
