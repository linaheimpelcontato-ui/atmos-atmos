import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, Pencil, Save, Loader2, ChevronDown, Grid3X3, Plus, Trash2, GripVertical, GripHorizontal, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSaveFocalPoint } from "@/hooks/useFocalPoints";
import { supabase } from "@/integrations/supabase/client";
import SaveReviewDialog from "@/components/editor/SaveReviewDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface PendingFocal {
  type: "focal";
  imagePath: string;
  focalX: number;
  focalY: number;
  device: "desktop" | "mobile";
  rotation?: number;
  scale?: number;
}

interface PendingOverride {
  type: "override";
  selector: string;
  overrideType: string;
  styles: Record<string, string>;
  device: string;
}

interface PendingImageReplace {
  type: "image-replace";
  imagePath: string;
}

type PendingChange = PendingFocal | PendingOverride | PendingImageReplace;

const PAGES = [
  { label: "Home", path: "/" },
  { label: "Roteiros", path: "/roteiros" },
  { label: "Cachoeiras", path: "/cachoeiras" },
  { label: "Experiências", path: "/experiencias" },
  { label: "Hospedagens", path: "/hospedagens" },
  { label: "Serviços", path: "/servicos" },
  { label: "Imersões", path: "/imersoes" },
  { label: "Dúvidas", path: "/duvidas" },
];

