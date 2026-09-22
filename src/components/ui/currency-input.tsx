import { useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { parseAmountInput } from "@/lib/currency";

// Preserve sub-cent unit rates already supported by proposals. Whole amounts
// still display two decimal places; focusing never rounds the saved number.
const displayCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 20,
});

type CurrencyInputProps = Omit<ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange" | "onBlur" | "onFocus" | "type" | "inputMode" | "step" | "min" | "max"
> & {
  value: number | "";
  onValueChange: (value: number) => void;
  commitOnBlur?: boolean;
  min?: number;
  max?: number;
};

export function CurrencyInput({ value, onValueChange, commitOnBlur = false, min, max, required, onKeyDown, ...props }: CurrencyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const edited = useRef(false);

  const validate = (input: HTMLInputElement) => {
    const amount = parseAmountInput(input.value);
    const message = amount === null ? "Informe um valor válido, por exemplo 1.000,00."
      : min !== undefined && amount < min ? `O valor mínimo é ${displayCurrency.format(min)}.`
      : max !== undefined && amount > max ? `O valor máximo é ${displayCurrency.format(max)}.` : "";
    input.setCustomValidity(message);
    return message || (required && !input.value.trim()) ? null : amount;
  };

  return <Input
    {...props}
    type="text"
    inputMode="decimal"
    required={required}
    value={draft ?? (value === "" ? "" : displayCurrency.format(value))}
    onFocus={() => {
      edited.current = false;
      setDraft(current => current ?? (value === "" ? "" : String(value).replace(".", ",")));
    }}
    onChange={event => {
      edited.current = true;
      setDraft(event.target.value);
      const amount = validate(event.target);
      if (!commitOnBlur && amount !== null) onValueChange(amount);
    }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (commitOnBlur && event.key === "Enter" && !event.defaultPrevented) {
        // Confirm the draft before a form could submit the previous numeric value.
        event.preventDefault();
        event.currentTarget.blur();
      }
    }}
    onBlur={event => {
      const amount = validate(event.currentTarget);
      if (amount === null) {
        event.currentTarget.reportValidity();
        return;
      }
      if (commitOnBlur && edited.current) onValueChange(amount);
      edited.current = false;
      setDraft(null);
    }}
  />;
}
