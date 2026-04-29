import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type ItineraryDay } from "@/data/itineraries";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { MapPin, Clock, Mountain, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import { storageUrl } from "@/lib/storage";

const difficultyConfig = {
  facil: { pt: "Fácil", en: "Easy", es: "Fácil", color: "text-green-600 bg-green-100" },
  moderado: { pt: "Moderado", en: "Moderate", es: "Moderado", color: "text-amber-600 bg-amber-100" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil", color: "text-red-600 bg-red-100" },
};

const labels = {
  pt: { difficulty: "Dificuldade", attractions: "Atrativos & Detalhes", entrance: "Ingresso", voluntary: "Voluntário" },
  en: { difficulty: "Difficulty", attractions: "Attractions & Details", entrance: "Entrance fee", voluntary: "Voluntary" },
  es: { difficulty: "Dificultad", attractions: "Atractivos y Detalles", entrance: "Entrada", voluntary: "Voluntario" },
};

/** Build 3-photo gallery dynamically from the waterfall's imageKey */
function buildGallery(imageKey: string): string[] {
  return [1, 2, 3].map((n) => storageUrl(`cachoeiras/${imageKey}-${n}.jpg`));
}

interface DayDetailDialogProps {
  day: ItineraryDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DayDetailDialog({ day, open, onOpenChange }: DayDetailDialogProps) {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!day) return null;

  const diff = difficultyConfig[day.difficulty];
  const l = labels[language];
  const gallery = buildGallery(day.imageKey);

  const goNext = () => setCurrentSlide((prev) => (prev + 1) % gallery.length);
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setCurrentSlide(0);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Image carousel */}
        <div className="relative h-56 sm:h-72 overflow-hidden">
          {gallery.map((url, idx) => (
            <img
              key={url}
              src={url}
              alt={`${day.title[language]} — ${idx + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Navigation arrows */}
          {gallery.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-1.5 transition-colors z-10"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-1.5 transition-colors z-10"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {gallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentSlide
                        ? "bg-white w-4"
                        : "bg-white/50 hover:bg-white/70"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-2xl font-bold drop-shadow-lg">{day.title[language]}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${diff.color}`}>
                <Mountain className="h-3 w-3" />
                {diff[language]}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                <Ticket className="h-3 w-3" />
                {day.voluntaryFee ? l.voluntary : `R$ ${day.entranceFee}`}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {day.description[language]}
          </p>

          {/* Attractions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              {l.attractions}
            </h3>
            <ul className="space-y-2">
              {day.attractions[language].map((attr, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  {attr}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
