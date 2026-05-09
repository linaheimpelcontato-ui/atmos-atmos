import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { storageUrl } from "@/lib/storage";
import { r2 } from "@/lib/r2";
import EditorColorPicker from "./EditorColorPicker";

interface Props {
  element: HTMLElement;
  onOverride: (selector: string, styles: Record<string, string>, textContent?: string, device?: string) => void;
  onClose: () => void;
  currentDevice?: "desktop" | "mobile";
}

function ensureEditorId(el: HTMLElement): string {
  if (el.dataset.editorId) return el.dataset.editorId;
  const id = el.id || el.getAttribute("data-section") || "section";
  const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
  const idx = siblings.indexOf(el);
  const editorId = `bg.${id}[${idx}]`;
  el.dataset.editorId = editorId;
  return editorId;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return "#f5f0e8";
  return "#" + match.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 245, g: 240, b: 232 };
}

function useTrackedRect(element: HTMLElement) {
  const [rect, setRect] = useState(() => element.getBoundingClientRect());
  useEffect(() => {
    const update = () => setRect(element.getBoundingClientRect());
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element]);
  return rect;
}

const SHADOW_PRESETS = [
  { label: "Nenhuma", value: "none" },
  { label: "Sutil", value: "inset 0 2px 20px rgba(0,0,0,0.08)" },
  { label: "Média", value: "inset 0 4px 40px rgba(0,0,0,0.15)" },
  { label: "Forte", value: "inset 0 8px 60px rgba(0,0,0,0.25)" },
];

const MANAGED_PROPS = ["backgroundColor", "paddingTop", "paddingBottom", "boxShadow", "backgroundImage", "backgroundSize", "backgroundPosition"] as const;

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function injectPendingOverride(selector: string, styles: Record<string, string>, device: string) {
  let styleEl = document.getElementById("editor-pending-overrides") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "editor-pending-overrides";
    document.head.appendChild(styleEl);
  }

  const pendingData: Record<string, Record<string, Record<string, string>>> =
    JSON.parse(styleEl.getAttribute("data-pending") || "{}");

  if (!pendingData[device]) pendingData[device] = {};
  pendingData[device][selector] = { ...pendingData[device][selector], ...styles };

  styleEl.setAttribute("data-pending", JSON.stringify(pendingData));

  const allRules: string[] = [];
  const mobileRules: string[] = [];
  const desktopRules: string[] = [];

  for (const [dev, selectors] of Object.entries(pendingData)) {
    for (const [sel, props] of Object.entries(selectors)) {
      const cssSelector = `[data-editor-id="${sel}"]`;
      const cssProps = Object.entries(props)
        .map(([k, v]) => `${camelToKebab(k)}: ${v} !important`)
        .join("; ");
      const rule = `${cssSelector} { ${cssProps} }`;

      if (dev === "mobile") mobileRules.push(rule);
      else if (dev === "desktop") desktopRules.push(rule);
      else allRules.push(rule);
    }
  }

  let css = allRules.join("\n");
  if (mobileRules.length > 0) css += `\n@media (max-width: 767px) {\n${mobileRules.join("\n")}\n}`;
  if (desktopRules.length > 0) css += `\n@media (min-width: 768px) {\n${desktopRules.join("\n")}\n}`;

  styleEl.textContent = css;
}

