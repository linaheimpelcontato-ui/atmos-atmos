import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFocalPoints } from "@/hooks/useFocalPoints";
import { supabase } from "@/integrations/supabase/client";
import EditorPopup, { type PopupAction } from "./EditorPopup";
import ImageEditPanel from "./ImageEditPanel";
import TextEditPanel from "./TextEditPanel";
import BackgroundEditPanel from "./BackgroundEditPanel";
import GridOverlay from "./GridOverlay";
import { clearSavedEditorPreviews, mergeSavedTextRows, savedTextRows, type SavedPreview } from '@/lib/editorSavedPreviews';
import { resolveEditorElement, type SiteTextOverride } from '@/lib/siteTextOverrides';
import { useLanguage } from "@/contexts/LanguageContext";

const R2_DOMAIN = import.meta.env.VITE_R2_DOMAIN || "";

export default function EditorModeListener() {
  const { language } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<"desktop" | "mobile">("desktop");
  const { data: focalPoints } = useFocalPoints();
  const qc = useQueryClient();

  const [popup, setPopup] = useState<{
    x: number; y: number;
    type: "image" | "text" | "background";
    element: HTMLElement;
  } | null>(null);

  const [panel, setPanel] = useState<{
    type: "edit-image" | "edit-text" | "edit-bg";
    element: HTMLElement;
    device?: "mobile" | "desktop";
    sourceAspect?: number;
    sourceBorderRadius?: string;
  } | null>(null);

  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent || window.parent === window) return;
      if (e.data?.type === "SET_EDITOR_MODE") {
        setEnabled(e.data.enabled);
        if (!e.data.enabled) { setPopup(null); setPanel(null); }
      }
      if (e.data?.type === "FOCAL_POINTS_SAVED") {
        qc.invalidateQueries({ queryKey: ["focal-points"] });
        qc.invalidateQueries({ queryKey: ["site-overrides"] });
        qc.invalidateQueries({ queryKey: ["site-text-overrides"] });
      }
      if (e.data?.type === "SET_GRID_OVERLAY") {
        setShowGrid(e.data.enabled);
      }
      if (e.data?.type === "SET_VIEWPORT_MODE") {
        setCurrentDevice(e.data.mode);
      }
      if (e.data?.type === "EDITOR_CHANGES_SAVED" && Array.isArray(e.data.changes)) {
        const changes = e.data.changes as SavedPreview[];
        void (async () => {
          // Cancel older reads before merging the authoritative values just saved.
          await qc.cancelQueries({ queryKey: ['site-text-overrides'] });
          const saved = savedTextRows(changes);
          for (const row of saved) {
            qc.setQueryData<SiteTextOverride[]>(['site-text-overrides',row.pathname,row.language],
              previous => mergeSavedTextRows(previous,[row]));
          }
          clearSavedEditorPreviews(document,changes,window.location.pathname,language);
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['focal-points'] }),
            qc.invalidateQueries({ queryKey: ['site-overrides'] }),
            qc.invalidateQueries({ queryKey: ['site-text-overrides'] }),
          ]);
        })().catch(error => console.error('Falha ao atualizar a prévia salva',error));
      }
    };
    window.addEventListener("message", handler);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "EDITOR_READY" }, window.location.origin);
    }
    return () => window.removeEventListener("message", handler);
  }, [qc,language]);

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: 'TEXT_EDITOR_STATE', active: panel?.type === 'edit-text' }, window.location.origin);
    return () => window.parent.postMessage({ type: 'TEXT_EDITOR_STATE', active: false }, window.location.origin);
  }, [panel?.type]);

  const extractPath = useCallback((src: string): string => {
    // Legacy Supabase
    const sbMatch = src.match(/\/storage\/v1\/(?:object|render\/image)\/public\/assets\/(.+?)(?:\?|$)/);
    if (sbMatch) return sbMatch[1];
    
    // Cloudflare R2
    if (R2_DOMAIN) {
      const domain = R2_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const r2Match = src.match(new RegExp(`https?://${domain}/(.+?)(?:\\?|$)`));
      if (r2Match) return r2Match[1];
    }
    
    return src;
  }, []);

  const classifyElement = useCallback((el: HTMLElement): "image" | "text" | "background" | null => {
    const tag = el.tagName.toLowerCase();
    if (tag === "img") {
      const style = window.getComputedStyle(el);
      if (style.objectFit === "cover" || el.hasAttribute("data-editable-image") || (el as HTMLImageElement).src.includes("/storage/") || (R2_DOMAIN && (el as HTMLImageElement).src.includes(R2_DOMAIN))) return "image";
    }
    // A click on text edits that text, even when it overlays a cover image.
    if (["h1", "h2", "h3", "h4", "p", "span", "a", "li"].includes(tag) && el.textContent?.trim()) return "text";
    // Blank overlays can still target the underlying cover image.
    if (["div", "section", "span", "p", "h1", "h2", "h3", "h4", "a"].includes(tag)) {
      const parent = el.closest("[class*='relative']") || el.parentElement;
      if (parent) {
        const nearbyImg = parent.querySelector("img[class*='object-cover']") as HTMLImageElement | null;
        if (nearbyImg) return "image";
      }
    }
    if (["h1", "h2", "h3", "h4", "p", "span", "a", "li"].includes(tag)) {
      if (el.textContent?.trim()) return "text";
    }
    if (["section", "div"].includes(tag)) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return "background";
    }
    return null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-editor-ui]')) return;
      let target = e.target as HTMLElement;
      let type: "image" | "text" | "background" | null = null;
      let current: HTMLElement | null = target;
      let depth = 0;
      while (current && depth < 8) {
        type = classifyElement(current);
        if (type) {
          if (type === "image" && current.tagName.toLowerCase() !== "img") {
            // classifyElement found an image via overlay — resolve actual img
            const container = current.closest("[class*='relative']") || current.parentElement;
            const actualImg = container?.querySelector("img[class*='object-cover']") as HTMLImageElement | null;
            if (actualImg) target = actualImg;
          } else {
            target = current;
          }
          break;
        }
        current = current.parentElement;
        depth++;
      }
      if ((type === "background" || !type) && target) {
        const container = type ? target : (target.closest("section") as HTMLElement);
        if (container) {
          const heroImg = container.querySelector("img[class*='object-cover']") as HTMLImageElement | null;
          if (heroImg) { type = "image"; target = heroImg; }
        }
      }
      if (!type) return;
      e.preventDefault();
      e.stopPropagation();
      setPanel(null);
      setPopup({ x: e.clientX + 8, y: e.clientY + 8, type, element: target });
    };

    const styleEl = document.createElement("style");
    styleEl.id = "editor-mode-styles";
    styleEl.textContent = `
      body[data-editor-mode="true"] img,
      body[data-editor-mode="true"] h1, body[data-editor-mode="true"] h2,
      body[data-editor-mode="true"] h3, body[data-editor-mode="true"] p,
      body[data-editor-mode="true"] span, body[data-editor-mode="true"] section,
      body[data-editor-mode="true"] [data-section] { cursor: pointer !important; }
      body[data-editor-mode="true"] img:hover { outline: 3px dashed #3b82f6 !important; outline-offset: 2px; }
      body[data-editor-mode="true"] h1:hover, body[data-editor-mode="true"] h2:hover,
      body[data-editor-mode="true"] h3:hover, body[data-editor-mode="true"] p:hover,
      body[data-editor-mode="true"] span:hover { outline: 2px dashed #60a5fa !important; outline-offset: 1px; }
      body[data-editor-mode="true"] section:hover, body[data-editor-mode="true"] [data-section]:hover {
        outline: 2px dashed #f59e0b !important; outline-offset: -2px; }
    `;
    document.head.appendChild(styleEl);
    document.body.setAttribute("data-editor-mode", "true");
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.getElementById("editor-mode-styles")?.remove();
      document.body.removeAttribute("data-editor-mode");
    };
  }, [enabled, classifyElement]);

  // Ref to hold pending measurement context
  const pendingMeasureRef = useRef<{
    img: HTMLImageElement;
    device: "mobile" | "desktop";
  } | null>(null);

  // Find the visual container that clips/rounds the image
  const findVisualContainer = useCallback((img: HTMLImageElement): HTMLElement => {
    let current = img.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflow = style.overflow;
      const br = style.borderRadius;
      const hasClip = overflow === "hidden" || overflow === "clip";
      const hasRadius = br !== "0px" && br !== "0" && br !== "";
      if (hasClip || hasRadius) return current;
      current = current.parentElement;
    }
    // Fallback: use direct parent
    return img.parentElement || img;
  }, []);

  // Find visible img with same src (for responsive layout swaps)
  const findVisibleImg = useCallback((originalImg: HTMLImageElement): HTMLImageElement => {
    const rect = originalImg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return originalImg;
    // Image hidden in this viewport — find a visible one with same src
    const allImgs = document.querySelectorAll<HTMLImageElement>("img");
    for (const candidate of allImgs) {
      if (candidate === originalImg) continue;
      if (candidate.src === originalImg.src) {
        const cr = candidate.getBoundingClientRect();
        if (cr.width > 0 && cr.height > 0) return candidate;
      }
    }
    return originalImg;
  }, []);

  // Listen for VIEWPORT_READY to measure in correct viewport
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "VIEWPORT_READY" && pendingMeasureRef.current) {
        if (e.origin !== window.location.origin || e.source !== window.parent || window.parent === window) return;
        const { img: originalImg, device } = pendingMeasureRef.current;
        pendingMeasureRef.current = null;

        // Find the visible image in this viewport
        const img = findVisibleImg(originalImg);
        const container = findVisualContainer(img);
        const containerRect = container.getBoundingClientRect();
        const renderedW = containerRect.width;
        const renderedH = containerRect.height;
        const computedBR = window.getComputedStyle(container).borderRadius;

        // Tell parent to restore iframe
        window.parent.postMessage({ type: "MEASURE_COMPLETE" }, "*");

        // Open panel with faithful dimensions
        const path = extractPath(img.src);
        const existing = focalPoints?.find((fp) => path.includes(fp.image_path));

        if (device === "mobile") {
          setFocalX(existing?.focal_x_mobile ?? 50);
          setFocalY(existing?.focal_y_mobile ?? 50);
          setScale(existing?.scale_mobile ?? 1);
        } else {
          setFocalX(existing?.focal_x ?? 50);
          setFocalY(existing?.focal_y ?? 50);
          setScale(existing?.scale ?? 1);
        }
        setRotation(existing?.rotation ?? 0);

        setPanel({
          type: "edit-image", element: img, device,
          sourceAspect: renderedW / renderedH,
          sourceBorderRadius: computedBR,
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [focalPoints, extractPath, findVisualContainer, findVisibleImg]);

  const handleAction = useCallback(
    (action: PopupAction) => {
      if (!popup) return;
      const el = popup.element;
      setPopup(null);

      if (action === "edit-image" || action === "edit-image-desktop" || action === "edit-image-mobile") {
        const img = el as HTMLImageElement;
        const device = action === "edit-image-mobile" ? "mobile" : action === "edit-image-desktop" ? "desktop" : currentDevice;

        // Store ref and request parent to resize iframe to correct viewport
        pendingMeasureRef.current = { img, device };
        window.parent.postMessage({ type: "REQUEST_MEASURE_VIEWPORT", device }, "*");
      } else if (action === "replace-image") {
        replaceTargetRef.current = el as HTMLImageElement;
        if (!fileInputRef.current) {
          const input = document.createElement("input");
          input.type = "file"; input.accept = "image/*"; input.style.display = "none";
          input.addEventListener("change", handleFileSelect);
          document.body.appendChild(input);
          fileInputRef.current = input;
        }
        fileInputRef.current.click();
      } else if (action === "edit-text") {
        setPanel({ type: "edit-text", element: el, device: currentDevice });
      } else if (action === "edit-bg") {
        setPanel({ type: "edit-bg", element: el });
      }
    },
    [popup, focalPoints, extractPath, currentDevice]
  );

  const handleFileSelect = useCallback(
    async (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      const img = replaceTargetRef.current;
      if (!file || !img) return;
      const path = extractPath(img.src);
      if (!path || !path.includes("/")) return;
      try {
        const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
        if (error) throw error;
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        img.src = `${baseUrl}/storage/v1/object/public/assets/${path}?t=${Date.now()}`;
        window.parent.postMessage({ type: "IMAGE_REPLACED", imagePath: path }, "*");
      } catch (err) { console.error("Upload failed:", err); }
      input.value = "";
    },
    [extractPath]
  );

  const handleFocalChange = useCallback(
    (x: number, y: number) => {
      setFocalX(x);
      setFocalY(y);
      if (panel?.element) {
        const img = panel.element as HTMLImageElement;
        if (panel.device === "desktop" || !panel.device) {
          img.style.objectPosition = `${x}% ${y}%`;
        }
        const path = extractPath(img.src);
        window.parent.postMessage({
          type: "FOCAL_POINT_CHANGED",
          imagePath: path, focalX: x, focalY: y,
          device: panel.device || "desktop",
          rotation, scale,
        }, "*");
      }
    },
    [panel, extractPath, rotation, scale]
  );

  const handleRotationChange = useCallback(
    (deg: number) => {
      setRotation(deg);
      if (panel?.element) {
        const path = extractPath((panel.element as HTMLImageElement).src);
        window.parent.postMessage({
          type: "FOCAL_POINT_CHANGED",
          imagePath: path, focalX, focalY,
          device: panel.device || "desktop",
          rotation: deg, scale,
        }, "*");
      }
    },
    [panel, extractPath, focalX, focalY, scale]
  );

  const handleScaleChange = useCallback(
    (s: number) => {
      setScale(s);
      if (panel?.element) {
        const path = extractPath((panel.element as HTMLImageElement).src);
        window.parent.postMessage({
          type: "FOCAL_POINT_CHANGED",
          imagePath: path, focalX, focalY,
          device: panel.device || "desktop",
          rotation, scale: s,
        }, "*");
      }
    },
    [panel, extractPath, focalX, focalY, rotation]
  );

  const handleOverride = useCallback(
    (selector: string, styles: Record<string, string>, textContent?: string, device?: string, originalText?: string) => {
      window.parent.postMessage({ type: "STYLE_OVERRIDE", selector, styles, overrideType: "text_style", device: device || "all" }, "*");
      if (textContent !== undefined) {
        const change = { type: 'text-content' as const, selector, content: textContent,
          originalText: originalText ?? '', device: device || 'all', pathname: window.location.pathname, language };
        const element = resolveEditorElement(document,selector);
        if (element) element.setAttribute('data-editor-text-pending',JSON.stringify(change));
        window.parent.postMessage({ ...change, type: 'TEXT_CONTENT_OVERRIDE' }, window.location.origin);
      }
    }, [language]
  );

  const handleBgOverride = useCallback(
    (selector: string, styles: Record<string, string>, _textContent?: string, device?: string) => {
      window.parent.postMessage({ type: "STYLE_OVERRIDE", selector, styles, overrideType: "bg_style", device: device || "all" }, "*");
    }, []
  );

  if (!enabled) return null;

  return (
    <>
      <GridOverlay visible={showGrid} />
      {popup && (
        <EditorPopup x={popup.x} y={popup.y} elementType={popup.type}
          device={currentDevice}
          onAction={handleAction} onClose={() => setPopup(null)} />
      )}
      {panel?.type === "edit-image" && (
        <ImageEditPanel
          imgElement={panel.element as HTMLImageElement}
          device={panel.device || "desktop"}
          focalX={focalX} focalY={focalY}
          rotation={rotation}
          scale={scale}
          sourceAspect={panel.sourceAspect}
          sourceBorderRadius={panel.sourceBorderRadius}
          onFocalChange={handleFocalChange}
          onRotationChange={handleRotationChange}
          onScaleChange={handleScaleChange}
          onClose={(confirmedDevice) => {
            if (confirmedDevice) {
              // Send focal point with confirmed device target
              const img = panel.element as HTMLImageElement;
              const path = extractPath(img.src);
              if (confirmedDevice === "all") {
                window.parent.postMessage({
                  type: "FOCAL_POINT_CHANGED",
                  imagePath: path, focalX, focalY,
                  device: "desktop", rotation, scale,
                }, "*");
                window.parent.postMessage({
                  type: "FOCAL_POINT_CHANGED",
                  imagePath: path, focalX, focalY,
                  device: "mobile", rotation, scale,
                }, "*");
              } else {
                window.parent.postMessage({
                  type: "FOCAL_POINT_CHANGED",
                  imagePath: path, focalX, focalY,
                  device: confirmedDevice, rotation, scale,
                }, "*");
              }
            }
            setPanel(null);
          }}
        />
      )}
      {panel?.type === "edit-text" && (
        <TextEditPanel element={panel.element} onOverride={handleOverride} onClose={() => setPanel(null)} initialDevice={panel.device || currentDevice} />
      )}
      {panel?.type === "edit-bg" && (
        <BackgroundEditPanel element={panel.element} onOverride={handleBgOverride} onClose={() => setPanel(null)} currentDevice={currentDevice} />
      )}
    </>
  );
}
