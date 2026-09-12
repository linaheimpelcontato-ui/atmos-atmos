import { describe, expect, it } from "vitest";
import { accommodationAmounts, hasMissingCommission, normalizeSavedRooms } from "./accommodationCalcs";
import { recordedCost, splitGroupTotal } from "./proposalCalcs";
import { calcProposalProfit } from "@/pages/admin/finance/financeCalcs";
import { calcAccommodationTotals } from "@/components/admin/proposals/ProposalAccommodationsSection";

const room = { type: "single", available: true, units: 1, capacity: 1, pricing_type: "per_room", cost: 1000, price: 1200, commission_percent: 10 };
const unit = { unit_label: "Hotel", rooms: [room] };

describe("historical accommodation commissions", () => {
  it.each([[unit], [room], { unit_label: "Hotel", modalities: [room] }])("preserves saved rate in each legacy room layout", raw => {
    const loaded = normalizeSavedRooms(raw);
    expect(loaded[0].rooms[0].commission_percent).toBe(10);
    expect(accommodationAmounts(loaded, 1).commission).toBe(100);
    expect(normalizeSavedRooms(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
  });
  it("preserves zero and flags absent historical commission", () => {
    const zero = normalizeSavedRooms([{ ...room, commission_percent: 0 }]);
    expect(accommodationAmounts(zero, 1).commission).toBe(0);
    expect(hasMissingCommission(zero)).toBe(false);
    const missing = normalizeSavedRooms([{ ...room, commission_percent: undefined }]);
    expect(hasMissingCommission(missing)).toBe(true);
    expect(accommodationAmounts(missing, 1).missingCommissions).toBe(1);
  });
  it("uses snapshots in finance even when catalog commission changes", () => {
    const p = { id: "p", total: 100, subtotal: 0, atmos_service: {}, num_people: 1, num_days: 1, proposal_accommodations: [{ is_selected: true, payment_type: "hospedagem", num_nights: 1, rooms: [unit], products: { variables: { comissao: 90 } } }] } as any;
    expect(calcProposalProfit(p, [], []).profit).toBe(100);
    p.proposal_accommodations[0].rooms[0].rooms = [{ ...room, commission_percent: 0 }];
    expect(calcProposalProfit(p, [], []).profit).toBe(0);
  });
  it("rounds commissions once per accommodation across summary, finance and receipt", () => {
    const units = normalizeSavedRooms([{ rooms: [{ ...room, cost: 0.05 }, { ...room, cost: 0.05 }] }]);
    const acc = { unit_configs: units, num_nights: 1, is_selected: true, payment_type: "hospedagem" } as any;
    const receiptAmount = accommodationAmounts(units, 1).commission;
    expect(receiptAmount).toBe(0.01);
    expect(calcAccommodationTotals([acc]).hospedagemCommission).toBe(receiptAmount);
    expect(calcProposalProfit({ id: "p", total: 0, subtotal: 0, atmos_service: {}, num_people: 1, num_days: 1,
      proposal_accommodations: [{ ...acc, rooms: units }] } as any, [], []).profit).toBe(receiptAmount);
  });
  it("preserves zero cost and distinguishes it from absent data", () => {
    expect(recordedCost(0) ?? 100).toBe(0);
    expect(recordedCost(undefined) ?? 100).toBe(100);
    expect(recordedCost(null) ?? 100).toBe(100);
  });
  it("distributes all accommodation cents among 18 paying travelers", () => {
    const allocation = splitGroupTotal(2000, 20, 2);
    expect(allocation.perPerson).toBeCloseTo(111.111111);
    expect(allocation.lowerCount).toBe(16);
    expect(allocation.upperCount).toBe(2);
    expect(allocation.lowerAmount * allocation.lowerCount + allocation.upperAmount * allocation.upperCount).toBeCloseTo(2000);
  });
});
