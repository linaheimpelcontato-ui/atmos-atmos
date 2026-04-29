
-- Shift existing B2C stages positions up by 1
UPDATE public.pipeline_stages SET position = position + 1 WHERE segment = 'b2c';

-- Shift existing B2B stages positions up by 1
UPDATE public.pipeline_stages SET position = position + 1 WHERE segment = 'b2b';

-- Insert "Aguardando Atendimento" at position 0 for both segments
INSERT INTO public.pipeline_stages (name, segment, position, color)
VALUES 
  ('Aguardando Atendimento', 'b2c', 0, '#ef4444'),
  ('Aguardando Atendimento', 'b2b', 0, '#ef4444');
