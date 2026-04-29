import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Users, ArrowLeft, Shield, Menu, UserCheck, Kanban, Building2, Package, UsersRound, Settings, Settings2, CalendarDays, Mail, BarChart3, Sparkles, Target, DollarSign, BookOpen, PieChart, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Percent, Truck, Palette, MapPin } from "lucide-react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { storageUrl } from "@/lib/storage";

const logoAtmos = storageUrl("home/logo-atmos.png");
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Each section has a `module` key that maps to admin_permissions.allowed_modules
const adminNavSections = [
  {
    label: "Site",
    module: "site",
    links: [
      { path: "/admin", label: "Painel do Site", icon: LayoutDashboard, exact: true },
      { path: "/admin/editor-visual", label: "Editor Visual", icon: Palette, exact: false },
      { path: "/admin/mapa", label: "Mapa", icon: MapPin, exact: false },
    ],
  },
  {
    label: "Cadastros",
    module: "cadastros",
    links: [
      { path: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
      { path: "/admin/guias", label: "Guias Parceiros", icon: UsersRound, exact: false },
      { path: "/admin/vendedores", label: "Vendedores", icon: UserCheck, exact: false },
      { path: "/admin/fornecedores", label: "Fornecedores", icon: Truck, exact: false },
    ],
  },
  {
    label: "Agenda ATMOS",
    module: "ferramentas",
    links: [
      { path: "/admin/metas", label: "Metas", icon: Target, exact: false },
      { path: "/admin/calendario", label: "Calendário Roteiros", icon: CalendarDays, exact: false },
    ],
  },
  {
    label: "B2C Turistas",
    module: "b2c",
    links: [
      { path: "/admin/b2c/dashboard", label: "Dashboard B2C", icon: LayoutDashboard, exact: false },
      { path: "/admin/b2c/solicitacoes", label: "Solicitações/Wishlist", icon: FileText, exact: false },
      { path: "/admin/b2c/prospects", label: "Clientes", icon: UserCheck, exact: false },
      { path: "/admin/b2c/pipeline", label: "Pipeline", icon: Kanban, exact: false },
      { path: "/admin/b2c/propostas", label: "Propostas", icon: FileText, exact: false },
    ],
  },
  {
    label: "B2B Imersões",
    module: "b2b",
    links: [
      { path: "/admin/b2b/dashboard", label: "Dashboard B2B", icon: LayoutDashboard, exact: false },
      { path: "/admin/b2b/solicitacoes", label: "Solicitações/Wishlist", icon: FileText, exact: false },
      { path: "/admin/b2b/prospects", label: "Clientes", icon: Building2, exact: false },
      { path: "/admin/b2b/pipeline", label: "Pipeline", icon: Kanban, exact: false },
      { path: "/admin/b2b/propostas", label: "Propostas", icon: FileText, exact: false },
      { path: "/admin/b2b/reunioes", label: "Calendário Reuniões", icon: CalendarDays, exact: false },
      { path: "/admin/b2b/descobrir", label: "Descobrir", icon: Sparkles, exact: false },
      { path: "/admin/b2b/templates", label: "Templates", icon: Mail, exact: false },
    ],
  },
  {
    label: "Financeiro",
    module: "financeiro",
    links: [
      { path: "/admin/financeiro/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
      { path: "/admin/financeiro/receitas", label: "Receitas", icon: TrendingUp, exact: false },
      { path: "/admin/financeiro/despesas", label: "Despesas", icon: TrendingDown, exact: false },
      { path: "/admin/financeiro/contas-receber", label: "Contas a Receber", icon: ArrowDownLeft, exact: false },
      { path: "/admin/financeiro/contas-pagar", label: "Contas a Pagar", icon: ArrowUpRight, exact: false },
      { path: "/admin/financeiro/lucro-margem", label: "Lucro & Margem", icon: Percent, exact: false },
      { path: "/admin/financeiro/fluxo-caixa", label: "Fluxo de Caixa", icon: DollarSign, exact: false },
      { path: "/admin/financeiro/relatorios", label: "Relatórios", icon: BarChart3, exact: false },
      { path: "/admin/financeiro/configuracoes", label: "Configurações", icon: Settings2, exact: false },
    ],
  },
  {
    label: "Sistema",
    module: "configuracoes",
    links: [
      { path: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
    ],
  },
];

function NavLinks({ location, allowedModules, onNavigate }: { location: ReturnType<typeof useLocation>; allowedModules: string[]; onNavigate?: () => void }) {
  // Empty array = super admin = all modules
  const isSuperAdmin = allowedModules.length === 0;

  const visibleSections = adminNavSections.filter(section =>
    isSuperAdmin || allowedModules.includes(section.module)
  );

  return (
    <>
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = link.exact
                  ? location.pathname === link.path
                  : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { isAdmin, checking, allowedModules } = useAdminGuard();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (checking || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-10 w-10 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col shrink-0">
        <div className="px-4 py-4 border-b border-border">
          <img src={logoAtmos} alt="ATMOS" className="h-12" />
          <div className="flex items-center gap-1.5 mt-1">
            <Shield className="h-3 w-3 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Painel Admin</span>
          </div>
        </div>
        <NavLinks location={location} allowedModules={allowedModules} />
      </aside>

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <img src={logoAtmos} alt="ATMOS" className="h-8" />
        <div className="flex items-center gap-1 ml-1">
          <Shield className="h-3 w-3 text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">Painel Admin</span>
        </div>
      </div>

      {/* Mobile nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
          <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-left">
              <img src={logoAtmos} alt="ATMOS" className="h-10" />
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Painel Admin</span>
            </div>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0">
            <NavLinks location={location} allowedModules={allowedModules} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-14 min-w-0">
        <div className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
