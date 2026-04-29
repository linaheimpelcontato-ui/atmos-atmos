import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, Calendar, User, Mountain, ArrowLeft, ShieldCheck, Menu } from "lucide-react";
import { useGuideGuard } from "@/hooks/useGuideGuard";
import { storageUrl } from "@/lib/storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const logoAtmos = storageUrl("home/logo-atmos.png");

const guideNavLinks = [
  { path: "/guia/dashboard", label: "Meu Dashboard", icon: LayoutDashboard },
  { path: "/guia/agenda", label: "Minha Agenda", icon: Calendar },
  { path: "/guia/perfil", label: "Meu Perfil", icon: User },
  { path: "/guia/cachoeiras", label: "Valores Cachoeiras", icon: Mountain },
];

function NavLinks({ location, onNavigate }: { location: ReturnType<typeof useLocation>; onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Portal do Guia
        </p>
        
        {guideNavLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-3 border-t border-border">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Sair / Voltar ao site
        </Link>
      </div>
    </>
  );
}

export default function GuideLayout() {
  const { isGuide, checking } = useGuideGuard();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (checking || !isGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground text-sm font-medium">Autenticando painel seguro do guia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-muted/20 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col shrink-0 shadow-sm z-10">
        <div className="px-5 py-5 border-b border-border">
          <img src={logoAtmos} alt="ATMOS" className="h-10 mb-1" />
          <div className="flex items-center gap-1.5 mt-2">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest">Painel Parceiro</span>
          </div>
        </div>
        <NavLinks location={location} />
      </aside>

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={logoAtmos} alt="ATMOS" className="h-7" />
        </div>
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-green-100">
           <ShieldCheck className="h-4 w-4 text-green-600" />
        </div>
      </div>

      {/* Mobile nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col overflow-hidden bg-card">
          <SheetHeader className="px-5 py-5 border-b border-border shrink-0">
            <SheetTitle className="flex flex-col items-start gap-2 text-left">
              <img src={logoAtmos} alt="ATMOS" className="h-9" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-green-600" />
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Painel Parceiro</span>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <NavLinks location={location} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden md:pt-0 pt-16 bg-background/50">
        <Outlet />
      </main>
    </div>
  );
}
