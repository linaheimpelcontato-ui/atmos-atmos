import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import MapCanvas from "@/components/admin/map/MapCanvas";
import MapPointDialog from "@/components/admin/map/MapPointDialog";
import { pointTypeConfig, type PointType } from "@/components/admin/map/mapData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface MapPoint {
  id: string;
  name: string;
  description: string | null;
  point_type: PointType;
  x: number;
  y: number;
  product_id: string | null;
  is_active: boolean;
}

export default function AdminMap() {
  const qc = useQueryClient();
  const [isPlacing, setIsPlacing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPoint, setEditPoint] = useState<MapPoint | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: points = [] } = useQuery<MapPoint[]>({
    queryKey: ["map-points"],
    queryFn: async () => {
      const { data, error } = await db.from("map_points").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (point: Omit<MapPoint, "id"> & { id?: string }) => {
      if (point.id) {
        const { error } = await db.from("map_points").update({
          name: point.name,
          description: point.description,
          point_type: point.point_type,
          x: point.x,
          y: point.y,
          product_id: point.product_id,
          is_active: point.is_active,
        }).eq("id", point.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("map_points").insert({
          name: point.name,
          description: point.description,
          point_type: point.point_type,
          x: point.x,
          y: point.y,
          product_id: point.product_id,
          is_active: point.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-points"] });
      toast.success("Ponto salvo!");
      setDialogOpen(false);
      setIsPlacing(false);
    },
    onError: () => toast.error("Erro ao salvar ponto"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("map_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-points"] });
      toast.success("Ponto excluído");
      setDialogOpen(false);
      setSelectedId(null);
    },
  });

  const handlePlacePoint = (x: number, y: number) => {
    setPendingCoords({ x, y });
    setEditPoint(null);
    setDialogOpen(true);
    setIsPlacing(false);
  };

  const handleClickPoint = (point: MapPoint) => {
    setSelectedId(point.id);
  };

  const handleEditPoint = (point: MapPoint) => {
    setEditPoint(point);
    setPendingCoords(null);
    setDialogOpen(true);
  };

  const handleSave = (data: { id?: string; name: string; description: string; point_type: PointType; x: number; y: number; product_id: string | null; is_active: boolean }) => {
    const coords = pendingCoords ?? { x: data.x, y: data.y };
    saveMutation.mutate({ ...data, ...coords });
  };

  const filteredPoints = points.filter((p) => {
    if (filterType !== "all" && p.point_type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen">
      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Mapa
            </h2>
            <Button
              size="sm"
              variant={isPlacing ? "destructive" : "default"}
              onClick={() => setIsPlacing(!isPlacing)}
            >
              {isPlacing ? "Cancelar" : <><Plus className="h-4 w-4 mr-1" /> Ponto</>}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge
              variant={filterType === "all" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilterType("all")}
            >
              Todos
            </Badge>
            {Object.entries(pointTypeConfig).map(([k, v]) => (
              <Badge
                key={k}
                variant={filterType === k ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setFilterType(k)}
              >
                {v.icon} {v.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPoints.map((p) => {
            const cfg = pointTypeConfig[p.point_type] || pointTypeConfig.waterfall;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  selectedId === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                }`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="text-base">{cfg.icon}</span>
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <button
                  className="p-1 hover:bg-muted rounded"
                  onClick={(e) => { e.stopPropagation(); handleEditPoint(p); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  className="p-1 hover:bg-destructive/10 rounded"
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            );
          })}
          {filteredPoints.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhum ponto encontrado
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapCanvas
          points={points}
          isPlacing={isPlacing}
          onPlacePoint={handlePlacePoint}
          onClickPoint={handleClickPoint}
          selectedId={selectedId}
        />
      </div>

      <MapPointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        point={
          editPoint
            ? { ...editPoint, description: editPoint.description ?? "" }
            : pendingCoords
            ? { name: "", description: "", point_type: "waterfall" as PointType, ...pendingCoords, product_id: null, is_active: true }
            : null
        }
        onSave={handleSave}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
