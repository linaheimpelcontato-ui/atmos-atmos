import { useCallback } from "react";

const PRESETS = [
  "#000000", "#ffffff", "#f5f0e8", "#1a1a1a", "#2d5016",
  "#8B4513", "#1e3a5f", "#4a2545", "#d4a574", "#e8ddd0",
];

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function EditorColorPicker({ value, onChange, label }: Props) {
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] font-medium text-white/70 uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="color"
          value={value}
          onChange={handleInput}
          className="w-7 h-7 rounded border border-white/20 cursor-pointer bg-transparent p-0"
        />
        {PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-5 h-5 rounded-full border border-white/30 hover:scale-125 transition-transform"
            style={{ backgroundColor: c, outline: value === c ? "2px solid white" : "none", outlineOffset: 2 }}
          />
        ))}
      </div>
    </div>
  );
}
