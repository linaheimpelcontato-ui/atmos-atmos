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
        <span className="text-white/60 text-xs font-mono truncate max-w-[60%]">{fileName}</span>
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
                <img src={u} alt={fileNames[i]} className="w-full h-full object-cover" />
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

  const info = getStorageInfo(product);

  const loadMedia = useCallback(async () => {
    if (!info) return;
    setLoading(true);
    try {
      const data = await r2.list(info.folder);
      
      const prefixRegex = new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-.*)?\\.(jpg|jpeg|png|webp|heic|mov|mp4|webm|avi|mkv)$`, 'i');
      const matching = (data || [])
        .filter((f: any) => prefixRegex.test(f.Key.split('/').pop()))
        .map((f: any) => f.Key.split('/').pop())
        .sort((a, b) => {
          const numA = parseInt(a.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(b.match(/-(\d+)\./)?.[1] || "0");
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

  const handleDelete = async (fileName: string) => {
    if (!info) return;
    try {
      await r2.delete(info.folder, fileName);
      toast.success("Arquivo removido do Cloudflare");
      setMedia((prev) => prev.filter((f) => f !== fileName));
      onDelete?.(fileName);
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
        let fileName = targetName;
        if (!fileName) {
          const nums = media
            .map((f) => {
              const match = f.match(new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.`));
              return match ? parseInt(match[1]) : 0;
            })
            .filter((n) => n > 0);
          const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
          const ext = file.name.split(".").pop() || "jpg";
          fileName = `${info.prefix}-${next}.${ext}`;
        }

        await r2.upload(info.folder, fileName, file);
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

  if (!info) return <div className="p-8 text-center text-muted-foreground">Tipo de produto não suportado para mídia.</div>;

  const mediaUrls = media.map((f) => storageUrl(`${info.folder}/${f}`));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Galeria de Fotos & Vídeos</h3>
          <p className="text-sm text-muted-foreground">Imagens que serão exibidas na página pública do produto.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload em Massa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((fileName, idx) => {
            const isVid = isVideo(fileName);
            
            return (
              <div key={fileName} className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/5 aspect-[4/3] shadow-sm cursor-pointer">
                {/* Clickable area — opens lightbox */}
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full z-10"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  title="Visualizar"
                />

                {isVid ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <Film className="h-8 w-8 text-white/20" />
                    <Play className="h-6 w-6 text-white absolute" />
                  </div>
                ) : (
                  <OptimizedImage
                    src={optimizedUrl(`${info.folder}/${fileName}`, IMAGE_PRESETS.thumbnail)}
                    alt={fileName}
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                )}

                {favorites.includes(fileName) && (
                  <div className="absolute top-2 right-2 z-10 pointer-events-none">
                    <div className="bg-yellow-500 rounded-full p-1 shadow-lg ring-2 ring-white/50">
                      <Star className="h-2.5 w-2.5 text-white fill-current" />
                    </div>
                  </div>
                )}
                
                {/* Hover overlay — pointer-events-none when invisible so clicks reach z-10 button */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20 pointer-events-none group-hover:pointer-events-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                    title="Visualizar"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={favorites.includes(fileName) ? "default" : "secondary"}
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(fileName); }}
                    title={favorites.includes(fileName) ? "Remover dos favoritos" : "Favoritar (máx 5)"}
                  >
                    <Star className={cn("h-4 w-4 text-yellow-500", favorites.includes(fileName) && "fill-current")} />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => { e.stopPropagation(); startReplace(fileName); }}
                    title="Substituir"
                  >
                    <Replace className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => { e.stopPropagation(); handleDelete(fileName); }}
                    title="Deletar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="absolute bottom-2 left-2 flex gap-1 z-20">
                  <Badge className="bg-black/40 backdrop-blur-md border-none text-[9px] px-1.5 h-4">
                    {idx + 1}
                  </Badge>
                  {isVid && <Badge className="bg-blue-500/80 backdrop-blur-md border-none text-[9px] px-1.5 h-4">Vídeo</Badge>}
                </div>
              </div>
            );
          })}
          
          <button 
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all aspect-[4/3] group"
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">Adicionar</span>
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
