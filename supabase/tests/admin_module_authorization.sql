-- Run only in the disposable atmos_module_auth_test database after migration24.
-- Self-contained fixtures; every DDL/DML change, including legacy simulation, rolls back.
BEGIN;
CREATE TEMP TABLE module_users(label text PRIMARY KEY,id uuid DEFAULT gen_random_uuid());
INSERT INTO module_users(label) VALUES ('full'),('all7'),('site'),('cadastros'),('b2c'),('b2b'),('financeiro'),('ferramentas'),('configuracoes'),('customer'),('customer2'),('guide'),('legacy');
INSERT INTO auth.users(id,email) SELECT id,id::text||'@example.invalid' FROM module_users;
INSERT INTO public.user_roles(user_id,role) SELECT id,'admin' FROM module_users WHERE label NOT IN ('customer','customer2','guide');
INSERT INTO public.admin_permissions(user_id,allowed_modules)
 SELECT id,CASE WHEN label='all7' THEN ARRAY['site','cadastros','b2c','b2b','financeiro','ferramentas','configuracoes'] ELSE ARRAY[label] END
 FROM module_users WHERE label NOT IN ('full','customer','customer2','guide','legacy');
-- Emulate an existing unknown value under the exact NOT VALID constraint.
-- Constraint definition is captured so this fixture does not duplicate production logic.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint
 WHERE conrelid='public.admin_permissions'::regclass AND conname='admin_permissions_known_modules';
 IF definition IS NULL THEN RAISE EXCEPTION 'Apply migration24 first'; END IF;
 ALTER TABLE public.admin_permissions DROP CONSTRAINT admin_permissions_known_modules;
 INSERT INTO public.admin_permissions(user_id,allowed_modules) SELECT id,ARRAY['all'] FROM module_users WHERE label='legacy';
 EXECUTE 'ALTER TABLE public.admin_permissions ADD CONSTRAINT admin_permissions_known_modules '||definition;
