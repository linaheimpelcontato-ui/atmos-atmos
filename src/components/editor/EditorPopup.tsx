import { createPortal } from "react-dom";
import { Monitor, Smartphone, Replace, Type, PaintBucket } from "lucide-react";

export type PopupAction =
  | "edit-image"
  | "edit-image-mobile"
  | "edit-image-desktop"
  | "replace-image"
  | "edit-text"
  | "edit-bg";

interface Props {
  x: number;
  y: number;
  elementType: "image" | "text" | "background";
  device?: "desktop" | "mobile";
  onAction: (action: PopupAction) => void;
  onClose: () => void;
}

export default function EditorPopup({ x, y, elementType, device, onAction, onClose }: Props) {
  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - 160);

  return createPortal(
    <>
      <div data-editor-ui className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        data-editor-ui
        className="fixed z-[9999] bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/10 p-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
        style={{ left, top }}
      >
        {elementType === "image" && (
          <>
            <PopupBtn
              icon={device === "mobile" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              label={`Editar Imagem (${device === "mobile" ? "Mobile" : "Desktop"})`}
              onClick={() => onAction("edit-image")}
            />
            <div className="h-px bg-white/10 mx-2 my-0.5" />
            <PopupBtn
              icon={<Replace className="w-4 h-4" />}
              label="Substituir"
              onClick={() => onAction("replace-image")}
            />
          </>
        )}
        {elementType === "text" && (
          <PopupBtn icon={<Type className="w-4 h-4" />} label="Editar texto" onClick={() => onAction("edit-text")} />
        )}
        {elementType === "background" && (
          <PopupBtn icon={<PaintBucket className="w-4 h-4" />} label="Editar fundo" onClick={() => onAction("edit-bg")} />
        )}
      </div>
    </>,
    document.body
  );
}

function PopupBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
