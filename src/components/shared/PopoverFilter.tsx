import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackFilterUse } from "@/lib/analytics";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const verMaisLabels = { pt: "ver mais", en: "see more", es: "ver más" };
const clearLabels = { pt: "Limpar", en: "Clear", es: "Limpiar" };

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface PopoverFilterProps {
  label: string;
  icon: ReactNode;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiSelect: true;
}

export default function PopoverFilter({
  label,
  icon,
  options,
  selectedValues,
  onChange,
}: PopoverFilterProps) {
  const { language } = useLanguage();
  const verMais = verMaisLabels[language];

  const toggle = (value: string) => {
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
      trackFilterUse(label, value, page);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs w-full justify-between"
          >
            <span className="truncate">{label}</span>
            <span className="flex items-center gap-1.5 ml-auto pl-2 shrink-0">
              {selectedValues.length > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 px-1.5 text-[10px] bg-accent text-accent-foreground"
                >
                  {selectedValues.length}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground font-normal">
                {verMais}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 max-h-72 overflow-y-auto p-3" align="start">
          <div className="space-y-1">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                <span className="text-sm text-foreground">{opt.label}</span>
              </label>
            ))}
          </div>
          {selectedValues.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-muted-foreground"
              onClick={() => onChange([])}
            >
              {clearLabels[language as keyof typeof clearLabels]}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
