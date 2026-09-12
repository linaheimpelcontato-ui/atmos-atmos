-- LOCAL disposable database only. All fixtures roll back.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.force_insert(text,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Generic privileged insert RPC is still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN
    ('trg_sync_product_to_drafts', 'on_auth_user_created_assign_admin') AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Unsafe legacy trigger is still active';
  END IF;
END $$;

CREATE TEMP TABLE snapshot_context(admin_id uuid, product_id uuid, proposal_id uuid, item_id uuid);
INSERT INTO snapshot_context VALUES(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
INSERT INTO auth.users(id, email) SELECT admin_id, admin_id::text || '@example.invalid' FROM snapshot_context;
INSERT INTO public.user_roles(user_id, role) SELECT admin_id, 'admin' FROM snapshot_context;
GRANT SELECT ON snapshot_context TO authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM snapshot_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text FROM snapshot_context), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.products(id,name,type,unit_price,cost_price,variables)
SELECT product_id,'LOCAL snapshot fixture','experience',100,80,'{"comissao":10}' FROM snapshot_context;
INSERT INTO public.proposals(id,title,status,segment,subtotal,total,num_people,num_days)
SELECT proposal_id,'LOCAL negotiated proposal','draft','b2b',2000,2000,20,1 FROM snapshot_context;
INSERT INTO public.proposal_day_items(id,proposal_id,catalog_item_id,day_number,category,item_name,value,quantity,cost_price,commission_percent,item_index)
SELECT item_id,proposal_id,product_id,1,'Experiências','Negotiated fixture',100,20,0,5,0 FROM snapshot_context;
UPDATE public.products SET unit_price=999,cost_price=777,variables='{"comissao":99}'
WHERE id=(SELECT product_id FROM snapshot_context);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.proposal_day_items WHERE id=(SELECT item_id FROM snapshot_context)
    AND value=100 AND cost_price=0 AND commission_percent=5 AND quantity=20) THEN
    RAISE EXCEPTION 'Catalog changed the negotiated proposal snapshot';
  END IF;
  IF (SELECT total FROM public.proposals WHERE id=(SELECT proposal_id FROM snapshot_context)) IS DISTINCT FROM 2000 THEN
    RAISE EXCEPTION 'Catalog changed the saved total';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
