-- Local disposable DB only. Public content is readable, publishing is admin-only.
BEGIN;
INSERT INTO auth.users(id,email) VALUES('00000000-0000-4000-8000-000000009901','site-text-admin@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-4000-8000-000000009901','admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009901',true);
INSERT INTO public.site_text_overrides(pathname,language,element_selector,device,original_text,content)
VALUES('/local-fixture','pt','text-fixture','desktop','Original','Primeiro texto'),
('/local-fixture','en','text-fixture','desktop','Original','English text'),
('/local-fixture','pt','text-fixture','mobile','Original','Texto mobile');
INSERT INTO public.site_text_overrides(pathname,language,element_selector,device,original_text,content)
VALUES('/local-fixture','pt','text-fixture','desktop','Original','Segundo texto')
ON CONFLICT(pathname,language,element_selector,device) DO UPDATE SET content=excluded.content;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.site_text_overrides WHERE pathname='/local-fixture')<>3 THEN RAISE EXCEPTION 'Public scoped text missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_text_overrides WHERE pathname='/local-fixture' AND language='pt' AND device='desktop' AND content='Segundo texto') THEN RAISE EXCEPTION 'Text update did not persist'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009902',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
 UPDATE public.site_text_overrides SET content='Unauthorized' WHERE pathname='/local-fixture';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Customer can overwrite published site text'; END IF;
 BEGIN
  INSERT INTO public.site_text_overrides(pathname,language,element_selector,device,original_text,content)
  VALUES('/local-fixture','pt','text-attacker','all','Original','Unauthorized');
  RAISE EXCEPTION 'Customer can publish site text';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;
