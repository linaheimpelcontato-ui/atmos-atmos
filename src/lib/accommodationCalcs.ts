import { moneyProduct, moneySum, moneySumProducts } from "./proposalCalcs";
import type { ProposalUnit } from "@/components/admin/proposals/ProposalAccommodationsSection";

/** Accept all three saved room layouts without filling historical commission from today's catalog. */
export function normalizeSavedRooms(raw: unknown): ProposalUnit[] {
  const input = raw as any;
  const units = Array.isArray(input)
    ? (input[0]?.rooms ? input : [{ rooms: input }])
    : [{ ...input, rooms: input?.modalities ?? [] }];
  return units.map((unit: any) => ({
    unit_label: unit.unit_label ?? "", total_units: unit.total_units ?? 0, max_capacity: unit.max_capacity ?? 1,
    rooms: (unit.rooms ?? []).map((room: any) => ({
      ...room, type: room.type ?? "", capacity: room.capacity ?? 1, units: room.units ?? 0,
      price: Number(room.price ?? 0), cost: Number(room.cost ?? 0), pricing_type: room.pricing_type ?? "per_room",
      available: room.available !== false,
      commission_percent: room.commission_percent == null ? undefined : Number(room.commission_percent),
    })),
  }));
}

/** Round once per accommodation, after summing the commission bases of all room lines. */
export function accommodationAmounts(units: ProposalUnit[], nights: number) {
  let revenue = 0, cost = 0, people = 0, missingCommissions = 0;
  const commissionTerms: number[][] = [];
  for (const room of units.flatMap(unit => unit.rooms)) {
    if (!room.available || room.units <= 0) continue;
    const capacity = room.pricing_type === "per_person" ? room.capacity : 1;
    const roomCost = moneyProduct(room.cost, room.units, nights, capacity);
    cost = moneySum(cost, roomCost);
    revenue = moneySum(revenue, moneyProduct(room.price, room.units, nights, capacity));
    people += room.units * room.capacity;
    if (room.commission_percent == null) missingCommissions++;
    else commissionTerms.push([roomCost, room.commission_percent, 0.01]);
  }
  return { revenue, cost, commission: moneySumProducts(commissionTerms), people, missingCommissions };
}

export function hasMissingCommission(units: ProposalUnit[]) {
  return units.some(unit => unit.rooms.some(room => room.available && room.units > 0 &&
    (room.commission_percent == null || !Number.isFinite(room.commission_percent) || room.commission_percent < 0 || room.commission_percent > 100)));
}
