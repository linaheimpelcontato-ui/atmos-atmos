import { pointTypeConfig, type PointType } from "./mapData";

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
  selectedId?: string | null;
  onClickPoint: (point: MapPoint) => void;
}

export default function MapPoints({ points, selectedId, onClickPoint }: Props) {
  return (
    <>
      {points.map((point) => {
        const px = (point.x / 100) * 1200;
        const py = (point.y / 100) * 900;
        const cfg = pointTypeConfig[point.point_type] || pointTypeConfig.waterfall;
        const isSelected = selectedId === point.id;
        return (
          <g
            key={point.id}
            transform={`translate(${px},${py})`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onClickPoint(point);
            }}
          >
            {isSelected && (
              <circle r="14" fill={cfg.color} opacity="0.25" filter="url(#pointGlow)">
                <animate attributeName="r" values="14;18;14" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="7" fill={cfg.color} stroke="white" strokeWidth="1.2" opacity="0.9" />
            <text
              y="3"
              textAnchor="middle"
              fontSize="7"
              style={{ pointerEvents: "none" }}
            >
              {cfg.icon}
            </text>
            <text
              y="-13"
              textAnchor="middle"
              fill="white"
              fontSize="6.5"
              fontWeight="500"
              opacity="0.85"
              style={{ pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}
            >
              {point.name}
            </text>
          </g>
        );
      })}
    </>
  );
}
