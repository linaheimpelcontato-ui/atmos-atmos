ALTER TABLE public.image_focal_points
  ADD COLUMN IF NOT EXISTS focal_x_mobile real DEFAULT 50,
  ADD COLUMN IF NOT EXISTS focal_y_mobile real DEFAULT 50;