-- Local disposable DB only; no binary upload or deletion is performed.
BEGIN;
-- Match the Storage API transaction flag so this fixture tests RLS, not
-- the platform guard against direct SQL deletion. All metadata is rolled back.
SELECT set_config('storage.allow_delete_query','true',true);
INSERT INTO storage.buckets(id,name,public) VALUES('assets','assets',true) ON CONFLICT(id) DO NOTHING;
INSERT INTO auth.users(id,email) VALUES('00000000-0000-4000-8000-000000009903','assets-admin@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-4000-8000-000000009903','admin');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009903',true);
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name) VALUES('assets','local-policy-fixture.txt');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009904',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('assets','local-unauthorized.txt');
  RAISE EXCEPTION 'Customer asset upload allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE storage.objects SET metadata='{"unauthorized":true}' WHERE bucket_id='assets' AND name='local-policy-fixture.txt';
 GET DIAGNOSTICS n=ROW_COUNT;IF n<>0 THEN RAISE EXCEPTION 'Customer asset overwrite allowed'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='assets' AND name='local-policy-fixture.txt';
 GET DIAGNOSTICS n=ROW_COUNT;IF n<>0 THEN RAISE EXCEPTION 'Customer asset deletion allowed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='assets' AND name='local-policy-fixture.txt') THEN RAISE EXCEPTION 'Public media read lost'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
