/**
 * Mirrors the same rule supabase/functions/approve-proposal/index.ts uses
 * server-side: "today" is the calendar date in America/Sao_Paulo (the
 * business's own timezone), not UTC. A `date` column like valid_until has
 * no timezone of its own -- comparing it against `new Date()` (UTC) can
 * make a proposal look expired hours before the named day is actually over
 * locally. Kept in one place so the UI and the endpoint can't drift apart.
 */
export function todaySaoPauloISODate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** valid_until is inclusive of the whole named day (Sao Paulo time). */
export function isProposalExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return validUntil < todaySaoPauloISODate();
}
