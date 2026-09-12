-- LOCAL only: public form -> segment-specific CRM, no outbound messages.
BEGIN;
DELETE FROM public.pipeline_stages; -- rollback; exercises absence of seeded stage UUIDs
SET LOCAL ROLE anon;
INSERT INTO public.quote_requests(user_name,user_email,user_phone,answers)
VALUES ('LOCAL traveler',' Segment-Test@Example.Invalid ','+55 (11) 0000-0000','{"groupSize":20}');
INSERT INTO public.imersao_leads(nome,email,telefone,empresa,cargo,tipo_grupo,num_participantes,quando)
VALUES ('LOCAL organizer','segment-test@example.invalid','551100000000','LOCAL company','Organizer','corporate','20','flexible');
-- Retry/case/phone format variants must not duplicate the CRM person in a segment.
INSERT INTO public.quote_requests(user_name,user_email,user_phone)
VALUES ('LOCAL repeated','SEGMENT-TEST@example.invalid','551100000000');
INSERT INTO public.imersao_leads(nome,email,telefone,empresa,cargo,tipo_grupo,num_participantes,quando)
VALUES ('LOCAL repeated','SEGMENT-TEST@example.invalid','+55 (11) 0000-0000','LOCAL company','Organizer','corporate','20','flexible');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.prospects) THEN RAISE EXCEPTION 'Public form submitter can read CRM'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.prospects WHERE email='segment-test@example.invalid') IS DISTINCT FROM 2::bigint THEN
    RAISE EXCEPTION 'B2B/B2C isolation or deduplication failed';
  END IF;
  IF (SELECT count(DISTINCT segment) FROM public.prospects WHERE email='segment-test@example.invalid') IS DISTINCT FROM 2::bigint THEN
    RAISE EXCEPTION 'Same person cannot enter both business segments';
  END IF;
  IF EXISTS (SELECT 1 FROM public.prospects WHERE email='segment-test@example.invalid' AND stage_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Unconfigured pipeline acquired a fabricated stage';
  END IF;
END $$;
INSERT INTO public.pipeline_stages(name,position,segment) VALUES ('Aguardando Orçamento',0,'b2b');
SET LOCAL ROLE anon;
INSERT INTO public.imersao_leads(nome,email,telefone,empresa,cargo,tipo_grupo,num_participantes,quando)
VALUES ('LOCAL staged','stage-test@example.invalid','551100000001','LOCAL company','Organizer','corporate','20','flexible');
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.prospects p JOIN public.pipeline_stages s ON s.id=p.stage_id
    WHERE p.email='stage-test@example.invalid' AND s.segment=p.segment AND p.segment='b2b') THEN
    RAISE EXCEPTION 'Request did not reach the configured segment pipeline';
  END IF;
END $$;
ROLLBACK;
