import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FloatingWishlist() {
  const { count } = useWishlist();
  const { t } = useLanguage();

  const label = count > 0 ? t("wishlist.floating") : t("wishlist.floating.empty");

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/wishlist" className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="rounded-full shadow-lg gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-5"
            >
              <Heart
                className={`h-5 w-5 ${count === 0 ? "animate-pulse" : ""}`}
                fill={count > 0 ? "currentColor" : "none"}
              />
              <span className="font-semibold">{label}</span>
              {count > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Button>
          </Link>
        </TooltipTrigger>
        {count === 0 && (
          <TooltipContent side="left" className="max-w-[220px] text-center">
            {t("wishlist.floating.tooltip")}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
