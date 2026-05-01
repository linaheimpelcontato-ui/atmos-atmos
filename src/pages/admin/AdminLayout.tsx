import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Users, ArrowLeft, Shield, Menu, UserCheck, 
  Kanban, Building2, Package, UsersRound, Settings, Settings2, 
  CalendarDays, Mail, BarChart3, Sparkles, Target, DollarSign, 
  BookOpen, PieChart, TrendingUp, TrendingDown, ArrowDownLeft, 
  ArrowUpRight, Percent, Truck, Palette, MapPin, Bell, Search, LogOut
} from "lucide-react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { storageUrl } from "@/lib/storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

const logoAtmos = storageUrl("home/logo-atmos.png");

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
    label: "Operacional",
    module: "cadastros",
    links: [
      { path: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
      { path: "/admin/guias", label: "Guias Parceiros", icon: UsersRound, exact: false },
      { path: "/admin/vendedores", label: "Vendedores", icon: UserCheck, exact: false },
      { path: "/admin/fornecedores", label: "Fornecedores", icon: Truck, exact: false },
    ],
  },
  {
    label: "Estratégia",
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
      { path: "/admin/b2c/solicitacoes", label: "Solicitações", icon: FileText, exact: false },
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
      { path: "/admin/b2b/solicitacoes", label: "Solicitações", icon: FileText, exact: false },
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
  const isSuperAdmin = allowedModules.length === 0;

  const visibleSections = adminNavSections.filter(section =>
    isSuperAdmin || allowedModules.includes(section.module)
  );

  return (
    <>
      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3">
            {section.label && (
              <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
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
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-[1.25rem] text-[13.5px] font-bold transition-all duration-300 group ${
                      isActive
                        ? "bg-admin-primary text-white shadow-xl shadow-admin-primary/25 scale-[1.02]"
                        : "text-admin-primary/60 hover:bg-admin-muted hover:text-admin-primary hover:translate-x-1"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 transition-all duration-300 ${isActive ? "scale-110 opacity-100" : "opacity-40 group-hover:opacity-100 group-hover:scale-110"}`} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-4 bg-admin-muted/30 border-t border-admin-border/40">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-[1.25rem] text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-admin-primary hover:bg-white transition-all duration-300 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
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
      <div className="min-h-screen flex items-center justify-center bg-admin-bg font-sans">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 bg-white rounded-[2rem] shadow-2xl"
          >
            <Shield className="h-10 w-10 text-admin-primary" />
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-admin-primary font-bold uppercase tracking-[0.2em] text-xs">Atmos Security</p>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest animate-pulse">Autenticando acesso premium...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-admin-bg overflow-hidden font-sans selection:bg-admin-primary/10">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[var(--admin-sidebar-w)] bg-white border-r border-admin-border/60 flex-col shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="px-8 py-10">
          <Link to="/admin" className="block transition-transform active:scale-95">
            <img src={logoAtmos} alt="ATMOS" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2.5 mt-6 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-admin-primary animate-pulse" />
            <span className="text-[9px] font-black text-admin-primary/30 uppercase tracking-[0.25em]">Admin Premium</span>
          </div>
        </div>
        <NavLinks location={location} allowedModules={allowedModules} />
      </aside>

      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-admin-border/50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2.5 rounded-2xl bg-admin-muted hover:bg-admin-border transition-all active:scale-90"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5 text-admin-primary" />
          </button>
          <img src={logoAtmos} alt="ATMOS" className="h-6" />
        </div>
        <div className="h-10 w-10 rounded-2xl bg-admin-primary flex items-center justify-center text-white shadow-lg shadow-admin-primary/30">
          <Shield className="h-5 w-5" />
        </div>
      </div>

      {/* Mobile nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[var(--admin-sidebar-w)] p-0 flex flex-col h-full border-none">
          <div className="px-8 py-10 border-b border-admin-border/50 bg-white">
            <img src={logoAtmos} alt="ATMOS" className="h-8" />
            <div className="flex items-center gap-2 mt-3">
              <div className="h-1.5 w-1.5 rounded-full bg-admin-primary" />
              <span className="text-[9px] font-black text-admin-primary/30 uppercase tracking-[0.2em]">Painel de Controle</span>
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0 bg-white">
            <NavLinks location={location} allowedModules={allowedModules} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-16 min-w-0 bg-admin-bg relative">
        {/* Glassmorphism Header */}
        <header className="hidden md:flex sticky top-0 z-20 h-24 px-8 items-center justify-between bg-white/40 backdrop-blur-md border-b border-admin-border/40">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-admin-primary" />
              <input 
                type="text" 
                placeholder="Buscar em todo o sistema..." 
                className="w-full h-12 pl-11 pr-4 bg-admin-muted/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-admin-primary/10 transition-all placeholder:text-muted-foreground/50 font-medium"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="h-12 w-12 rounded-2xl bg-white border border-admin-border/60 flex items-center justify-center text-muted-foreground hover:text-admin-primary transition-all relative shadow-sm hover:shadow-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-admin-primary border-2 border-white" />
            </button>
            <div className="h-12 px-4 rounded-2xl bg-white border border-admin-border/60 flex items-center gap-3 text-sm font-bold text-admin-primary shadow-sm">
              <div className="h-8 w-8 rounded-xl bg-admin-muted flex items-center justify-center text-[10px] font-black">AD</div>
              <span className="tracking-tight">Administrador</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-admin-primary/[0.02] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex-1 flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
