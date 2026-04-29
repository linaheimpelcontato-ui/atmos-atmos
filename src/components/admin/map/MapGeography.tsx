import {
  municipalityBorders,
  nationalPark,
  kalungaTerritory,
  rivers,
  roads,
  towns,
} from "./mapData";

export default function MapGeography() {
  return (
    <>
      {/* Municipality borders — subtle dashed lines */}
      {municipalityBorders.map((m, i) => (
        <g key={`muni-${i}`}>
          <path
            d={m.path}
            fill="none"
            stroke="#5a8a3a"
            strokeWidth="0.6"
            strokeDasharray="4 3"
            opacity="0.3"
          />
          <text
            x={m.labelX}
            y={m.labelY}
            textAnchor="middle"
            fill="#8ab870"
            fontSize="8"
            fontWeight="300"
            letterSpacing="1.5"
            opacity="0.4"
            style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
          >
            {m.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* National Park */}
      <path
        d={nationalPark.path}
        fill="#3a6e1a"
        fillOpacity="0.12"
        stroke="#C49A3C"
        strokeWidth="1.2"
        strokeDasharray="6 3"
        opacity="0.8"
      />
      <text
        x={nationalPark.labelX}
        y={nationalPark.labelY}
        textAnchor="middle"
        fill="#C49A3C"
        fontSize="7"
        fontWeight="600"
        letterSpacing="2"
        opacity="0.7"
        style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
      >
        PARQUE NACIONAL
      </text>
      <text
        x={nationalPark.labelX}
        y={nationalPark.labelY + 11}
        textAnchor="middle"
        fill="#C49A3C"
        fontSize="5.5"
        fontWeight="400"
        letterSpacing="1.5"
        opacity="0.5"
        style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
      >
        CHAPADA DOS VEADEIROS
      </text>

      {/* Kalunga Territory */}
      <path
        d={kalungaTerritory.path}
        fill="#8B6914"
        fillOpacity="0.08"
        stroke="#C49A3C"
        strokeWidth="0.8"
        strokeDasharray="4 2"
        opacity="0.6"
      />
      <text
        x={kalungaTerritory.labelX}
        y={kalungaTerritory.labelY}
        textAnchor="middle"
        fill="#C49A3C"
        fontSize="7"
        fontWeight="500"
        letterSpacing="2"
        opacity="0.5"
        style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
      >
        TERRITÓRIO KALUNGA
      </text>

      {/* Rivers — secondary first */}
      {rivers.secondary.map((r, i) => (
        <g key={`rs-${i}`}>
          <path
            d={r.path}
            fill="none"
            stroke="#4a90c4"
            strokeWidth={r.width}
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
      ))}

      {/* Rivers — main with glow */}
      {rivers.main.map((r, i) => (
        <g key={`rm-${i}`}>
          {/* Glow layer */}
          <path
            d={r.path}
            fill="none"
            stroke="#3a80b8"
            strokeWidth={r.width + 3}
            strokeLinecap="round"
            opacity="0.1"
            filter="url(#riverGlow)"
          />
          {/* Core river */}
          <path
            d={r.path}
            fill="none"
            stroke="#5aade8"
            strokeWidth={r.width}
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* Highlight */}
          <path
            d={r.path}
            fill="none"
            stroke="#80d0ff"
            strokeWidth={r.width * 0.4}
            strokeLinecap="round"
            opacity="0.2"
          />
          {/* Label along path */}
          <path id={`river-path-${i}`} d={r.path} fill="none" stroke="none" />
          {r.name && (
            <text fill="#80C0F0" fontSize="5.5" opacity="0.45" style={{ pointerEvents: "none" }}>
              <textPath href={`#river-path-${i}`} startOffset="25%">
                {r.name}
              </textPath>
            </text>
          )}
        </g>
      ))}

      {/* Roads */}
      {roads.map((road, i) => (
        <g key={`road-${i}`}>
          <path
            d={road.path}
            fill="none"
            stroke={road.isMain ? "#C49A3C" : "#a08a60"}
            strokeWidth={road.width}
            strokeLinecap="round"
            strokeDasharray={road.isMain ? "none" : "3 2"}
            opacity={road.isMain ? 0.35 : 0.2}
          />
          {road.name && (
            <>
              <path id={`road-path-${i}`} d={road.path} fill="none" stroke="none" />
              <text fill="#C49A3C" fontSize="5" opacity="0.4" style={{ pointerEvents: "none" }}>
                <textPath href={`#road-path-${i}`} startOffset="40%">
                  {road.name}
                </textPath>
              </text>
            </>
          )}
        </g>
      ))}

      {/* Towns */}
      {towns.map((town, i) => (
        <g key={`town-${i}`}>
          {/* Glow */}
          <circle
            cx={town.x}
            cy={town.y}
            r={town.size * 2}
            fill="#fffbe6"
            opacity={town.isMain ? 0.08 : 0.04}
            filter="url(#townGlow)"
          />
          {/* Dot */}
          <circle
            cx={town.x}
            cy={town.y}
            r={town.size}
            fill={town.isMain ? "#fffbe6" : "#d4c8a0"}
            stroke={town.isMain ? "#C49A3C" : "none"}
            strokeWidth={town.isMain ? 0.8 : 0}
            opacity={town.isMain ? 0.9 : 0.6}
          />
          {/* Label */}
          <text
            x={town.x}
            y={town.y - town.size - 4}
            textAnchor="middle"
            fill={town.isMain ? "#fffbe6" : "#c4c0a0"}
            fontSize={town.isMain ? "7.5" : "6"}
            fontWeight={town.isMain ? "500" : "300"}
            letterSpacing="0.5"
            opacity={town.isMain ? 0.85 : 0.55}
            style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
          >
            {town.name}
          </text>
        </g>
      ))}
    </>
  );
}