export default function BackgroundEditPanel({ element, onOverride, onClose, currentDevice = "desktop" }: Props) {
  const computed = window.getComputedStyle(element);
  const [bgColor, setBgColor] = useState(rgbToHex(computed.backgroundColor));
  const [opacity, setOpacity] = useState(100);
  const [paddingY, setPaddingY] = useState(parseFloat(computed.paddingTop) || 48);
  const [shadow, setShadow] = useState("none");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Save original inline styles
  const originals = useRef<Record<string, string>>({});
  useEffect(() => {
    const saved: Record<string, string> = {};
    for (const prop of MANAGED_PROPS) {
      saved[prop] = element.style[prop as keyof CSSStyleDeclaration] as string;
    }
    originals.current = saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selector = ensureEditorId(element);
  const rect = useTrackedRect(element);

  // Apply live preview (inline, temporary)
  useEffect(() => {
    const { r, g, b } = hexToRgb(bgColor);
    element.style.backgroundColor = `rgba(${r},${g},${b},${opacity / 100})`;
  }, [bgColor, opacity, element]);

  useEffect(() => {
    element.style.paddingTop = `${paddingY}px`;
    element.style.paddingBottom = `${paddingY}px`;
  }, [paddingY, element]);

  useEffect(() => {
    element.style.boxShadow = shadow;
  }, [shadow, element]);

  useEffect(() => {
    if (bgImage) {
      element.style.backgroundImage = `url(${bgImage})`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
    } else {
      element.style.backgroundImage = "";
      element.style.backgroundSize = "";
      element.style.backgroundPosition = "";
    }
  }, [bgImage, element]);

  const clearInlineStyles = useCallback(() => {
    for (const prop of MANAGED_PROPS) {
      const orig = originals.current[prop];
      if (orig) {
        (element.style as unknown as Record<string, string>)[prop] = orig;
      } else {
        (element.style as unknown as Record<string, string>)[prop] = "";
      }
    }
  }, [element]);

  const handleUploadImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `backgrounds/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await r2.upload("backgrounds", path.split('/').pop()!, file);
      const url = storageUrl(path);
      setBgImage(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const handleConfirm = useCallback(() => {
    // Clear inline styles — let CSS media queries handle display
    clearInlineStyles();

    const { r, g, b } = hexToRgb(bgColor);
    const styles: Record<string, string> = {
      backgroundColor: `rgba(${r},${g},${b},${opacity / 100})`,
      paddingTop: `${paddingY}px`,
      paddingBottom: `${paddingY}px`,
    };
    if (shadow !== "none") styles.boxShadow = shadow;
    if (bgImage) {
      styles.backgroundImage = `url(${bgImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
    }

    onOverride(selector, styles, undefined, currentDevice);
    injectPendingOverride(selector, styles, currentDevice);
    onClose();
  }, [bgColor, opacity, paddingY, shadow, bgImage, selector, onOverride, currentDevice, onClose, clearInlineStyles]);

  const handleCancel = useCallback(() => {
    clearInlineStyles();
    onClose();
  }, [clearInlineStyles, onClose]);

  const panelWidth = 288;

  return createPortal(
    <>
      <div data-editor-ui className="fixed inset-0 z-[9997]" onClick={handleCancel} />

      <div
        className="fixed z-[9998] border-2 border-amber-400 rounded pointer-events-none"
        style={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
      />

      <div
        data-editor-ui
        className="fixed z-[9999] bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-4 space-y-3 animate-in slide-in-from-right-4 duration-200 overflow-y-auto"
        style={{
          width: panelWidth,
          maxHeight: "calc(100vh - 16px)",
          left: Math.min(rect.right + 12, window.innerWidth - panelWidth - 16),
          top: Math.max(rect.top, 8),
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-semibold">Editar Fundo</span>
          <button onClick={handleCancel} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <EditorColorPicker value={bgColor} onChange={setBgColor} label="Cor de fundo" />

        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
            Transparência ({opacity}%)
          </label>
          <input
            type="range" min={0} max={100} step={1} value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full mt-1 accent-amber-400"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide mb-1.5 block">
            Sombra interna
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {SHADOW_PRESETS.map((s) => (
              <button
                key={s.label}
                onClick={() => setShadow(s.value)}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                  shadow === s.value
                    ? "bg-amber-500 border-amber-400 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
            Padding vertical ({paddingY.toFixed(0)}px)
          </label>
          <input
            type="range" min={0} max={200} step={4} value={paddingY}
            onChange={(e) => setPaddingY(Number(e.target.value))}
            className="w-full mt-1 accent-amber-400"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide mb-1.5 block">
            Imagem de fundo
          </label>
          {bgImage ? (
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              <img loading="lazy" src={bgImage} alt="" className="w-full h-20 object-cover" />
              <button
                onClick={() => setBgImage(null)}
                className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Enviando…" : "Carregar imagem"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Confirmar
        </button>
      </div>
    </>,
    document.body
  );
}
