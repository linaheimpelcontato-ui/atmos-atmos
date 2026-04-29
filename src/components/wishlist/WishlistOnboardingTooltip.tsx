import { useEffect, useState } from "react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const STORAGE_KEY = "atmos-wishlist-onboarding-shown";

const tipText: Record<Language, string> = {
  pt: "Clique no ❤️ para adicionar à sua Wishlist e montar seu orçamento!",
  en: "Click the ❤️ to add to your Wishlist and build your quote!",
  es: "¡Haz clic en el ❤️ para agregar a tu Wishlist y armar tu presupuesto!",
};

interface Props {
  children: React.ReactNode;
}

export default function WishlistOnboardingTooltip({ children }: Props) {
  const { count } = useWishlist();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setVisible(false);
      return;
    }
    const shown = sessionStorage.getItem(STORAGE_KEY);
    if (shown) return;

    // Small delay so tooltip appears after page renders
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  // Dismiss on any wishlist add
  useEffect(() => {
    if (count > 0 && visible) {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
  }, [count, visible]);

  return (
    <div className="relative">
      {children}
      {visible && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          role="tooltip"
        >
          <div className="bg-accent text-accent-foreground text-xs font-medium px-3 py-2 rounded-lg shadow-lg relative">
            {tipText[language]}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-accent rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
