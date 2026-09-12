import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { storageUrl } from "@/lib/storage";

export function isMaintenancePathAllowed(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || ["/reset-password", "/privacidade", "/termos"].includes(pathname);
}

/** Optional public maintenance screen. Admin authorization remains in the admin guards. */
export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  if (import.meta.env.VITE_SITE_MAINTENANCE !== "true" || isMaintenancePathAllowed(pathname)) {
    return <>{children}</>;
  }
  return (
    <main className="min-h-screen bg-[#f4f3f0] flex flex-col items-center justify-center px-6 text-center text-[#1A261B]">
      <Helmet><title>Voltamos em breve — ATMOS</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <img src={storageUrl("home/logo-atmos.png")} alt="ATMOS" className="w-40 mb-10" />
      <h1 className="text-4xl font-display mb-5">Estamos preparando sua próxima experiência.</h1>
      <p className="max-w-lg text-lg mb-10">Nosso site está em atualização. Em breve, você poderá explorar a Chapada dos Veadeiros com a gente.</p>
      <Button variant="outline" onClick={() => setLoginOpen(true)}>Acesso da equipe</Button>
      <AuthModal open={loginOpen} defaultMode="login" onClose={() => setLoginOpen(false)}
        onSuccess={() => { setLoginOpen(false); navigate("/admin"); }} />
    </main>
  );
}
