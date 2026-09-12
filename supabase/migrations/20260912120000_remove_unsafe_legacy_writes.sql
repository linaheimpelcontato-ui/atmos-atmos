-- Unused import RPC bypassed RLS and disabled integrity triggers for arbitrary
-- public tables. Imports must use the table's normal policies and constraints.
DROP FUNCTION IF EXISTS public.force_insert(text, jsonb);

-- Catalog prices are references. A saved proposal is a negotiated snapshot:
-- silently refreshing it changes costs, suppliers and prices without updating
-- totals or revalidating checked costs. New selections still use the catalog.
DROP TRIGGER IF EXISTS trg_sync_product_to_drafts ON public.products;
DROP FUNCTION IF EXISTS public.sync_product_to_draft_proposals();

-- An unverified signup email must never provision an administrator. Existing
-- roles remain unchanged; provision future admins through a trusted admin path.
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
DROP FUNCTION IF EXISTS public.assign_admin_role_on_signup();

-- Supabase's default privileges can grant anon explicitly. Revoking PUBLIC
-- alone does not remove that grant, as the local ACL test demonstrated.
REVOKE ALL ON FUNCTION public.get_my_published_proposal_link() FROM PUBLIC, anon;
