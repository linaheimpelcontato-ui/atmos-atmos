import { Link } from "react-router-dom";
import { Map, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackCtaClick } from "@/lib/analytics";

export default function CtaSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-primary text-primary-foreground">
      <div className="container max-w-3xl text-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          {t("cta.title")}
        </h2>
        <p className="text-lg opacity-80 mb-10 leading-relaxed">
          {t("cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="rounded-full px-8 gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => trackCtaClick("roteiros", "home")}>
            <Link to="/roteiros">
              <Map className="h-4 w-4" />
              {t("hero.cta")}
            </Link>
          </Button>
          <Button asChild size="lg" className="rounded-full px-8 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => trackCtaClick("monte_roteiro", "home")}>
            <Link to="/monte-seu-roteiro">
              <Palette className="h-4 w-4" />
              {t("hero.cta2")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
