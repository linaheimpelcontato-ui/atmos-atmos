ALTER TABLE public.image_focal_points ADD COLUMN IF NOT EXISTS scale real DEFAULT 1;
ALTER TABLE public.image_focal_points ADD COLUMN IF NOT EXISTS scale_mobile real DEFAULT 1;