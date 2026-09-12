import { describe, expect, it } from "vitest";
import { APPROVED_PROPOSAL_STATUSES, isApprovedProposalStatus } from "./proposalStatus";

describe("commercial proposal approval", () => {
  it.each(["approved", "accepted"])("includes canonical/legacy status %s", status => {
    expect(isApprovedProposalStatus(status)).toBe(true);
    expect(APPROVED_PROPOSAL_STATUSES).toContain(status);
  });

  it.each(["draft", "sent", "negotiating", "rejected", "expired", "cancelled", "closed",
    "paid", "partial", "pending", "signed", "APPROVED", "approved ", "", null, undefined, 1])(
    "does not treat %s as approval", status => {
      expect(isApprovedProposalStatus(status)).toBe(false);
      expect(APPROVED_PROPOSAL_STATUSES).not.toContain(status);
    },
  );
});
