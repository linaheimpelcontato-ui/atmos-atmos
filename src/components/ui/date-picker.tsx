import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** Value as ISO string yyyy-MM-dd or "" */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** compact sizes for admin forms */
  size?: "sm" | "default";
  /** ISO string to use as default calendar month when value is empty */
  defaultMonth?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  disabled,
  size = "default",
  defaultMonth: defaultMonthStr,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const defaultMonthDate = React.useMemo(() => {
    if (defaultMonthStr) {
      const d = parse(defaultMonthStr, "yyyy-MM-dd", new Date());
      return isValid(d) ? d : undefined;
    }
    return undefined;
  }, [defaultMonthStr]);

  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
  };

  const isSm = size === "sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal w-full",
            isSm ? "h-8 text-xs px-2.5 gap-1.5" : "h-10 text-sm px-3 gap-2",
            !dateValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className={cn(isSm ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0")} />
          {dateValue ? format(dateValue, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={dateValue || defaultMonthDate}
          locale={ptBR}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
