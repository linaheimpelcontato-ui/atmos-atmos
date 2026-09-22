import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./currency-input";

afterEach(cleanup);

function mount({ initial = 0 as number | "", commitOnBlur = false, required = false, min, max, floor }: {
  initial?: number | ""; commitOnBlur?: boolean; required?: boolean; min?: number; max?: number; floor?: number;
} = {}) {
  const change = vi.fn();
  function Form() {
    const [value, setValue] = useState(initial);
    return <form aria-label="Proposta">
      <CurrencyInput aria-label="Valor" value={value} commitOnBlur={commitOnBlur} required={required} min={min} max={max}
        onValueChange={amount => { change(amount); setValue(floor === undefined ? amount : Math.max(floor, amount)); }} />
      <output data-testid="amount">{value}</output>
    </form>;
  }
  render(<Form />);
  return { input: screen.getByRole("textbox", { name: "Valor" }), change };
}

describe("currency inputs in proposals", () => {
  it.each([false, true])("formats 1000 as reais without treating it as cents (commitOnBlur=%s)", commitOnBlur => {
    const { input, change } = mount({ commitOnBlur });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1000" } });
    expect(input).toHaveValue("1000");
    if (commitOnBlur) expect(change).not.toHaveBeenCalled();
    else expect(change).toHaveBeenLastCalledWith(1000);
    fireEvent.blur(input);
    expect(input).toHaveValue("R$\u00a01.000,00");
    expect(screen.getByTestId("amount")).toHaveTextContent("1000");
    expect(change).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it.each(["1.234,56", "R$\u00a01.234,56", "1234.56"])("accepts pasted %s", text => {
    const { input, change } = mount();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.blur(input);
    expect(change).toHaveBeenLastCalledWith(1234.56);
    expect(input).toHaveValue("R$\u00a01.234,56");
  });

  it("allows decimal typing without moving the cursor via a mask", () => {
    const { input } = mount();
    fireEvent.focus(input);
    for (const text of ["1", "10", "10,", "10,5", "10,50"]) {
      fireEvent.change(input, { target: { value: text } });
      expect(input).toHaveValue(text);
    }
    fireEvent.blur(input);
    expect(input).toHaveValue("R$\u00a010,50");
  });

  it("keeps sub-cent rates intact across focus/blur and edits", () => {
    const { input, change } = mount({ initial: 0.145, commitOnBlur: true });
    expect(input).toHaveValue("R$\u00a00,145");
    fireEvent.focus(input);
    expect(input).toHaveValue("0,145");
    fireEvent.blur(input);
    expect(change).not.toHaveBeenCalled();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0,125" } });
    fireEvent.blur(input);
    expect(change).toHaveBeenLastCalledWith(0.125);
    expect(input).toHaveValue("R$\u00a00,125");
  });

  it("shows a parent-enforced minimum cost instead of the rejected draft", () => {
    const { input } = mount({ initial: 200, floor: 200, commitOnBlur: true });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("R$\u00a0200,00");
  });

  it("clears optional amounts to zero, never leaving an old hidden amount", () => {
    const { input, change } = mount({ initial: 1000 });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(change).toHaveBeenLastCalledWith(0);
    expect(input).toHaveValue("R$\u00a00,00");
  });

  it("keeps required amounts empty and invalid until entered", () => {
    const { input, change } = mount({ initial: "", required: true });
    expect(input).toBeInvalid();
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input).toHaveValue("");
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("form")).toBeInvalid();
    fireEvent.change(input, { target: { value: "1000" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("R$\u00a01.000,00");
    expect(screen.getByRole("form")).toBeValid();
  });

  it.each(["1000abc", "12.34,56", "1,2,3", "NaN", "-1", "2001"])("blocks invalid or out-of-range %s without committing it", text => {
    const { input, change } = mount({ initial: 100, min: 0, max: 2000 });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    expect(input).toBeInvalid();
    fireEvent.blur(input);
    expect(change).not.toHaveBeenCalled();
    expect(input).toHaveValue(text);
    expect(screen.getByTestId("amount")).toHaveTextContent("100");
    fireEvent.change(input, { target: { value: "1500,50" } });
    fireEvent.blur(input);
    expect(input).toBeValid();
    expect(input).toHaveValue("R$\u00a01.500,50");
  });

  it("formats amounts arriving from a saved proposal or catalog", () => {
    const change = vi.fn();
    const { rerender } = render(<CurrencyInput aria-label="Valor" value={1000} onValueChange={change} />);
    rerender(<CurrencyInput aria-label="Valor" value={10000} onValueChange={change} />);
    expect(screen.getByRole("textbox")).toHaveValue("R$\u00a010.000,00");
    expect(change).not.toHaveBeenCalled();
  });

  it("confirms a deferred edit with Enter instead of submitting the old amount", () => {
    const { input, change } = mount({ initial: 70, commitOnBlur: true });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "1000" } });
    const allowedDefault = fireEvent.keyDown(input, { key: "Enter" });
    expect(allowedDefault).toBe(false);
    expect(change).toHaveBeenCalledExactlyOnceWith(1000);
    expect(input).toHaveValue("R$\u00a01.000,00");
  });
});
