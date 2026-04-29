import { useState } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { CalendarIcon, ArrowRight, ArrowLeft, Check, Info } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { type Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────── */

export interface QuoteAnswers {
  profileType: string;
  status: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  numDays: string;
  groupSize: string;
  children: string;
  mobility: string;
  mobilityDetails: string;
  transport: string;
  hasAccommodation: string;
  accommodationLocation: string;
  notes: string;
}

export const emptyAnswers: QuoteAnswers = {
  profileType: "",
  status: "",
  startDate: undefined,
  endDate: undefined,
  numDays: "",
  groupSize: "",
  children: "",
  mobility: "",
  mobilityDetails: "",
  transport: "",
  hasAccommodation: "",
  accommodationLocation: "",
  notes: "",
};

interface Props {
  language: Language;
  onComplete: (answers: QuoteAnswers) => void;
  onCancel: () => void;
  onSwitchToImmersion?: () => void;
}

/* ── i18n helper ────────────────────────────────────────── */

const txt = (lang: Language, pt: string, en: string, esStr: string) =>
  lang === "en" ? en : lang === "es" ? esStr : pt;

const dateLocale = (lang: Language) =>
  lang === "en" ? enUS : lang === "es" ? es : ptBR;

/* ── Question definitions ───────────────────────────────── */

interface RadioOption {
  label: string;
  description?: string;
}

interface QuestionDef {
  id: keyof QuoteAnswers;
  question: Record<Language, string>;
  subtitle?: Record<Language, string>;
  type: "radio" | "date" | "daterange" | "number" | "text" | "textarea" | "radio-described";
  options?: Record<Language, string[]>;
  describedOptions?: Record<Language, RadioOption[]>;
  conditional?: (answers: QuoteAnswers) => boolean;
  placeholder?: Record<Language, string>;
  allowUnsure?: boolean;
}

const questions: QuestionDef[] = [
  {
    id: "profileType",
    question: {
      pt: "Qual é o seu perfil?",
      en: "What is your profile?",
      es: "¿Cuál es tu perfil?",
    },
    type: "radio-described",
    describedOptions: {
      pt: [
        { label: "Turista", description: "Viagem pessoal, casal, família ou amigos" },
        { label: "Grupo/Imersão", description: "Grupo corporativo, retiro, evento ou imersão transformacional" },
      ],
      en: [
        { label: "Tourist", description: "Personal trip, couple, family or friends" },
        { label: "Group/Immersion", description: "Corporate group, retreat, event or transformational immersion" },
      ],
      es: [
        { label: "Turista", description: "Viaje personal, pareja, familia o amigos" },
        { label: "Grupo/Inmersión", description: "Grupo corporativo, retiro, evento o inmersión transformacional" },
      ],
    },
  },
  {
    id: "status",
    question: {
      pt: "Você já está na Chapada ou está planejando viagem?",
      en: "Are you already in Chapada or planning a trip?",
      es: "¿Ya estás en Chapada o estás planificando un viaje?",
    },
    type: "radio",
    options: {
      pt: ["Já estou na Chapada", "Estou planejando viagem"],
      en: ["I'm already in Chapada", "I'm planning a trip"],
      es: ["Ya estoy en Chapada", "Estoy planificando viaje"],
    },
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "startDate",
    question: {
      pt: "Quando vai ser sua viagem?",
      en: "When is your trip?",
      es: "¿Cuándo será tu viaje?",
    },
    type: "daterange",
    allowUnsure: true,
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "numDays",
    question: {
      pt: "Quantos dias de passeio pretende fazer?",
      en: "How many days of tours do you plan?",
      es: "¿Cuántos días de paseo planeas hacer?",
    },
    type: "number",
    placeholder: {
      pt: "Ex: 3",
      en: "E.g.: 3",
      es: "Ej: 3",
    },
    allowUnsure: true,
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "groupSize",
    question: {
      pt: "Quantas pessoas tem no seu grupo?",
      en: "How many people are in your group?",
      es: "¿Cuántas personas hay en tu grupo?",
    },
    type: "number",
    placeholder: {
      pt: "Ex: 4",
      en: "E.g.: 4",
      es: "Ej: 4",
    },
    allowUnsure: true,
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "children",
    question: {
      pt: "Seu grupo possui crianças?",
      en: "Are there children in your group?",
      es: "¿Hay niños en tu grupo?",
    },
    type: "radio",
    options: {
      pt: ["Não tem crianças", "Menores de 10 anos", "Acima de 10 anos", "Ainda não sei"],
      en: ["No children", "Under 10 years old", "Over 10 years old", "Not sure yet"],
      es: ["No hay niños", "Menores de 10 años", "Mayores de 10 años", "Aún no sé"],
    },
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "mobility",
    question: {
      pt: "Dificuldade de mobilidade?",
      en: "Mobility difficulty?",
      es: "¿Dificultad de movilidad?",
    },
    subtitle: {
      pt: "Alguém no seu grupo possui alguma operação recente ou dificuldade de locomoção?",
      en: "Does anyone in your group have a recent surgery or difficulty moving?",
      es: "¿Alguien en tu grupo tiene una operación reciente o dificultad para moverse?",
    },
    type: "radio",
    options: {
      pt: ["Não", "Sim", "Não sei"],
      en: ["No", "Yes", "Not sure"],
      es: ["No", "Sí", "No sé"],
    },
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "mobilityDetails",
    question: {
      pt: "Conte-nos mais sobre a dificuldade",
      en: "Tell us more about the difficulty",
      es: "Cuéntanos más sobre la dificultad",
    },
    type: "textarea",
    placeholder: {
      pt: "Descreva brevemente para ajudarmos na logística...",
      en: "Briefly describe to help us with logistics...",
      es: "Describe brevemente para ayudarnos con la logística...",
    },
    conditional: (a) =>
      !isImmersionProfile(a) &&
      (a.mobility === "Sim" || a.mobility === "Yes" || a.mobility === "Sí"),
  },
  {
    id: "transport",
    question: {
      pt: "Logística de Transporte",
      en: "Transport Logistics",
      es: "Logística de Transporte",
    },
    subtitle: {
      pt: "A Atmos sugere sempre passeios com o 4x4 do guia para maior conforto e segurança.",
      en: "Atmos always suggests tours with the guide's 4x4 for greater comfort and safety.",
      es: "Atmos siempre sugiere recorridos con el 4x4 del guía para mayor comodidad y seguridad.",
    },
    type: "radio",
    options: {
      pt: ["4x4 do guia", "Carro próprio", "4x4 próprio", "Ainda não sei"],
      en: ["Guide's 4x4", "Own car", "Own 4x4", "Not sure yet"],
      es: ["4x4 del guía", "Carro propio", "4x4 propio", "Aún no sé"],
    },
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "hasAccommodation",
    question: {
      pt: "Hospedagem reservada?",
      en: "Accommodation booked?",
      es: "¿Hospedaje reservado?",
    },
    type: "radio",
    options: {
      pt: ["Não", "Sim", "Ainda não sei"],
      en: ["No", "Yes", "Not sure yet"],
      es: ["No", "Sí", "Aún no sé"],
    },
    conditional: (a) => !isImmersionProfile(a),
  },
  {
    id: "accommodationLocation",
    question: {
      pt: "Localização da hospedagem",
      en: "Accommodation location",
      es: "Ubicación del hospedaje",
    },
    type: "radio",
    options: {
      pt: ["Alto Paraíso", "Cavalcante", "São Jorge"],
      en: ["Alto Paraíso", "Cavalcante", "São Jorge"],
      es: ["Alto Paraíso", "Cavalcante", "São Jorge"],
    },
    conditional: (a) =>
      !isImmersionProfile(a) &&
      (a.hasAccommodation === "Sim" || a.hasAccommodation === "Yes" || a.hasAccommodation === "Sí"),
  },
  {
    id: "notes",
    question: {
      pt: "Alguma observação especial?",
      en: "Any special notes?",
      es: "¿Alguna observación especial?",
    },
    type: "textarea",
    placeholder: {
      pt: "Opcional — conte-nos o que mais importa para você ou se tem alguma restrição alimentar...",
      en: "Optional — tell us what matters most or if you have dietary restrictions...",
      es: "Opcional — cuéntanos lo que más importa o si tienes restricciones dietéticas...",
    },
    conditional: (a) => !isImmersionProfile(a),
  },
];

/* ── Helper to check immersion profile ── */

function isImmersionProfile(a: QuoteAnswers): boolean {
  return (
    a.profileType === "Grupo/Imersão" ||
    a.profileType === "Group/Immersion" ||
    a.profileType === "Grupo/Inmersión"
  );
}

/* ── Component ──────────────────────────────────────────── */

export default function QuoteQuestionnaire({ language, onComplete, onCancel, onSwitchToImmersion }: Props) {
  const [answers, setAnswers] = useState<QuoteAnswers>({ ...emptyAnswers });
  const [unsureFields, setUnsureFields] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  // Filter visible questions based on conditionals
  const visibleQuestions = questions.filter(
    (q) => !q.conditional || q.conditional(answers)
  );

  const current = visibleQuestions[currentStep];
  const isLast = currentStep === visibleQuestions.length - 1;
  const isFirst = currentStep === 0;

  const canProceed = () => {
    if (!current) return false;
    if (unsureFields.has(current.id)) return true;
    const val = answers[current.id];
    if (current.id === "notes" || current.id === "mobilityDetails") return true;
    if (current.type === "date") return !!val;
    if (current.type === "daterange") return !!answers.startDate && !!answers.endDate;
    if (typeof val === "string") return val.trim().length > 0;
    return !!val;
  };

  const setValue = (value: string | Date | undefined) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setUnsureFields((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
  };

  const setDateRange = (range: DateRange | undefined) => {
    setAnswers((prev) => ({ ...prev, startDate: range?.from, endDate: range?.to }));
    setUnsureFields((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
  };

  const markUnsure = () => {
    const unsureLabel = txt(language, "Ainda não sei", "Not sure yet", "Aún no sé");
    setUnsureFields((prev) => new Set(prev).add(current.id));
    if (current.type === "date" || current.type === "daterange") {
      setAnswers((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
    } else {
      setAnswers((prev) => ({ ...prev, [current.id]: unsureLabel }));
    }
  };

  const handleNext = () => {
    if (current.id === "profileType" && isImmersionProfile(answers)) {
      onSwitchToImmersion?.();
      return;
    }

    if (isLast) {
      onComplete(answers);
    } else {
      setCurrentStep((s) => Math.min(s + 1, visibleQuestions.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  if (!current) return null;

  const progress = ((currentStep + 1) / visibleQuestions.length) * 100;

  return (
    <div className="bg-white border border-[#1A261B]/5 rounded-[2px] p-6 md:p-10 shadow-sm transition-all duration-500">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[#1A261B]/40 font-bold">
          {currentStep + 1} / {visibleQuestions.length}
        </span>
        <button
          onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-[#1A261B]/40 hover:text-[#1A261B] transition-colors font-bold"
        >
          {txt(language, "Cancelar", "Cancel", "Cancelar")}
        </button>
      </div>
      <div className="w-full bg-[#1A261B]/5 rounded-full h-1.5 mb-8">
        <div
          className="bg-[#1A261B] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl md:text-2xl font-display text-[#1A261B] mb-3 leading-tight">
          {current.question[language]}
        </h3>
        {current.subtitle && (
          <div className="flex gap-2 items-start opacity-60">
            <Info className="h-3 w-3 mt-1 flex-shrink-0 text-[#1A261B]" />
            <p className="text-sm font-light text-[#1A261B]">
              {current.subtitle[language]}
            </p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mb-10 min-h-[120px]">
        {/* Radio with descriptions */}
        {current.type === "radio-described" && current.describedOptions && (
          <div className="space-y-3">
            {current.describedOptions[language].map((option) => {
              const selected = answers[current.id] === option.label;
              return (
                <button
                  key={option.label}
                  onClick={() => setValue(option.label)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-[2px] border transition-all",
                    selected
                      ? "border-[#1A261B] bg-[#1A261B]/5 shadow-sm"
                      : "border-[#1A261B]/10 bg-background hover:border-[#1A261B]/30 hover:bg-[#1A261B]/[0.02]"
                  )}
                >
                  <span className="block text-sm font-bold uppercase tracking-widest text-[#1A261B]">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block text-xs text-[#1A261B]/40 mt-1 font-light">
                      {option.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Radio options */}
        {current.type === "radio" && current.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.options[language].map((option) => {
              const selected = answers[current.id] === option;
              return (
                <button
                  key={option}
                  onClick={() => setValue(option)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-[2px] border transition-all text-[11px] font-bold uppercase tracking-widest",
                    selected
                      ? "border-[#1A261B] bg-[#1A261B] text-white shadow-md"
                      : "border-[#1A261B]/10 bg-background text-[#1A261B]/60 hover:border-[#1A261B]/30 hover:bg-[#1A261B]/[0.02]"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {/* Date range picker */}
        {current.type === "daterange" && (
          <div className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-bold h-14 rounded-[2px] border-[#1A261B]/10 px-5",
                    !answers.startDate && "text-[#1A261B]/30"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 text-[#1A261B]/40" />
                  <span className="text-[11px] uppercase tracking-widest">
                    {answers.startDate && answers.endDate
                      ? `${format(answers.startDate, "dd/MM/yyyy")} – ${format(answers.endDate, "dd/MM/yyyy")}`
                      : txt(language, "Selecione o período", "Select period", "Selecciona el período")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={answers.startDate ? { from: answers.startDate, to: answers.endDate } : undefined}
                  onSelect={setDateRange}
                  disabled={(date) => date < new Date()}
                  numberOfMonths={2}
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Number input */}
        {current.type === "number" && (
          <div className="space-y-3">
            <Input
              type="number"
              value={unsureFields.has(current.id) ? "" : (answers[current.id] as string)}
              onChange={(e) => setValue(e.target.value)}
              placeholder={current.placeholder?.[language]}
              className="h-14 text-xl font-display border-[#1A261B]/10 rounded-[2px] px-5 focus-visible:ring-[#1A261B]"
            />
          </div>
        )}

        {/* Textarea */}
        {current.type === "textarea" && (
          <Textarea
            value={answers[current.id] as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder={current.placeholder?.[language]}
            rows={4}
            className="text-base font-light border-[#1A261B]/10 rounded-[2px] p-5 focus-visible:ring-[#1A261B] resize-none"
          />
        )}

        {/* Allow Unsure Button for generic steps */}
        {current.allowUnsure && (current.type === "daterange" || current.type === "number") && (
          <button
            onClick={markUnsure}
            className={cn(
              "mt-4 w-full text-left px-5 py-3 rounded-[2px] border transition-all text-[10px] font-bold uppercase tracking-widest",
              unsureFields.has(current.id)
                ? "border-[#1A261B] bg-[#1A261B] text-white"
                : "border-[#1A261B]/10 text-[#1A261B]/30 hover:border-[#1A261B]/30"
            )}
          >
            {txt(language, "Ainda não sei", "Not sure yet", "Aún no sé")}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-[#1A261B]/5">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isFirst}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A261B]/40 hover:text-[#1A261B]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {txt(language, "Voltar", "Back", "Volver")}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="rounded-full px-10 py-6 bg-[#1A261B] text-white hover:bg-black font-bold uppercase tracking-[0.2em] text-[10px] shadow-lg transition-all"
        >
          {isLast ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              {txt(language, "Prosseguir para Roteiro", "Proceed to Itinerary", "Prosseguir")}
            </>
          ) : (
            <>
              {txt(language, "Próxima", "Next", "Siguiente")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
