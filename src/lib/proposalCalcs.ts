/** Monetary totals are rounded at the line/group boundary, never before rateio. */
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const lineTotal = (unit: number, quantity: number) => money(unit * quantity);
export const supplierCommission = (cost: number, percent: number) => money(cost * percent / 100);
export function splitGroupTotal(total: number, people: number, courtesies: number) {
  if (!Number.isInteger(people) || people <= 0 || !Number.isInteger(courtesies) || courtesies < 0 || courtesies >= people) {
    throw new Error("Informe um grupo válido com pelo menos um pagante.");
  }
  const paying = people - courtesies;
  return { total: money(total), paying, perPerson: total / paying };
}
export function resizeFixedPrice(value: number, cost: number, oldQuantity: number, newQuantity: number) {
  if (newQuantity <= 0) return { value, cost };
  return { value: lineTotal(value, oldQuantity) / newQuantity, cost: lineTotal(cost, oldQuantity) / newQuantity };
}
export function operatingProfit(revenue: number, cost: number, commission: number, deductions: number) {
  return money(revenue - cost + commission - deductions);
}
