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
import { Trash2, Plus, ChevronDown, Pencil, Search, Package, RefreshCw, ImageIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Product } from "./shared";
import { productTypeLabels } from "./shared";
import { ProductMediaTab } from "./ProductMediaTab";

type DayItem = {
  product_id: string;
  product_name: string;
  product_type: string;
  cost_price?: number;
};

type Day = {
  dayNumber: number;
  items: DayItem[];
  guidePricing?: Pricing;
  attractions: string;
  description: string;
};

import { regionLabels } from "./shared";

type PricingTier = { individual?: number; dupla?: number; trio?: number };
type Pricing = { atmos4x4?: PricingTier; carroProprio?: PricingTier };

type ItineraryVars = {
  duration: number;
  days: Day[];
  extraCosts?: { equipmentFees?: number; equipmentItems?: string; entranceFees?: number };
  pricing?: Pricing;
  discount?: number;
  discountFixed?: number;
  subcategory?: string;
  // Standard fields
  pricingType?: "total" | "per_person";
  limitPeople?: number;
  fiscal_cnpj?: string;
  fiscal_ncm?: string;
  fiscal_tax_rate?: number;
  seo_slug?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  favorites?: string[];
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
    is_active: boolean;
    variables: ItineraryVars;
  }) => void;
  onDelete?: (id: string) => void;
  isSaving: boolean;
}

