import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Upload, Replace, X, Loader2, Film, ImageIcon, Play, ChevronLeft, ChevronRight, Expand, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { optimizedUrl, storageUrl, IMAGE_PRESETS } from "@/lib/storage";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { toast } from "sonner";
import { r2 } from "@/lib/r2";
import type { Product } from "./shared";
import { getStorageInfo } from "./shared";
import { cn } from "@/lib/utils";

/* ─── Storage path mapping ─────────────────────────────────────────── */


/* ─── Helpers ──────────────────────────────────────────────────────── */

const isVideo = (fileName: string) => /\.(mp4|mov|webm|avi|mkv)$/i.test(fileName);

/* ─── Lightbox ─────────────────────────────────────────────────────── */

function Lightbox({
  urls,
  fileNames,
  index,
  onClose,
}: {
  urls: string[];
  fileNames: string[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  const prev = () => setCurrent((c) => (c - 1 + urls.length) % urls.length);
  const next = () => setCurrent((c) => (c + 1) % urls.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  const url = urls[current];
  const fileName = fileNames[current];
  const vid = isVideo(fileName);

  // Render directly in the dialog DOM tree (no portal) so Radix's
  // contains() check returns true and closeOnInteractOutside never fires.
  // position:fixed makes it cover the screen regardless of dialog scroll/overflow.
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <span className="text-white/60 text-xs font-mono truncate max-w-[60%]">{fileName.split('/').pop()}</span>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{current + 1} / {urls.length}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="flex-1 w-full flex items-center justify-center p-16">
        {vid ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-full max-w-full rounded object-contain shadow-2xl"
          />
        ) : (
          <img
            src={url}
            alt={fileName}
            className="max-h-full max-w-full object-contain rounded shadow-2xl"
          />
        )}
      </div>

      {/* Navigation arrows */}
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* Thumbnails strip */}
      {urls.length > 1 && (
        <div className="flex gap-2 px-6 pb-6 overflow-x-auto max-w-full">
          {urls.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                i === current ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70"
              )}
            >
              {isVideo(fileNames[i]) ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Film className="h-3 w-3 text-white/50" />
                </div>
              ) : (
                <img src={u} alt={fileNames[i].split('/').pop()} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Component ────────────────────────────────────────────────────── */

export function ProductMediaTab({ 
  product, 
  onDelete,
  favorites = [],
  onToggleFavorite
}: { 
  product: Partial<Product> & { name: string; type: string; tempId?: string };
  onDelete?: (fileName: string) => void;
  favorites?: string[];
  onToggleFavorite?: (fileName: string) => void;
}) {
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  const info = getStorageInfo(product);

  const loadMedia = useCallback(async () => {
    if (!info) return;
    setLoading(true);
    try {
      console.log("Listing folder:", info.folder);
      const data = await r2.list(info.folder);
      console.log("R2 Data found:", data?.length || 0, "objects");
      
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const normalizedPrefix = normalize(info.prefix);
      const normalizedRawName = info.rawName ? normalize(info.rawName) : normalizedPrefix;

      const matching = (data || [])
        .filter((f: any) => {
          const key = f.Key.toLowerCase();
          const fileName = key.split('/').pop() || "";
          const normalizedFileName = normalize(fileName);
          
          return normalizedFileName.startsWith(normalizedPrefix) || 
                 normalizedFileName.startsWith(normalizedRawName) ||
                 key.includes(`/${normalizedPrefix}/`) ||
                 key.includes(`/${normalizedRawName}/`);
        })
        .map((f: any) => f.Key) // Store full Key
        .sort((a, b) => {
          const nameA = a.split('/').pop() || "";
          const nameB = b.split('/').pop() || "";
          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        });
      setMedia(matching);
    } catch (err) {
      console.error("Error loading R2 media:", err);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [info?.folder, info?.prefix]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleDelete = async (fullKey: string) => {
    if (!info) return;
    try {
      // The r2.delete expects folder and fileName. 
      // If fullKey is 'produtos/CACHOEIRAS/Almecegas/Almecegas-1.jpg' 
      // and info.folder is 'produtos/CACHOEIRAS'
      // we need to pass the relative part.
      const relativePath = fullKey.replace(`${info.folder}/`, "");
      await r2.delete(info.folder, relativePath);
      toast.success("Arquivo removido do Cloudflare");
      setMedia((prev) => prev.filter((f) => f !== fullKey));
      onDelete?.(fullKey.split('/').pop() || "");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar arquivo");
    }
  };

  const handleUpload = async (files: FileList | File[], targetName?: string) => {
    if (!info) return;
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (!fileName) {
          const nums = media
            .map((f) => {
              const baseName = f.split('/').pop() || "";
              const match = baseName.match(new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.`));
              return match ? parseInt(match[1]) : 0;
            })
            .filter((n) => n > 0);
          const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
          const ext = file.name.split(".").pop() || "jpg";
          fileName = `${info.prefix}-${next}.${ext}`;
        }
        
        // If we found subfolders in existing media, let's keep them if it's a replacement or specific case
        // But for new uploads, we'll use the info.folder root to keep it simple unless we want to maintain the nesting.
        // Given the user's preference for nesting, let's try to put it in the same subfolder if it exists.
        const firstWithSubfolder = media.find(m => m.includes(`${info.folder}/`) && m.split('/').length > (info.folder.split('/').length + 1));
        const uploadFolder = firstWithSubfolder 
          ? firstWithSubfolder.substring(0, firstWithSubfolder.lastIndexOf('/'))
          : info.folder;

        const finalRelativeName = uploadFolder === info.folder ? fileName : `${uploadFolder.replace(`${info.folder}/`, "")}/${fileName}`;

        await r2.upload(info.folder, finalRelativeName, file);
      }
      toast.success(targetName ? "Arquivo substituído" : `${fileArray.length} arquivo(s) enviado(s) para Cloudflare`);
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await handleUpload(e.target.files);
    e.target.value = "";
  };

  const handleReplaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replaceTarget) await handleUpload([file], replaceTarget);
    e.target.value = "";
    setReplaceTarget(null);
  };

  const startReplace = (fileName: string) => {
    setReplaceTarget(fileName);
    setTimeout(() => replaceRef.current?.click(), 50);
  };

  const downloadFile = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName.split('/').pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const bulkDownload = async () => {
    toast.info("Iniciando downloads...");
    for (const key of selectedKeys) {
      const url = storageUrl(key);
      await downloadFile(url, key);
      // Small delay to prevent browser blocking
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const toggleFavorite = async (fullKey: string) => {
    if (!info) return;
    setIsMoving(true);
    try {
      const isFav = fullKey.includes('_capa');
      const newKey = isFav 
        ? fullKey.replace('_capa', '') 
        : fullKey.replace(/(\.[^.]+)$/, '_capa$1');
      
      await r2.copy(fullKey, newKey);
      await r2.delete(info.folder, fullKey.replace(`${info.folder}/`, ""));
      
      toast.success(isFav ? "Removido dos destaques" : "Definido como imagem de capa");
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao favoritar imagem");
    } finally {
      setIsMoving(false);
    }
  };

  const moveMedia = async (idx: number, direction: 'left' | 'right') => {
    if (!info || isMoving) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= media.length) return;

    setIsMoving(true);
    try {
      const keyA = media[idx];
      const keyB = media[targetIdx];
      
      // Temporary name to avoid collision during swap
      const tempKey = `${keyA}_temp`;
      
      await r2.copy(keyA, tempKey);
      await r2.copy(keyB, keyA);
      await r2.copy(tempKey, keyB);
      
      await r2.delete(info.folder, tempKey.replace(`${info.folder}/`, ""));
      
      toast.success("Ordem atualizada");
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao reordenar");
    } finally {
      setIsMoving(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const bulkDelete = async () => {
    if (!info || selectedKeys.length === 0) return;
    if (!confirm(`Deseja deletar ${selectedKeys.length} arquivos?`)) return;

    setLoading(true);
    try {
      for (const key of selectedKeys) {
        await r2.delete(info.folder, key.replace(`${info.folder}/`, ""));
      }
      toast.success(`${selectedKeys.length} arquivos removidos`);
      setSelectedKeys([]);
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar arquivos");
    } finally {
      setLoading(false);
    }
  };

  if (!info) return <div className="p-8 text-center text-muted-foreground">Tipo de produto não suportado para mídia.</div>;

  const mediaUrls = media.map((f) => storageUrl(f));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-[#2D241E]">
            {selectedKeys.length > 0 ? `${selectedKeys.length} selecionados` : "Galeria de Fotos & Vídeos"}
          </h3>
          <p className="text-[10px] text-[#8d7b63] uppercase tracking-wider font-medium">
            {selectedKeys.length > 0 ? "Escolha uma ação para os itens" : "Gerencie a ordem e destaque do site"}
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedKeys.length > 0 ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={bulkDownload} className="h-9 rounded-xl text-xs border-[#8d7b63]/20 hover:bg-[#8d7b63]/5">
                Exportar {selectedKeys.length}
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={bulkDelete} className="h-9 rounded-xl text-xs bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Remover {selectedKeys.length}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || isMoving} className="h-9 rounded-xl text-xs bg-[#2D241E] text-white border-none hover:bg-[#3D342E] shadow-lg shadow-black/10 transition-all active:scale-95">
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
              Upload em Massa
            </Button>
          )}
        </div>
      </div>

      {loading || isMoving ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-[#8d7b63]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 bg-[#8d7b63] rounded-full animate-ping" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#8d7b63] animate-pulse">
            {isMoving ? "Sincronizando ordem..." : "Carregando galeria..."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {media.map((fullKey, idx) => {
            const fileName = fullKey.split('/').pop() || "";
            const isVid = isVideo(fileName);
            const isSelected = selectedKeys.includes(fullKey);
            const isFav = fileName.includes('_capa');
            
            return (
              <div 
                key={fullKey} 
                className={cn(
                  "relative group rounded-2xl overflow-hidden border transition-all duration-300 aspect-[4/3] shadow-sm",
                  isSelected ? "ring-2 ring-[#2D241E] border-transparent scale-[0.98]" : "border-black/5 hover:border-black/10 hover:shadow-xl hover:-translate-y-1"
                )}
              >
                {/* Checkbox selector */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(fullKey); }}
                  className={cn(
                    "absolute top-3 left-3 z-30 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center backdrop-blur-md",
                    isSelected ? "bg-[#2D241E] border-[#2D241E]" : "bg-black/10 border-white/60 opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </button>

                {/* Media Content */}
                <div 
                  className="w-full h-full cursor-pointer"
                  onClick={() => selectedKeys.length > 0 ? toggleSelect(fullKey) : setLightboxIndex(idx)}
                >
                  {isVid ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#2D241E]">
                      <Film className="h-8 w-8 text-white/20" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="h-8 w-8 text-white fill-white/20" />
                      </div>
                    </div>
                  ) : (
                    <OptimizedImage
                      src={optimizedUrl(fullKey, IMAGE_PRESETS.thumbnail)}
                      alt={fullKey}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      containerClassName="w-full h-full"
                    />
                  )}
                </div>

                {/* Cover Badge */}
                {isFav && (
                  <div className="absolute top-3 right-3 z-20">
                    <Badge className="bg-yellow-400 text-[#2D241E] border-none text-[8px] font-black uppercase px-2 h-5 shadow-lg shadow-yellow-400/20 backdrop-blur-md">
                      Destaque
                    </Badge>
                  </div>
                )}
                
                {/* Actions Overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 flex flex-col justify-end p-3 gap-3 z-20 pointer-events-none",
                  selectedKeys.length > 0 ? "opacity-0" : "opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto"
                )}>
                  {/* Reordering Row */}
                  <div className="flex items-center justify-center gap-1.5 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveMedia(idx, 'left'); }}
                      className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/40 disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="h-8 px-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-widest">
                      Pos {idx + 1}
                    </div>

                    <button
                      type="button"
                      disabled={idx === media.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveMedia(idx, 'right'); }}
                      className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/40 disabled:opacity-20 transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Utility Row */}
                  <div className="flex items-center justify-between translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(fullKey); }}
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                          isFav ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/30" : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/30"
                        )}
                        title="Imagem de Capa"
                      >
                        <Star className={cn("h-4 w-4", isFav && "fill-current")} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadFile(storageUrl(fullKey), fileName); }}
                        className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                        title="Baixar"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startReplace(fileName); }}
                        className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                        title="Substituir"
                      >
                        <Replace className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(fullKey); }}
                      className="h-8 w-8 rounded-xl bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600 shadow-lg shadow-red-500/20 flex items-center justify-center transition-all"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Video Indicator */}
                {!isFav && isVid && (
                  <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                    <Badge className="bg-blue-500/80 backdrop-blur-md border-none text-[8px] font-black uppercase px-2 h-5 shadow-lg shadow-blue-500/20">
                      Vídeo
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
          
          <button 
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#8d7b63]/20 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#2D241E]/40 hover:bg-[#2D241E]/5 transition-all aspect-[4/3] group relative overflow-hidden"
          >
            <div className="h-12 w-12 rounded-2xl bg-[#8d7b63]/10 flex items-center justify-center group-hover:bg-[#2D241E]/10 group-hover:scale-110 transition-all duration-300">
              <Upload className="h-6 w-6 text-[#8d7b63] group-hover:text-[#2D241E] transition-colors" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#8d7b63] group-hover:text-[#2D241E] uppercase tracking-widest">Adicionar</span>
              <span className="text-[8px] text-[#8d7b63]/60 group-hover:text-[#2D241E]/60 uppercase tracking-tighter mt-1">Fotos ou Vídeos</span>
            </div>
            
            {/* Animated bg elements */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#8d7b63]/5 rounded-full blur-2xl group-hover:bg-[#2D241E]/10 transition-colors" />
          </button>
        </div>
      )}

      {media.length === 0 && !loading && (
        <div className="border-2 border-dashed border-border/40 rounded-2xl p-12 text-center bg-muted/5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h4 className="text-sm font-semibold">Nenhuma mídia encontrada</h4>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto mt-1">
            Faça upload das fotos e vídeos que serão exibidos no site para este produto.
          </p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
      <input ref={replaceRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleReplaceChange} />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          urls={mediaUrls}
          fileNames={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
