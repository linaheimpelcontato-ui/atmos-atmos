import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  VIEWBOX,
  municipalityBorders,
  nationalPark,
  kalungaTerritory,
  rivers,
  roads,
  towns,
  terrainZones,
  fogZones,
  flora,
  fauna,
  pointTypeConfig,
  type PointType,
} from "./mapData";
import MapSvgDefs from "./MapSvgDefs";
import MapBackground from "./MapBackground";
import MapGeography from "./MapGeography";
import MapNature from "./MapNature";
import MapPoints from "./MapPoints";

interface MapPoint {
  id: string;
  name: string;
  description: string | null;
  point_type: PointType;
  x: number;
  y: number;
  is_active: boolean;
}

interface Props {
  points: MapPoint[];
  isPlacing: boolean;
  onPlacePoint: (x: number, y: number) => void;
  onClickPoint: (point: MapPoint) => void;
  selectedId?: string | null;
}

export default function MapCanvas({ points, isPlacing, onPlacePoint, onClickPoint, selectedId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(5, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPlacing) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(pan);
  }, [isPlacing, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.x + (e.clientX - dragStart.x),
      y: panStart.y + (e.clientY - dragStart.y),
    });
  }, [dragging, dragStart, panStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPlacing || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());
    const xPct = (svgPt.x / 1200) * 100;
    const yPct = (svgPt.y / 900) * 100;
    onPlacePoint(Math.round(xPct * 100) / 100, Math.round(yPct * 100) / 100);
  }, [isPlacing, onPlacePoint]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", preventScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        cursor: isPlacing ? "crosshair" : dragging ? "grabbing" : "grab",
        backgroundColor: "#0e1f06",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
        onClick={handleSvgClick}
      >
        <MapSvgDefs />
        <MapBackground />
        <MapGeography />
        <MapNature />
        <MapPoints
          points={points}
          selectedId={selectedId}
          onClickPoint={onClickPoint}
        />

        {/* Placing indicator */}
        {isPlacing && (
          <text x="600" y="40" textAnchor="middle" fill="#C49A3C" fontSize="13" fontWeight="600" opacity="0.9">
            Clique no mapa para posicionar o ponto
          </text>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(5, z + 0.3))}
          className="w-8 h-8 rounded bg-card/80 backdrop-blur text-foreground flex items-center justify-center text-lg font-bold hover:bg-card transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.3))}
          className="w-8 h-8 rounded bg-card/80 backdrop-blur text-foreground flex items-center justify-center text-lg font-bold hover:bg-card transition-colors"
        >
          −
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="w-8 h-8 rounded bg-card/80 backdrop-blur text-foreground flex items-center justify-center text-xs hover:bg-card transition-colors"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
