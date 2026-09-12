-- Team management requires a full administrator, never merely the settings module.
-- Missing permission row / empty array retains the UI's existing full-access meaning.
BEGIN;
CREATE FUNCTION public.is_full_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') AND NOT EXISTS (
    SELECT 1 FROM public.admin_permissions WHERE user_id = _user_id
      AND cardinality(allowed_modules) > 0
  );
$$;
REVOKE ALL ON FUNCTION public.is_full_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_full_admin(uuid) TO authenticated, service_role;

-- An actual row update serializes writers across both tables. At stronger isolation
-- a stale writer gets a serialization failure instead of counting an old snapshot.
CREATE TABLE public.admin_team_write_lock (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  version bigint NOT NULL DEFAULT 0
);
INSERT INTO public.admin_team_write_lock(singleton) VALUES (true);
ALTER TABLE public.admin_team_write_lock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_team_write_lock FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.lock_admin_team_writes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.admin_team_write_lock SET version = version + 1 WHERE singleton;
  -- Check after serialization, including statements RLS would otherwise silently filter.
  -- SQL maintenance/service-role remain trusted; they still obey last-full protection.
  IF current_setting('role', true) IN ('anon', 'authenticated')
    AND (auth.uid() IS NULL OR NOT public.is_full_admin(auth.uid())) THEN
    RAISE EXCEPTION 'A gestão de equipe exige administrador com acesso total' USING ERRCODE='42501';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.lock_admin_team_writes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER serialize_admin_permissions BEFORE INSERT OR UPDATE OR DELETE ON public.admin_permissions
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_admin_team_writes();
CREATE TRIGGER serialize_user_roles BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_admin_team_writes();

CREATE FUNCTION public.protect_last_full_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE losing_user uuid;
BEGIN
  IF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP <> 'INSERT' AND OLD.role = 'admin' AND public.is_full_admin(OLD.user_id) THEN
      IF TG_OP = 'DELETE' THEN losing_user := OLD.user_id;
      ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        losing_user := OLD.user_id;
      END IF;
    END IF;
  ELSIF TG_OP <> 'DELETE' THEN
    IF cardinality(NEW.allowed_modules) > 0 AND public.is_full_admin(NEW.user_id) THEN
      losing_user := NEW.user_id;
    END IF;
  END IF;
  IF losing_user IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.role = 'admin' AND r.user_id <> losing_user
      AND NOT EXISTS (SELECT 1 FROM public.admin_permissions p
        WHERE p.user_id = r.user_id AND cardinality(p.allowed_modules) > 0)
  ) THEN
    RAISE EXCEPTION 'Mantenha pelo menos um administrador com acesso total' USING ERRCODE='23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_last_full_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_full_admin_role BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_full_admin();
CREATE TRIGGER protect_full_admin_permissions BEFORE INSERT OR UPDATE OR DELETE ON public.admin_permissions
FOR EACH ROW EXECUTE FUNCTION public.protect_last_full_admin();

-- Rebuild the authorization policies on these two security tables only.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('admin_permissions','user_roles')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
  END LOOP;
END $$;
CREATE POLICY "Read own or full-admin permissions" ON public.admin_permissions FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_full_admin(auth.uid()));
CREATE POLICY "Read own or full-admin roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin permission insert" ON public.admin_permissions FOR INSERT TO authenticated
WITH CHECK (public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin permission update" ON public.admin_permissions FOR UPDATE TO authenticated
USING (public.is_full_admin(auth.uid())) WITH CHECK (public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin permission delete" ON public.admin_permissions FOR DELETE TO authenticated
USING (public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin role insert" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin role update" ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_full_admin(auth.uid())) WITH CHECK (public.is_full_admin(auth.uid()));
CREATE POLICY "Full admin role delete" ON public.user_roles FOR DELETE TO authenticated
USING (public.is_full_admin(auth.uid()));
-- TRUNCATE is not subject to RLS or the row/statement DML guards above.
REVOKE ALL ON public.admin_permissions, public.user_roles FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.admin_permissions, public.user_roles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions, public.user_roles TO authenticated;

CREATE FUNCTION public.manage_admin_team(p_action text, p_user_id uuid, p_allowed_modules text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.admin_team_write_lock SET version=version+1 WHERE singleton;
  IF auth.uid() IS NULL OR NOT public.is_full_admin(auth.uid()) THEN
    RAISE EXCEPTION 'A gestão de equipe exige administrador com acesso total' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_action NOT IN ('add','remove') OR p_action IS NULL THEN
    RAISE EXCEPTION 'Ação ou usuário inválido' USING ERRCODE='22023';
  END IF;
  IF p_action='add' THEN
    IF p_allowed_modules IS NULL OR array_ndims(p_allowed_modules)>1 OR EXISTS (
      SELECT 1 FROM unnest(p_allowed_modules) m WHERE m IS NULL OR btrim(m)='' OR length(m)>100
    ) THEN RAISE EXCEPTION 'Informe explicitamente os módulos; lista vazia concede acesso total' USING ERRCODE='22023'; END IF;
    -- One transaction: never expose an admin role before its restrictions exist.
    INSERT INTO public.admin_permissions(user_id,allowed_modules) VALUES(p_user_id,p_allowed_modules)
      ON CONFLICT(user_id) DO UPDATE SET allowed_modules=EXCLUDED.allowed_modules;
    IF NOT public.has_role(p_user_id,'admin') THEN
      INSERT INTO public.user_roles(user_id,role) VALUES(p_user_id,'admin');
    END IF;
  ELSE
    IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'Você não pode remover a si mesmo' USING ERRCODE='22023'; END IF;
    DELETE FROM public.user_roles WHERE user_id=p_user_id AND role='admin';
    IF NOT FOUND THEN RAISE EXCEPTION 'Administrador não encontrado' USING ERRCODE='P0002'; END IF;
    DELETE FROM public.admin_permissions WHERE user_id=p_user_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'user_id',p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.manage_admin_team(text,uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_admin_team(text,uuid,text[]) TO authenticated;
COMMIT;
