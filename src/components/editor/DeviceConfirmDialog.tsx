import { useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Layers } from "lucide-react";

export type DeviceTarget = "mobile" | "desktop" | "all";

interface Props {
  onConfirm: (device: DeviceTarget) => void;
  onCancel: () => void;
  currentDevice: "desktop" | "mobile";
}

const OPTIONS: { value: DeviceTarget; label: string; icon: typeof Monitor }[] = [
  { value: "mobile", label: "Apenas Mobile", icon: Smartphone },
  { value: "desktop", label: "Apenas Desktop", icon: Monitor },
  { value: "all", label: "Ambos (Mobile e Desktop)", icon: Layers },
];

export default function DeviceConfirmDialog({ onConfirm, onCancel, currentDevice }: Props) {
  const [selected, setSelected] = useState<DeviceTarget>(currentDevice);

  return createPortal(
    <>
      <div data-editor-ui className="fixed inset-0 z-[10000] bg-black/60" onClick={onCancel} />
      <div
        data-editor-ui
        className="fixed z-[10001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-5 w-80 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <h3 className="text-white text-sm font-semibold">Aplicar alterações em qual dispositivo?</h3>

        <div className="space-y-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelected(value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left text-sm ${
                selected === value
                  ? "bg-blue-500/20 border-blue-400 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
