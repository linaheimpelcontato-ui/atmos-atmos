import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useAdminGuard() {
  const { user, loading } = useAuth();
  // Auth events can replace the User object without changing the signed-in identity.
  const userId = user?.id;
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsAdmin(null);
    setChecking(true);
    setAllowedModules([]);
    if (loading) return;

    if (!userId) {
      setIsAdmin(false);
      setChecking(false);
      navigate("/");
      return;
    }

    (async () => {
      const { data: roleOk, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (cancelled) return;
      if (error || !roleOk) {
        setIsAdmin(false);
        navigate("/");
        setChecking(false);
        return;
      }

      // Fetch allowed modules
      const { data: perms, error: permissionsError } = await db
        .from("admin_permissions")
        .select("allowed_modules")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      // Only an absent row means full access; a failed read must never mean full.
      if (permissionsError) {
        setIsAdmin(false);
        setChecking(false);
        navigate("/");
        return;
      }
      setAllowedModules(perms?.allowed_modules ?? []);
      setIsAdmin(true);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [userId, loading, navigate]);

  return { isAdmin, checking, allowedModules };
}

export function useIsAdmin() {
  const { user, loading } = useAuth();
  // Auth events can replace the User object without changing the signed-in identity.
  const userId = user?.id;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);
    if (loading || !userId) return;

    db.rpc("has_role", { _user_id: userId, _role: "admin" }).then(
      ({ data, error }: { data: boolean | null; error: unknown }) => {
        if (!cancelled) setIsAdmin(!error && data === true);
      }
    );
    return () => { cancelled = true; };
  }, [userId, loading]);

  return isAdmin;
}
