import { expect, it } from "vitest";
import { buildServiceItems } from "./catalogSync";

it("preserves person-based shared transfers and fixed private car prices", () => {
  const items = buildServiceItems();
  const shared = items.find(item => item.source_id === "compartilhado-alto-paraíso")!;
  expect(shared.variables.pricingType).toBe("por_pessoa");
  expect(shared.unit_price * 2).toBe(520);
  const car = items.find(item => item.source_id === "particular-alto-paraíso")!;
  expect(car.variables).toMatchObject({ pricingType: "total", limitPeople: 4 });
  expect(car.unit_price).toBe(1200);
});
it("keeps all van capacity fares instead of silently choosing the first", () => {
  const vans = buildServiceItems().filter(item => item.source_id.startsWith("van-alto-paraíso-"));
  expect(vans.map(item => [item.variables.limitPeople, item.unit_price])).toEqual([[10, 3000], [15, 3600], [20, 5000]]);
  expect(vans.every(item => item.variables.pricingType === "total")).toBe(true);
  expect(new Set(vans.map(item => item.source_id)).size).toBe(3);
});
