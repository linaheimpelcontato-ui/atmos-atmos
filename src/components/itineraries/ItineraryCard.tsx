import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Itinerary, type ItineraryDay } from "@/data/itineraries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Check, Mountain, Flame, Truck, Car, Ticket, Footprints } from "lucide-react";
import HelmetIcon from "@/components/icons/HelmetIcon";
import { toast } from "@/hooks/use-toast";
import DayDetailDialog from "./DayDetailDialog";
import { dayImages, getDayImage } from "./dayImages";
import { getItineraryImage } from "./itineraryImages";
import { OptimizedImage } from "../ui/OptimizedImage";

const difficultyConfig = {
  facil: { labelPt: "Fácil", labelEn: "Easy", labelEs: "Fácil", color: "text-green-600 bg-green-100" },
  moderado: { labelPt: "Moderado", labelEn: "Moderate", labelEs: "Moderado", color: "text-amber-600 bg-amber-100" },
  dificil: { labelPt: "Difícil", labelEn: "Hard", labelEs: "Difícil", color: "text-red-600 bg-red-100" },
};

const labels = {
  pt: {
    days: "dias",
    classico: "Clássico",
    jurassico: "Jurássico",
    pricing: "Valores por pessoa",
    atmos4x4: "ATMOS 4x4",
    carroProprio: "Carro próprio",
    individual: "Individual",
    dupla: "Dupla",
    trioPlus: "3+ pessoas",
    inclusions: "O que está incluso",
    addWishlist: "Adicionar na Wishlist",
    removeWishlist: "Remover da Wishlist",
    added: "Roteiro adicionado na wishlist!",
    removed: "Roteiro removido da wishlist.",
    clickToSeeMore: "Clique para ver detalhes",
    entranceFees: "Ingressos dos atrativos",
    equipmentFees: "Equipamentos do Dragão",
    chargedSeparately: "cobrados à parte",
    chargedSeparatelyTitle: "Cobrados à parte",
  },
  en: {
    days: "days",
    classico: "Classic",
    jurassico: "Jurassic",
    pricing: "Price per person",
    atmos4x4: "ATMOS 4x4",
    carroProprio: "Own vehicle",
    individual: "Solo",
    dupla: "Duo",
    trioPlus: "3+ people",
    inclusions: "What's included",
    addWishlist: "Add to Wishlist",
    removeWishlist: "Remove from Wishlist",
    added: "Itinerary added to wishlist!",
    removed: "Itinerary removed from wishlist.",
    clickToSeeMore: "Click to see details",
    entranceFees: "Attraction entrance fees",
    equipmentFees: "Dragão equipment",
    chargedSeparately: "charged separately",
    chargedSeparatelyTitle: "Charged separately",
  },
  es: {
    days: "días",
    classico: "Clásico",
    jurassico: "Jurásico",
    pricing: "Precio por persona",
    atmos4x4: "ATMOS 4x4",
    carroProprio: "Vehículo propio",
    individual: "Individual",
    dupla: "Dúo",
    trioPlus: "3+ personas",
    inclusions: "Qué incluye",
    addWishlist: "Agregar a la Wishlist",
    removeWishlist: "Quitar de la Wishlist",
    added: "¡Itinerario agregado a la wishlist!",
    removed: "Itinerario quitado de la wishlist.",
    clickToSeeMore: "Clic para ver detalles",
    entranceFees: "Entradas a los atractivos",
    equipmentFees: "Equipos del Dragão",
    chargedSeparately: "cobrados aparte",
    chargedSeparatelyTitle: "Cobrados aparte",
  },
};

interface ItineraryCardProps {
  itinerary: Itinerary;
}