export default function AdminVisualEditor() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGES[0]);
  const saveFocal = useSaveFocalPoint();
  const [showGrid, setShowGrid] = useState(false);
  const [gridMode, setGridMode] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");
  const [showReview, setShowReview] = useState(false);
  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "FOCAL_POINT_CHANGED") {
        const { imagePath, focalX, focalY, device = "desktop", rotation, scale } = e.data;
        setPending((prev) => {
          const filtered = prev.filter(
            (p) =>
              !(
                p.type === "focal" &&
                (p as PendingFocal).imagePath === imagePath &&
                (p as PendingFocal).device === device
              )
          );
          return [...filtered, { type: "focal", imagePath, focalX, focalY, device, rotation, scale }];
        });
      }
    if (e.data?.type === "STYLE_OVERRIDE") {
        const { selector, styles, overrideType, device = "all" } = e.data;
        setPending((prev) => {
          const filtered = prev.filter(
            (p) => !(p.type === "override" && (p as PendingOverride).selector === selector && (p as PendingOverride).device === device)
          );
          return [...filtered, { type: "override", selector, overrideType, styles, device }];
        });
      }
      if (e.data?.type === "IMAGE_REPLACED") {
        const { imagePath } = e.data;
        setPending((prev) => {
          const filtered = prev.filter(
            (p) => !(p.type === "image-replace" && (p as PendingImageReplace).imagePath === imagePath)
          );
          return [...filtered, { type: "image-replace", imagePath }];
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Listen for grid mode done from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "GRID_MODE_DONE") {
        setGridMode(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Viewport measurement handshake for faithful image framing
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "REQUEST_MEASURE_VIEWPORT") {
        const { device } = e.data;
        const prevWidth = iframe.style.width;
        const prevMaxWidth = iframe.style.maxWidth;
        const prevMinWidth = iframe.style.minWidth;

        const restore = () => {
          iframe.style.width = prevWidth;
          iframe.style.maxWidth = prevMaxWidth;
          iframe.style.minWidth = prevMinWidth;
        };

        // Resize iframe to target viewport
        if (device === "mobile") {
          iframe.style.width = "390px";
          iframe.style.maxWidth = "390px";
          iframe.style.minWidth = "390px";
        } else {
          // Full width without sidebar constraint
          iframe.style.width = "100%";
          iframe.style.maxWidth = "none";
          iframe.style.minWidth = "0";
        }

        // Wait for reflow then tell iframe to measure
        requestAnimationFrame(() => {
          setTimeout(() => {
            iframe.contentWindow?.postMessage({ type: "VIEWPORT_READY" }, "*");
          }, 350);
        });

        // Listen for measurement complete to restore
        const restoreHandler = (ev: MessageEvent) => {
          if (ev.data?.type === "MEASURE_COMPLETE") {
            restore();
            window.removeEventListener("message", restoreHandler);
            if (restoreTimer) clearTimeout(restoreTimer);
          }
        };
        window.addEventListener("message", restoreHandler);

        // Fallback restore after 3s to avoid getting stuck
        restoreTimer = setTimeout(() => {
          restore();
          window.removeEventListener("message", restoreHandler);
        }, 3000);
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  const sendGridMode = useCallback((m: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setGridMode(m);
    iframe.contentWindow?.postMessage({ type: "SET_GRID_MODE", mode: m }, "*");
  }, []);

  // Toggle edit mode in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      iframe.contentWindow?.postMessage(
        { type: "SET_EDITOR_MODE", enabled: editing },
        "*"
      );
    };
    send();
    iframe.addEventListener("load", send);
    return () => iframe.removeEventListener("load", send);
  }, [editing, currentPage]);

  // Toggle grid overlay in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      iframe.contentWindow?.postMessage(
        { type: "SET_GRID_OVERLAY", enabled: showGrid },
        "*"
      );
    };
    send();
    iframe.addEventListener("load", send);
    return () => iframe.removeEventListener("load", send);
  }, [showGrid, currentPage]);

  // Send viewport mode to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      iframe.contentWindow?.postMessage(
        { type: "SET_VIEWPORT_MODE", mode: viewportMode },
        "*"
      );
    };
    send();
    iframe.addEventListener("load", send);
    return () => iframe.removeEventListener("load", send);
  }, [viewportMode, currentPage]);

  const handleSave = useCallback(async (itemsToSave: PendingChange[]) => {
    if (itemsToSave.length === 0) return;
    setSaving(true);
    try {
      const focalChanges = itemsToSave.filter((p) => p.type === "focal") as PendingFocal[];
      if (focalChanges.length > 0) {
        await Promise.all(
          focalChanges.map((p) => saveFocal(p.imagePath, p.focalX, p.focalY, p.device, p.rotation, p.scale))
        );
      }

      const overrideChanges = itemsToSave.filter((p) => p.type === "override") as PendingOverride[];
      if (overrideChanges.length > 0) {
        await Promise.all(
          overrideChanges.map((o) =>
            db.from("site_overrides").upsert(
              {
                element_selector: o.selector,
                override_type: o.overrideType,
                styles: o.styles,
                device: o.device,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "element_selector,device" }
            )
          )
        );
      }

      iframeRef.current?.contentWindow?.postMessage({ type: "FOCAL_POINTS_SAVED" }, "*");
      
      // Remove saved items from pending, keep unsaved ones
      const savedSet = new Set(itemsToSave);
      setPending((prev) => prev.filter((p) => !savedSet.has(p)));

      // Tell iframe to clear pending preview styles (they're now persisted)
      iframeRef.current?.contentWindow?.postMessage({ type: "CLEAR_PENDING_OVERRIDES" }, "*");

      const count = itemsToSave.length;
      toast.success(`${count} alteração${count > 1 ? "ões" : ""} salva${count > 1 ? "s" : ""}! Visível no site público.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }, [saveFocal]);

  const iframeSrc = `${window.location.origin}${currentPage.path}?editor=true`;

  const focalCount = pending.filter((p) => p.type === "focal").length;
  const overrideCount = pending.filter((p) => p.type === "override").length;
  const replaceCount = pending.filter((p) => p.type === "image-replace").length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              {currentPage.label}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {PAGES.map((p) => (
              <DropdownMenuItem
                key={p.path}
                onClick={() => setCurrentPage(p)}
                className={p.path === currentPage.path ? "bg-accent" : ""}
              >
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Viewport toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setViewportMode("desktop")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewportMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            onClick={() => setViewportMode("mobile")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewportMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>

        <div className="flex-1" />

        {editing && pending.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            {focalCount > 0 && <span>📐 {focalCount}</span>}
            {overrideCount > 0 && <span>🎨 {overrideCount}</span>}
            {replaceCount > 0 && <span>🖼 {replaceCount}</span>}
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={showGrid ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              title="Grids de referência"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="flex flex-col gap-1">
              <Button
                variant={showGrid ? "outline" : "default"}
                size="sm"
                onClick={() => { setShowGrid(!showGrid); if (showGrid) setGridMode(null); }}
                className="gap-1.5 justify-start text-xs h-8"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                {showGrid ? "Ocultar Grid" : "Mostrar Grid"}
              </Button>
              {showGrid && (
                <>
                  <div className="h-px bg-border my-0.5" />
                  <Button
                    variant={gridMode === "add-v" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => sendGridMode("add-v")}
                    className="gap-1.5 justify-start text-xs h-8"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                    <Plus className="h-3 w-3" />
                    Vertical
                  </Button>
                  <Button
                    variant={gridMode === "add-h" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => sendGridMode("add-h")}
                    className="gap-1.5 justify-start text-xs h-8"
                  >
                    <GripHorizontal className="h-3.5 w-3.5" />
                    <Plus className="h-3 w-3" />
                    Horizontal
                  </Button>
                  <div className="h-px bg-border my-0.5" />
                  <Button
                    variant={gridMode === "remove" ? "destructive" : "ghost"}
                    size="sm"
                    onClick={() => sendGridMode("remove")}
                    className="gap-1.5 justify-start text-xs h-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover Linhas
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
          className="gap-1.5"
        >
          {editing ? (
            <>
              <Pencil className="h-3.5 w-3.5" /> Editando
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Visualizando
            </>
          )}
        </Button>

        {pending.length > 0 && (
          <Button
            size="sm"
            onClick={() => setShowReview(true)}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar ({pending.length})
          </Button>
        )}
      </div>

      {/* Iframe */}
      <div className="flex-1 bg-muted/30 overflow-hidden flex justify-center">
        <iframe
          ref={iframeRef}
          key={currentPage.path}
          src={iframeSrc}
          className="h-full border-0 transition-[width,max-width] duration-300 ease-in-out"
          style={{
            width: viewportMode === "mobile" ? "390px" : "100%",
            maxWidth: viewportMode === "mobile" ? "390px" : "none",
            boxShadow: viewportMode === "mobile" ? "0 0 40px rgba(0,0,0,0.15)" : "none",
          }}
          title="Preview do site"
        />
      </div>

      {showReview && (
        <SaveReviewDialog
          pending={pending}
          onSave={(selected) => {
            setShowReview(false);
            handleSave(selected);
          }}
          onCancel={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