END $$;
CREATE TEMP TABLE module_rows(label text PRIMARY KEY,id uuid DEFAULT gen_random_uuid());
INSERT INTO module_rows(label) VALUES ('c'),('b'),('pc'),('pb'),('ic'),('ib'),('guide'),('product'),('transaction');
GRANT SELECT ON module_users,module_rows TO authenticated,anon;
CREATE FUNCTION pg_temp.mid(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM module_rows WHERE label=k $$;
CREATE FUNCTION pg_temp.login(k text) RETURNS void LANGUAGE plpgsql AS $$ DECLARE u uuid; BEGIN
 SELECT id INTO STRICT u FROM module_users WHERE label=k;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','email',u::text||'@example.invalid')::text,true);
END $$;
CREATE FUNCTION pg_temp.check_ok(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'MODULE ASSERTION: %',label; END IF;
END $$;
CREATE FUNCTION pg_temp.denied(command text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
 RAISE EXCEPTION 'Expected 42501: %',command;
END $$;
CREATE FUNCTION pg_temp.zero_rows(command text) RETURNS void LANGUAGE plpgsql AS $$ DECLARE n int; BEGIN
 EXECUTE command; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Unauthorized mutation affected % rows: %',n,command; END IF;
END $$;
INSERT INTO public.prospects(id,name,email,segment) VALUES
 (pg_temp.mid('c'),'MODULE C',(SELECT id::text||'@example.invalid' FROM module_users WHERE label='customer'),'b2c'),
 (pg_temp.mid('b'),'MODULE B','module-b@example.invalid','b2b');
INSERT INTO public.guides(id,name,user_id) SELECT pg_temp.mid('guide'),'MODULE GUIDE',id FROM module_users WHERE label='guide';
INSERT INTO public.products(id,name,type) VALUES(pg_temp.mid('product'),'MODULE PRODUCT','experience');
INSERT INTO public.proposals(id,title,segment,prospect_id,guide_id,status,total,num_people,num_days,atmos_service) VALUES
 (pg_temp.mid('pc'),'MODULE C','b2c',pg_temp.mid('c'),pg_temp.mid('guide'),'sent',100,1,1,'{}'),
 (pg_temp.mid('pb'),'MODULE B','b2b',pg_temp.mid('b'),null,'approved',200,1,1,'{}');
INSERT INTO public.proposal_day_items(id,proposal_id,day_number,item_index,category,item_name,value,quantity) VALUES
 (pg_temp.mid('ic'),pg_temp.mid('pc'),1,0,'Experiências','MODULE C',100,1),
 (pg_temp.mid('ib'),pg_temp.mid('pb'),1,0,'Experiências','MODULE B',200,1);
INSERT INTO public.financial_transactions(id,type,description,amount,due_date,status)
 VALUES(pg_temp.mid('transaction'),'payable','MODULE expense',5,current_date,'pending');
INSERT INTO public.email_templates(title,subject,body,segment) VALUES('MODULE C','s','b','b2c'),('MODULE B','s','b','b2b');
INSERT INTO public.sales_goals(period_start,segment,goal_amount) VALUES(current_date,'b2c',10),(current_date,'b2b',20);
INSERT INTO public.site_text_overrides(pathname,language,element_selector,device,original_text,content)
 VALUES('/module-test','pt','#module-test','all','before','after');

SET LOCAL ROLE authenticated;
SELECT pg_temp.login('b2c');
DO $$ DECLARE m text; BEGIN
 FOREACH m IN ARRAY ARRAY['site','cadastros','b2c','b2b','financeiro','ferramentas','configuracoes'] LOOP
  PERFORM pg_temp.check_ok(public.has_admin_module(m)=(m='b2c'),'B2C module helper: '||m);
 END LOOP;
END $$;
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=1,'B2C proposal read scope');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposal_day_items)=1,'B2C child read scope');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.prospects)=1,'B2C prospect scope');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.products)=1,'B2C shared catalogue');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.email_templates)=1,'B2C templates');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.financial_transactions)=0,'B2C no finance');
UPDATE public.proposals SET notes='B2C allowed' WHERE id=pg_temp.mid('pc');
SELECT pg_temp.check_ok((SELECT notes='B2C allowed' FROM public.proposals WHERE id=pg_temp.mid('pc')),'B2C own update');
SELECT pg_temp.zero_rows($q$UPDATE public.proposals SET notes='BAD' WHERE id=pg_temp.mid('pb')$q$);
SELECT pg_temp.zero_rows($q$DELETE FROM public.proposals WHERE id=pg_temp.mid('pb')$q$);
SELECT pg_temp.denied($q$UPDATE public.proposals SET segment='b2b' WHERE id=pg_temp.mid('pc')$q$);
SELECT pg_temp.denied($q$UPDATE public.proposals SET prospect_id=pg_temp.mid('b') WHERE id=pg_temp.mid('pc')$q$);
SELECT pg_temp.denied($q$UPDATE public.proposal_day_items SET proposal_id=pg_temp.mid('pb') WHERE id=pg_temp.mid('ic')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.proposals(title,segment) VALUES('BAD','b2b')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.proposal_day_items(proposal_id,day_number,category,item_name) VALUES(pg_temp.mid('pb'),2,'Experiências','BAD')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.products(name,type) VALUES('BAD','experience')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.financial_transactions(type,description,amount,due_date) VALUES('payable','BAD',1,current_date)$q$);
SELECT pg_temp.denied($q$SELECT public.generate_proposal_receivable(pg_temp.mid('pb'))$q$);
SELECT pg_temp.denied($q$SELECT public.save_proposal_cost_checks(pg_temp.mid('pc'),'[]','[]')$q$);
SELECT pg_temp.denied($q$SELECT public.save_public_proposal_edits(pg_temp.mid('pb'),'[]','[]')$q$);
SELECT public.save_public_proposal_edits(pg_temp.mid('pc'),'[]','[]');
SELECT public.save_proposal_bundle(pg_temp.mid('pc'),'{}',jsonb_build_array(jsonb_build_object('id',pg_temp.mid('ic'))),'[]','[]','[]','[]');
DO $$ DECLARE p uuid; BEGIN
 INSERT INTO public.proposals(title,segment,prospect_id) VALUES('MODULE disposable','b2c',pg_temp.mid('c')) RETURNING id INTO p;
 INSERT INTO public.proposal_day_items(proposal_id,day_number,category,item_name) VALUES(p,1,'Experiências','MODULE disposable');
 DELETE FROM public.proposals WHERE id=p;
 PERFORM pg_temp.check_ok(NOT EXISTS(SELECT 1 FROM public.proposals WHERE id=p),'B2C own insert/delete remains available');
 PERFORM pg_temp.check_ok(NOT EXISTS(SELECT 1 FROM public.proposal_day_items WHERE proposal_id=p),'Authorized parent delete cascades commercial child');
