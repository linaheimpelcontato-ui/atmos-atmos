import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";

// Pages
import Index from "./pages/Index";
import Itineraries from "./pages/Itineraries";
import ItineraryDetail from "./pages/ItineraryDetail";
import BuildItinerary from "./pages/BuildItinerary";
import MonteSeuRoteiro from "./pages/MonteSeuRoteiro";
import Waterfalls from "./pages/Waterfalls";
import Experiences from "./pages/Experiences";
import Accommodations from "./pages/Accommodations";
import Services from "./pages/Services";
import Immersions from "./pages/Immersions";
import FAQ from "./pages/FAQ";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ProposalPublic from "./pages/ProposalPublic";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDashboardB2C from "./pages/admin/AdminDashboardB2C";
import AdminDashboardB2B from "./pages/admin/AdminDashboardB2B";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminGuides from "./pages/admin/AdminGuides";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminSuppliers from "./pages/admin/AdminSuppliers";
import AdminProspects from "./pages/admin/AdminProspects";
import AdminPipeline from "./pages/admin/AdminPipeline";
import AdminProposals from "./pages/admin/AdminProposals";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGoals from "./pages/admin/AdminGoals";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminMap from "./pages/admin/AdminMap";
import AdminVisualEditor from "./pages/admin/AdminVisualEditor";
import AdminDiscover from "./pages/admin/AdminDiscover";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminMeetingCalendar from "./pages/admin/AdminMeetingCalendar";

// Finance Pages
import AdminFinanceDashboard from "./pages/admin/AdminFinanceDashboard";
import AdminFinanceReceitas from "./pages/admin/AdminFinanceReceitas";
import AdminFinanceDespesas from "./pages/admin/AdminFinanceDespesas";
import AdminFinanceContasReceber from "./pages/admin/AdminFinanceContasReceber";
import AdminFinanceContasPagar from "./pages/admin/AdminFinanceContasPagar";
import AdminFinanceLucroMargem from "./pages/admin/AdminFinanceLucroMargem";
import AdminFinanceFluxoCaixa from "./pages/admin/AdminFinanceFluxoCaixa";
import AdminFinanceReports from "./pages/admin/AdminFinanceReports";
import AdminFinanceConfig from "./pages/admin/AdminFinanceConfig";

// Guide Pages
import GuideLayout from "./pages/guide/GuideLayout";
import GuideDashboard from "./pages/guide/GuideDashboard";
import GuideAgenda from "./pages/guide/GuideAgenda";
import GuideProfile from "./pages/guide/GuideProfile";
import GuideWaterfalls from "./pages/guide/GuideWaterfalls";

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
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <WishlistProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public Home */}
                <Route path="/" element={<Index />} />
                <Route path="/duvidas" element={<FAQ />} />
                
                {/* Protected Public Pages */}
                <Route path="/roteiros" element={<ProtectedRoute><Itineraries /></ProtectedRoute>} />
                <Route path="/roteiros/:id" element={<ProtectedRoute><ItineraryDetail /></ProtectedRoute>} />
                <Route path="/monte-seu-roteiro" element={<ProtectedRoute><MonteSeuRoteiro /></ProtectedRoute>} />
                <Route path="/monte-seu-roteiro/:category" element={<ProtectedRoute><MonteSeuRoteiro /></ProtectedRoute>} />
                <Route path="/novo-roteiro" element={<ProtectedRoute><BuildItinerary /></ProtectedRoute>} />
                {/* Redirect legacy paths to centralized Monte Seu Roteiro */}
                <Route path="/cachoeiras" element={<Navigate to="/monte-seu-roteiro/cachoeiras" replace />} />
                <Route path="/experiencias" element={<Navigate to="/monte-seu-roteiro/experiencias" replace />} />
                <Route path="/hospedagens" element={<Navigate to="/monte-seu-roteiro/hospedagens" replace />} />
                <Route path="/servicos" element={<Navigate to="/monte-seu-roteiro/servicos" replace />} />
                <Route path="/imersoes" element={<ProtectedRoute><Immersions /></ProtectedRoute>} />
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
                  <Route path="perfil" element={<GuideProfile />} />
                  <Route path="cachoeiras" element={<GuideWaterfalls />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </WishlistProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
