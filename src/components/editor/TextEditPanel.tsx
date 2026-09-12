import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import EditorColorPicker from "./EditorColorPicker";
import { textEditorId } from '@/lib/siteTextOverrides';

interface Props {
  element: HTMLElement;
  onOverride: (selector: string, styles: Record<string, string>, textContent?: string, device?: string, originalText?: string) => void;
  onClose: () => void;
  initialDevice?: "desktop" | "mobile";
}

function ensureEditorId(el: HTMLElement): string {
  if (el.dataset.editorId) return el.dataset.editorId;
  const id = textEditorId(el);
  el.dataset.editorId = id;
  return id;
}

function useTrackedRect(element: HTMLElement, deps: unknown[] = []) {
  const [rect, setRect] = useState(() => element.getBoundingClientRect());
  useEffect(() => {
    const update = () => setRect(element.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, ...deps]);
  return rect;
}

const alignOptions = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
] as const;

// Properties we modify — used to save/restore originals
const MANAGED_PROPS = ["color", "maxWidth", "textAlign", "fontSize"] as const;

export default function TextEditPanel({ element, onOverride, onClose, initialDevice = "desktop" }: Props) {
  // A draft belongs to the device on which this panel was opened, even if the
  // parent changes its current viewport before the draft is confirmed.
  const editingDevice = useRef(initialDevice).current;
  const computed = window.getComputedStyle(element);
  const [color, setColor] = useState(rgbToHex(computed.color));
  const [fontSize, setFontSize] = useState(parseFloat(computed.fontSize));
  const [widthPx, setWidthPx] = useState(element.offsetWidth);
  const [textContent, setTextContent] = useState(element.innerText);
  const [textAlign, setTextAlign] = useState<string>(computed.textAlign === "start" ? "left" : computed.textAlign);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Save original inline styles on mount so we can restore on cancel
  const originals = useRef<Record<string, string>>({});
  const originalText = useRef(element.innerText);
  const sourceText = useRef(element.dataset.editorOriginalText ?? element.textContent ?? '');
  const canEditText = element.children.length === 0;
  useEffect(() => {
    element.dataset.editorOriginalText = sourceText.current;
    element.setAttribute('data-editor-text-editing','');
    return () => element.removeAttribute('data-editor-text-editing');
  }, [element]);
  useEffect(() => {
    const saved: Record<string, string> = {};
    for (const prop of MANAGED_PROPS) {
      saved[prop] = element.style[prop as keyof CSSStyleDeclaration] as string;
    }
    originals.current = saved;
    originalText.current = element.innerText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selector = ensureEditorId(element);
  const rect = useTrackedRect(element, [widthPx]);

  // Apply live inline previews (temporary, while panel is open)
  useEffect(() => { element.style.maxWidth = `${widthPx}px`; }, [widthPx, element]);
  useEffect(() => { element.style.color = color; }, [color, element]);
  useEffect(() => { element.style.fontSize = `${fontSize}px`; }, [fontSize, element]);
  useEffect(() => { element.style.textAlign = textAlign; }, [textAlign, element]);
  useEffect(() => { if (canEditText) element.innerText = textContent; }, [textContent, element, canEditText]);

  // Drag handlers
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const delta = e.clientX - dragStartX.current;
      const newWidth = dragging === "right"
        ? Math.max(100, dragStartWidth.current + delta)
        : Math.max(100, dragStartWidth.current - delta);
      setWidthPx(Math.round(newWidth));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const startDrag = (side: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    dragStartX.current = e.clientX;
    dragStartWidth.current = widthPx;
    setDragging(side);
  };

  // Restore original inline styles (used on cancel AND confirm)
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

  const handleConfirm = useCallback(() => {
    // Keep text content change
    if (canEditText) {
      element.innerText = textContent;
      element.setAttribute('data-editor-text-pending','');
    }

    // Clear inline styles so CSS media-query overrides take effect
    clearInlineStyles();

    const styles: Record<string, string> = {
      color,
      maxWidth: `${widthPx}px`,
      textAlign,
      fontSize: `${fontSize}px`,
    };

    // Keep both persisted and pending overrides scoped to this editing session.
    onOverride(selector, styles, canEditText ? textContent : undefined, editingDevice, sourceText.current);

    // Inject a pending-override style tag for immediate visual feedback
    injectPendingOverride(selector, styles, editingDevice);

    onClose();
  }, [color, fontSize, widthPx, textAlign, textContent, element, selector, onOverride, editingDevice, onClose, clearInlineStyles, canEditText]);

  const handleCancel = useCallback(() => {
    // Restore everything
    clearInlineStyles();
    if (canEditText) element.innerText = originalText.current;
    onClose();
  }, [element, clearInlineStyles, onClose, canEditText]);

  const handleStyle = "absolute top-0 w-3 h-full cursor-col-resize z-[9999] group";
  const handleLine = "absolute top-0 bottom-0 w-0.5 bg-blue-400 group-hover:bg-blue-300 group-hover:w-1 transition-all";

  return createPortal(
    <>
      <div data-editor-ui className="fixed inset-0 z-[9997]" onClick={handleCancel} />

      {/* Highlight with drag handles */}
      <div
        className="fixed z-[9998] border-2 border-blue-400 rounded pointer-events-none"
        style={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
      >
        <div
          data-editor-ui
          className={handleStyle + " -left-2"}
          style={{ pointerEvents: "auto" }}
          onMouseDown={(e) => startDrag("left", e)}
        >
          <div className={handleLine + " left-1"} />
        </div>
        <div
          data-editor-ui
          className={handleStyle + " -right-2"}
          style={{ pointerEvents: "auto" }}
          onMouseDown={(e) => startDrag("right", e)}
        >
          <div className={handleLine + " right-1"} />
        </div>
      </div>

      {/* Width indicator while dragging */}
      {dragging && (
        <div
          data-editor-ui
          className="fixed z-[9999] bg-gray-900/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
          style={{ left: rect.left + rect.width / 2 - 30, top: rect.top - 28 }}
        >
          {widthPx}px
        </div>
      )}

      {/* Panel */}
      <div
        data-editor-ui
        className="fixed z-[9999] bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-4 w-72 space-y-3 animate-in slide-in-from-right-4 duration-200"
        style={{ left: Math.max(rect.right - 288, 8), top: Math.min(rect.bottom + 12, window.innerHeight - 520) }}
      >
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-semibold">Editar Texto</span>
          <button onClick={handleCancel} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Textarea for content editing */}
        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide">Conteúdo</label>
          <textarea
            data-editor-ui
            disabled={!canEditText}
            maxLength={10000}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={4}
            className="w-full mt-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm px-3 py-2 resize-y focus:outline-none focus:border-blue-400 placeholder:text-white/30"
            placeholder="Digite o texto..."
          />
          {!canEditText && <p className="mt-1 text-xs text-white/70">Selecione um trecho de texto simples para editar o conteúdo; os estilos deste bloco continuam disponíveis.</p>}
        </div>

        {/* Alignment */}
        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide">Alinhamento</label>
          <div className="flex gap-1 mt-1">
            {alignOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                data-editor-ui
                onClick={() => setTextAlign(value)}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-sm transition-colors ${
                  textAlign === value
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <EditorColorPicker value={color} onChange={setColor} label="Cor da fonte" />

        {/* Font size */}
        <div>
          <label className="text-[11px] font-medium text-white/70 uppercase tracking-wide mb-1.5 block">
            Tamanho da fonte ({editingDevice === "mobile" ? "Mobile" : "Desktop"})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={120}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1 accent-blue-400"
            />
            <span className="text-white text-xs font-mono w-10 text-right">{fontSize.toFixed(0)}px</span>
          </div>
        </div>

        <p className="text-[10px] text-white/40 text-center">
          ↔ Arraste as bordas laterais para ajustar a largura
        </p>

        <button
          onClick={handleConfirm}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Confirmar
        </button>
      </div>
    </>,
    document.body
  );
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return "#000000";
  return (
    "#" +
    match
      .slice(0, 3)
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/**
 * Inject/update a <style> tag with pending (unsaved) overrides using media queries.
 * This ensures confirmed edits for one device don't affect the other.
 */
function injectPendingOverride(selector: string, styles: Record<string, string>, device: string) {
  let styleEl = document.getElementById("editor-pending-overrides") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "editor-pending-overrides";
    document.head.appendChild(styleEl);
  }

  // Parse existing pending overrides from a data attribute
  const pendingData: Record<string, Record<string, Record<string, string>>> =
    JSON.parse(styleEl.getAttribute("data-pending") || "{}");

  // Store override keyed by device+selector
  if (!pendingData[device]) pendingData[device] = {};
  pendingData[device][selector] = { ...pendingData[device][selector], ...styles };

  styleEl.setAttribute("data-pending", JSON.stringify(pendingData));

  // Rebuild CSS
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
