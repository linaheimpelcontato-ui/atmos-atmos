import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Loader2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Props {
  prospectId: string;
  prospectEmail: string | null;
  onCreated: (data: any) => void;
}

type ProductRow = { id: string; name: string; type: string; category: string | null };

const TYPE_LABELS: Record<string, string> = {
  waterfall: "Cachoeira",
  experience: "Experiência",
  accommodation: "Hospedagem",
  service: "Serviço",
  itinerary: "Roteiro",
};

export default function ManualWishlistForm({ prospectId, prospectEmail, onCreated }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products = [] } = useQuery<ProductRow[]>({
    queryKey: ["products-for-wishlist"],
    queryFn: async () => {
      const { data } = await db
        .from("products")
        .select("id, name, type, category")
        .eq("is_active", true)
        .order("type, name");
      return (data || []) as ProductRow[];
    },
  });

  // Group products by type
  const grouped = products.reduce<Record<string, ProductRow[]>>((acc, p) => {
    const key = p.type || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = products
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ name: p.name, type: p.type, id: p.id }));

      const answers: Record<string, unknown> = {
        profileType: "Turista",
        origin: "manual_admin",
      };
      if (startDate) answers.startDate = startDate;
      if (endDate) answers.endDate = endDate;
      if (groupSize) answers.groupSize = groupSize;
      if (notes) answers.notes = notes;

      // Get prospect info
      const { data: prosp } = await db.from("prospects").select("name, email, phone").eq("id", prospectId).maybeSingle();

      const payload = {
        user_email: prosp?.email || prospectEmail || null,
        user_name: prosp?.name || null,
        user_phone: prosp?.phone || null,
        items,
        answers,
        language: "pt",
        status: "pending",
      };

      const { data, error } = await db.from("quote_requests").insert(payload).select("*").single();
      if (error) throw error;

      toast({ title: "Wishlist criada", description: "Wishlist manual salva com sucesso." });
      onCreated(data);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Selecione os produtos desejados e preencha os dados do cliente.
      </p>

      {/* Products by type */}
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {TYPE_LABELS[type] || type}
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {items.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <span>{p.name}</span>
                {p.category && (
                  <span className="text-xs text-muted-foreground ml-auto">{p.category}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Extra fields */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Data início</Label>
            <DatePicker value={startDate} onChange={setStartDate} size="sm" />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <DatePicker value={endDate} onChange={setEndDate} size="sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Nº Pessoas</Label>
          <Input
            type="number"
            min={1}
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            placeholder="Ex: 4"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas adicionais..."
            className="resize-none"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gap-2"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Wishlist
      </Button>
    </div>
  );
}
