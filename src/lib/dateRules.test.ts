import { describe, it, expect } from "vitest";
import { isProposalExpired } from "./dateRules";

describe("isProposalExpired", () => {
  it("is not expired when there's no valid_until", () => {
    expect(isProposalExpired(null)).toBe(false);
  });

  it("is expired for a date clearly in the past", () => {
    expect(isProposalExpired("2000-01-01")).toBe(true);
  });

  it("is not expired for a date clearly in the future", () => {
    expect(isProposalExpired("2999-12-31")).toBe(false);
  });

  it("is not expired on the named day itself (inclusive)", () => {
    // The whole calendar day in America/Sao_Paulo counts as still valid,
    // not just up to UTC midnight -- this is the exact bug that made
    // approve-proposal reject same-day approvals hours too early.
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const todaySaoPaulo = `${get("year")}-${get("month")}-${get("day")}`;
    expect(isProposalExpired(todaySaoPaulo)).toBe(false);
  });
});
