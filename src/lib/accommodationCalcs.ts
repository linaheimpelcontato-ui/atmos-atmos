import { money } from "./proposalCalcs";
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
  let revenue = 0, cost = 0, commissionRaw = 0, people = 0, missingCommissions = 0;
  for (const room of units.flatMap(unit => unit.rooms)) {
    if (!room.available || room.units <= 0) continue;
    const quantity = room.units * nights * (room.pricing_type === "per_person" ? room.capacity : 1);
    const roomCost = money(room.cost * quantity);
    cost += roomCost;
    revenue += money(room.price * quantity);
    people += room.units * room.capacity;
    if (room.commission_percent == null) missingCommissions++;
    else commissionRaw += roomCost * room.commission_percent / 100;
  }
  return { revenue: money(revenue), cost: money(cost), commission: money(commissionRaw), people, missingCommissions };
}

export function hasMissingCommission(units: ProposalUnit[]) {
  return units.some(unit => unit.rooms.some(room => room.available && room.units > 0 &&
    (room.commission_percent == null || !Number.isFinite(room.commission_percent) || room.commission_percent < 0 || room.commission_percent > 100)));
}
