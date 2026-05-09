import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Check, Loader2, Store, Upload, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getStorageInfo, type Product, type ProductVariation, SupplierCombobox } from "./shared";
import { optimizedUrl, IMAGE_PRESETS, storageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRef } from "react";
import { r2 } from "@/lib/r2";

interface ProductVariationsTabProps {
  product: Partial<Product> & { id?: string; name: string; type: string; unit_price?: number; cost_price?: number; variables?: any; tempId?: string };
  value: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
  favorites?: string[];
}

export function ProductVariationsTab({ 
  product,
  value: variations,
  onChange,
  favorites = []
}: ProductVariationsTabProps) {
  const [uploading, setUploading] = useState<string | null>(null); // variation id
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeVarRef = useRef<string | null>(null);

  const info = (product.id || product.tempId) ? getStorageInfo(product as any) : null;
  // Fetch product media to allow selection for variations
  const { data: media = [], isLoading: loadingMedia, refetch: refetchMedia } = useQuery({
    queryKey: ["product-media", product.id || product.tempId],
    queryFn: async () => {
      if (!(product.id || product.tempId) || !info) return [];
      
      const data = await r2.list(info.folder);
      
      // Filter by prefix (same logic as ProductMediaTab)
      const prefixRegex = new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-.*)?\\.(jpg|jpeg|png|webp|heic|mov|mp4|webm|avi|mkv)$`, 'i');
      return data
        .filter((f: any) => {
          const name = f.Key.split('/').pop();
          return !name.startsWith(".") && prefixRegex.test(name);
        })
        .map((f: any) => f.Key.split('/').pop())
        .sort((a, b) => {
          // Priority 1: Favorites
          const isAFav = favorites.includes(a);
          const isBFav = favorites.includes(b);
          if (isAFav && !isBFav) return -1;
          if (!isAFav && isBFav) return 1;

          // Priority 2: Numerical order
          const numA = parseInt(a.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(b.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        });
    },
    enabled: !!(product.id || product.tempId) && !!info
  });

  const addVariation = () => {
    const newVar: ProductVariation = {
      id: crypto.randomUUID(),
      name: "",
      unit_price: product.unit_price || 0,
      cost_price: product.cost_price || 0,
      description: "",
      is_active: true,
      media: [],
      supplier_id: null
    };
    onChange([...variations, newVar]);
  };

  const updateVariation = (id: string, updates: Partial<ProductVariation>) => {
    const newVariations = variations.map(v => 
      v.id === id ? { ...v, ...updates } : v
    );
    onChange(newVariations);
  };

  const removeVariation = (id: string) => {
    const newVariations = variations.filter(v => v.id !== id);
    onChange(newVariations);
  };

  const toggleMedia = (vId: string, fileName: string) => {
    const v = variations.find(x => x.id === vId);
    if (!v) return;
    
    const currentMedia = v.media || [];
    const newMedia = currentMedia.includes(fileName)
      ? currentMedia.filter(m => m !== fileName)
      : [...currentMedia, fileName];
      
    updateVariation(vId, { media: newMedia });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, vId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !info) return;

    setUploading(vId);
    try {
      const fileArray = Array.from(files);
      const uploadedNames: string[] = [];

      for (const file of fileArray) {
        // Generate next filename using same logic as ProductMediaTab
        const nums = media
          .map((f) => {
            const match = f.match(new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.`));
            return match ? parseInt(match[1]) : 0;
          })
          .filter((n) => n > 0);
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${info.prefix}-${next}.${ext}`;

        await r2.upload(info.folder, fileName, file);
        uploadedNames.push(fileName);
      }

      // Add to variation media
      const v = variations.find(x => x.id === vId);
      if (v) {
        const newMedia = [...v.media, ...uploadedNames];
        updateVariation(vId, { media: newMedia });
      }

      toast.success(`${uploadedNames.length} foto(s) enviada(s)`);
      await refetchMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/10">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Variações do Produto</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tighter">
            Crie opções como tamanhos, trechos ou tipos de lanche
          </p>
        </div>
        <Button 
          type="button"
          onClick={addVariation}
          size="sm"
          className="h-8 gap-2 px-4 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar Variante
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {variations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground/40">
              <Plus className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma variação cadastrada</p>
            <p className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">
              Clique no botão acima para adicionar a primeira variante deste produto.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {variations.map((v) => (
              <div 
                key={v.id}
                className={cn(
                  "group relative flex flex-col p-5 rounded-2xl border bg-white transition-all hover:shadow-lg",
                  !v.is_active && "opacity-60 bg-muted/20"
                )}
              >
                <div className="grid grid-cols-[1fr_120px_120px_auto] gap-6 items-start">
                  {/* Nome e Fotos */}
                  <div className="flex items-center gap-4 min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button 
                          type="button"
                          className={cn(
                            "relative h-14 w-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:bg-muted/50 shrink-0 overflow-hidden",
                            (v.media && v.media.length > 0) && "border-primary/30 border-solid"
                          )}
                        >
                          {v.media && v.media.length > 0 && info ? (
                            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
                              {v.media.slice(0, 4).map((m, i) => (
                                <img loading="lazy" 
                                  key={i}
                                  src={optimizedUrl(`${info.folder}/${m}`, IMAGE_PRESETS.thumbnail)}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ))}
                              {v.media.length > 4 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-bold">
                                  +{v.media.length - 4}
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Fotos</span>
                            </>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold uppercase tracking-wider">Selecionar Fotos</h5>
                            <span className="text-[10px] text-muted-foreground">{(v.media || []).length} selecionadas</span>
                          </div>
                          
                          {!(product.id || product.tempId) ? (
                            <p className="text-[10px] text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                              Aguarde a inicialização do produto para gerenciar fotos.
                            </p>
                          ) : loadingMedia ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : (
                            <>
                              {media.length === 0 && (
                                <p className="text-[10px] text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                                  Nenhuma foto encontrada para este produto.
                                </p>
                              )}
                              {media.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                  {media.map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => toggleMedia(v.id, m)}
                                      className={cn(
                                        "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                                        (v.media || []).includes(m) ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
                                      )}
                                    >
                                      <img loading="lazy" 
                                        src={optimizedUrl(`${info!.folder}/${m}`, IMAGE_PRESETS.thumbnail)}
                                        className="w-full h-full object-cover"
                                        alt=""
                                      />
                                      {favorites.includes(m) && (
                                        <div className="absolute top-1 right-1 z-10">
                                          <Star className="h-2 w-2 text-yellow-500 fill-current" />
                                        </div>
                                      )}
                                      {(v.media || []).includes(m) && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                          <div className="bg-primary rounded-full p-0.5 shadow-lg">
                                            <Check className="h-2 w-2 text-white" strokeWidth={4} />
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          <div className="pt-2 border-t">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={(e) => handleUpload(e, v.id)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 h-8 text-[10px] font-bold uppercase"
                              disabled={!!uploading}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {uploading === v.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              Subir Fotos Direto
                            </Button>
                          </div>

                          <p className="text-[9px] text-muted-foreground italic">
                            Se nenhuma foto for selecionada, usará as fotos do produto principal.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        activeVarRef.current = v.id;
                        fileInputRef.current?.click();
                      }}
                      disabled={!!uploading}
                    >
                      {uploading === v.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input 
                        placeholder="Nome da variante (ex: Lanche Vegano)"
                        value={v.name}
                        onChange={(e) => updateVariation(v.id, { name: e.target.value })}
                        className="h-9 text-sm font-bold border-transparent hover:border-input focus:border-primary transition-all bg-transparent focus:bg-white"
                      />
                      <Input 
                        placeholder="Descrição curta (ex: Opção sem glúten e sem lactose)"
                        value={v.description || ""}
                        onChange={(e) => updateVariation(v.id, { description: e.target.value })}
                        className="h-7 text-[10px] border-transparent hover:border-input focus:border-primary transition-all bg-transparent focus:bg-white text-muted-foreground"
                      />

                      {v.media && v.media.length > 0 && info && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {v.media.map((m) => (
                            <div key={m} className="group/img relative h-7 w-7 rounded-lg overflow-hidden border border-border/50 bg-muted/20 shadow-sm">
                              <img loading="lazy" 
                                src={optimizedUrl(`${info.folder}/${m}`, IMAGE_PRESETS.thumbnail)}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                              <button
                                type="button"
                                onClick={() => toggleMedia(v.id, m)}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="Remover da variação"
                              >
                                <X className="h-3 w-3 text-white stroke-[3px]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custos e Preços */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Custo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">R$</span>
                      <Input 
                        type="number"
                        value={v.cost_price}
                        onChange={(e) => updateVariation(v.id, { cost_price: parseFloat(e.target.value) || 0 })}
                        className="h-10 pl-8 text-xs font-mono bg-muted/30 border-none focus:bg-white shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-primary uppercase ml-1">Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-primary/60 font-medium">R$</span>
                      <Input 
                        type="number"
                        value={v.unit_price}
                        onChange={(e) => updateVariation(v.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="h-10 pl-8 text-xs font-mono bg-primary/5 border-none focus:bg-white focus:ring-1 focus:ring-primary/20 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-3 pt-6">
                    <Switch 
                      checked={v.is_active}
                      onCheckedChange={(val) => updateVariation(v.id, { is_active: val })}
                    />
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariation(v.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="mt-4 pt-4 border-t flex items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <Store className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Parceiro da Variante:</span>
                  </div>
                  <div className="flex-1 max-w-sm">
                    <SupplierCombobox 
                      supplierId={v.supplier_id} 
                      onSelect={(s) => updateVariation(v.id, { supplier_id: s?.id || null })} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 italic ml-auto">
                    Se não selecionado, usará o parceiro do produto principal.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
