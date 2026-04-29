import { useEffect, useRef } from "react";
import { Check, Compass, Heart, MessageCircle } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { trackWishlistStep } from "@/lib/analytics";

const labels: Record<string, Record<Language, string>> = {
  explore: { pt: "Explore", en: "Explore", es: "Explora" },
  favorite: { pt: "Favorite", en: "Favorite", es: "Favorito" },
  quote: { pt: "Orçamento", en: "Quote", es: "Presupuesto" },
};

interface Props {
  quoteStarted?: boolean;
}

export default function WishlistStepper({ quoteStarted = false }: Props) {
  const { language } = useLanguage();
  const { count } = useWishlist();

  const steps = [
    { key: "explore", icon: Compass, done: true, active: true },
    { key: "favorite", icon: Heart, done: count > 0, active: count > 0 },
    { key: "quote", icon: MessageCircle, done: quoteStarted, active: quoteStarted },
  ];

  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    steps.forEach((step) => {
      if ((step.done || step.active) && !firedRef.current.has(step.key)) {
        firedRef.current.add(step.key);
        trackWishlistStep(step.key);
      }
    });
  }, [count, quoteStarted]);

  return (
    <div className="flex items-center justify-center gap-0 py-6 max-w-md mx-auto">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1 last:flex-initial">
          {/* Step circle */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.done
                  ? "bg-accent border-accent text-accent-foreground"
                  : step.active
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground bg-muted"
              }`}
            >
              {step.done ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                step.done || step.active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {labels[step.key][language]}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                steps[i + 1].done || steps[i + 1].active ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
