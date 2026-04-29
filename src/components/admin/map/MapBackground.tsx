import { terrainZones, fogZones } from "./mapData";

export default function MapBackground() {
  return (
    <>
      {/* Base gradient */}
      <rect width="1200" height="900" fill="url(#bgGrad)" />

      {/* Layer 1: coarse vegetation noise */}
      <rect width="1200" height="900" filter="url(#coarseVeg)" opacity="1" />

      {/* Layer 2: fine vegetation noise */}
      <rect width="1200" height="900" filter="url(#vegetationNoise)" opacity="1" />

      {/* Layer 3: fine detail */}
      <rect width="1200" height="900" filter="url(#fineDetail)" opacity="1" />

      {/* Terrain elevation zones */}
      {terrainZones.map((zone, i) => (
        <ellipse
          key={`terrain-${i}`}
          cx={zone.cx}
          cy={zone.cy}
          rx={zone.rx}
          ry={zone.ry}
          fill={zone.color}
          opacity={zone.opacity}
        />
      ))}

      {/* Fog / mist in valleys */}
      {fogZones.map((fog, i) => (
        <rect
          key={`fog-${i}`}
          x={fog.x}
          y={fog.y}
          width={fog.width}
          height={fog.height}
          rx={fog.height / 2}
          fill="white"
          opacity={fog.opacity}
          filter="url(#fogBlur)"
        />
      ))}
    </>
  );
}
