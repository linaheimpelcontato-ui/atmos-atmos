import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type ProposalProspect = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
};

const normalizedName = (name: string) => name.trim().toLocaleLowerCase("pt-BR");

export default function ProspectCombobox({ prospects, value, onChange }: {
  prospects: ProposalProspect[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const names = useMemo(() => {
    const counts = new Map<string, number>();
    for (const prospect of prospects) {
      const name = normalizedName(prospect.name);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [prospects]);
  const detail = (prospect: ProposalProspect) => (names.get(normalizedName(prospect.name)) ?? 0) > 1
    ? [prospect.email || prospect.phone || prospect.company_name, `Cadastro ${prospect.id.slice(0, 8)}`].filter(Boolean).join(" · ")
    : "";
  const selected = prospects.find(prospect => prospect.id === value);
  const selectedLabel = selected
    ? [selected.name, detail(selected)].filter(Boolean).join(" — ")
    : value ? "Selecionar..." : "Nenhum";
  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-label="Prospect" aria-expanded={open}
          title={selectedLabel} className="h-8 text-sm w-full min-w-0 justify-between font-normal">
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] max-w-[calc(100vw-2rem)] p-0" align="start" onWheel={event => event.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Buscar prospect..." className="h-8 text-sm" />
          <CommandList className="max-h-[250px]">
            <CommandEmpty>Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => select(null)}>
                <Check aria-hidden className={cn("mr-2 h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                Nenhum
              </CommandItem>
              {prospects.map(prospect => (
                <CommandItem key={prospect.id} value={prospect.id}
                  keywords={[prospect.name, prospect.email ?? "", prospect.phone ?? "", prospect.company_name ?? ""]}
                  onSelect={() => select(prospect.id)}>
                  <Check aria-hidden className={cn("mr-2 h-3.5 w-3.5 shrink-0", value === prospect.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block">{prospect.name}</span>
                    {detail(prospect) && <span className="block text-xs opacity-75 break-all">{detail(prospect)}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
