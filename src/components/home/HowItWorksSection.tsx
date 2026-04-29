import { Compass, Heart, MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Compass,
    titleKey: "howitworks.step1.title" as const,
    descKey: "howitworks.step1.desc" as const,
  },
  {
    icon: Heart,
    titleKey: "howitworks.step2.title" as const,
    descKey: "howitworks.step2.desc" as const,
  },
  {
    icon: MessageCircle,
    titleKey: "howitworks.step3.title" as const,
    descKey: "howitworks.step3.desc" as const,
  },
];

export default function HowItWorksSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container px-4 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {t("howitworks.title")}
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t("howitworks.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-10">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex flex-row items-start gap-4 md:flex-col md:items-center md:text-center">
                {/* Number + icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>

                <div className="text-left md:contents">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-1 md:mt-0">
                    {t(step.descKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>


        <Button asChild size="lg" className="rounded-full gap-2">
          <Link to="/monte-seu-roteiro">
            {t("howitworks.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
