import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GuideTrip } from "@/lib/guidePortal";
const db = supabase as any;
interface GuideContext { is_admin: boolean; is_preview: boolean; guide_id: string | null; name: string | null }
function useGuideAccess(preview: string | null) {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ['guide-access', user?.id, preview], enabled: !loading && !!user,
    queryFn: async (): Promise<GuideContext> => {
      if (preview && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(preview)) throw new Error('Guia de prévia inválido.');
      const { data, error } = await db.rpc('get_guide_portal_context', { p_preview_guide_id: preview });
      if (error) throw error;
      return data;
    }, retry: false,
  });
  return { ...query, user, authLoading: loading, context: user ? query.data : undefined };
}
export function useGuideGuard() {
  const location = useLocation();
  const preview = new URLSearchParams(location.search).get('guide');
  const access = useGuideAccess(preview);
  const navigate = useNavigate();
  const isGuide = !!(access.context?.guide_id || access.context?.is_admin);
  useEffect(() => {
    if (!access.authLoading && !access.user) navigate('/', { replace: true });
  }, [access.authLoading, access.user, navigate]);
  return {
    isGuide, guideId: access.context?.guide_id ?? null,
    checking: access.authLoading || (!!access.user && access.isPending),
    error: access.error, isAdmin: access.context?.is_admin ?? false,
    isPreview: access.context?.is_preview ?? false, preview,
    name: access.context?.name, userId: access.user?.id,
  };
}
export function useIsGuide() {
  const { context } = useGuideAccess(null);
  return !!(context?.guide_id || context?.is_admin);
}
export function useGuideTrips() {
  const guard = useGuideGuard();
  const query = useQuery({
    queryKey: ['guide-trips', guard.userId, guard.guideId, guard.preview],
    enabled: !!guard.guideId && !guard.checking && !guard.error,
    queryFn: async (): Promise<GuideTrip[]> => {
      const { data, error } = await db.rpc('get_guide_portal_proposals', { p_preview_guide_id: guard.preview });
      if (error) throw error;
      return data ?? [];
    },
  });
  return { ...query, guard };
}