const fmtBRL = (v: number | undefined, maxFrac = 2) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: maxFrac })}` : "—";

const typeFilter = ["waterfall", "experience", "service", "accommodation"];

export default function ItineraryFormDialog({ open, onOpenChange, product, allProducts, onSave, onDelete, isSaving }: Props) {
  const isEdit = !!product;

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<Day[]>([{ dayNumber: 1, items: [], attractions: "", description: "" }]);
  const [equipFees, setEquipFees] = useState("");
  const [equipItems, setEquipItems] = useState("");
  const [entranceFees, setEntranceFees] = useState("");
  const [dayPricing, setDayPricing] = useState<Record<number, Pricing>>({});
  const [itemSearch, setItemSearch] = useState<Record<number, string>>({});
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  
  // Standard fields state
  const [pricingType, setPricingType] = useState<"total" | "per_person">("total");
  const [limitPeople, setLimitPeople] = useState("");
  const [fiscalCnpj, setFiscalCnpj] = useState("");
  const [fiscalNcm, setFiscalNcm] = useState("");
  const [fiscalTaxRate, setFiscalTaxRate] = useState("");
  const [seoSlug, setSeoSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const calculateEntranceFees = (daysData: Day[]) => {
    let total = 0;
    daysData.forEach((d) => {
      (d.items || []).forEach((item) => {
        if (item.product_type === "waterfall") {
          const prod = allProducts.find((p) => p.id === item.product_id);
          const fee = (prod?.variables as any)?.entranceFee;
          if (fee && typeof fee === "number") total += fee;
        }
      });
    });
    return total;
  };

  const convertGuidePrices = (gp: any): Pricing => {
    const atmos = gp?.["4x4Atmos"];
    const carro = gp?.carroTurista;
    return {
      atmos4x4: atmos ? { individual: atmos["1"], dupla: atmos["2"], trio: atmos["3plus"] } : undefined,
      carroProprio: carro ? { individual: carro["1"], dupla: carro["2"], trio: carro["3plus"] } : undefined,
    };
  };

  useEffect(() => {
    if (!open) return;
    const vars = (product?.variables || {}) as Record<string, unknown>;
    const rawDays = (vars.days || []) as any[];
    const extra = (vars.extraCosts || {}) as { equipmentFees?: number; equipmentItems?: string | Record<string, string>; entranceFees?: number };

    const convertedDays: Day[] = rawDays.map((d: any, i: number) => {
      const attrObj = typeof d.attractions === 'object' ? d.attractions : { pt: d.attractions || "" };
      const descObj = typeof d.description === 'object' ? d.description : { pt: d.description || "" };

      return {
        dayNumber: i + 1,
        items: d.items || [],
        guidePricing: d.guidePricing,
        attractions: Array.isArray(attrObj.pt) ? attrObj.pt.join(", ") : (attrObj.pt || ""),
        description: descObj.pt || "",
      };
    });

    const initialDayPricing: Record<number, Pricing> = {};
    convertedDays.forEach((d, idx) => {
      const wfItem = d.items.find((it: any) => it.product_type === "waterfall");
      if (wfItem) {
        const wfProd = allProducts.find((p) => p.id === wfItem.product_id);
        const gp = (wfProd?.variables as any)?.guidePrices;
        if (gp) initialDayPricing[idx] = convertGuidePrices(gp);
        else if (d.guidePricing) initialDayPricing[idx] = d.guidePricing;
      } else if (d.guidePricing) {
        initialDayPricing[idx] = d.guidePricing;
      }
    });

    setName(product?.name || "");
    setIsActive(product?.is_active ?? true);
    setDays(convertedDays.length > 0 ? convertedDays : [{ dayNumber: 1, items: [], attractions: "", description: "" }]);
    setEquipFees(extra.equipmentFees?.toString() || "");
    setEquipItems(typeof extra.equipmentItems === "string" ? extra.equipmentItems : "");
    setEntranceFees(calculateEntranceFees(convertedDays).toString() || extra.entranceFees?.toString() || "");
    setDayPricing(initialDayPricing);
    setDiscountPercent((vars.discount as number)?.toString() || "");
    setDiscountFixed((vars.discountFixed as number)?.toString() || "");
    setPricingType((vars.pricingType as any) || "total");
    setLimitPeople((vars.limitPeople as any)?.toString() || "");
    setFiscalCnpj((vars.fiscal_cnpj as any) || "");
    setFiscalNcm((vars.fiscal_ncm as any) || "");
    setFiscalTaxRate((vars.fiscal_tax_rate as any)?.toString() || "");
    setSeoSlug((vars.seo_slug as any) || "");
    setSeoTitle((vars.seo_title as any) || "");
    setSeoDescription((vars.seo_description as any) || "");
    setSeoKeywords((vars.seo_keywords as any) || "");
    setFavorites((vars.favorites as any) || []);
    setCategory(product?.category || "");
    setSubcategory((vars.subcategory as any) || "");
    setDescription(product?.description || "");
  }, [open, product, allProducts]);

  const addDay = () => setDays([...days, { dayNumber: days.length + 1, items: [], attractions: "", description: "" }]);
  const removeDay = (idx: number) => {
    const updated = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setDays(updated.length > 0 ? updated : [{ dayNumber: 1, items: [], attractions: "", description: "" }]);
  };

  const addItem = (dayIdx: number, prod: Product) => {
    const updated = [...days];
    updated[dayIdx] = {
      ...updated[dayIdx],
      items: [...updated[dayIdx].items, {
        product_id: prod.id,
        product_name: prod.name,
        product_type: prod.type,
        cost_price: prod.unit_price,
      }],
    };
    setDays(updated);
    if (prod.type === "waterfall") {
      const gp = (prod.variables as any)?.guidePrices;
      if (gp) setDayPricing((prev) => ({ ...prev, [dayIdx]: convertGuidePrices(gp) }));
      const fee = (prod.variables as any)?.entranceFee;
      if (fee) setEntranceFees((prev) => ((parseFloat(prev) || 0) + fee).toString());
    }
    setItemSearch({ ...itemSearch, [dayIdx + 1]: "" });
  };

  const removeItem = (dayIdx: number, itemIdx: number) => {
    const item = days[dayIdx].items[itemIdx];
    const updated = [...days];
    updated[dayIdx] = { ...updated[dayIdx], items: updated[dayIdx].items.filter((_, i) => i !== itemIdx) };
    setDays(updated);
    if (item.product_type === "waterfall") {
      const prod = allProducts.find(p => p.id === item.product_id);
      const fee = (prod?.variables as any)?.entranceFee;
      if (fee) setEntranceFees(prev => Math.max(0, (parseFloat(prev) || 0) - fee).toString());
    }
  };

  const aggregatedPricing = useMemo(() => {
    const agg: Pricing = { atmos4x4: { individual: 0, dupla: 0, trio: 0 }, carroProprio: { individual: 0, dupla: 0, trio: 0 } };
    days.forEach((_, i) => {
      const dp = dayPricing[i];
      if (dp?.atmos4x4) {
        agg.atmos4x4!.individual! += dp.atmos4x4.individual || 0;
        agg.atmos4x4!.dupla! += dp.atmos4x4.dupla || 0;
        agg.atmos4x4!.trio! += dp.atmos4x4.trio || 0;
      }
      if (dp?.carroProprio) {
        agg.carroProprio!.individual! += dp.carroProprio.individual || 0;
        agg.carroProprio!.dupla! += dp.carroProprio.dupla || 0;
        agg.carroProprio!.trio! += dp.carroProprio.trio || 0;
      }
    });
    return agg;
  }, [days, dayPricing]);

  const extraCostsTotal = useMemo(() => (parseFloat(entranceFees) || 0) + (parseFloat(equipFees) || 0), [entranceFees, equipFees]);
  const discountMultiplier = useMemo(() => 1 - (parseFloat(discountPercent) || 0) / 100, [discountPercent]);
  const discountFixedValue = useMemo(() => parseFloat(discountFixed) || 0, [discountFixed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      category,
      is_active: isActive,
      variables: {
        duration: days.length,
        subcategory,
        days: days.map((d, i) => ({ 
          dayNumber: i + 1, 
          items: d.items, 
          guidePricing: dayPricing[i] || {},
          attractions: { pt: d.attractions.split(/[,\n]/).map(s => s.trim()).filter(Boolean) },
          description: { pt: d.description }
        })),
        extraCosts: {
          equipmentFees: parseFloat(equipFees) || 0,
          equipmentItems: equipItems,
          entranceFees: parseFloat(entranceFees) || 0,
        },
        pricing: aggregatedPricing,
        discount: parseFloat(discountPercent) || 0,
        discountFixed: parseFloat(discountFixed) || 0,
        pricingType,
        limitPeople: parseInt(limitPeople) || undefined,
        fiscal_cnpj: fiscalCnpj,
        fiscal_ncm: fiscalNcm,
        fiscal_tax_rate: parseFloat(fiscalTaxRate) || undefined,
        seo_slug: seoSlug,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
        favorites: favorites,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {isEdit ? (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Pencil className="h-5 w-5" /></div>
                <div>
                  <span className="block text-primary">Editar Roteiro</span>
                  <span className="text-xs font-normal text-muted-foreground">ID: {product.id.slice(0, 8)}...</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Plus className="h-5 w-5" /></div>
                <span className="text-primary">Novo Roteiro</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <form className="flex-1 flex flex-col min-h-0" onSubmit={handleSubmit}>
          <Tabs defaultValue="roteiro" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b bg-muted/10">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-6 rounded-none p-0">
                <TabsTrigger value="roteiro" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Definição</TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Precificação</TabsTrigger>
                <TabsTrigger value="fiscal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Fiscal & SEO</TabsTrigger>
                <TabsTrigger value="images" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-sm font-medium transition-all">Imagens & Vídeos</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="roteiro" className="mt-0 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-4 space-y-6">
                    <div className="space-y-4 p-5 bg-muted/20 rounded-xl border border-border/50">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Nome do Roteiro *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 bg-background" placeholder="Ex: Chapada 3 Dias" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Região</Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(regionLabels).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground/60 italic leading-tight">Define o destino e pasta de fotos.</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Subcategoria</Label>
                          <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="h-10 bg-background" placeholder="Ex: Clássico, Expedição..." />
                          <p className="text-[10px] text-muted-foreground/60 italic leading-tight">Ex: "Clássico", "Expedição".</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Descrição do Roteiro</Label>
                        <Textarea 
                          value={description} 
                          onChange={(e) => setDescription(e.target.value)} 
                          className="min-h-[120px] bg-background resize-none text-sm leading-relaxed" 
                          placeholder="Descreva a jornada, os diferenciais e o que torna este roteiro especial..."
                        />
                      </div>
                      <div className="space-y-4 pt-2">
                        <Label className="text-sm font-semibold">Visibilidade & Mídia</Label>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border/50 shadow-sm transition-all hover:bg-muted/5">
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                            <span className="text-xs font-medium text-muted-foreground">
                              {isActive ? "Público no Site" : "Oculto no Site"}
                            </span>
                          </div>
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full justify-start gap-3 h-12 rounded-xl border-dashed hover:border-primary/40 hover:bg-primary/5 group"
                            onClick={() => {
                              const imagesTab = document.querySelector('[value="images"]') as HTMLButtonElement;
                              if (imagesTab) imagesTab.click();
                            }}
                          >
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <ImageIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-left">
                              <span className="block text-xs font-semibold">Fotos & Vídeos</span>
                              <span className="text-[10px] text-muted-foreground">Gerenciar galeria do roteiro</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 p-5 bg-primary/5 rounded-xl border border-primary/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Logística</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Modelo</Label>
                          <Select value={pricingType} onValueChange={(v: any) => setPricingType(v)}>
                            <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="total">Total</SelectItem><SelectItem value="per_person">Por Pessoa</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Limite Pessoas</Label>
                          <Input type="number" value={limitPeople} onChange={(e) => setLimitPeople(e.target.value)} className="h-9 bg-background" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-wider">Dias do Roteiro</h3><Button type="button" variant="outline" size="sm" onClick={addDay}><Plus className="h-3.5 w-3.5 mr-1" /> Dia</Button></div>
                    <div className="space-y-4">
                      {days.map((day, dIdx) => (
                        <div key={dIdx} className="group p-5 bg-background rounded-xl border border-border hover:border-primary/30 transition-all shadow-sm">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed">
                            <h4 className="font-bold flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs">{dIdx + 1}</span> Dia {dIdx + 1}</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeDay(dIdx)} className="h-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Título do Dia / Atrações</Label>
                                <Input 
                                  placeholder="Ex: Almécegas I e II + São Bento" 
                                  className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all" 
                                  value={day.attractions || ""} 
                                  onChange={(e) => {
                                    const newDays = [...days];
                                    newDays[dIdx].attractions = e.target.value;
                                    setDays(newDays);
                                  }} 
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Descrição Curta</Label>
                                <Input 
                                  placeholder="Ex: Um dia de contemplação e banhos relaxantes..." 
                                  className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all" 
                                  value={day.description || ""} 
                                  onChange={(e) => {
                                    const newDays = [...days];
                                    newDays[dIdx].description = e.target.value;
                                    setDays(newDays);
                                  }} 
                                />
                              </div>
                            </div>

                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Vincular produtos (Atrações, Experiências...)" 
                                className="pl-9 h-10 bg-primary/5 border-none font-medium" 
                                value={itemSearch[day.dayNumber] || ""} 
                                onChange={(e) => setItemSearch({ ...itemSearch, [day.dayNumber]: e.target.value })} 
                              />
                            </div>
                            {itemSearch[day.dayNumber] && (
                              <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto bg-background shadow-lg z-10">
                                {allProducts.filter(p => typeFilter.includes(p.type)).filter(p => p.name.toLowerCase().includes(itemSearch[day.dayNumber].toLowerCase())).map(p => (
                                  <button key={p.id} type="button" className="w-full text-left p-2.5 text-xs hover:bg-primary/5 border-b last:border-0 transition-colors flex items-center justify-between" onClick={() => addItem(dIdx, p)}>
                                    <div className="flex items-center gap-2"><Badge variant="outline" className="text-[9px] uppercase">{p.type}</Badge><span className="font-medium">{p.name}</span></div>
                                    <Plus className="h-3 w-3 text-primary" />
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-2 mt-2">
                              {day.items?.map((item, iIdx) => (
                                <div key={iIdx} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg border border-border/30">
                                  <div className="p-1.5 bg-background rounded text-primary border border-border/50"><Package className="h-3.5 w-3.5" /></div>
                                  <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{item.product_name}</p><p className="text-[10px] text-muted-foreground uppercase">{item.product_type}</p></div>
                                  <div className="flex items-center gap-2"><span className="text-xs font-mono font-medium">{fmtBRL(item.cost_price || 0)}</span><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(dIdx, iIdx)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4 p-5 bg-muted/20 rounded-xl border border-border/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider">Custos Extras</h4>
                      <div className="space-y-3">
                        <div className="space-y-1"><Label className="text-xs">Ingressos (Auto)</Label><Input value={entranceFees} readOnly className="h-9 text-xs bg-muted/30" /></div>
                        <div className="space-y-1"><Label className="text-xs">Equipamentos (R$)</Label><Input type="number" value={equipFees} onChange={(e) => setEquipFees(e.target.value)} className="h-9 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-xs">Itens</Label><Input value={equipItems} onChange={(e) => setEquipItems(e.target.value)} className="h-9 text-xs" /></div>
                      </div>
                    </div>
                    <div className="space-y-4 p-5 bg-primary/5 rounded-xl border border-primary/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Descontos</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label className="text-xs block">Perc. (%)</Label><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="h-9 text-center" /></div>
                        <div className="space-y-1"><Label className="text-xs block">Fixo (R$)</Label><Input type="number" value={discountFixed} onChange={(e) => setDiscountFixed(e.target.value)} className="h-9 text-center" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-6 bg-background rounded-2xl border border-border shadow-sm">
                      <h4 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> Simulação de Venda Final</h4>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-muted/30"><tr><th className="text-left p-4 border-b">Modalidade</th><th className="text-center p-4 border-b">Individual</th><th className="text-center p-4 border-b">Dupla</th><th className="text-center p-4 border-b">Trio+</th></tr></thead>
                          <tbody className="divide-y">
                            <tr className="hover:bg-muted/10 transition-colors"><td className="p-4 font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Atmos 4x4</td><td className="text-center p-4 font-mono font-bold text-primary">{fmtBRL(Math.max(0, ((aggregatedPricing.atmos4x4?.individual || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td><td className="text-center p-4 font-mono font-bold text-primary">{fmtBRL(Math.max(0, ((aggregatedPricing.atmos4x4?.dupla || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td><td className="text-center p-4 font-mono font-bold text-primary">{fmtBRL(Math.max(0, ((aggregatedPricing.atmos4x4?.trio || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td></tr>
                            <tr className="hover:bg-muted/10 transition-colors"><td className="p-4 font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> Carro Próprio</td><td className="text-center p-4 font-mono font-bold text-orange-600">{fmtBRL(Math.max(0, ((aggregatedPricing.carroProprio?.individual || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td><td className="text-center p-4 font-mono font-bold text-orange-600">{fmtBRL(Math.max(0, ((aggregatedPricing.carroProprio?.dupla || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td><td className="text-center p-4 font-mono font-bold text-orange-600">{fmtBRL(Math.max(0, ((aggregatedPricing.carroProprio?.trio || 0) + extraCostsTotal) * discountMultiplier - discountFixedValue), 0)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fiscal" className="mt-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b"><Package className="h-4 w-4 text-primary" /><h4 className="text-sm font-bold uppercase tracking-wider">Dados Fiscais</h4></div>
                    <div className="space-y-5">
                      <div className="space-y-1.5"><Label className="text-xs font-medium">CNPJ Emissor</Label><Input value={fiscalCnpj} onChange={(e) => setFiscalCnpj(e.target.value)} className="h-10 bg-muted/10" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-xs font-medium">NCM</Label><Input value={fiscalNcm} onChange={(e) => setFiscalNcm(e.target.value)} className="h-10 bg-muted/10" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-medium">Alíquota ICMS (%)</Label><Input type="number" step="0.01" value={fiscalTaxRate} onChange={(e) => setFiscalTaxRate(e.target.value)} className="h-10 bg-muted/10" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b"><Search className="h-4 w-4 text-primary" /><h4 className="text-sm font-bold uppercase tracking-wider">Marketing & SEO</h4></div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-amber-600 uppercase tracking-wider">URL (Slug SEO)</Label>
                        <Input 
                          value={seoSlug} 
                          onChange={(e) => setSeoSlug(e.target.value)} 
                          className="h-10 bg-muted/10 font-mono text-xs border-amber-100" 
                        />
                        <p className="text-[9px] font-medium text-amber-600/80 italic leading-tight">
                          ⚠️ Cuidado: Alterar o slug muda a URL pública e pode quebrar links.
                        </p>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs font-medium">Meta Title</Label><Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="h-10 bg-muted/10" /></div>
                      <div className="space-y-1.5"><Label className="text-xs font-medium">Meta Description</Label><Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="bg-muted/10 text-xs" /></div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="mt-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                {product || name.trim() ? (
                  <ProductMediaTab 
                    product={product || { 
                      name, 
                      type: "itinerary", 
                      variables: { 
                        days, 
                        extraCosts: { equipmentFees: parseFloat(equipFees), equipmentItems: equipItems, entranceFees: parseFloat(entranceFees) },
                        favorites: favorites
                      } 
                    } as any} 
                    onFavoriteToggle={(file) => {
                      setFavorites(prev => 
                        prev.includes(file) ? prev.filter(f => f !== file) : [...prev.slice(-4), file]
                      );
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-2xl border-2 border-dashed border-border/40 text-center">
                    <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
                    <h4 className="text-sm font-semibold text-foreground">Dê um nome ao roteiro primeiro</h4>
                    <p className="text-xs max-w-[240px] mt-1">Defina o nome do roteiro na aba Definição para poder enviar fotos e vídeos.</p>
                  </div>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
              {isEdit && onDelete ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Excluir</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Excluir roteiro?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(product!.id)}>Confirmar</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <div />}
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving || !name.trim()} className="px-8 shadow-lg shadow-primary/20">{isSaving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
