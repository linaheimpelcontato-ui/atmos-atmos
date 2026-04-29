import { useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const labels = {
  pt: "Filtros",
  en: "Filters",
  es: "Filtros",
};

interface CollapsibleFiltersProps {
  children: ReactNode;
}

export default function CollapsibleFilters({ children }: CollapsibleFiltersProps) {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          {labels[language]}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
