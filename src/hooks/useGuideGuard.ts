import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useGuideGuard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isGuide, setIsGuide] = useState<boolean | null>(null);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/");
      return;
    }

    (async () => {
      // 1. Verify if user is mapped to 'guide' or 'admin' role
      const { data: isGuideRole } = await db.rpc("has_role", { _user_id: user.id, _role: "guide" });
      const { data: isAdminRole } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
      
      if (!isGuideRole && !isAdminRole) {
        navigate("/");
        setChecking(false);
        return;
      }

      // 2. Fetch their specific guide_id from the guides table using the user_id FK
      const { data: guideData } = await db
        .from("guides")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!guideData && !isAdminRole) {
        console.error("Guia aprovado mas não encontrado na tabela de perfis de guias.");
        navigate("/");
        setChecking(false);
        return;
      }

      // If admin and no guide profile found, use a mock ID for previewing UI
      setGuideId(guideData?.id || "preview-admin-mode");
      setIsGuide(true);
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  return { isGuide, guideId, checking };
}

export function useIsGuide() {
  const { user, loading } = useAuth();
  const [isGuide, setIsGuide] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    db.rpc("has_role", { _user_id: user.id, _role: "guide" }).then(
      ({ data: isGuideRole }: { data: boolean | null }) => {
        setIsGuide(!!isGuideRole);
      }
    );
  }, [user, loading]);

  return isGuide;
}
