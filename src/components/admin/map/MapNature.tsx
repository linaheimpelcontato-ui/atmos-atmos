import { flora, fauna } from "./mapData";

function FloraElement({ type, x, y, scale, idx }: { type: string; x: number; y: number; scale: number; idx: number }) {
  if (type === "buriti") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.4}>
        <line x1="0" y1="0" x2="0" y2="-18" stroke="#4a3a1a" strokeWidth="1.5" />
        <path d="M 0 -18 Q -10 -26 -7 -16" fill="#3a6e1a" />
        <path d="M 0 -18 Q 10 -26 7 -16" fill="#3a6e1a" />
        <path d="M 0 -18 Q -5 -30 0 -20" fill="#4a8e2a" />
        <path d="M 0 -18 Q 5 -30 0 -20" fill="#4a8e2a" />
        <path d="M 0 -18 Q 0 -32 2 -20" fill="#5aa03a" />
      </g>
    );
  }
  if (type === "pequi") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.35}>
        <circle cx="0" cy="-7" r="8" fill="#3a6e1a" />
        <circle cx="-4" cy="-3" r="6" fill="#2d5a14" />
        <circle cx="4" cy="-3" r="6" fill="#4a8e2a" />
        <circle cx="0" cy="-1" r="2.5" fill="#b89030" />
      </g>
    );
  }
  if (type === "jatoba") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.35}>
        <line x1="0" y1="0" x2="0" y2="-14" stroke="#4a3a1a" strokeWidth="2" />
        <ellipse cx="-6" cy="-18" rx="8" ry="6" fill="#2d5a14" />
        <ellipse cx="6" cy="-16" rx="7" ry="6" fill="#3a6e1a" />
        <ellipse cx="0" cy="-21" rx="6" ry="5" fill="#4a8e2a" />
      </g>
    );
  }
  if (type === "cerrado_bush") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.25}>
        <ellipse cx="0" cy="-3" rx="6" ry="4" fill="#2d5a14" />
        <ellipse cx="3" cy="-5" rx="5" ry="3.5" fill="#3a6e1a" />
        <ellipse cx="-3" cy="-4" rx="4" ry="3" fill="#1e4a0e" />
      </g>
    );
  }
  // grass_tuft
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.2}>
      <line x1="-3" y1="0" x2="-4" y2="-8" stroke="#4a7e2a" strokeWidth="0.8" />
      <line x1="0" y1="0" x2="0" y2="-10" stroke="#5a9e3a" strokeWidth="0.8" />
      <line x1="3" y1="0" x2="4" y2="-7" stroke="#4a7e2a" strokeWidth="0.8" />
    </g>
  );
}

function FaunaElement({ type, x, y, scale, idx }: { type: string; x: number; y: number; scale: number; idx: number }) {
  if (type === "lobo-guara") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.3}>
        <ellipse cx="0" cy="0" rx="10" ry="5" fill="#8B6914" />
        <circle cx="-8" cy="-3" r="3.5" fill="#A07818" />
        <line x1="-10" y1="-6" x2="-12" y2="-10" stroke="#8B6914" strokeWidth="1.2" />
        <line x1="-6" y1="-6" x2="-5" y2="-10" stroke="#8B6914" strokeWidth="1.2" />
        <line x1="6" y1="3" x2="12" y2="1" stroke="#8B6914" strokeWidth="1.2" />
        <line x1="-4" y1="5" x2="-4" y2="11" stroke="#5A3E1B" strokeWidth="1" />
        <line x1="4" y1="5" x2="4" y2="11" stroke="#5A3E1B" strokeWidth="1" />
      </g>
    );
  }
  if (type === "tucano") {
    return (
      <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.3}>
        <ellipse cx="0" cy="0" rx="4" ry="3" fill="#1a1a1a" />
        <path d="M 4 0 L 12 -2 L 10 1 Z" fill="#e8a020" />
        <circle cx="-1" cy="-1" r="0.8" fill="white" />
        <path d="M -3 2 L -6 6" stroke="#3a3a3a" strokeWidth="0.8" />
      </g>
    );
  }
  // arara
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.35}>
      <path d="M -8 0 Q 0 -12 8 0" fill="none" stroke="#1E6BB8" strokeWidth="1.5" />
      <path d="M -10 1 Q 0 -15 10 1" fill="none" stroke="#C49A3C" strokeWidth="0.8" />
      <ellipse cx="0" cy="2" rx="2.5" ry="1.8" fill="#1E6BB8" />
      <circle cx="-0.8" cy="1.2" r="0.6" fill="white" />
      <path d="M 1.5 2.5 L 4 3.5" stroke="#C49A3C" strokeWidth="0.8" />
    </g>
  );
}

export default function MapNature() {
  return (
    <>
      {flora.map((f, i) => (
        <FloraElement key={`flora-${i}`} type={f.type} x={f.x} y={f.y} scale={f.scale} idx={i} />
      ))}
      {fauna.map((f, i) => (
        <FaunaElement key={`fauna-${i}`} type={f.type} x={f.x} y={f.y} scale={f.scale} idx={i} />
      ))}
    </>
  );
}
