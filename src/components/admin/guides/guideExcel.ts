import * as XLSX from "xlsx";
import { regionLabels } from "@/components/admin/products/shared";

type Row = {
  name: string;
  category: string | null;
  gwp?: {
    is_active: boolean;
    price_car_1: number;
    price_car_2: number;
    price_car_3plus: number;
    price_4x4_1: number;
    price_4x4_2: number;
    price_4x4_3plus: number;
  };
};

export function exportGuideExcel(guideName: string, rows: Row[], show4x4: boolean) {
  const header = [
    "Cachoeira",
    "Região",
    "Ativo",
    "Carro Turista 1p",
    "Carro Turista 2p",
    "Carro Turista 3+",
    ...(show4x4 ? ["4x4 Guia 1p", "4x4 Guia 2p", "4x4 Guia 3+"] : []),
  ];

  const data = rows.map((r) => {
    const gwp = r.gwp;
    const base = [
      r.name,
      regionLabels[r.category || ""] || r.category || "",
      gwp?.is_active ? "S" : "N",
      gwp?.price_car_1 ?? 0,
      gwp?.price_car_2 ?? 0,
      gwp?.price_car_3plus ?? 0,
    ];
    if (show4x4) {
      base.push(gwp?.price_4x4_1 ?? 0, gwp?.price_4x4_2 ?? 0, gwp?.price_4x4_3plus ?? 0);
    }
    return base;
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

  // Set column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 18 }, { wch: 6 },
    { wch: 16 }, { wch: 16 }, { wch: 16 },
    ...(show4x4 ? [{ wch: 14 }, { wch: 14 }, { wch: 14 }] : []),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preços");
  const slug = guideName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  XLSX.writeFile(wb, `precos-${slug}.xlsx`);
}

export type ImportResult = {
  updated: number;
  notFound: string[];
};

export function parseGuideExcel(
  file: File,
  waterfallMap: Map<string, string>, // normalised name -> product_id
  show4x4: boolean,
): Promise<{ payloads: Record<string, any>[]; notFound: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        const payloads: Record<string, any>[] = [];
        const notFound: string[] = [];

        for (const row of json) {
          const name = String(row["Cachoeira"] ?? "").trim();
          const key = name.toLowerCase();
          const productId = waterfallMap.get(key);

          if (!productId) {
            if (name) notFound.push(name);
            continue;
          }

          const ativo = String(row["Ativo"] ?? "").trim().toUpperCase();

          const payload: Record<string, any> = {
            product_id: productId,
            is_active: ativo === "S",
            price_car_1: Number(row["Carro Turista 1p"]) || 0,
            price_car_2: Number(row["Carro Turista 2p"]) || 0,
            price_car_3plus: Number(row["Carro Turista 3+"]) || 0,
          };

          if (show4x4) {
            payload.price_4x4_1 = Number(row["4x4 Guia 1p"]) || 0;
            payload.price_4x4_2 = Number(row["4x4 Guia 2p"]) || 0;
            payload.price_4x4_3plus = Number(row["4x4 Guia 3+"]) || 0;
          }

          payloads.push(payload);
        }

        resolve({ payloads, notFound });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
