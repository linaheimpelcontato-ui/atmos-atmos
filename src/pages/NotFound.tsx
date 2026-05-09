import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <PageSEO title="Página não encontrada — ATMOS" description="A rota que você tentou acessar não existe." path="/404" />
      <div className="flex min-h-[80vh] items-center justify-center bg-[#f4f3f0] px-6">
        <div className="text-center max-w-lg">
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#1A261B]/40 mb-4 block">
            ERRO 404
          </span>
          <h1 className="mb-6 text-5xl md:text-7xl font-display text-[#1A261B] leading-tight">
            Caminho<br/><span className="italic text-[#1A261B]/60">desconhecido</span>
          </h1>
          <p className="mb-10 text-lg text-[#2C3E2D]/60 font-light leading-relaxed">
            A trilha que você procurava não está no nosso mapa. Pode ser que o link esteja quebrado ou a página tenha sido movida.
          </p>
          <Button asChild className="rounded-full px-8 py-6 bg-[#1A261B] hover:bg-black text-white font-bold uppercase tracking-widest text-xs">
            <Link to="/" className="flex items-center gap-2">
              Voltar ao Início
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
