import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Trash2, 
  Upload, 
  X, 
  Loader2, 
  Film, 
  ImageIcon, 
  Play, 
  Star,
  GripVertical,
  CheckSquare,
  Square,
  Download,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { optimizedUrl, storageUrl, IMAGE_PRESETS, isImageMatch } from "@/lib/storage";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { toast } from "sonner";
import { r2 } from "@/lib/r2";
import type { Product } from "./shared";
import { getStorageInfo } from "./shared";
import { cn } from "@/lib/utils";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from "framer-motion";

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

/* ─── Sortable Item ────────────────────────────────────────────────── */

function SortableItem({ 
  id, 
  fullKey, 
  idx, 
  isSelected, 
  isFav, 
  isVid, 
  onSelect, 
  onFavorite, 
  onDelete, 
  onDownload,
  onClick
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-2xl overflow-hidden border transition-all duration-300 aspect-[4/3] bg-white/5",
        isSelected ? "ring-2 ring-[#2D241E] border-transparent scale-[0.98]" : "border-black/5 hover:border-black/10 hover:shadow-xl",
        isDragging && "opacity-0"
      )}
    >
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={onClick}
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={cn(
          "absolute top-3 left-3 z-30 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center backdrop-blur-md",
          isSelected ? "bg-[#2D241E] border-[#2D241E] text-white shadow-lg" : "bg-black/10 border-white/60 opacity-0 group-hover:opacity-100 text-white"
        )}
      >
        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>

      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3 right-3 z-30 p-2.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-grab active:cursor-grabbing text-white hover:bg-white/20 shadow-lg"
        title="Arraste para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="w-full h-full">
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
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            containerClassName="w-full h-full"
          />
        )}
      </div>

      {isFav && (
        <div className="absolute bottom-3 left-3 z-20">
          <Badge className="bg-yellow-400 text-[#2D241E] border-none text-[8px] font-black uppercase px-2 h-5 shadow-lg shadow-yellow-400/20 backdrop-blur-md">
            Capa
          </Badge>
        </div>
      )}
      
      <div className={cn(
        "absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20 pointer-events-none group-hover:pointer-events-auto",
        isSelected && "opacity-0"
      )}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-all backdrop-blur-md shadow-lg",
            isFav ? "bg-yellow-400 text-black scale-110" : "bg-white/20 border border-white/30 text-white hover:bg-white/40"
          )}
          title="Definir como Capa"
        >
          <Star className={cn("h-5 w-5", isFav && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 flex items-center justify-center transition-all shadow-lg"
          title="Baixar"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="h-10 w-10 rounded-xl bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-lg"
          title="Deletar"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Component ────────────────────────────────────────────────────── */

export function ProductMediaTab({ 
  product,
  onFavoriteToggle
}: { 
  product: Product;
  onFavoriteToggle?: (fileName: string) => void;
}) {
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const favorites = (product.variables as any)?.favorites || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const info = getStorageInfo(product);

  const loadMedia = useCallback(async () => {
    if (!info) return;
    setLoading(true);
    try {
      const data = await r2.list(info.folder);
      
      const matching = (data || [])
        .filter((f: any) => isImageMatch(f.Key, info.prefix, info.rawName))
        .map((f: any) => f.Key)
        .sort((a, b) => {
          const nameA = a.toLowerCase();
          const nameB = b.toLowerCase();
          
          const isFavA = nameA.includes('_capa');
          const isFavB = nameB.includes('_capa');
          if (isFavA && !isFavB) return -1;
          if (!isFavA && isFavB) return 1;

          const numA = parseInt(nameA.match(/-(\d+)\./)?.[1] || "0");
          const numB = parseInt(nameB.match(/-(\d+)\./)?.[1] || "0");
          return numA - numB;
        });
      setMedia(matching);
    } catch (err) {
      console.error(err);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [info?.folder, info?.prefix, info?.rawName]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleDelete = async (fullKey: string) => {
    if (!info) return;
    try {
      const relativePath = fullKey.replace(`${info.folder}/`, "");
      await r2.delete(info.folder, relativePath);
      toast.success("Imagem removida");
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar");
    }
  };

  const handleUpload = async (files: File[]) => {
    if (!info) return;
    setUploading(true);
    try {
      const nums = media
        .map((f) => {
          const baseName = f.split('/').pop() || "";
          const match = baseName.match(/-(\d+)\./);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((n) => n > 0);
      let nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

      const uploadFolder = (info as any).productFolder || info.folder;

      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${info.prefix}-${nextNum}.${ext}`;
        await r2.upload(uploadFolder, fileName, file);
        nextNum++;
      }
      toast.success(`${files.length} arquivos enviados`);
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id || !info) return;

    const oldIndex = media.indexOf(active.id as string);
    const newIndex = media.indexOf(over.id as string);
    
    const newMedia = arrayMove(media, oldIndex, newIndex);
    setMedia(newMedia);

    setIsMoving(true);
    try {
      // Reordering is expensive in R2 because we have to rename files to keep numerical order.
      // We'll do it in chunks to avoid timeouts.
      const tempKeys: string[] = [];
      const baseFolder = info.folder;

      // 1. Copy to temp
      for (let i = 0; i < newMedia.length; i++) {
        const currentKey = newMedia[i];
        const fileName = currentKey.split('/').pop() || "";
        const tempKey = `${baseFolder}/.temp_${Date.now()}_${i}_${fileName}`;
        await r2.copy(currentKey, tempKey);
        tempKeys.push(tempKey);
      }

      // 2. Delete originals
      for (const key of media) {
        await r2.delete(baseFolder, key.replace(`${baseFolder}/`, ""));
      }

      // 3. Move from temp to final names
      for (let i = 0; i < tempKeys.length; i++) {
        const tempKey = tempKeys[i];
        const originalKey = newMedia[i];
        const ext = originalKey.split('.').pop();
        const isFav = originalKey.includes('_capa');
        const newName = `${info.prefix}-${i + 1}${isFav ? '_capa' : ''}.${ext}`;
        
        // Find subfolder if any
        const parts = originalKey.replace(`${baseFolder}/`, "").split('/');
        const subfolder = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
        const finalKey = `${baseFolder}/${subfolder}${newName}`;
        
        await r2.copy(tempKey, finalKey);
        await r2.delete(baseFolder, tempKey.replace(`${baseFolder}/`, ""));
      }
      
      toast.success("Ordem sincronizada");
      await loadMedia();
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Erro ao sincronizar ordem. Tente novamente.");
      await loadMedia();
    } finally {
      setIsMoving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const downloadFile = async (url: string, fullKey: string) => {
    const fileName = fullKey.split('/').pop() || "image.jpg";
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error("CORS or Network issue");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Standard download failed, trying alternative:", err);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info(`Download iniciado: ${fileName}`, { duration: 2000 });
    }
  };

  const bulkDownload = async () => {
    if (selectedKeys.length === 0) return;
    toast.info(`Preparando download de ${selectedKeys.length} arquivos...`);
    
    for (let i = 0; i < selectedKeys.length; i++) {
      const key = selectedKeys[i];
      const url = storageUrl(key);
      await downloadFile(url, key);
      if (i < selectedKeys.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
  };

  const toggleFavorite = (fullKey: string) => {
    const fileName = fullKey.split('/').pop() || "";
    if (onFavoriteToggle) {
      onFavoriteToggle(fileName);
      toast.success("Destaque atualizado", {
        icon: <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />,
        duration: 2000
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedKeys.length === media.length && media.length > 0) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys([...media]);
    }
  };

  const bulkDelete = async () => {
    if (!info || selectedKeys.length === 0) return;
    if (!confirm(`Deseja deletar ${selectedKeys.length} arquivos permanentemente?`)) return;

    setLoading(true);
    try {
      for (const key of selectedKeys) {
        await r2.delete(info.folder, key.replace(`${info.folder}/`, ""));
      }
      toast.success(`${selectedKeys.length} arquivos removidos com sucesso`);
      setSelectedKeys([]);
      await loadMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar alguns arquivos");
    } finally {
      setLoading(false);
    }
  };

  if (!info) return <div className="p-8 text-center text-[#8d7b63] font-medium italic">Tipo de produto não suportado para mídia.</div>;

  const mediaUrls = media.map((f) => storageUrl(f));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white/60 backdrop-blur-xl p-5 rounded-3xl border border-white/20 sticky top-0 z-30 shadow-xl shadow-black/5">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={toggleSelectAll}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all border",
              selectedKeys.length > 0 && selectedKeys.length === media.length
                ? "bg-[#2D241E] border-[#2D241E] text-white"
                : "bg-white/50 border-black/5 text-[#2D241E] hover:border-black/10"
            )}
          >
            {selectedKeys.length > 0 ? (
              selectedKeys.length === media.length ? <CheckSquare className="h-5 w-5" /> : <div className="h-2 w-3 bg-current rounded-sm" />
            ) : <Square className="h-5 w-5" />}
          </button>

          <div className="flex flex-col">
            <h3 className="text-sm font-black text-[#2D241E] uppercase tracking-tighter">
              {selectedKeys.length > 0 ? `${selectedKeys.length} Selecionados` : "Galeria Atmos"}
            </h3>
            <p className="text-[10px] text-[#8d7b63] uppercase tracking-[0.2em] font-bold opacity-70 leading-tight">
              {selectedKeys.length > 0 ? "Escolha uma ação global" : `${media.length} itens no total`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedKeys.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex gap-2"
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={bulkDownload} 
                  className="h-10 px-5 rounded-2xl text-xs font-bold border-black/5 bg-white/50 hover:bg-white transition-all shadow-sm active:scale-95"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={bulkDelete} 
                  className="h-10 px-5 rounded-2xl text-xs font-bold bg-red-500 hover:bg-red-600 border-none shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar
                </Button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => fileRef.current?.click()} 
              disabled={uploading || isMoving} 
              className="h-11 px-6 rounded-2xl text-xs font-black bg-[#2D241E] text-white border-none hover:bg-[#3D342E] shadow-xl shadow-black/10 transition-all active:scale-95 flex items-center gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              ADICIONAR MÍDIA
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
          <p className="text-xs font-medium text-[#8d7b63] animate-pulse text-center max-w-[200px]">
            {isMoving ? "Sincronizando nova ordem no Cloudflare..." : "Carregando galeria..."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
            <SortableContext
              items={media}
              strategy={rectSortingStrategy}
            >
              {media.map((fullKey, idx) => {
                const fileName = fullKey.split('/').pop() || "";
                const isFav = fullKey.includes('_capa') || favorites.includes(fileName);
                return (
                  <SortableItem
                    key={fullKey}
                    id={fullKey}
                    fullKey={fullKey}
                    idx={idx}
                    isSelected={selectedKeys.includes(fullKey)}
                    isFav={isFav}
                    isVid={isVideo(fullKey)}
                    onSelect={() => {
                      setSelectedKeys(prev => 
                        prev.includes(fullKey) ? prev.filter(k => k !== fullKey) : [...prev, fullKey]
                      );
                    }}
                    onFavorite={() => toggleFavorite(fullKey)}
                    onDelete={() => handleDelete(fullKey)}
                    onDownload={() => downloadFile(storageUrl(fullKey), fullKey)}
                    onClick={() => selectedKeys.length > 0 ? (
                      setSelectedKeys(prev => 
                        prev.includes(fullKey) ? prev.filter(k => k !== fullKey) : [...prev, fullKey]
                      )
                    ) : setLightboxIndex(idx)}
                  />
                );
              })}
            </SortableContext>
            
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
            </button>
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId ? (
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-[#2D241E] shadow-2xl scale-105 aspect-[4/3]">
                {isVideo(activeId) ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#2D241E]">
                    <Film className="h-8 w-8 text-white/50" />
                  </div>
                ) : (
                  <img
                    src={optimizedUrl(activeId, IMAGE_PRESETS.thumbnail)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          urls={media.map(storageUrl)}
          fileNames={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) handleUpload(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
