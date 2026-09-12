/** A transport success alone is not a saved conference. */
export function requireSavedCostChecks(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  if (result.data !== true) throw new Error('Conferência não confirmada pelo servidor.');
}
