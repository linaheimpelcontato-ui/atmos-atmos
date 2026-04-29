
ALTER TABLE public.site_overrides ADD COLUMN device text NOT NULL DEFAULT 'all';
ALTER TABLE public.site_overrides DROP CONSTRAINT IF EXISTS site_overrides_element_selector_key;
ALTER TABLE public.site_overrides ADD CONSTRAINT site_overrides_selector_device_key UNIQUE(element_selector, device);
