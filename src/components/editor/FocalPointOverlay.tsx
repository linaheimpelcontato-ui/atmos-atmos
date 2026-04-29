import { useState, useCallback, useRef, useEffect } from "react";
import { Move } from "lucide-react";

interface Props {
  /** Current focal X (0-100) */
  focalX: number;
  /** Current focal Y (0-100) */
  focalY: number;
  /** Called when user drags the focal point */
  onChange: (x: number, y: number) => void;
}

/**
 * Overlay shown on top of an image when in editor mode.
 * Renders a draggable crosshair that sets the focal point.
 */
export default function FocalPointOverlay({ focalX, focalY, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const calcPosition = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      onChange(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      calcPosition(e.clientX, e.clientY);
    },
    [calcPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      calcPosition(e.clientX, e.clientY);
    },
    [dragging, calcPosition]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Crosshair lines */}
      <div
        className="absolute w-px bg-white/70 pointer-events-none"
        style={{ left: `${focalX}%`, top: 0, bottom: 0 }}
      />
      <div
        className="absolute h-px bg-white/70 pointer-events-none"
        style={{ top: `${focalY}%`, left: 0, right: 0 }}
      />

      {/* Focal point marker */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${focalX}%`,
          top: `${focalY}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-white bg-white/20 flex items-center justify-center shadow-lg">
          <Move className="w-4 h-4 text-white drop-shadow" />
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono pointer-events-none">
        Ponto focal: {focalX.toFixed(0)}%, {focalY.toFixed(0)}%
      </div>
    </div>
  );
}
