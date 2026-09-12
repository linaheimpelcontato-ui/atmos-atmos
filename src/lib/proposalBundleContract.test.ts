import { describe, expect, it } from "vitest";
import { requestedPriceBreakdown, validateBundleCommissions } from "./proposalBundleContract";

const id = "12345678-1234-1234-1234-123456789abc";
const accommodation = { id, is_selected: true, payment_type: "hospedagem" };
const valid = { source_key: `accommodation:${id}`, amount: 0.01, description: "Comissão hospedagem", due_date: "2026-09-11" };

describe("public breakdown payload contract", () => {
  it("distinguishes absent from explicit true and false", () => {
    expect(requestedPriceBreakdown({})).toBeUndefined();
    expect(requestedPriceBreakdown({ show_price_breakdown: true })).toBe(true);
    expect(requestedPriceBreakdown({ show_price_breakdown: false })).toBe(false);
  });
  it.each([null, undefined, "true", "false", 1, 0])("rejects a present non-boolean: %s", value => {
    expect(() => requestedPriceBreakdown({ show_price_breakdown: value })).toThrow();
  });
});

describe("commission bundle preflight", () => {
  it("allows no commissions and a valid linked commission", () => {
    expect(() => validateBundleCommissions([], [])).not.toThrow();
    expect(() => validateBundleCommissions([valid], [accommodation])).not.toThrow();
  });
  it.each([null, undefined, 0, -0.01, NaN, Infinity, "0.01"])("rejects invalid amount %s", amount => {
    expect(() => validateBundleCommissions([{ ...valid, amount }], [accommodation])).toThrow();
  });
  it("rejects duplicated sources even when amounts are identical", () => {
    expect(() => validateBundleCommissions([valid, { ...valid }], [accommodation])).toThrow(/duplicada/);
  });
  it.each([null, undefined, "", "accommodation:", "other:123", `accommodation:${id.toUpperCase()}`])("rejects malformed or noncanonical source %s", source_key => {
    expect(() => validateBundleCommissions([{ ...valid, source_key }], [accommodation])).toThrow();
  });
  it("rejects a valid key with no eligible accommodation in this bundle", () => {
    expect(() => validateBundleCommissions([valid], [])).toThrow();
    expect(() => validateBundleCommissions([valid], [{ ...accommodation, is_selected: false }])).toThrow();
    expect(() => validateBundleCommissions([valid], [{ ...accommodation, payment_type: "atmos" }])).toThrow();
  });
  it.each([null, "", "2026-02-30", "not-a-date"])("rejects invalid due date %s", due_date => {
    expect(() => validateBundleCommissions([{ ...valid, due_date }], [accommodation])).toThrow();
  });
  it("rejects non-arrays, null records and absent descriptions", () => {
    expect(() => validateBundleCommissions(null, [])).toThrow();
    expect(() => validateBundleCommissions([null], [])).toThrow();
    expect(() => validateBundleCommissions([{ ...valid, description: null }], [accommodation])).toThrow();
  });
});
