import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useAdminGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/");
      return;
    }

    (async () => {
      const { data: roleOk, error } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error || !roleOk) {
        navigate("/");
        setChecking(false);
        return;
      }

      // Fetch allowed modules
      const { data: perms } = await db
        .from("admin_permissions")
        .select("allowed_modules")
        .eq("user_id", user.id)
        .maybeSingle();

      setAllowedModules(perms?.allowed_modules ?? []);
      setIsAdmin(true);
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  return { isAdmin, checking, allowedModules };
}

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    db.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(
      ({ data }: { data: boolean | null }) => {
        setIsAdmin(!!data);
      }
    );
  }, [user, loading]);

  return isAdmin;
}
