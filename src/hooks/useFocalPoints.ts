import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface FocalPoint {
  image_path: string;
  focal_x: number;
  focal_y: number;
  focal_x_mobile: number;
  focal_y_mobile: number;
  rotation: number;
  scale: number;
  scale_mobile: number;
}

export function useFocalPoints() {
  return useQuery<FocalPoint[]>({
    queryKey: ["focal-points"],
    queryFn: async () => {
      const { data, error } = await db
        .from("image_focal_points")
        .select("image_path, focal_x, focal_y, focal_x_mobile, focal_y_mobile, rotation, scale, scale_mobile");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFocalPosition(imagePath: string): string {
  const { data } = useFocalPoints();
  if (!data) return "center center";
  const fp = data.find((f) => imagePath.includes(f.image_path));
  if (!fp) return "center center";
  return `${fp.focal_x}% ${fp.focal_y}%`;
}

export async function saveFocalPoint(
  imagePath: string,
  focalX: number,
  focalY: number,
  device: "desktop" | "mobile" = "desktop",
  rotation?: number,
  scale?: number
) {
  const payload: Record<string, unknown> = {
    image_path: imagePath,
    updated_at: new Date().toISOString(),
  };

  if (device === "mobile") {
    payload.focal_x_mobile = focalX;
    payload.focal_y_mobile = focalY;
    if (scale !== undefined) payload.scale_mobile = scale;
  } else {
    payload.focal_x = focalX;
    payload.focal_y = focalY;
    if (scale !== undefined) payload.scale = scale;
  }

  if (rotation !== undefined) {
    payload.rotation = rotation;
  }

  const { error } = await db
    .from("image_focal_points")
    .upsert(payload, { onConflict: "image_path" });
  if (error) throw error;
}

export function useSaveFocalPoint() {
  const qc = useQueryClient();
  return async (
    imagePath: string,
    focalX: number,
    focalY: number,
    device: "desktop" | "mobile" = "desktop",
    rotation?: number,
    scale?: number
  ) => {
    await saveFocalPoint(imagePath, focalX, focalY, device, rotation, scale);
    qc.invalidateQueries({ queryKey: ["focal-points"] });
  };
}
