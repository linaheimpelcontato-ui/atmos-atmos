import { useState, useEffect } from "react";
import { Plus, Pencil, ImageIcon, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SupplierCombobox, getDialogFields, PRICING_TYPE_FIELDS, FISCAL_FIELDS, SEO_FIELDS,
  productTypeLabels, regionLabels, type Product,
} from "./shared";
import { ProductMediaTab } from "./ProductMediaTab";
import { ProductVariationsTab } from "./ProductVariationsTab";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  onSave: (data: any) => void;
  isSaving: boolean;
  allTypes: string[];
  getTypeLabel: (t: string) => string;
}

const serviceCategoryOptions: Record<string, string> = {
  lanche: "Lanche",
  gastronomia: "Gastronomia",
  drone: "Registro Drone",
  transfer: "Transfer",
  especial: "Especial",
};

export function ProductDialog({
  open,
  onOpenChange,
  editingProduct,
  onSave,
  isSaving,
  allTypes,
  getTypeLabel,
}: ProductDialogProps) {
  const [formName, setFormName] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formType, setFormType] = useState("experience");
  const [formSupplierId, setFormSupplierId] = useState<string | null>(null);
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCategory, setFormCategory] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formVars, setFormVars] = useState<Record<string, any>>({});
  const [formVariations, setFormVariations] = useState<any[]>([]);
  const [formTempId, setFormTempId] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setFormName(editingProduct.name);
        const varsData = (editingProduct.variables || {}) as Record<string, unknown>;
        setFormSubtitle((varsData.subtitle as string) || "");
        setFormType(editingProduct.type);
        setFormCategory(editingProduct.category || "");
        setFormSubcategory((varsData.subcategory as string) || "");

        if (editingProduct.type === "service") {
          setFormCategory((varsData.service_type as string) || editingProduct.category || "");
          setFormRegion((varsData.region as string) || (editingProduct.category && regionLabels[editingProduct.category] ? editingProduct.category : ""));
        } else {
          setFormRegion("");
        }

        setFormSupplierId(editingProduct.supplier_id || null);
        setFormPrice(editingProduct.unit_price.toString());
        setFormCostPrice(editingProduct.cost_price.toString());
        setFormDescription(editingProduct.description || "");
        setFormIsActive(editingProduct.is_active);
        setFormVariations((varsData.variations as any[]) || []);
        setFormTempId("");
        setFormVars(varsData);
      } else {
        setFormName("");
        setFormSubtitle("");
        setFormType("experience");
        setFormSupplierId(null);
        setFormPrice("");
        setFormCostPrice("");
        setFormDescription("");
        setFormIsActive(true);
        setFormCategory("");
        setFormRegion("");
        setFormSubcategory("");
        setFormVars({});
        setFormVariations([]);
        setFormTempId(crypto.randomUUID());
      }
    }
  }, [open, editingProduct]);

  const handleSave = () => {
    const varsObj: Record<string, unknown> = {};
    const fields = [
      ...getDialogFields(formType, formCategory),
      ...FISCAL_FIELDS,
      ...SEO_FIELDS,
    ];
    fields.forEach((f) => {
      const raw = formVars[f.key] || "";
      if (f.type === "number" || f.type === "percent") {
        varsObj[f.key] = parseFloat(raw) || 0;
      } else {
        varsObj[f.key] = raw;
      }
    });

    if (formType === "service") {
      varsObj.service_type = formCategory;
      varsObj.region = formRegion;
    }

    const payload = {
      name: formName,
      type: formType,
      category: formType === "service" ? formRegion : (formCategory || null),
      segment: "b2c",
      unit_price: parseFloat(formPrice) || 0,
      cost_price: parseFloat(formCostPrice) || 0,
      description: formDescription || null,
      is_active: formIsActive,
      supplier_id: formSupplierId || null,
      variables: {
        ...formVars,
        ...varsObj,
        subcategory: formSubcategory,
        subtitle: formSubtitle,
        service_type: formType === "service" ? formCategory : undefined,
        variations: formVariations,
        storage_id: formTempId || formVars.storage_id,
      }
    };

    onSave(payload);
  };

  const currentFields = getDialogFields(formType, formCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-admin-bg">
        <DialogHeader className="p-8 pb-4 bg-white border-b border-admin-border/50">
          <DialogTitle className="flex items-center gap-4 text-2xl font-bold tracking-tight text-admin-primary">
            {editingProduct ? (
              <div className="p-3 bg-admin-muted rounded-2xl text-admin-primary"><Pencil className="h-6 w-6" /></div>
            ) : (
              <div className="p-3 bg-admin-muted rounded-2xl text-admin-primary"><Plus className="h-6 w-6" /></div>
            )}
            <div className="flex flex-col">
              <span>{editingProduct ? "Editar Produto" : "Novo Produto"}</span>
              {editingProduct && <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">ID: {editingProduct.id.slice(0, 8)}</span>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 bg-admin-surface">
          <Tabs defaultValue="geral" className="flex-1 flex flex-col h-full">
            <div className="px-8 bg-white border-b border-admin-border/50">
              <TabsList className="bg-transparent h-14 w-full justify-start gap-8 rounded-none p-0">
                {["geral", "variations", "images", "details", "fiscal"].map((t) => (
                  <TabsTrigger 
                    key={t} 
                    value={t} 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-admin-primary rounded-none h-14 px-1 text-sm font-semibold transition-all uppercase tracking-widest text-muted-foreground/60 data-[state=active]:text-admin-primary"
                  >
                    {t === "geral" ? "Geral" : t === "variations" ? "Variações" : t === "images" ? "Galeria" : t === "details" ? "Logística" : "Fiscal & SEO"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <TabsContent value="geral" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Nome do Produto</Label>
                      <Input 
                        value={formName} 
                        onChange={(e) => setFormName(e.target.value)} 
                        required 
                        className="h-12 text-base bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all" 
                        placeholder="Ex: Trilha das Sete Quedas" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Subtítulo / Chamada Curta</Label>
                      <Input 
                        value={formSubtitle} 
                        onChange={(e) => setFormSubtitle(e.target.value)} 
                        className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all font-medium" 
                        placeholder="Ex: Aventura de dia inteiro com guia" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Tipo</Label>
                        <Select value={formType} onValueChange={(v) => { setFormType(v); setFormVars({}); setFormCategory(""); }}>
                          <SelectTrigger className="h-12 bg-white border-admin-border rounded-xl shadow-sm font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl border-admin-border shadow-2xl">
                            {allTypes.map((t) => (
                              <SelectItem key={t} value={t} className="text-sm font-medium">{getTypeLabel(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Status</Label>
                        <div className="flex items-center gap-3 h-12 px-4 bg-white rounded-xl border border-admin-border shadow-sm">
                          <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {formIsActive ? "Publicado" : "Rascunho"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-admin-primary/[0.03] p-8 rounded-[2rem] border border-admin-primary/10 space-y-8">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/50 ml-1">Lógica de Cobrança</Label>
                          <Select 
                            value={formVars.pricingType || "por_pessoa"} 
                            onValueChange={(v) => setFormVars(p => ({ ...p, pricingType: v }))}
                          >
                            <SelectTrigger className="h-12 bg-white border-admin-border rounded-xl shadow-sm font-black text-[11px] uppercase tracking-widest text-admin-primary focus:ring-admin-primary/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
                              <SelectItem value="por_pessoa" className="text-[11px] font-black uppercase tracking-widest">Por Pessoa</SelectItem>
                              <SelectItem value="total" className="text-[11px] font-black uppercase tracking-widest">Valor Total</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formVars.pricingType === "total" && (
                          <div className="w-full sm:w-40 space-y-2 animate-in fade-in slide-in-from-right-4 duration-500">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/50 ml-1">Limite de Pax</Label>
                            <Input 
                              type="number"
                              value={formVars.limitPeople || ""} 
                              onChange={(e) => setFormVars(p => ({ ...p, limitPeople: e.target.value }))} 
                              className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all font-black text-center" 
                              placeholder="Ex: 4"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary h-8 flex items-end pb-1 ml-1 leading-tight">
                            {formVars.pricingType === "total" ? "Valor Total (Venda)" : "Valor Venda (por pessoa)"}
                          </Label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-admin-primary/30 group-focus-within:text-admin-primary transition-colors">R$</span>
                            <Input 
                              type="number"
                              value={formPrice} 
                              onChange={(e) => setFormPrice(e.target.value)} 
                              className="h-14 pl-12 text-lg font-black bg-white border-admin-border focus:border-admin-primary rounded-2xl shadow-sm transition-all text-admin-primary" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary/40 h-8 flex items-end pb-1 ml-1 leading-tight">
                            {formVars.pricingType === "total" ? "Custo Total" : "Custo por Pessoa"}
                          </Label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-admin-primary/20 group-focus-within:text-admin-primary/40 transition-colors">R$</span>
                            <Input 
                              type="number"
                              value={formCostPrice} 
                              onChange={(e) => setFormCostPrice(e.target.value)} 
                              className="h-14 pl-12 text-lg bg-white border-admin-border rounded-2xl shadow-sm text-admin-primary/40 font-bold" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 px-4 py-3 bg-admin-primary/5 rounded-xl border border-admin-primary/5">
                        <div className="p-1.5 bg-admin-primary/10 rounded-lg">
                          <Info className="h-3 w-3 text-admin-primary" />
                        </div>
                        <p className="text-[9px] font-black text-admin-primary/60 uppercase tracking-[0.1em] leading-relaxed">
                          {formVars.pricingType === "total" 
                            ? "Este valor será fixo na proposta, independente do número de pessoas." 
                            : "Este valor será multiplicado pelo número de pessoas na proposta."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Parceiro / Fornecedor</Label>
                      <SupplierCombobox
                        supplierId={formSupplierId}
                        onSelect={(s) => {
                          setFormSupplierId(s?.id || null);
                          if (s) {
                            setFormVars(prev => ({
                              ...prev,
                              empresa: s.name,
                              responsavel: s.contact_name || prev.responsavel || "",
                              telefone: s.phone || prev.telefone || "",
                            }));
                          }
                        }}
                      />
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full justify-start gap-4 h-16 rounded-2xl border-dashed border-admin-border hover:border-admin-primary/30 hover:bg-admin-primary/5 group transition-all"
                      onClick={() => (document.querySelector('[value="images"]') as HTMLButtonElement)?.click()}
                    >
                      <div className="h-10 w-10 rounded-xl bg-admin-muted flex items-center justify-center group-hover:bg-admin-primary/10 transition-colors">
                        <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-admin-primary transition-colors" />
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-admin-primary">Galeria de Mídia</span>
                        <span className="text-xs text-muted-foreground font-medium">Fotos e vídeos do produto</span>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Descrição Detalhada</Label>
                  <Textarea 
                    value={formDescription} 
                    onChange={(e) => setFormDescription(e.target.value)} 
                    className="min-h-[120px] bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all resize-none text-sm leading-relaxed" 
                    placeholder="Descreva o produto com detalhes para o cliente..." 
                  />
                </div>
              </TabsContent>

              <TabsContent value="variations" className="mt-0 animate-in fade-in slide-in-from-bottom-2 h-full">
                <ProductVariationsTab 
                  value={formVariations} 
                  onChange={setFormVariations} 
                  product={{ 
                    id: editingProduct?.id, 
                    tempId: formTempId, 
                    name: formName, 
                    type: formType,
                    unit_price: parseFloat(formPrice) || 0,
                    cost_price: parseFloat(formCostPrice) || 0,
                    variables: formVars
                  }}
                  favorites={formVars.favorites || []}
                />
              </TabsContent>

              <TabsContent value="images" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <ProductMediaTab 
                  product={{ ...editingProduct, name: formName, type: formType, id: editingProduct?.id || "", variables: { ...formVars, storage_id: formTempId || formVars.storage_id } } as any}
                  onFavoriteToggle={(file) => {
                    const favs = (formVars.favorites as string[]) || [];
                    const newFavs = favs.includes(file) ? favs.filter(f => f !== file) : [...favs.slice(-4), file];
                    setFormVars(p => ({ ...p, favorites: newFavs }));
                  }}
                  onOrderChange={(newOrder) => {
                    setFormVars(p => ({ ...p, gallery_order: newOrder }));
                  }}
                />
              </TabsContent>

              <TabsContent value="details" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">Subcategoria</Label>
                      <Input 
                        value={formSubcategory} 
                        onChange={(e) => setFormSubcategory(e.target.value)} 
                        className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all" 
                        placeholder="Ex: Passeio de Lancha" 
                      />
                    </div>
                    {currentFields.map((f) => (
                      <div key={f.key} className="space-y-2">
                        <Label className="text-sm font-bold text-admin-primary uppercase tracking-wider">{f.label}</Label>
                        {f.type === "select" ? (
                          <Select value={formVars[f.key] || ""} onValueChange={(v) => setFormVars(p => ({ ...p, [f.key]: v }))}>
                            <SelectTrigger className="h-12 bg-white border-admin-border focus:ring-2 focus:ring-admin-primary/10 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-admin-border shadow-2xl">
                              {Object.entries(f.options || {}).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            type={f.type === "number" || f.type === "percent" ? "number" : "text"}
                            value={formVars[f.key] || ""}
                            onChange={(e) => setFormVars(p => ({ ...p, [f.key]: e.target.value }))}
                            className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all"
                          />
                        )}
                      </div>
                    ))}
                  </div>
              </TabsContent>

              <TabsContent value="fiscal" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1 bg-admin-primary rounded-full" />
                        <h3 className="text-sm font-bold text-admin-primary uppercase tracking-[0.2em]">Dados Fiscais</h3>
                      </div>
                      <div className="space-y-5">
                        {FISCAL_FIELDS.map(f => (
                          <div key={f.key} className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                            <Input 
                              value={formVars[f.key] || ""} 
                              onChange={(e) => setFormVars(p => ({ ...p, [f.key]: e.target.value }))} 
                              className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1 bg-admin-primary rounded-full" />
                        <h3 className="text-sm font-bold text-admin-primary uppercase tracking-[0.2em]">SEO & Metadata</h3>
                      </div>
                      <div className="space-y-5">
                        {SEO_FIELDS.map(f => (
                          <div key={f.key} className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                            {f.key === "seo_description" ? (
                              <Textarea 
                                value={formVars[f.key] || ""} 
                                onChange={(e) => setFormVars(p => ({ ...p, [f.key]: e.target.value }))} 
                                className="min-h-[100px] bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all resize-none" 
                              />
                            ) : (
                              <Input 
                                value={formVars[f.key] || ""} 
                                onChange={(e) => setFormVars(p => ({ ...p, [f.key]: e.target.value }))} 
                                className="h-12 bg-white border-admin-border focus:border-admin-primary rounded-xl shadow-sm transition-all" 
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-8 bg-white border-t border-admin-border/50 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 h-12 text-muted-foreground hover:text-admin-primary font-bold uppercase tracking-widest text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="px-10 h-12 bg-admin-primary hover:bg-black text-white rounded-xl shadow-lg shadow-admin-primary/20 font-bold uppercase tracking-widest text-xs transition-all active:scale-95">
            {isSaving ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Criar Produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
