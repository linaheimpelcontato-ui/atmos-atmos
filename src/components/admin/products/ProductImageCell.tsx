import { useState, useRef, useCallback } from "react";
import { ImageIcon, Trash2, Upload, Replace, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl } from "@/lib/storage";
import { toast } from "sonner";
import { r2 } from "@/lib/r2";
import type { Product } from "./shared";

/* ─── Storage path mapping ─────────────────────────────────────────── */

function getStorageInfo(product: Product): { folder: string; prefix: string } | null {
  const vars = (product.variables || {}) as Record<string, unknown>;
  switch (product.type) {
    case "waterfall":
      return { folder: "cachoeiras", prefix: product.source_id || product.name };
    case "experience":
      return { folder: "experiencias", prefix: (vars.imageKey as string) || product.source_id || product.name };
    case "accommodation":
      return { folder: "hospedagens", prefix: product.source_id || product.name };
    case "service":
      return { folder: "servicos", prefix: product.source_id || product.category || product.name };
    case "itinerary":
      return { folder: "roteiros", prefix: product.source_id || product.name };
    default:
      return null;
  }
}

/* ─── Component ────────────────────────────────────────────────────── */

export function ProductImageCell({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);

  const info = getStorageInfo(product);

  const loadImages = useCallback(async () => {
    if (!info) return;
    setLoading(true);
    try {
      const data = await r2.list(info.folder);
      const matching = (data || [])
        .map((f: any) => f.Key.split('/').pop())
        .filter((name: string) => new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-.*)?\\.(jpg|jpeg|png|webp|heic|mov|mp4|webm|avi|mkv)$`, 'i').test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setImages(matching);
    } catch (err) {
      console.error(err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [info?.folder, info?.prefix]);

  const handleOpen = () => {
    setOpen(true);
    loadImages();
  };

  const handleDelete = async (fileName: string) => {
    if (!info) return;
    try {
      await r2.delete(info.folder, fileName);
      toast.success("Imagem removida do Cloudflare");
      setImages((prev) => prev.filter((f) => f !== fileName));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar imagem");
    }
  };

  const handleUpload = async (file: File, targetName?: string) => {
    if (!info) return;
    let fileName = targetName;
    if (!fileName) {
      // find next number
      const nums = images
        .map((f) => {
          const match = f.match(new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.`));
          return match ? parseInt(match[1]) : 0;
        })
        .filter((n) => n > 0);
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const ext = file.name.split(".").pop() || "jpg";
      fileName = `${info.prefix}-${next}.${ext}`;
    }

    try {
      await r2.upload(info.folder, fileName, file);
      toast.success(targetName ? "Imagem substituída" : "Imagem adicionada ao Cloudflare");
      await loadImages();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar imagem");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleUpload(file);
    e.target.value = "";
  };

  const handleReplaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replaceTarget) await handleUpload(file, replaceTarget);
    e.target.value = "";
    setReplaceTarget(null);
  };

  const startReplace = (fileName: string) => {
    setReplaceTarget(fileName);
    setTimeout(() => replaceRef.current?.click(), 50);
  };

  // Thumbnail: show first image
  const thumbUrl = info && images.length > 0
    ? storageUrl(`${info.folder}/${images[0]}`)
    : info
      ? storageUrl(`${info.folder}/${info.prefix}-1.jpg`)
      : null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="w-8 h-8 rounded object-cover border border-border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <span className="hidden">
          <ImageIcon className="w-8 h-8 p-1.5 rounded border border-border text-muted-foreground" />
        </span>
        <ImageIcon className={`w-4 h-4 text-muted-foreground ${thumbUrl ? "hidden" : ""}`} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Fotos — {product.name}
              <Badge variant="secondary" className="text-xs">{images.length}</Badge>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : (
            <>
              {images.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Nenhuma imagem encontrada.</p>
              )}

              <div className="grid grid-cols-3 gap-3 max-h-[50vh] overflow-auto">
                {images.map((fileName) => (
                  <div key={fileName} className="relative group rounded-lg overflow-hidden border border-border">
                    <img
                      src={storageUrl(`${info!.folder}/${fileName}`)}
                      alt={fileName}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startReplace(fileName)}
                        title="Substituir"
                      >
                        <Replace className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(fileName)}
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {fileName}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Adicionar foto
                </Button>
              </div>
            </>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceChange} />
        </DialogContent>
      </Dialog>
    </>
  );
}