END $$;
SELECT pg_temp.denied($q$SELECT public.save_proposal_bundle(pg_temp.mid('pb'),'{}','[]','[]','[]','[]','[]')$q$);
SELECT pg_temp.denied($q$SELECT public.save_proposal_bundle(NULL,'{"segment":"b2b"}','[]','[]','[]','[]','[]')$q$);
SELECT pg_temp.denied($q$SELECT public.require_admin_bundle_access(pg_temp.mid('pc'),'{}','[{"amount":1}]')$q$);
SELECT pg_temp.denied($q$SELECT public.get_guide_portal_context(pg_temp.mid('guide'))$q$);
SELECT pg_temp.check_ok(public.get_public_proposal((SELECT share_token::text FROM public.proposals WHERE id=pg_temp.mid('pc'))) IS NOT NULL,'B2C own draft preview');

SELECT pg_temp.login('b2b');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=1,'B2B proposal read scope');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposal_day_items)=1,'B2B child read scope');
SELECT pg_temp.zero_rows($q$DELETE FROM public.proposal_day_items WHERE id=pg_temp.mid('ic')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.prospects(name,segment) VALUES('BAD','b2c')$q$);
SELECT pg_temp.denied($q$UPDATE public.proposals SET segment='b2c' WHERE id=pg_temp.mid('pb')$q$);
SELECT pg_temp.denied($q$SELECT public.save_public_proposal_edits(pg_temp.mid('pc'),'[]','[]')$q$);

SELECT pg_temp.login('financeiro');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=2,'Finance reads both segments');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposal_day_items)=2,'Finance reads both child sets');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.financial_transactions)=1,'Finance read');
UPDATE public.financial_transactions SET amount=6 WHERE id=pg_temp.mid('transaction');
SELECT pg_temp.zero_rows($q$UPDATE public.proposals SET total=999 WHERE id=pg_temp.mid('pc')$q$);
SELECT pg_temp.denied($q$SELECT public.save_proposal_bundle(pg_temp.mid('pc'),'{}','[]','[]','[]','[]','[]')$q$);
SELECT public.generate_proposal_receivable(pg_temp.mid('pb'));
SELECT public.save_proposal_cost_checks(pg_temp.mid('pc'),'[]','[]');
SELECT public.save_proposal_cost_checks(pg_temp.mid('pc'),jsonb_build_array(jsonb_build_object(
 'item_id',i.id,'actual_cost',15,'is_verified',true,'expected_snapshot',public.cost_item_identity(i))), '[]')
 FROM public.proposal_day_items i WHERE id=pg_temp.mid('ic');
SELECT pg_temp.check_ok((SELECT actual_cost=15 AND is_verified FROM public.proposal_cost_checks WHERE proposal_id=pg_temp.mid('pc')),'Finance actual cost RPC write');
SELECT pg_temp.denied($q$INSERT INTO public.products(name,type) VALUES('BAD','experience')$q$);
-- Foreign-key SET NULL runs as table owner; its financial write still needs finance.
SELECT pg_temp.login('b2b');
SELECT pg_temp.denied($q$DELETE FROM public.proposals WHERE id=pg_temp.mid('pb')$q$);
SELECT pg_temp.check_ok(EXISTS(SELECT 1 FROM public.proposals WHERE id=pg_temp.mid('pb')),'Denied cascade preserves proposal');

