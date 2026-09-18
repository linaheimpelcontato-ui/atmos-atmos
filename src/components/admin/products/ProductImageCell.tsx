import { useState, useRef, useCallback } from "react";
import { ImageIcon, Trash2, Upload, Replace, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { exactStorageUrl, optimizedUrl, IMAGE_PRESETS, isImageMatch } from "@/lib/storage";
import { toast } from "sonner";
import { r2 } from "@/lib/r2";
import { type Product, getStorageInfo } from "./shared";


/* ─── Component ────────────────────────────────────────────────────── */

export function ProductImageCell({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const info = getStorageInfo(product);

  const loadImages = useCallback(async () => {
    if (!info) return;
    setLoading(true);
    try {
      const data = await r2.list(info.folder);
      
      const matching = (data || [])
        .filter((f: any) => isImageMatch(f.Key, info.prefix, info.rawName))
        .map((f: any) => f.Key) // Store full Key
        .sort((a, b) => {
          const nameA = a.toLowerCase();
          const nameB = b.toLowerCase();
          
          // Priority 1: _capa files always first
          const isFavA = nameA.includes('_capa');
          const isFavB = nameB.includes('_capa');
          if (isFavA && !isFavB) return -1;
          if (!isFavA && isFavB) return 1;

          // Priority 2: Numerical order
          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        });
      setImages(matching);
    } catch (err) {
      console.error(err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [info?.folder, info?.prefix, info?.rawName]);

  const handleOpen = () => {
    setOpen(true);
    loadImages();
  };

  const handleDelete = async (fullKey: string) => {
    if (!info) return;
    try {
      const relativePath = fullKey.replace(`${info.folder}/`, "");
      await r2.delete(info.folder, relativePath);
      toast.success("Imagem removida do Cloudflare");
      setImages((prev) => prev.filter((f) => f !== fullKey));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar imagem");
    }
  };

  const handleUpload = async (file: File, targetName?: string) => {
    if (!info) return;
    let fileName = targetName;
    if (!fileName) {
      const nums = images
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

    try {
      const firstWithSubfolder = images.find(m => m.includes(`${info.folder}/`) && m.split('/').length > (info.folder.split('/').length + 1));
      const uploadFolder = (info as any).productFolder || info.folder;
      await r2.upload(uploadFolder, fileName, file);
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


  // Thumbnail: show first image
  const thumbUrl = images.length > 0
    ? optimizedUrl(exactStorageUrl(images[0]), IMAGE_PRESETS.thumbnail)
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
                {images.map((fullKey) => {
                  const fileName = fullKey.split('/').pop() || "";
                  return (
                    <div key={fullKey} className="relative group rounded-lg overflow-hidden border border-border">
                      <img
                        src={optimizedUrl(exactStorageUrl(fullKey), IMAGE_PRESETS.thumbnail)}
                        alt={fileName}
                        className="w-full aspect-[4/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(fullKey)}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {fileName}
                      </span>
                    </div>
                  );
                })}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
