import { useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckSquare, Square, Monitor, Smartphone, Layers } from "lucide-react";

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

interface Props {
  pending: PendingChange[];
  onSave: (selected: PendingChange[]) => void;
  onCancel: () => void;
}

function getLabel(item: PendingChange): string {
  if (item.type === "focal") return `📐 Enquadramento: ${shortenPath(item.imagePath)}`;
  if (item.type === "override") {
    const typeLabel = item.overrideType === "text_style" ? "🎨 Texto" : "🎨 Fundo";
    return `${typeLabel}: ${shortenSelector(item.selector)}`;
  }
  if (item.type === "image-replace") return `🖼 Imagem: ${shortenPath(item.imagePath)}`;
  return "Alteração";
}

function getDeviceIcon(item: PendingChange) {
  if (item.type === "focal") {
    return item.device === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />;
  }
  if (item.type === "override") {
    if (item.device === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
    if (item.device === "desktop") return <Monitor className="w-3.5 h-3.5" />;
    return <Layers className="w-3.5 h-3.5" />;
  }
  return <Layers className="w-3.5 h-3.5" />;
}

function shortenPath(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1]?.replace(/\.[^.]+$/, "") || p;
}

function shortenSelector(s: string): string {
  return s.length > 30 ? s.slice(0, 27) + "…" : s;
}

export default function SaveReviewDialog({ pending, onSave, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(pending.map((_, i) => i)));

  const toggleAll = () => {
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((_, i) => i)));
    }
  };

  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const handleSave = () => {
    const items = pending.filter((_, i) => selected.has(i));
    onSave(items);
  };

  return createPortal(
    <>
      <div data-editor-ui className="fixed inset-0 z-[10000] bg-black/60" onClick={onCancel} />
      <div
        data-editor-ui
        className="fixed z-[10001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-5 w-[420px] max-w-[95vw] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm font-semibold">Revisar alterações</h3>
          <button onClick={onCancel} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-white mb-2 transition-colors"
        >
          {selected.size === pending.length ? (
            <CheckSquare className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          {selected.size === pending.length ? "Desmarcar todos" : "Selecionar todos"}
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {pending.map((item, idx) => (
            <button
              key={idx}
              onClick={() => toggle(idx)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                selected.has(idx)
                  ? "bg-blue-500/15 border-blue-400/40 text-white"
                  : "bg-white/5 border-white/10 text-white/40 line-through"
              }`}
            >
              {selected.has(idx) ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-white/30 shrink-0" />
              )}
              <span className="flex-1 truncate">{getLabel(item)}</span>
              <span className="text-white/50">{getDeviceIcon(item)}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selected.size === 0}
            className="flex-1 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Salvar ({selected.size})
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
