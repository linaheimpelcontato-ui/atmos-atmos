import { useEffect, useRef, lazy, Suspense } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import FloatingWishlist from "./FloatingWishlist";
import { trackScrollDepth } from "@/lib/analytics";
import { useApplySiteOverrides } from "@/hooks/useSiteOverrides";
import { useApplyFocalPoints } from "@/hooks/useApplyFocalPoints";

const EditorModeListener = lazy(() => import("@/components/editor/EditorModeListener"));

interface LayoutProps {
  children: React.ReactNode;
  hideWishlist?: boolean;
}

export default function Layout({ children, hideWishlist }: LayoutProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isEditorMode = searchParams.get("editor") === "true";
  const firedRef = useRef<Set<number>>(new Set());

  // Apply site overrides from database
  useApplySiteOverrides();
  // Apply focal points + rotation to images
  useApplyFocalPoints();

  useEffect(() => {
    firedRef.current = new Set();

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = (scrollTop / docHeight) * 100;

      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !firedRef.current.has(threshold)) {
          firedRef.current.add(threshold);
          trackScrollDepth(threshold, pathname);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      {!isEditorMode && <Header />}
      <main className="flex-1">{children}</main>
      {!isEditorMode && <Footer />}
      {!isEditorMode && !hideWishlist && <FloatingWishlist />}
      {isEditorMode && (
        <Suspense fallback={null}>
          <EditorModeListener />
        </Suspense>
      )}
    </div>
  );
}
