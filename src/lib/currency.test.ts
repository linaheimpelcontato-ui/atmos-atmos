import { describe, expect, it } from "vitest";
import { formatBRL, parseAmountInput } from "./currency";
import { lineTotal } from "./proposalCalcs";

describe("Brazilian proposal currency display", () => {
  it.each([
    [0, "R$ 0,00"], [70, "R$ 70,00"], [1470, "R$ 1.470,00"],
    [1234567.89, "R$ 1.234.567,89"], [-1470.5, "-R$ 1.470,50"],
    [0.145, "R$ 0,15"],
  ])("formats %s without modifying the numeric value", (value, expected) => {
    expect(formatBRL(value).replace(/\u00a0/g, " ")).toBe(expected);
  });

  it("preserves the screenshot calculation: 21 people at 70 reais", () => {
    const total = lineTotal(70, 21);
    expect(total).toBe(1470);
    expect(formatBRL(total)).toBe("R$\u00a01.470,00");
  });
});

describe("proposal numeric input", () => {
  it.each([
    ["1.470,00", 1470], ["R$ 1.470,50", 1470.5], ["70,00", 70],
    ["1470.50", 1470.5], ["0.145", 0.145], ["0,145", 0.145],
    ["21", 21], ["", 0], ["0", 0], ["70,", 70], ["-12,50", -12.5],
  ])("reads %s without losing thousands or precision", (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });
  it.each(["12.34,56", "1,470.00", "70abc", "--1", "Infinity", "NaN", "1,2,3"])(
    "rejects %s instead of saving a truncated or zero amount", input => {
      expect(parseAmountInput(input)).toBeNull();
    },
  );
});