export default function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const [selectedDay, setSelectedDay] = useState<ItineraryDay | null>(null);

  const l = labels[language as keyof typeof labels] || labels.pt;
  const inWishlist = isInWishlist(itinerary.id);
  const isJurassico = itinerary.category === "jurassico";

  const toggleWishlist = () => {
    if (inWishlist) {
      removeItem(itinerary.id);
      toast({ title: l.removed });
    } else {
      addItem({
        id: itinerary.id,
        type: "itinerary",
        name: itinerary.name[language],
        details: `${itinerary.duration} ${l.days} — ${isJurassico ? l.jurassico : l.classico}`,
        imageUrl: getItineraryImage(itinerary.id),
      });
      toast({ title: l.added });
    }
  };

  const getDiffLabel = (diff: string) => {
    const cfg = difficultyConfig[diff as keyof typeof difficultyConfig];
    if (!cfg) return diff;
    if (language === "en") return cfg.labelEn;
    if (language === "es") return cfg.labelEs;
    return cfg.labelPt;
  };

  const formatPrice = (price: number) =>
    `R$ ${price.toLocaleString("pt-BR")}`;

  return (
    <div className="flex flex-col h-full">
      {/* Category badge above card */}
      <div className="text-center mb-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isJurassico
            ? "bg-red-900 text-white"
            : "bg-[#556952] text-white"
        }`}>
          {isJurassico ? <Flame className="h-3.5 w-3.5" /> : <Mountain className="h-3.5 w-3.5" />}
          {isJurassico ? l.jurassico : l.classico}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isJurassico ? (language === "en" ? "Moderate to hard — for adventurers" : language === "es" ? "Moderado a difícil — para aventureros" : "Moderado a difícil — para aventureiros") : (language === "en" ? "Easy to moderate — for all profiles" : language === "es" ? "Fácil a moderado — para todos los perfiles" : "Fácil a moderado — para todos os perfis")}
        </p>
      </div>
      <Card className="overflow-hidden border-none shadow-lg group ring-1 ring-border-accent/20 hover:ring-border-accent/40 transition-all flex flex-col flex-1">
        {/* Hero Image — clickable to detail page */}
        <div
          className="relative h-64 overflow-hidden cursor-pointer"
          onClick={() => navigate(`/roteiros/${itinerary.id}`)}
        >
          <OptimizedImage
            src={getItineraryImage(itinerary.id, itinerary.name.pt)}
            alt={itinerary.name[language]}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            containerClassName="absolute inset-0"
            fallbackSrc="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A261B]/80 via-[#1A261B]/20 to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-6 left-6">
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md border border-white/10 shadow-lg transition-colors",
              isJurassico ? "bg-rose-900/40 text-white" : "bg-[#1A261B]/40 text-white"
            )}>
              {isJurassico ? <Flame className="h-3 w-3" /> : <Mountain className="h-3 w-3" />}
              {isJurassico ? l.jurassico : l.classico}
            </span>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h3 className="text-3xl font-display mb-2 drop-shadow-sm leading-tight">
              {itinerary.name[language]}
            </h3>
            <p className="text-sm font-light text-white/70 italic leading-relaxed line-clamp-2">
              {itinerary.description[language]}
            </p>
          </div>
        </div>

        <CardContent className="p-6 flex flex-col flex-1 gap-5">
          {/* Day list — clickable to open dialog */}
          <div className="space-y-2">
            {itinerary.days.map((day, idx) => {
              const diff = difficultyConfig[day.difficulty];
              return (
                <button
                  key={idx}
                  className="w-full flex items-center gap-3 p-2 border rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left cursor-pointer group/day"
                  onClick={() => setSelectedDay(day)}
                >
                  {/* Day thumbnail */}
                  <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                    <OptimizedImage
                      src={getDayImage(day.imageKey, day.title[language])}
                      alt={day.title[language]}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground leading-tight">{day.title[language]}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.color}`}>
                        {getDiffLabel(day.difficulty)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0 ml-auto">
                    <Footprints className="h-3 w-3" />
                    {day.trailDistanceKm}km
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pricing Table */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{l.pricing}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] md:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-medium text-muted-foreground"></th>
                    <th className="text-center py-2 px-1 md:px-2 font-medium text-muted-foreground whitespace-nowrap">{l.individual}</th>
                    <th className="text-center py-2 px-1 md:px-2 font-medium text-muted-foreground whitespace-nowrap">{l.dupla}</th>
                    <th className="text-center py-2 px-1 md:px-2 font-medium text-muted-foreground whitespace-nowrap">{l.trioPlus}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2.5 pr-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                        <span>{l.atmos4x4}</span>
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-1 md:px-2 font-semibold whitespace-nowrap">{formatPrice(itinerary.pricing.atmos4x4.individual)}</td>
                    <td className="text-center py-2.5 px-1 md:px-2 font-semibold whitespace-nowrap">{formatPrice(itinerary.pricing.atmos4x4.dupla)}</td>
                    <td className="text-center py-2.5 px-1 md:px-2 font-semibold whitespace-nowrap">{formatPrice(itinerary.pricing.atmos4x4.trio)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                        <span>{l.carroProprio}</span>
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-1 md:px-2 whitespace-nowrap">{formatPrice(itinerary.pricing.carroProprio.individual)}</td>
                    <td className="text-center py-2.5 px-1 md:px-2 whitespace-nowrap">{formatPrice(itinerary.pricing.carroProprio.dupla)}</td>
                    <td className="text-center py-2.5 px-1 md:px-2 whitespace-nowrap">{formatPrice(itinerary.pricing.carroProprio.trio)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inclusions */}
          <div>
            <h4 className="font-semibold text-sm mb-2">{l.inclusions}</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {itinerary.inclusions[language].map((inc, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>

          {/* Extra Costs */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
            <h4 className="font-semibold text-xs mb-1 text-muted-foreground">{l.chargedSeparatelyTitle}</h4>
            <div className="flex items-center gap-2 text-xs">
              <Ticket className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{l.entranceFees}</span>
              <span className="font-semibold text-foreground ml-auto whitespace-nowrap">{formatPrice(itinerary.extraCosts.entranceFees)}</span>
            </div>
            {itinerary.extraCosts.equipmentFees && (
              <div className="flex items-center gap-2 text-xs">
                <HelmetIcon size={14} className="text-accent flex-shrink-0" />
                <span className="text-muted-foreground">{l.equipmentFees}</span>
                <span className="font-semibold text-foreground ml-auto whitespace-nowrap">{formatPrice(itinerary.extraCosts.equipmentFees)}</span>
              </div>
            )}
            {itinerary.extraCosts.equipmentItems && (
              <p className="text-xs text-muted-foreground pl-5">{itinerary.extraCosts.equipmentItems[language]}</p>
            )}
          </div>

          {/* Wishlist button */}
          <div className="mt-auto pt-2">
            <Button
              onClick={toggleWishlist}
              className={`w-full rounded-full gap-2 ${
                inWishlist
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
            >
              <Heart className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} />
              {inWishlist ? l.removeWishlist : l.addWishlist}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <DayDetailDialog
        day={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </div>
  );
}
