import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Monitor, Smartphone, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Props {
  imgElement: HTMLImageElement;
  device: "mobile" | "desktop";
  focalX: number;
  focalY: number;
  rotation: number;
  scale: number;
  /** Actual rendered aspect ratio of the image container on the public site */
  sourceAspect?: number;
  /** Border radius to mirror from the public site element */
  sourceBorderRadius?: string;
  onFocalChange: (x: number, y: number) => void;
  onRotationChange: (deg: number) => void;
  onScaleChange: (s: number) => void;
  onClose: (confirmedDevice?: string) => void;
}

export default function ImageEditPanel({
  imgElement,
  device,
  focalX,
  focalY,
  rotation,
  scale,
  sourceAspect,
  sourceBorderRadius,
  onFocalChange,
  onRotationChange,
  onScaleChange,
  onClose,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  
  const lastPointer = useRef({ x: 0, y: 0 });

  // Use actual source aspect ratio if provided, otherwise fall back to device defaults
  const frameAspect = sourceAspect ?? (device === "mobile" ? 9 / 16 : 16 / 9);

  // Frame fills available space
  const maxW = Math.min(window.innerWidth - 80, 800);
  const maxH = Math.min(window.innerHeight - 220, 600);

  let frameW: number, frameH: number;
  if (frameAspect > maxW / maxH) {
    frameW = maxW;
    frameH = maxW / frameAspect;
  } else {
    frameH = maxH;
    frameW = maxH * frameAspect;
  }

  const isRotated90 = rotation === 90 || rotation === 270;
  const rotDeg = rotation === 90 ? 90 : rotation === 270 ? -90 : 0;
  const coverScale = isRotated90 ? Math.max(frameW / frameH, frameH / frameW) : 1;
  const minScale = 1 / coverScale;

  // Auto-correct zoom if rotation change makes current scale too small
  useEffect(() => {
    if (scale < minScale) {
      onScaleChange(Number(minScale.toFixed(2)));
    }
  }, [isRotated90, minScale, scale, onScaleChange]);

  const imgSrc = imgElement.src;

  // Drag to pan focal point
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      // Moving image right → focal point moves left (decreases %)
      // Sensitivity: map pixel drag to % change relative to frame size
      const sensitivity = 100 / (Math.max(frameW, frameH) * scale);
      const newX = Math.max(0, Math.min(100, focalX - dx * sensitivity));
      const newY = Math.max(0, Math.min(100, focalY - dy * sensitivity));
      onFocalChange(
        Math.round(newX * 10) / 10,
        Math.round(newY * 10) / 10
      );
    },
    [dragging, focalX, focalY, frameW, frameH, scale, onFocalChange]
  );

  const handlePointerUp = useCallback(() => setDragging(false), []);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      onScaleChange(Math.max(minScale, Math.min(3, scale + delta)));
    },
    [scale, onScaleChange]
  );

  // Build image style: cover + objectPosition + scale + rotation
  const buildImgStyle = (): React.CSSProperties => {
    const finalScale = coverScale * scale;
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${focalX}% ${focalY}%`,
      transform: isRotated90
        ? `rotate(${rotDeg}deg) scale(${finalScale})`
        : `scale(${scale})`,
      transformOrigin: "center center",
      pointerEvents: "none",
    };
  };

  return createPortal(
    <>
      <div
        data-editor-ui
        className="fixed inset-0 bg-black/70 z-[9997]"
        onClick={() => onClose()}
      />

      <div
        data-editor-ui
        className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
      >
        {/* Header */}
        <div className="flex items-center gap-3 text-white text-sm font-medium">
          {device === "mobile" ? (
            <Smartphone className="w-4 h-4" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
          <span>Enquadramento {device === "mobile" ? "Mobile" : "Desktop"}</span>
          <span className="text-white/50 text-xs font-mono ml-2">
            {focalX.toFixed(0)}% × {focalY.toFixed(0)}%
          </span>
          {scale !== 1 && (
            <span className="text-blue-400 text-xs font-mono">
              {scale.toFixed(2)}×
            </span>
          )}
          {isRotated90 && (
            <span className="text-yellow-400 text-xs font-mono">
              {rotation}°
            </span>
          )}
        </div>

        {/* Fixed frame with image behind it */}
        <div
          ref={frameRef}
          className="relative overflow-hidden border-2 border-white cursor-grab active:cursor-grabbing select-none"
          style={{ width: frameW, height: frameH, borderRadius: sourceBorderRadius || '0.5rem' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          <img
            src={imgSrc}
            alt=""
            draggable={false}
            style={buildImgStyle()}
          />

          {/* Corner marks */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/80 pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/80 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/80 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/80 pointer-events-none" />

          {/* Size label — show real measured dimensions */}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none">
            {Math.round(frameW)}×{Math.round(frameH)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Zoom slider */}
          <div className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
            <ZoomOut className="w-4 h-4 text-white/60" />
            <Slider
              min={Math.ceil(minScale * 100)}
              max={300}
              step={1}
              value={[Math.round(scale * 100)]}
              onValueChange={([v]) => onScaleChange(v / 100)}
              className="w-28"
            />
            <ZoomIn className="w-4 h-4 text-white/60" />
            <span className="text-white text-xs font-mono min-w-[3rem] text-center">
              {(scale * 100).toFixed(0)}%
            </span>
          </div>

          {/* Rotation (mobile only) */}
          {device === "mobile" && (
            <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10">
              <button
                onClick={() => onRotationChange(rotation === 0 ? 270 : 0)}
                className="p-1.5 text-white hover:bg-white/10 rounded transition-colors"
                title="Girar -90°"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="text-white text-xs font-mono min-w-[3rem] text-center">
                {rotation}°
              </span>
              <button
                onClick={() => onRotationChange(rotation === 0 ? 90 : 0)}
                className="p-1.5 text-white hover:bg-white/10 rounded transition-colors"
                title="Girar +90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {rotation !== 0 && (
                <button
                  onClick={() => onRotationChange(0)}
                  className="ml-1 px-2 py-1 text-white/60 hover:text-white text-[10px] hover:bg-white/10 rounded transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Confirm */}
          <button
            data-editor-ui
            onClick={(e) => {
              e.stopPropagation();
              onClose(device);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
