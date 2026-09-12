/** Commercial approval only. It does not imply a signed contract or payment.
 * `approved` is written by approve-proposal; `accepted` is the legacy value
 * documented by the original text-column schema. Keep legacy rows readable.
 */
export const APPROVED_PROPOSAL_STATUSES = ["approved", "accepted"] as const;

export function isApprovedProposalStatus(status: unknown): status is typeof APPROVED_PROPOSAL_STATUSES[number] {
  return APPROVED_PROPOSAL_STATUSES.some(approved => status === approved);
}