SELECT pg_temp.login('cadastros');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.prospects)=2,'Cadastros CRM both segments');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Cadastros no proposal access');
-- Deleting the CRM row must not clear a protected proposal.prospect_id through FK action.
SELECT pg_temp.denied($q$DELETE FROM public.prospects WHERE id=pg_temp.mid('c')$q$);
SELECT pg_temp.check_ok(EXISTS(SELECT 1 FROM public.prospects WHERE id=pg_temp.mid('c')),'Denied CRM cascade preserves prospect');
UPDATE public.products SET name='MODULE PRODUCT edited' WHERE id=pg_temp.mid('product');
SELECT public.get_guide_portal_context(pg_temp.mid('guide'));
SELECT pg_temp.check_ok(public.get_guide_portal_proposals(pg_temp.mid('guide'))='[]'::jsonb,'Cadastros preview cannot expose unrelated proposals');
-- Account binding is delegation of portal access, not ordinary catalogue editing.
SELECT pg_temp.denied($q$UPDATE public.guides SET user_id=auth.uid() WHERE id=pg_temp.mid('guide')$q$);
SELECT pg_temp.denied($q$UPDATE public.guides SET user_id=(SELECT id FROM module_users WHERE label='customer2') WHERE id=pg_temp.mid('guide')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.guides(name,user_id) VALUES('BAD delegate',auth.uid())$q$);
SELECT pg_temp.denied($q$UPDATE public.prospects SET email=(SELECT id::text||'@example.invalid' FROM module_users WHERE label='customer2') WHERE id=pg_temp.mid('c')$q$);
SELECT pg_temp.check_ok((SELECT email=(SELECT id::text||'@example.invalid' FROM module_users WHERE label='customer') FROM public.prospects WHERE id=pg_temp.mid('c')),'Denied identity change preserves customer link');
-- A trusted legacy binding must also remain unable to bypass module checks.
RESET ROLE;
UPDATE public.guides SET user_id=(SELECT id FROM module_users WHERE label='cadastros') WHERE id=pg_temp.mid('guide');
SET LOCAL ROLE authenticated;
SELECT pg_temp.login('cadastros');
SELECT pg_temp.check_ok(public.get_guide_portal_proposals()='[]'::jsonb,'Cadastros self-bound guide does not bypass proposal modules');
RESET ROLE;
UPDATE public.guides SET user_id=(SELECT id FROM module_users WHERE label='guide') WHERE id=pg_temp.mid('guide');
SET LOCAL ROLE authenticated;
SELECT pg_temp.login('cadastros');
SELECT pg_temp.denied($q$SELECT public.generate_proposal_receivable(pg_temp.mid('pb'))$q$);

SELECT pg_temp.login('site');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Site no commercial rows');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.financial_transactions)=0,'Site no financial rows');
UPDATE public.site_text_overrides SET content='site edit' WHERE pathname='/module-test';
SELECT pg_temp.check_ok((SELECT content='site edit' FROM public.site_text_overrides WHERE pathname='/module-test'),'Site write');
SELECT pg_temp.denied($q$INSERT INTO public.prospects(name,segment) VALUES('BAD','b2c')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.proposals(title,segment) VALUES('BAD fake segment','site')$q$);

SELECT pg_temp.login('ferramentas');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.sales_goals)=2,'Tools goals');
UPDATE public.sales_goals SET goal_amount=30;
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Tools no blanket proposal access');
SELECT pg_temp.zero_rows($q$UPDATE public.site_text_overrides SET content='BAD' WHERE pathname='/module-test'$q$);

SELECT pg_temp.login('configuracoes');
SELECT pg_temp.check_ok(NOT public.is_full_admin(auth.uid()),'Settings not full admin');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Settings no proposals');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.admin_permissions)=1,'Settings only own permission row');
SELECT pg_temp.denied($q$UPDATE public.admin_permissions SET allowed_modules='{}' WHERE user_id=auth.uid()$q$);

SELECT pg_temp.login('legacy');
SELECT pg_temp.check_ok(NOT public.is_full_admin(auth.uid()) AND NOT public.has_admin_module('b2c'),'Legacy all fails closed');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Legacy all no proposals');
SELECT pg_temp.login('full');
DO $$ BEGIN
 BEGIN UPDATE public.admin_permissions SET allowed_modules=ARRAY['unknown'] WHERE user_id=(SELECT id FROM module_users WHERE label='site');
 EXCEPTION WHEN check_violation THEN RETURN; END;
 RAISE EXCEPTION 'New unknown module accepted';
