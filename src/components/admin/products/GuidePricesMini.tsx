import { Users } from "lucide-react";

type GuidePrices = {
  "4x4Atmos"?: Record<string, number>;
  carroTurista?: Record<string, number>;
};

interface Props {
  guidePrices: GuidePrices | undefined | null;
  className?: string;
}

export default function GuidePricesMini({ guidePrices, className = "" }: Props) {
  if (!guidePrices) return null;

  const atmos = guidePrices["4x4Atmos"];
  const carro = guidePrices.carroTurista;
  if (!atmos && !carro) return null;

  const fmt = (v: number | undefined) => (v != null ? `R$ ${v.toLocaleString("pt-BR")}` : "—");

  return (
    <div className={`rounded border border-border bg-muted/20 px-2.5 py-1.5 ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Guia ATMOS</span>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-medium pr-2" />
            <th className="text-right font-medium px-1 whitespace-nowrap">1 pax</th>
            <th className="text-right font-medium px-1 whitespace-nowrap">2 pax</th>
            <th className="text-right font-medium px-1 whitespace-nowrap">3+ pax</th>
          </tr>
        </thead>
        <tbody>
          {atmos && (
            <tr>
              <td className="font-medium text-foreground pr-2 whitespace-nowrap">ATMOS 4×4</td>
              <td className="text-right font-mono px-1">{fmt(atmos["1"])}</td>
              <td className="text-right font-mono px-1">{fmt(atmos["2"])}</td>
              <td className="text-right font-mono px-1">{fmt(atmos["3plus"])}</td>
            </tr>
          )}
          {carro && (
            <tr>
              <td className="font-medium text-foreground pr-2 whitespace-nowrap">Carro Turista</td>
              <td className="text-right font-mono px-1">{fmt(carro["1"])}</td>
              <td className="text-right font-mono px-1">{fmt(carro["2"])}</td>
              <td className="text-right font-mono px-1">{fmt(carro["3plus"])}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
