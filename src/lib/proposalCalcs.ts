/** Exact decimal arithmetic on the decimal representation sent in JSON to SQL.
 * Keep fractions until monetary boundaries; ties round away from zero, like
 * PostgreSQL round(numeric, 2). Never round a unit price before multiplication.
 * Callers must pass operands separately: money(a * b) cannot undo float error.
 */
type Fraction = { n: bigint; d: bigint };
const decimal = (value: number): Fraction => {
  if (!Number.isFinite(value)) throw new Error("Valor monetário deve ser finito.");
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  const [integer, fraction = ""] = coefficient.split(".");
  const scale = fraction.length - Number(exponent);
  const n = BigInt(integer + fraction);
  return scale >= 0 ? { n, d: 10n ** BigInt(scale) } : { n: n * 10n ** BigInt(-scale), d: 1n };
};
const add = (a: Fraction, b: Fraction): Fraction => a.d === b.d
  ? { n: a.n + b.n, d: a.d }
  : { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
const multiply = (a: Fraction, b: Fraction): Fraction => ({ n: a.n * b.n, d: a.d * b.d });
const divide = (a: Fraction, b: Fraction): Fraction => {
  if (b.n === 0n) throw new Error("Divisor monetário não pode ser zero.");
  const sign = b.n < 0n ? -1n : 1n;
  return { n: a.n * b.d * sign, d: a.d * b.n * sign };
};
const roundedCents = ({ n, d }: Fraction): bigint => {
  const magnitude = (n < 0n ? -n : n) * 100n;
  const cents = magnitude / d + (magnitude % d * 2n >= d ? 1n : 0n);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Valor monetário excede a precisão suportada.");
  return n < 0n ? -cents : cents;
};
const roundedMoney = (value: Fraction) => Number(roundedCents(value)) / 100;
export const money = (value: number) => roundedMoney(decimal(value));
export const moneySum = (...values: number[]) => roundedMoney(values.map(decimal).reduce(add, decimal(0)));
export const moneyProduct = (...values: number[]) => roundedMoney(values.map(decimal).reduce(multiply, decimal(1)));
/** Sum unrounded products, then round once (e.g. commissions per lodging). */
export const moneySumProducts = (terms: number[][]) => roundedMoney(terms
  .map(values => values.map(decimal).reduce(multiply, decimal(1)))
  .reduce(add, decimal(0)));
export const lineTotal = (unit: number, quantity: number) => moneyProduct(unit, quantity);
export const supplierCommission = (cost: number, percent: number) => roundedMoney(divide(multiply(decimal(cost), decimal(percent)), decimal(100)));
export const proposalDiscount = (subtotal: number, percent: number, fixed: number) =>
  roundedMoney(add(divide(multiply(decimal(money(subtotal)), decimal(percent)), decimal(100)), decimal(fixed)));
export function splitGroupTotal(total: number, people: number, courtesies: number) {
  if (!Number.isInteger(people) || people <= 0 || !Number.isInteger(courtesies) || courtesies < 0 || courtesies >= people) {
    throw new Error("Informe um grupo válido com pelo menos um pagante.");
  }
  const paying = people - courtesies;
  const cents = Number(roundedCents(decimal(total)));
  const lowerCents = Math.floor(cents / paying);
  const upperCount = cents - lowerCents * paying;
  return { total: money(total), paying, perPerson: money(total) / paying,
    lowerAmount: lowerCents / 100, lowerCount: paying - upperCount,
    upperAmount: (lowerCents + 1) / 100, upperCount };
}
export function resizeFixedPrice(value: number, cost: number, oldQuantity: number, newQuantity: number) {
  if (newQuantity <= 0) return { value, cost };
  return { value: lineTotal(value, oldQuantity) / newQuantity, cost: lineTotal(cost, oldQuantity) / newQuantity };
}
export function operatingProfit(revenue: number, cost: number, commission: number, deductions: number) {
  return moneySum(revenue, -cost, commission, -deductions);
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
  if ([discountPercent, discountFixed, taxPercent].some(value => money(value) !== value)) {
    throw new Error("Informe descontos e imposto com no máximo duas casas decimais.");
  }
  const discountValue = proposalDiscount(subtotal, discountPercent, discountFixed);
  if (discountValue > money(subtotal)) throw new Error("O desconto não pode exceder o subtotal dos itens do roteiro.");
  const afterDiscount = moneySum(money(subtotal), -discountValue);
  const base = moneySum(afterDiscount, money(serviceRevenue), money(accommodationRevenue));
  const total = roundedMoney(divide(multiply(decimal(base), decimal(100)), add(decimal(100), decimal(-taxPercent))));
  if (total > 99999999.99) throw new Error("O total excede o limite monetário da proposta.");
  return { discountValue, afterDiscount, base, total, taxValue: moneySum(total, -base) };
}
