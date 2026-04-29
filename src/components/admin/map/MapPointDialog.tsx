import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pointTypeConfig, type PointType } from "./mapData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface MapPointData {
  id?: string;
  name: string;
  description: string;
  point_type: PointType;
  x: number;
  y: number;
  product_id: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  point: MapPointData | null;
  onSave: (data: MapPointData) => void;
  onDelete?: (id: string) => void;
}

export default function MapPointDialog({ open, onOpenChange, point, onSave, onDelete }: Props) {
  const [form, setForm] = useState<MapPointData>({
    name: "",
    description: "",
    point_type: "waterfall",
    x: 50,
    y: 50,
    product_id: null,
    is_active: true,
  });

  useEffect(() => {
    if (point) setForm(point);
    else setForm({ name: "", description: "", point_type: "waterfall", x: 50, y: 50, product_id: null, is_active: true });
  }, [point, open]);

  const { data: products } = useQuery({
    queryKey: ["products-for-map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, type")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Ponto" : "Novo Ponto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Cachoeira Santa Bárbara" />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Select value={form.point_type} onValueChange={(v) => setForm({ ...form, point_type: v as PointType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(pointTypeConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.icon} {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">Produto vinculado (opcional)</label>
            <Select value={form.product_id ?? "none"} onValueChange={(v) => setForm({ ...form, product_id: v === "none" ? null : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>X: {form.x.toFixed(1)}%</span>
            <span>Y: {form.y.toFixed(1)}%</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {form.id && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(form.id!)}>
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
