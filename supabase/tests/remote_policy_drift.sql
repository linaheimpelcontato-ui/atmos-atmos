-- Disposable DB only. Exercise actual reads/writes, not policy names alone.
BEGIN;
CREATE TEMP TABLE drift_context(admin_id uuid, customer_id uuid, row_id uuid);
INSERT INTO drift_context VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
GRANT SELECT ON drift_context TO authenticated, anon;
INSERT INTO auth.users(id,email) SELECT admin_id,admin_id::text||'@example.invalid' FROM drift_context;
INSERT INTO auth.users(id,email) SELECT customer_id,customer_id::text||'@example.invalid' FROM drift_context;
INSERT INTO public.user_roles(user_id,role) SELECT admin_id,'admin' FROM drift_context;
SELECT set_config('request.jwt.claim.sub',(SELECT admin_id::text FROM drift_context),true);
SET LOCAL ROLE authenticated;
INSERT INTO public.products(id,name) SELECT row_id,'Drift fixture' FROM drift_context;
INSERT INTO public.guides(id,name) SELECT row_id,'Drift fixture' FROM drift_context;
INSERT INTO public.suppliers(id,name) SELECT row_id,'Drift fixture' FROM drift_context;
INSERT INTO public.sellers(id,name) SELECT row_id,'Drift fixture' FROM drift_context;
INSERT INTO public.prospects(id,name,segment) SELECT row_id,'Drift fixture','b2b' FROM drift_context;
INSERT INTO public.proposals(id,title,segment) SELECT row_id,'Drift fixture','b2b' FROM drift_context;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ DECLARE t text; n int; BEGIN
  FOREACH t IN ARRAY ARRAY['products','guides','suppliers','sellers','prospects','proposals'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id=(SELECT row_id FROM drift_context)',t) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'Anonymous internal read allowed: %',t; END IF;
  END LOOP;
  UPDATE public.guides SET user_id=(SELECT customer_id FROM drift_context)
    WHERE id=(SELECT row_id FROM drift_context);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Customer can claim a guide identity'; END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub',(SELECT customer_id::text FROM drift_context),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE t text; n int; field text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','guides','suppliers','sellers','prospects','proposals'] LOOP
    field:=CASE WHEN t='proposals' THEN 'title' ELSE 'name' END;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE id=(SELECT row_id FROM drift_context)',t) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'Customer internal read allowed: %',t; END IF;
    EXECUTE format('UPDATE public.%I SET %I=''Unauthorized change'' WHERE id=(SELECT row_id FROM drift_context)',t,field);
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Customer update allowed: %',t; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE id=(SELECT row_id FROM drift_context)',t);
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>0 THEN RAISE EXCEPTION 'Customer delete allowed: %',t; END IF;
    BEGIN
      IF t IN ('prospects','proposals') THEN
        EXECUTE format('INSERT INTO public.%I(%I,segment) VALUES(''Unauthorized insert'',''b2b'')',t,field);
      ELSE
        EXECUTE format('INSERT INTO public.%I(%I) VALUES(''Unauthorized insert'')',t,field);
      END IF;
      RAISE EXCEPTION 'Customer insert allowed: %',t;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  UPDATE public.guides SET user_id=(SELECT customer_id FROM drift_context)
    WHERE id=(SELECT row_id FROM drift_context);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Customer can claim a guide identity'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT admin_id::text FROM drift_context),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE t text; n int; field text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','guides','suppliers','sellers','prospects','proposals'] LOOP
    field:=CASE WHEN t='proposals' THEN 'title' ELSE 'name' END;
    EXECUTE format('UPDATE public.%I SET %I=''Authorized change'' WHERE id=(SELECT row_id FROM drift_context)',t,field);
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Admin update lost: %',t; END IF;
  END LOOP;
END $$;
RESET ROLE;
ROLLBACK;