END $$;
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=2,'Full admin preserved');
SELECT pg_temp.check_ok((SELECT prospect_id=pg_temp.mid('c') FROM public.proposals WHERE id=pg_temp.mid('pc')),'Denied cascade preserves proposal CRM link');
SELECT public.get_guide_portal_context(pg_temp.mid('guide'));
SELECT public.save_public_proposal_edits(pg_temp.mid('pc'),'[]','[]');
UPDATE public.proposals SET status='sent' WHERE id=pg_temp.mid('pc');
SELECT pg_temp.login('all7');
SELECT pg_temp.check_ok(NOT public.is_full_admin(auth.uid()),'All seven is not team administrator');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=2,'All seven commercial access');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.financial_transactions)=2,'All seven finance access');
SELECT pg_temp.denied($q$UPDATE public.admin_permissions SET allowed_modules='{}' WHERE user_id=auth.uid()$q$);

-- Customer policies remain useful independently of admin module checks.
SELECT pg_temp.login('customer');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.profiles)=1,'Customer own profile');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.proposals)=0,'Customer cannot query proposals directly');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.prospects)=0,'Customer cannot query CRM');
INSERT INTO public.quote_requests(user_id,user_name,user_email) VALUES(auth.uid(),'MODULE customer',auth.uid()::text||'@example.invalid');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.quote_requests WHERE user_id=auth.uid())=1,'Customer own request');
SELECT pg_temp.denied($q$SELECT public.save_proposal_cost_checks(pg_temp.mid('pc'),'[]','[]')$q$);
SELECT pg_temp.denied($q$SELECT public.get_guide_portal_context(pg_temp.mid('guide'))$q$);
SELECT pg_temp.login('guide');
SELECT pg_temp.check_ok(public.get_guide_portal_context()->>'guide_id'=pg_temp.mid('guide')::text,'Guide own context preserved');
SELECT pg_temp.check_ok(jsonb_array_length(public.get_guide_portal_proposals())=1,'Actual guide assigned itinerary remains visible');
INSERT INTO public.guide_trip_costs(proposal_id,guide_id,description,amount) VALUES(pg_temp.mid('pc'),pg_temp.mid('guide'),'MODULE guide meal',10);
SELECT pg_temp.check_ok((SELECT count(*) FROM public.guide_trip_costs)=1,'Guide own costs preserved');
SELECT pg_temp.denied($q$INSERT INTO public.guide_trip_costs(proposal_id,guide_id,description,amount) VALUES(pg_temp.mid('pb'),pg_temp.mid('guide'),'BAD',10)$q$);

RESET ROLE;
-- Keep token in a temp table accessible to all roles without exposing proposal rows.
CREATE TEMP TABLE module_token AS SELECT share_token::text token FROM public.proposals WHERE id=pg_temp.mid('pc');
GRANT SELECT ON module_token TO authenticated,anon;
SET LOCAL ROLE authenticated;
SELECT pg_temp.login('b2b');
SELECT pg_temp.check_ok(public.get_public_proposal((SELECT token FROM module_token)) IS NULL,'B2B cannot preview B2C draft via public RPC');
SELECT pg_temp.login('customer');
SELECT pg_temp.check_ok(public.get_public_proposal((SELECT token FROM module_token)) IS NULL,'Customer cannot preview draft');
RESET ROLE;
UPDATE public.proposals SET published_at=now() WHERE id=pg_temp.mid('pc');
SET LOCAL ROLE authenticated;
SELECT pg_temp.login('customer');
SELECT pg_temp.check_ok(public.get_my_published_proposal_link() IS NOT NULL,'Original customer retains published proposal link');
SELECT pg_temp.login('customer2');
SELECT pg_temp.check_ok(public.get_my_published_proposal_link() IS NULL,'Control customer gained no proposal link through attempted email theft');
SELECT pg_temp.check_ok(public.get_guide_portal_context()->>'guide_id' IS NULL,'Control customer gained no guide binding');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{}',true);
SELECT pg_temp.check_ok(public.get_public_proposal((SELECT token FROM module_token)) IS NOT NULL,'Anon published proposal preserved');
SELECT pg_temp.check_ok((SELECT count(*) FROM public.site_text_overrides WHERE pathname='/module-test')=1,'Anon site content preserved');
INSERT INTO public.quote_requests(user_name,user_email) VALUES('MODULE anon','module-anon@example.invalid');
SELECT pg_temp.denied($q$SELECT public.has_admin_module('site')$q$);
RESET ROLE;
ROLLBACK;
