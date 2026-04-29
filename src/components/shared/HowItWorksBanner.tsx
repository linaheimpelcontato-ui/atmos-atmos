import { Compass, Heart, MessageCircle, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

export default function HowItWorksBanner() {
  const { t } = useLanguage();

  return (
    <section className="py-10 md:py-14 bg-card border-t border-border">
      <div className="container px-4 max-w-5xl mx-auto">
        <h3 className="text-lg md:text-xl font-bold text-foreground text-center mb-6">
          {t("howitworks.title")}
        </h3>

        <div className="flex flex-col items-start md:flex-row md:items-center justify-center gap-4 md:gap-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="contents">
                <div className="flex flex-row items-start gap-3 md:flex-col md:items-center md:gap-2 md:flex-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                  </div>
                  <div className="text-left md:text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {t(step.titleKey)}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
