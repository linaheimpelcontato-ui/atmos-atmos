ALTER TABLE public.image_focal_points
  ADD COLUMN IF NOT EXISTS rotation real DEFAULT 0;