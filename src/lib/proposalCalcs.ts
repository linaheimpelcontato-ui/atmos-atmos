/** Monetary totals are rounded at the line/group boundary, never before rateio. */
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const lineTotal = (unit: number, quantity: number) => money(unit * quantity);
export const supplierCommission = (cost: number, percent: number) => money(cost * percent / 100);
export function splitGroupTotal(total: number, people: number, courtesies: number) {
  if (!Number.isInteger(people) || people <= 0 || !Number.isInteger(courtesies) || courtesies < 0 || courtesies >= people) {
    throw new Error("Informe um grupo válido com pelo menos um pagante.");
  }
  const paying = people - courtesies;
  const cents = Math.round(money(total) * 100);
  const lowerCents = Math.floor(cents / paying);
  const upperCount = cents - lowerCents * paying;
  return { total: money(total), paying, perPerson: total / paying,
    lowerAmount: lowerCents / 100, lowerCount: paying - upperCount,
    upperAmount: (lowerCents + 1) / 100, upperCount };
}
export function resizeFixedPrice(value: number, cost: number, oldQuantity: number, newQuantity: number) {
  if (newQuantity <= 0) return { value, cost };
  return { value: lineTotal(value, oldQuantity) / newQuantity, cost: lineTotal(cost, oldQuantity) / newQuantity };
}
export function operatingProfit(revenue: number, cost: number, commission: number, deductions: number) {
  return money(revenue - cost + commission - deductions);
}

/** Undefined/null means absent; zero is an explicitly recorded cost. */
export function recordedCost(cost: number | null | undefined): number | undefined {
  return cost != null && Number.isFinite(cost) ? cost : undefined;
}

/** Current commercial rule: discounts on itinerary items, then add service and
 * ATMOS-paid lodging, then gross up tax. Round monetary stages, never the rateio.
 * This describes the application's rule, not a claim about tax legislation. */
export function proposalPriceTotals(input: {
  subtotal: number; serviceRevenue: number; accommodationRevenue: number;
  discountPercent: number; discountFixed: number; taxPercent: number;
}) {
  const { subtotal, serviceRevenue, accommodationRevenue, discountPercent, discountFixed, taxPercent } = input;
  if (Object.values(input).some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Preços, descontos e imposto devem ser números válidos e não negativos.");
  }
  if (discountPercent > 100 || taxPercent >= 100) {
    throw new Error("Desconto percentual deve ser até 100%; imposto deve ser menor que 100%.");
  }
  if ([discountPercent, discountFixed, taxPercent].some(value => Math.abs(money(value) - value) > 1e-9)) {
    throw new Error("Informe descontos e imposto com no máximo duas casas decimais.");
  }
  const discountValue = money(money(subtotal) * discountPercent / 100 + discountFixed);
  if (discountValue > money(subtotal)) throw new Error("O desconto não pode exceder o subtotal dos itens do roteiro.");
  const afterDiscount = money(subtotal - discountValue);
  const base = money(afterDiscount + money(serviceRevenue) + money(accommodationRevenue));
  const total = money(base / (1 - taxPercent / 100));
  if (total > 99999999.99) throw new Error("O total excede o limite monetário da proposta.");
  return { discountValue, afterDiscount, base, total, taxValue: money(total - base) };
}
