import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";

import { RouteTracker } from "./components/RouteTracker";
import { CookieConsent } from "./components/ui/CookieConsent";

import { lazy, Suspense } from "react";

// Pages - Lazy Loaded
const Index = lazy(() => import("./pages/Index"));
const Itineraries = lazy(() => import("./pages/Itineraries"));
const ItineraryDetail = lazy(() => import("./pages/ItineraryDetail"));
const BuildItinerary = lazy(() => import("./pages/BuildItinerary"));
const MonteSeuRoteiro = lazy(() => import("./pages/MonteSeuRoteiro"));
const Waterfalls = lazy(() => import("./pages/Waterfalls"));
const Experiences = lazy(() => import("./pages/Experiences"));
const Accommodations = lazy(() => import("./pages/Accommodations"));
const Services = lazy(() => import("./pages/Services"));
const FAQ = lazy(() => import("./pages/FAQ"));
const GruposImersoes = lazy(() => import("./pages/GruposImersoes"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const Termos = lazy(() => import("./pages/Termos"));
const ProposalPublic = lazy(() => import("./pages/ProposalPublic"));

// Admin Pages - Lazy Loaded (Heavy bundle)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDashboardB2C = lazy(() => import("./pages/admin/AdminDashboardB2C"));
const AdminDashboardB2B = lazy(() => import("./pages/admin/AdminDashboardB2B"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminSuppliers = lazy(() => import("./pages/admin/AdminSuppliers"));
const AdminProspects = lazy(() => import("./pages/admin/AdminProspects"));
const AdminPipeline = lazy(() => import("./pages/admin/AdminPipeline"));
const AdminProposals = lazy(() => import("./pages/admin/AdminProposals"));
const AdminQuotes = lazy(() => import("./pages/admin/AdminQuotes"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminGoals = lazy(() => import("./pages/admin/AdminGoals"));
const AdminCalendar = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminMap = lazy(() => import("./pages/admin/AdminMap"));
const AdminVisualEditor = lazy(() => import("./pages/admin/AdminVisualEditor"));
const AdminDiscover = lazy(() => import("./pages/admin/AdminDiscover"));
const AdminTemplates = lazy(() => import("./pages/admin/AdminTemplates"));
const AdminMeetingCalendar = lazy(() => import("./pages/admin/AdminMeetingCalendar"));

// Finance Pages - Lazy Loaded
const AdminFinanceDashboard = lazy(() => import("./pages/admin/AdminFinanceDashboard"));
const AdminFinanceReceitas = lazy(() => import("./pages/admin/AdminFinanceReceitas"));
const AdminFinanceDespesas = lazy(() => import("./pages/admin/AdminFinanceDespesas"));
const AdminFinanceContasReceber = lazy(() => import("./pages/admin/AdminFinanceContasReceber"));
const AdminFinanceContasPagar = lazy(() => import("./pages/admin/AdminFinanceContasPagar"));
const AdminFinanceLucroMargem = lazy(() => import("./pages/admin/AdminFinanceLucroMargem"));
const AdminFinanceFluxoCaixa = lazy(() => import("./pages/admin/AdminFinanceFluxoCaixa"));
const AdminFinanceReports = lazy(() => import("./pages/admin/AdminFinanceReports"));
const AdminFinanceConfig = lazy(() => import("./pages/admin/AdminFinanceConfig"));

// Guide Pages - Lazy Loaded
const GuideLayout = lazy(() => import("./pages/guide/GuideLayout"));
const GuideDashboard = lazy(() => import("./pages/guide/GuideDashboard"));
const GuideAgenda = lazy(() => import("./pages/guide/GuideAgenda"));
const GuideProfile = lazy(() => import("./pages/guide/GuideProfile"));
const GuideWaterfalls = lazy(() => import("./pages/guide/GuideWaterfalls"));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-white text-primary font-poppins">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <WishlistProvider>
              <TooltipProvider>
              <CookieConsent />
              <RouteTracker />
              <Toaster />
              <Sonner />
              <Suspense fallback={<div className="h-screen w-screen bg-[#FAF9F6]" />}>
                <Routes>
                  {/* Public Home */}
                  <Route path="/" element={<Index />} />
                  <Route path="/duvidas" element={<FAQ />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/termos" element={<Termos />} />
                  
                  {/* Public Catalog Pages (SEO Enabled) */}
                  <Route path="/roteiros" element={<Itineraries />} />
                  <Route path="/roteiros/:id" element={<ItineraryDetail />} />
                  <Route path="/monte-seu-roteiro" element={<MonteSeuRoteiro />} />
                  <Route path="/monte-seu-roteiro/:category" element={<MonteSeuRoteiro />} />
                  <Route path="/novo-roteiro" element={<ProtectedRoute><BuildItinerary /></ProtectedRoute>} />
                  {/* Redirect legacy paths to centralized Monte Seu Roteiro */}
                  <Route path="/cachoeiras" element={<Navigate to="/monte-seu-roteiro/cachoeiras" replace />} />
                  <Route path="/experiencias" element={<Navigate to="/monte-seu-roteiro/experiencias" replace />} />
                  <Route path="/hospedagens" element={<Navigate to="/monte-seu-roteiro/hospedagens" replace />} />
                  <Route path="/servicos" element={<Navigate to="/monte-seu-roteiro/servicos" replace />} />
                  <Route path="/grupos-e-imersoes" element={<ProtectedRoute><GruposImersoes /></ProtectedRoute>} />
                  
                  {/* Private User Pages */}
                  <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                  <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  
                  {/* Authentication Utilities */}
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* Public Proposal (accessible via token) */}
                  <Route path="/proposta/:token" element={<ProposalPublic />} />

                  {/* Admin panel */}
                  <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="editor-visual" element={<AdminVisualEditor />} />
                    <Route path="mapa" element={<AdminMap />} />
                    <Route path="b2c/solicitacoes" element={<AdminQuotes segment="b2c" />} />
                    <Route path="b2b/solicitacoes" element={<AdminQuotes segment="b2b" />} />
                    <Route path="produtos" element={<AdminProducts />} />
                    <Route path="guias" element={<AdminGuides />} />
                    <Route path="vendedores" element={<AdminSellers />} />
                    <Route path="fornecedores" element={<AdminSuppliers />} />
                    <Route path="b2c/dashboard" element={<AdminDashboardB2C />} />
                    <Route path="b2c/prospects" element={<AdminProspects segment="b2c" />} />
                    <Route path="b2c/pipeline" element={<AdminPipeline segment="b2c" />} />
                    <Route path="b2c/propostas" element={<AdminProposals segment="b2c" />} />
                    <Route path="b2b/dashboard" element={<AdminDashboardB2B />} />
                    <Route path="b2b/prospects" element={<AdminProspects segment="b2b" />} />
                    <Route path="b2b/pipeline" element={<AdminPipeline segment="b2b" />} />
                    <Route path="b2b/propostas" element={<AdminProposals segment="b2b" />} />
                    <Route path="b2b/descobrir" element={<AdminDiscover />} />
                    <Route path="b2b/templates" element={<AdminTemplates />} />
                    <Route path="b2b/reunioes" element={<AdminMeetingCalendar />} />
                    
                    <Route path="financeiro/dashboard" element={<AdminFinanceDashboard />} />
                    <Route path="financeiro/receitas" element={<AdminFinanceReceitas />} />
                    <Route path="financeiro/despesas" element={<AdminFinanceDespesas />} />
                    <Route path="financeiro/contas-receber" element={<AdminFinanceContasReceber />} />
                    <Route path="financeiro/contas-pagar" element={<AdminFinanceContasPagar />} />
                    <Route path="financeiro/lucro-margem" element={<AdminFinanceLucroMargem />} />
                    <Route path="financeiro/fluxo-caixa" element={<AdminFinanceFluxoCaixa />} />
                    <Route path="financeiro/relatorios" element={<AdminFinanceReports />} />
                    <Route path="financeiro/configuracoes" element={<AdminFinanceConfig />} />
                    <Route path="configuracoes" element={<AdminSettings />} />
                    <Route path="metas" element={<AdminGoals />} />
                    <Route path="calendario" element={<AdminCalendar />} />
                  </Route>
                  
                  {/* Guide portal */}
                  <Route path="/guia" element={<ProtectedRoute><GuideLayout /></ProtectedRoute>}>
                    <Route index element={<GuideDashboard />} />
                    <Route path="dashboard" element={<GuideDashboard />} />
                    <Route path="agenda" element={<GuideAgenda />} />
                    <Route path="/guia/perfil" element={<GuideProfile />} />
                    <Route path="cachoeiras" element={<GuideWaterfalls />} />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </TooltipProvider>
          </WishlistProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
