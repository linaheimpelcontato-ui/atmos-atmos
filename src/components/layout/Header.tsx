import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Globe, Heart, LogIn, LogOut, UserCircle, Shield, MapPin } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdminGuard";
import { useIsGuide } from "@/hooks/useGuideGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import { storageUrl } from "@/lib/storage";

const logoAtmos = storageUrl("home/logo-atmos.png");


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";




const navLinks = [
  { key: "nav.home", path: "/" },
  { key: "nav.buildItinerary", path: "/monte-seu-roteiro" },
  { key: "nav.itineraries", path: "/roteiros" },
  { key: "nav.immersions", path: "/grupos-e-imersoes" },
  { key: "nav.faq", path: "/duvidas" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [myProposalSlug, setMyProposalSlug] = useState<string | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { count } = useWishlist();
  const { user, profile, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const isGuide = useIsGuide();

  // Fetch user's published proposal link via RPC (ownership + published_at
  // enforced server-side; no direct proposals/prospects select from the
  // client). Guarded against a stale response resolving after logout/switch
  // to a different user -- otherwise user A's link could get set into state
  // after B is already logged in.
  useEffect(() => {
    let cancelled = false;
    if (!user?.email) { setMyProposalSlug(null); return; }
    (async () => {
      const { data, error } = await supabase.rpc("get_my_published_proposal_link");
      if (cancelled) return;
      if (error || !data) { setMyProposalSlug(null); return; }
      const link = data as { slug: string | null; share_token: string | null };
      setMyProposalSlug(link.slug || link.share_token || null);
    })();
    return () => { cancelled = true; };
  }, [user]);
  
  // Auto-open login if redirected from a protected route
  useEffect(() => {
    if (!user && location.state?.from) {
      setAuthModalOpen(true);
    }
  }, [user, location.state]);

  // Force onboarding for incomplete profiles (Google Login)
  useEffect(() => {
    if (user && profile) {
      const isIncomplete = !profile.full_name || !profile.phone;
      if (isIncomplete && !authModalOpen) {
        setAuthModalOpen(true);
      }
    }
  }, [user, profile, authModalOpen]);

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-[60] bg-white border-b border-border/50 shadow-sm backdrop-blur-md">
      <div className="container flex items-center h-20 px-6">
        {/* Left: Atmos Symbol */}
        <div className="w-1/3 flex justify-start items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-110">
              <img
                src={storageUrl("home/simboloatmos.png")}
                alt="ATMOS Symbol"
                className="h-8 w-8 object-contain"
                width="32"
                height="32"
              />
            </div>
          </Link>
        </div>

        {/* Center: Atmos Logo */}
        <div className="w-1/3 flex justify-center items-center">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
            <img 
              src={storageUrl("home/logo-atmos.png")} 
              alt="ATMOS Logo" 
              className="h-14 sm:h-16 w-auto object-contain" 
              width="160"
              height="64"
            />
          </Link>
        </div>

        {/* Right Actions */}
        <div className="w-1/3 flex justify-end items-center gap-4">
          {/* Language Selector removed as requested */}

          {/* User Auth / Profile */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Wishlist Icon only if logged in */}
              <Link
                to="/wishlist"
                className={`relative flex items-center justify-center h-9 w-9 rounded-full transition-colors hover:bg-muted ${location.pathname === "/wishlist" ? "text-accent" : "text-nav-foreground/75"
                  }`}
              >
                <Heart className="h-5 w-5" fill={count > 0 ? "currentColor" : "none"} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center hover:shadow-md transition-all">
                    {userInitial}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b mb-1">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2">
                    <UserCircle className="h-4 w-4" /> {t("nav.profile")}
                  </DropdownMenuItem>
                  {myProposalSlug && (
                    <DropdownMenuItem onClick={() => navigate(`/proposta/${myProposalSlug}`)} className="gap-2">
                      <MapPin className="h-4 w-4" /> Meu Roteiro
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 text-accent">
                      <Shield className="h-4 w-4" /> Painel Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive">
                    <LogOut className="h-4 w-4" /> {t("auth.signout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              onClick={() => {
                setAuthModalOpen(true);
              }}
              variant="outline"
              size="sm"
              className="font-poppins font-bold uppercase tracking-widest text-[10px] border-[#2C3E2D]/20 text-[#2C3E2D] hover:bg-[#2C3E2D]/5 px-6 rounded-full h-10"
            >
              Entrar
            </Button>
          )}

          {/* Mobile navigation toggle - only if logged in and has internal pages */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Links - ONLY VISIBLE IF LOGGED IN */}
      {user && (
        <div className="hidden lg:block border-t border-border/40 bg-white/80">
          <div className="container flex justify-center items-center py-2 overflow-x-auto gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all hover:bg-accent/5 ${location.pathname === link.path
                    ? "text-accent bg-accent/10"
                    : "text-nav-foreground/60 hover:text-accent"
                  }`}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Navigation - ONLY VISIBLE IF LOGGED IN */}
      {user && mobileOpen && (
        <nav className="lg:hidden border-t border-border bg-white animate-in slide-in-from-top duration-300">
          <div className="flex flex-col py-4 px-6 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-semibold transition-colors ${location.pathname === link.path ? "text-accent" : "text-nav-foreground/75"
                  }`}
              >
                {t(link.key)}
              </Link>
            ))}
            <Link
              to="/grupos-e-imersoes"
              className="block py-3 text-xs uppercase font-bold text-accent/70"
              onClick={() => setMobileOpen(false)}
            >
              Para Parceiros →
            </Link>
          </div>
        </nav>
      )}

      <AuthModal
        open={authModalOpen}
        defaultMode="login"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          const from = location.state?.from?.pathname || "/monte-seu-roteiro";
          navigate(from);
        }}
      />
    </header>
  );
}
