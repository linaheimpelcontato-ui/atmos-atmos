import { Link } from "react-router-dom";
import { ArrowRight, Map, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { optimizedUrl } from "@/lib/storage";

const catItineraries = optimizedUrl("home/cat-itineraries.jpg", { quality: 70 });
const pathsCustom = optimizedUrl("home/paths-custom.jpg", { quality: 70 });

export default function PathsSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 pb-10 md:pb-14">
      <div className="container px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          {t("paths.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">
          {t("hero.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Roteiro Pronto */}
          <Link to="/roteiros" className="group">
            <div className="relative h-[420px] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
              <img
                src={catItineraries}
                alt={t("paths.ready.title")}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium mb-3">
                  <Map className="h-3.5 w-3.5" />
                  {t("paths.ready.bullet3")}
                </div>
                <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">
                  {t("paths.ready.title")}
                </h3>
                <p className="text-sm opacity-90 mb-4 leading-relaxed drop-shadow-md">
                  {t("paths.ready.desc")}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {["bullet1", "bullet2", "bullet3"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm opacity-85">
                      <Check className="h-4 w-4 text-accent flex-shrink-0" />
                      {t(`paths.ready.${b}`)}
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-5 py-2.5 text-sm font-semibold group-hover:gap-3 transition-all">
                  {t("paths.ready.cta")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* Monte seu Roteiro */}
          <Link to="/monte-seu-roteiro" className="group">
            <div className="relative h-[420px] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
              <img
                src={pathsCustom}
                alt={t("paths.custom.title")}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium mb-3">
                  <Palette className="h-3.5 w-3.5" />
                  100% personalizado
                </div>
                <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">
                  {t("paths.custom.title")}
                </h3>
                <p className="text-sm opacity-90 mb-4 leading-relaxed drop-shadow-md">
                  {t("paths.custom.desc")}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {["bullet1", "bullet2", "bullet3"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm opacity-85">
                      <Check className="h-4 w-4 text-accent flex-shrink-0" />
                      {t(`paths.custom.${b}`)}
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-5 py-2.5 text-sm font-semibold group-hover:gap-3 transition-all">
                  {t("paths.custom.cta")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
