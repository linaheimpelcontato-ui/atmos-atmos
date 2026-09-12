export interface GuideTrip {
  id: string; code: string | null; status: string; start_date: string | null;
  end_date: string | null; num_people: number | null;
  items: { day_number: number; category: string; item_name: string | null; start_time: string | null; end_time: string | null }[];
}
export function parseGuideAmount(input: string): number {
  const value = input.trim();
  const normalized = /^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)
    ? value.replace(/\./g, '').replace(',', '.')
    : /^\d+([.,]\d{1,2})?$/.test(value) ? value.replace(',', '.') : '';
  const amount = Number(normalized);
  if (!normalized || !Number.isFinite(amount) || amount <= 0 || amount > 999999999.99)
    throw new Error('Informe um valor positivo, com até duas casas decimais (ex.: 123,45).');
  return amount;
}
export function guideDate(date: string | null): string {
  if (!date) return 'Data a definir';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
export function guideTripCounts(trips: GuideTrip[], today: string) {
  return {
    past: trips.filter(t => t.start_date && (t.end_date || t.start_date) < today).length,
    upcoming: trips.filter(t => t.start_date && (t.end_date || t.start_date) >= today).length,
    undated: trips.filter(t => !t.start_date).length,
  };
}
