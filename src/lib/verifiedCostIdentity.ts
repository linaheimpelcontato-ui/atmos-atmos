export interface CostIdentity {
  id?: string; day_number: number; item_index: number; category?: string | null;
  catalog_item_id?: string | null; variation_id?: string | null; supplier_id?: string | null;
  vehicle_type?: string | null;
}
export interface CostCheck { item_id?: string | null; identity_snapshot?: CostIdentity | null; notes?: string | null; day_number: number; item_index: number; actual_cost: number; is_verified: boolean }
export const VERIFIED_COST_MESSAGE = 'A identidade de um item com custo conferido mudou ou ficou ambígua. Desmarque a conferência antes de alterar a composição e confira novamente o custo do item correto.';
const sameSlot = (a: CostIdentity | CostCheck, b: CostIdentity | CostCheck) => a.day_number === b.day_number && a.item_index === b.item_index;
export function sameCostIdentity(a: CostIdentity, b: CostIdentity): boolean {
  return !!a.id && a.id === b.id && sameSlot(a,b)
    && ['category','catalog_item_id','variation_id','supplier_id'].every(k => (a[k as keyof CostIdentity] ?? null) === (b[k as keyof CostIdentity] ?? null))
    && (a.vehicle_type || 'carroTurista') === (b.vehicle_type || 'carroTurista');
}
export function verifiedCheckForCell(cell: CostIdentity, original: CostIdentity[], current: CostIdentity[], checks: CostCheck[]): CostCheck | undefined {
  const before = original.filter(c=>sameSlot(c,cell));
  const after = current.filter(c=>sameSlot(c,cell));
  if (before.length !== 1 || after.length !== 1 || !sameCostIdentity(before[0],cell)) return undefined;
  return checks.find(c=>c.is_verified && sameSlot(c,cell) && boundCheckMatches(cell,c));
}
export function assertVerifiedCostIdentity(original: CostIdentity[], current: CostIdentity[], checks: CostCheck[]): void {
  const slots = new Set<string>();
  for (const c of current) {
    const key = `${c.day_number}:${c.item_index}`;
    if (slots.has(key)) throw new Error('Dois itens ocupam o mesmo dia/posição. Desmarque eventuais conferências antes de corrigir a composição e confira novamente os itens corretos.');
    slots.add(key);
  }
  for (const check of checks.filter(c=>c.is_verified && c.day_number >= 0)) {
    const cell = current.find(c=>sameSlot(c,check));
    const before = original.filter(c=>sameSlot(c,check));
    if (!cell || before.length !== 1 || !sameCostIdentity(before[0],cell)
      || (check.item_id && !boundCheckMatches(cell,check))) throw new Error(VERIFIED_COST_MESSAGE);
  }
}

export function costSnapshot(item: CostIdentity & { qty?: number; quantity?: number }) {
  return { id: item.id ?? null, day_number: item.day_number, item_index: item.item_index,
    category: item.category ?? null, catalog_item_id: item.catalog_item_id ?? null,
    variation_id: item.variation_id ?? null, supplier_id: item.supplier_id ?? null,
    vehicle_type: item.vehicle_type || 'carroTurista', quantity: item.quantity ?? item.qty ?? 1 };
}
export function boundCheckMatches(cell: CostIdentity, check: CostCheck): boolean {
  return !!check.item_id && check.item_id === cell.id && !!check.identity_snapshot && sameCostIdentity(check.identity_snapshot,cell);
}
export function checklistSavedValues(cell: CostIdentity, checks: CostCheck[]) {
  return checks.find(c=>boundCheckMatches(cell,c));
}
