import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

interface GridOverlayProps {
  visible: boolean;
}

interface VLine { id: number; pct: number }
interface HLine { id: number; pct: number }

let nextId = 100;

const RED = "220,50,50";
const LINE_OPACITY = 0.4;
const CENTER_OPACITY = 0.5;
const SELECTED_OPACITY = 0.75;

type Mode = null | "add-v" | "add-h" | "remove";

export default function GridOverlay({ visible }: GridOverlayProps) {
  const [vLines, setVLines] = useState<VLine[]>([
    { id: 1, pct: 25 },
    { id: 2, pct: 33.333 },
  ]);
  const [hLines, setHLines] = useState<HLine[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [removeTargets, setRemoveTargets] = useState<Set<string>>(new Set());

  const dragging = useRef<{ axis: "v" | "h"; id: number; startPos: number; startVal: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Listen for mode messages from parent
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "SET_GRID_MODE") {
        const newMode = e.data.mode as Mode;
        setMode(newMode);
        if (newMode !== "remove") setRemoveTargets(new Set());
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Drag / select handlers for vertical lines
  const onMouseDownV = useCallback((id: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "remove") {
      const key = `v-${id}`;
      setRemoveTargets(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      return;
    }
    if (mode) return;
    const line = vLines.find(l => l.id === id);
    if (!line) return;
    dragging.current = { axis: "v", id, startPos: e.clientX, startVal: line.pct };
    setIsDragging(true);
  }, [vLines, mode]);

  // Drag / select handlers for horizontal lines
  const onMouseDownH = useCallback((id: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "remove") {
      const key = `h-${id}`;
      setRemoveTargets(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      return;
    }
    if (mode) return;
    const line = hLines.find(l => l.id === id);
    if (!line) return;
    dragging.current = { axis: "h", id, startPos: e.clientY, startVal: line.pct };
    setIsDragging(true);
  }, [hLines, mode]);

  // Drag move/up
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const d = dragging.current;
      if (d.axis === "v") {
        const deltaPct = ((e.clientX - d.startPos) / window.innerWidth) * 100;
        setVLines(prev => prev.map(l => l.id === d.id ? { ...l, pct: Math.max(2, Math.min(48, d.startVal + deltaPct)) } : l));
      } else {
        const deltaPct = ((e.clientY - d.startPos) / window.innerHeight) * 100;
        setHLines(prev => prev.map(l => l.id === d.id ? { ...l, pct: Math.max(2, Math.min(98, d.startVal + deltaPct)) } : l));
      }
    };
    const onUp = () => { dragging.current = null; setIsDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  // Canvas click for add modes
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (mode === "add-v") {
      let pct = (e.clientX / window.innerWidth) * 100;
      if (pct > 50) pct = 100 - pct;
      pct = Math.max(2, Math.min(48, pct));
      setVLines(prev => [...prev, { id: ++nextId, pct }]);
      setMode(null);
      window.parent.postMessage({ type: "GRID_MODE_DONE" }, "*");
    } else if (mode === "add-h") {
      const pct = Math.max(2, Math.min(98, (e.clientY / window.innerHeight) * 100));
      setHLines(prev => [...prev, { id: ++nextId, pct }]);
      setMode(null);
      window.parent.postMessage({ type: "GRID_MODE_DONE" }, "*");
    }
  }, [mode]);

  const confirmRemove = () => {
    const vDel = new Set<number>();
    const hDel = new Set<number>();
    removeTargets.forEach(key => {
      const [t, id] = key.split("-");
      (t === "v" ? vDel : hDel).add(Number(id));
    });
    setVLines(prev => prev.filter(l => !vDel.has(l.id)));
    setHLines(prev => prev.filter(l => !hDel.has(l.id)));
    setRemoveTargets(new Set());
    setMode(null);
    window.parent.postMessage({ type: "GRID_MODE_DONE" }, "*");
  };

  const cancelMode = () => {
    setRemoveTargets(new Set());
    setMode(null);
    window.parent.postMessage({ type: "GRID_MODE_DONE" }, "*");
  };

  if (!visible) return null;

  const isAdd = mode === "add-v" || mode === "add-h";
  const isRemove = mode === "remove";

  const vLineStyle = (left: number, sel: boolean): React.CSSProperties => ({
    position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: "1px",
    background: `rgba(${RED},${sel ? SELECTED_OPACITY : LINE_OPACITY})`,
    pointerEvents: "none",
  });

  const hLineStyle = (top: number, sel: boolean): React.CSSProperties => ({
    position: "absolute", top: `${top}%`, left: 0, right: 0, height: "1px",
    background: `rgba(${RED},${sel ? SELECTED_OPACITY : LINE_OPACITY})`,
    pointerEvents: "none",
  });

  const vHandleStyle = (left: number): React.CSSProperties => ({
    position: "absolute", left: `${left}%`, top: 0, bottom: 0,
    width: "9px", marginLeft: "-4px",
    cursor: isRemove ? "pointer" : (mode ? "default" : "ew-resize"),
    pointerEvents: (isRemove || !mode) ? "auto" : "none",
    zIndex: 2,
  });

  const hHandleStyle = (top: number): React.CSSProperties => ({
    position: "absolute", top: `${top}%`, left: 0, right: 0,
    height: "9px", marginTop: "-4px",
    cursor: isRemove ? "pointer" : (mode ? "default" : "ns-resize"),
    pointerEvents: (isRemove || !mode) ? "auto" : "none",
    zIndex: 2,
  });

  const labelV = (left: number): React.CSSProperties => ({
    position: "absolute", left: `${left}%`, top: "8px", transform: "translateX(-50%)",
    fontSize: "9px", fontFamily: "monospace", color: `rgba(${RED},0.6)`, pointerEvents: "none", whiteSpace: "nowrap",
  });

  const labelH = (top: number): React.CSSProperties => ({
    position: "absolute", top: `${top}%`, left: "8px", transform: "translateY(-50%)",
    fontSize: "9px", fontFamily: "monospace", color: `rgba(${RED},0.6)`, pointerEvents: "none", whiteSpace: "nowrap",
  });

  return createPortal(
    <div
      id="editor-grid-overlay"
      style={{
        position: "fixed", inset: 0,
        pointerEvents: (isAdd || isRemove) ? "auto" : "none",
        zIndex: 99998,
        cursor: isAdd ? "crosshair" : (isRemove ? "default" : "default"),
      }}
      data-editor-ui
      onClick={isAdd ? handleCanvasClick : undefined}
    >
      {/* Add mode indicator */}
      {isAdd && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          padding: "6px 16px", borderRadius: 6,
          background: "rgba(0,0,0,0.8)", color: `rgb(${RED})`,
          fontSize: 12, fontFamily: "system-ui", pointerEvents: "none", zIndex: 10,
          whiteSpace: "nowrap",
        }}>
          Clique para posicionar a linha {mode === "add-v" ? "vertical" : "horizontal"}
        </div>
      )}

      {/* Remove mode confirm/cancel */}
      {isRemove && (
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, pointerEvents: "auto", zIndex: 10,
        }} data-editor-ui>
          <button onClick={confirmRemove} disabled={removeTargets.size === 0} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 14px", borderRadius: 6,
            background: removeTargets.size > 0 ? `rgba(${RED},0.85)` : "rgba(0,0,0,0.4)",
            color: "#fff", border: "none",
            cursor: removeTargets.size > 0 ? "pointer" : "default",
            fontSize: 12, fontFamily: "system-ui",
          }}>
            <Check size={14} /> Remover ({removeTargets.size})
          </button>
          <button onClick={cancelMode} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 14px", borderRadius: 6,
            background: "rgba(0,0,0,0.65)", color: "#ccc",
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: "pointer", fontSize: 12, fontFamily: "system-ui",
          }}>
            <X size={14} /> Cancelar
          </button>
        </div>
      )}

      {/* Center line */}
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: `rgba(${RED},${CENTER_OPACITY})`, pointerEvents: "none" }} />

      {/* Vertical mirrored pairs */}
      {vLines.map(l => {
        const mirror = 100 - l.pct;
        const sel = removeTargets.has(`v-${l.id}`);
        return (
          <div key={l.id}>
            <div style={vLineStyle(l.pct, sel)} />
            <div style={vLineStyle(mirror, sel)} />
            <div style={vHandleStyle(l.pct)} onMouseDown={onMouseDownV(l.id)} />
            <div style={vHandleStyle(mirror)} onMouseDown={onMouseDownV(l.id)} />
            {isDragging && dragging.current?.id === l.id && (
              <>
                <div style={labelV(l.pct)}>{l.pct.toFixed(1)}%</div>
                <div style={labelV(mirror)}>{mirror.toFixed(1)}%</div>
              </>
            )}
          </div>
        );
      })}

      {/* Horizontal lines */}
      {hLines.map(l => {
        const sel = removeTargets.has(`h-${l.id}`);
        return (
          <div key={l.id}>
            <div style={hLineStyle(l.pct, sel)} />
            <div style={hHandleStyle(l.pct)} onMouseDown={onMouseDownH(l.id)} />
            {isDragging && dragging.current?.id === l.id && (
              <div style={labelH(l.pct)}>{l.pct.toFixed(1)}%</div>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
