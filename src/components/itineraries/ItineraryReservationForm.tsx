import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { CalendarIcon, ArrowRight, ArrowLeft, Check, Info, ShieldCheck, Wallet, Calendar as CalendarIconLucide, MessageCircle } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { trackQuoteSubmit, trackWhatsAppClick } from "@/lib/analytics";

export interface ReservationAnswers {
  profileType: string;
  status: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  groupSize: string;
  children: string;
  mobility: string;
  mobilityDetails: string;
  transport: string;
  hasAccommodation: string;
  accommodationLocation: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyAnswers = (user: any): ReservationAnswers => ({
  profileType: "",
  status: "",
  startDate: undefined,
  endDate: undefined,
  groupSize: "",
  children: "",
  mobility: "",
  mobilityDetails: "",
  transport: "",
  hasAccommodation: "",
  accommodationLocation: "",
  name: user?.user_metadata?.full_name || "",
  email: user?.email || "",
  phone: user?.user_metadata?.phone || "",
  notes: "",
});

interface Props {
  itinerary: any;
  language: Language;
  onClose: () => void;
}

const txt = (lang: Language, pt: string, en: string, esStr: string) =>
  lang === "en" ? en : lang === "es" ? esStr : pt;

const dateLocale = (lang: Language) =>
  lang === "en" ? enUS : lang === "es" ? es : ptBR;

const signalIntent = (lang: Language) => txt(
  lang,
  "\n\n*Estou ciente do sinal de compromisso (R$ 1.500) para garantir a exclusividade da curadoria e agendamento.*",
  "\n\n*I am aware of the commitment deposit (R$ 1,500) to ensure curation exclusivity and scheduling.*",
  "\n\n*Soy consciente de la señal de compromiso (R$ 1.500) para garantizar la exclusividad de la curaduría y programación.*"
);

function buildWhatsAppMessage(
  itinerary: any,
  answers: ReservationAnswers,
  lang: Language
) {
  const greeting = txt(
    lang,
    `Olá! Gostaria de solicitar reserva para o roteiro: *${itinerary.title.pt}* (${itinerary.duration} dias). Seguem minhas informações:`,
    `Hello! I'd like to request a reservation for the itinerary: *${itinerary.title.pt}* (${itinerary.duration} days). Here are my details:`,
    `¡Hola! Me gustaría solicitar una reserva para el itinerario: *${itinerary.title.pt}* (${itinerary.duration} días). Aquí mis datos:`
  );

  const answerLines: string[] = [];
  if (answers.name) answerLines.push(`• ${txt(lang, "Nome", "Name", "Nombre")}: ${answers.name}`);
  if (answers.email) answerLines.push(`• ${txt(lang, "Email", "Email", "Email")}: ${answers.email}`);
  if (answers.phone) answerLines.push(`• ${txt(lang, "Telefone", "Phone", "Teléfono")}: ${answers.phone}`);
  if (answers.profileType) answerLines.push(`• ${txt(lang, "Perfil", "Profile", "Perfil")}: ${answers.profileType}`);
  if (answers.status) answerLines.push(`• ${txt(lang, "Situação", "Status", "Situación")}: ${answers.status}`);
  if (answers.startDate) {
    const startFormatted = format(answers.startDate, "PPP", { locale: dateLocale(lang) });
    if (answers.endDate) {
      const endFormatted = format(answers.endDate, "PPP", { locale: dateLocale(lang) });
      answerLines.push(`• ${txt(lang, "Período", "Period", "Período")}: ${startFormatted} – ${endFormatted}`);
    } else {
      answerLines.push(`• ${txt(lang, "Data de início", "Start date", "Fecha de inicio")}: ${startFormatted}`);
    }
  }
  answerLines.push(`• ${txt(lang, "Roteiro Selecionado", "Selected Itinerary", "Itinerario Seleccionado")}: ${itinerary.title.pt} (${itinerary.duration} dias)`);
  if (answers.groupSize) answerLines.push(`• ${txt(lang, "Pessoas no grupo", "People in group", "Personas en el grupo")}: ${answers.groupSize}`);
  if (answers.children) answerLines.push(`• ${txt(lang, "Crianças", "Children", "Niños")}: ${answers.children}`);
  if (answers.mobility) answerLines.push(`• ${txt(lang, "Mobilidade", "Mobility", "Movilidad")}: ${answers.mobility}${answers.mobilityDetails ? ` (${answers.mobilityDetails})` : ""}`);
  if (answers.transport) answerLines.push(`• ${txt(lang, "Transporte", "Transport", "Transporte")}: ${answers.transport}`);
  if (answers.hasAccommodation) answerLines.push(`• ${txt(lang, "Hospedagem reservada", "Accommodation booked", "Hospedaje reservado")}: ${answers.hasAccommodation}${answers.accommodationLocation ? ` (${answers.accommodationLocation})` : ""}`);
  if (answers.notes) answerLines.push(`• ${txt(lang, "Observações", "Notes", "Observaciones")}: ${answers.notes}`);

  const answersBlock = `*${txt(lang, "Minhas informações", "My details", "Mis datos")}*\n${answerLines.join("\n")}`;

  const closing = txt(lang, "Aguardo retorno para prosseguirmos com a reserva. Obrigado(a)!", "Looking forward to booking. Thanks!", "Espero su respuesta para proceder con la reserva. ¡Gracias!");
  return [greeting, answersBlock, closing, signalIntent(lang)].filter(Boolean).join("\n\n");
}

interface QuestionDef {
  id: keyof ReservationAnswers;
  question: Record<Language, string>;
  subtitle?: Record<Language, string>;
  type: "radio" | "date" | "daterange" | "number" | "text" | "textarea" | "radio-described";
  options?: Record<Language, string[]>;
  describedOptions?: Record<Language, { label: string; description?: string }[]>;
  conditional?: (answers: ReservationAnswers) => boolean;
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
    conditional: (a) => a.mobility === "Sim" || a.mobility === "Yes" || a.mobility === "Sí",
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
    conditional: (a) => a.hasAccommodation === "Sim" || a.hasAccommodation === "Yes" || a.hasAccommodation === "Sí",
  },
  {
    id: "name",
    question: {
      pt: "Como podemos te chamar?",
      en: "What should we call you?",
      es: "¿Cómo te podemos llamar?",
    },
    type: "text",
    placeholder: {
      pt: "Seu nome completo",
      en: "Your full name",
      es: "Tu nombre completo",
    },
  },
  {
    id: "email",
    question: {
      pt: "Qual o seu melhor e-mail?",
      en: "What is your best email?",
      es: "¿Cuál es tu mejor correo electrónico?",
    },
    type: "text",
    placeholder: {
      pt: "exemplo@email.com",
      en: "example@email.com",
      es: "ejemplo@correo.com",
    },
  },
  {
    id: "phone",
    question: {
      pt: "Qual o seu WhatsApp para contato?",
      en: "What is your WhatsApp number?",
      es: "¿Cuál es tu WhatsApp de contacto?",
    },
    type: "text",
    placeholder: {
      pt: "Ex: (11) 99999-9999",
      en: "E.g.: +1 (555) 123-4567",
      es: "Ej: +34 600 000 000",
    },
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
  },
];

export default function ItineraryReservationForm({ itinerary, language, onClose }: Props) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<ReservationAnswers>(emptyAnswers(user));
  const [unsureFields, setUnsureFields] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isLast) {
      setShowOnboarding(true);
    } else {
      setCurrentStep((s) => Math.min(s + 1, visibleQuestions.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleOnboardingConfirm = async () => {
    setIsSubmitting(true);
    try {
      const normalizedEmail = answers.email.toLowerCase();
      const quoteData = {
        user_id: user?.id ?? null,
        user_name: answers.name,
        user_email: normalizedEmail,
        user_phone: answers.phone,
        items: [{
          type: "itinerary",
          id: itinerary.id,
          name: itinerary.title[language as keyof typeof itinerary.title] || itinerary.title.pt,
          details: `${itinerary.duration} dias`
        }],
        answers: answers,
        status: "pending",
        language,
      };

      const { error } = await supabase.from("quote_requests").insert(quoteData);

      if (error) {
        console.error("Error saving quote request:", error);
      } else {
        // Update the prospect's tags to include this itinerary's tag
        setTimeout(async () => {
          try {
            const { data: prospect } = await supabase
              .from("prospects")
              .select("id, tags")
              .eq("email", normalizedEmail)
              .maybeSingle();

            if (prospect) {
              const existingTags = prospect.tags || [];
              const newTags = Array.from(new Set([...existingTags, "turista", itinerary.id]));
              await supabase
                .from("prospects")
                .update({
                  name: answers.name,
                  phone: answers.phone,
                  tags: newTags,
                  notes: `Solicitou reserva para o roteiro: ${itinerary.title.pt}`
                })
                .eq("id", prospect.id);
            }
          } catch (err) {
            console.error("Error updating prospect tags:", err);
          }
        }, 1000);
      }
    } catch (e) {
      console.error("Exception in onboarding confirm:", e);
    }

    const message = buildWhatsAppMessage(itinerary, answers, language);
    const encoded = encodeURIComponent(message);
    trackQuoteSubmit(1);
    trackWhatsAppClick("reservation_direct");
    window.open(`https://wa.me/5511933697400?text=${encoded}`, "_blank");
    setIsSubmitting(false);
    setShowOnboarding(false);
    onClose();
  };

  if (!current) return null;

  const progress = ((currentStep + 1) / visibleQuestions.length) * 100;

  return (
    <div className="text-[#2e2019]">
      <AnimatePresence mode="wait">
        {!showOnboarding ? (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[#2e2019]/40 font-bold">
                {currentStep + 1} / {visibleQuestions.length}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#c4a97d] font-bold">
                {itinerary.title.pt}
              </span>
            </div>
            <div className="w-full bg-[#2e2019]/5 rounded-full h-1.5">
              <div
                className="bg-[#c4a97d] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Question */}
            <div>
              <h3 className="text-2xl font-display uppercase tracking-tight text-[#2e2019] mb-3 leading-tight font-outfit">
                {current.question[language]}
              </h3>
              {current.subtitle && (
                <div className="flex gap-2 items-start opacity-60">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#2e2019]" />
                  <p className="text-xs font-light text-[#2e2019]">
                    {current.subtitle[language]}
                  </p>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="min-h-[140px] flex flex-col justify-center">
              {/* Radio with descriptions */}
              {current.type === "radio-described" && current.describedOptions && (
                <div className="space-y-3 w-full">
                  {current.describedOptions[language].map((option) => {
                    const selected = answers[current.id] === option.label;
                    return (
                      <button
                        key={option.label}
                        onClick={() => setValue(option.label)}
                        className={cn(
                          "w-full text-left px-6 py-5 rounded-none border transition-all",
                          selected
                            ? "border-[#c4a97d] bg-[#c4a97d]/5 shadow-sm"
                            : "border-[#2e2019]/10 bg-[#fcfaf7] hover:border-[#c4a97d]/50 hover:bg-[#c4a97d]/[0.02]"
                        )}
                      >
                        <span className="block text-xs font-bold uppercase tracking-widest text-[#2e2019]">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="block text-[11px] text-[#2e2019]/50 mt-1 font-light">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {current.options[language].map((option) => {
                    const selected = answers[current.id] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => setValue(option)}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-none border transition-all text-[11px] font-bold uppercase tracking-widest",
                          selected
                            ? "border-[#c4a97d] bg-[#c4a97d] text-white shadow-md"
                            : "border-[#2e2019]/10 bg-[#fcfaf7] text-[#2e2019]/60 hover:border-[#c4a97d]/50 hover:bg-[#c4a97d]/[0.02]"
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
                <div className="space-y-3 w-full">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-bold h-14 rounded-none border-[#2e2019]/10 px-5 bg-[#fcfaf7]",
                          !answers.startDate && "text-[#2e2019]/30"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4 text-[#2e2019]/40" />
                        <span className="text-[11px] uppercase tracking-widest">
                          {answers.startDate && answers.endDate
                            ? `${format(answers.startDate, "dd/MM/yyyy")} – ${format(answers.endDate, "dd/MM/yyyy")}`
                            : txt(language, "Selecione o período", "Select period", "Selecciona el período")}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-none bg-[#fcfaf7] border border-[#e4dbcc]" align="start">
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
                <div className="space-y-3 w-full">
                  <Input
                    type="number"
                    value={unsureFields.has(current.id) ? "" : (answers[current.id] as string)}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={current.placeholder?.[language]}
                    className="h-14 text-xl font-display border-[#2e2019]/10 rounded-none px-5 bg-[#fcfaf7] focus-visible:ring-[#c4a97d]"
                  />
                </div>
              )}

              {/* Generic text input */}
              {current.type === "text" && (
                <div className="space-y-3 w-full">
                  <Input
                    type="text"
                    value={answers[current.id] as string}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={current.placeholder?.[language]}
                    className="h-14 text-base font-light border-[#2e2019]/10 rounded-none px-5 bg-[#fcfaf7] focus-visible:ring-[#c4a97d]"
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
                  className="text-base font-light border-[#2e2019]/10 rounded-none p-5 bg-[#fcfaf7] focus-visible:ring-[#c4a97d] resize-none"
                />
              )}

              {/* Allow Unsure Button for generic steps */}
              {current.allowUnsure && (current.type === "daterange" || current.type === "number") && (
                <button
                  onClick={markUnsure}
                  className={cn(
                    "mt-4 w-full text-left px-5 py-3 rounded-none border transition-all text-[10px] font-bold uppercase tracking-widest",
                    unsureFields.has(current.id)
                      ? "border-[#c4a97d] bg-[#c4a97d] text-white"
                      : "border-[#2e2019]/10 text-[#2e2019]/30 hover:border-[#c4a97d]/50"
                  )}
                >
                  {txt(language, "Ainda não sei", "Not sure yet", "Aún no sé")}
                </button>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-[#2e2019]/5">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isFirst}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2e2019]/40 hover:text-[#2e2019]"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {txt(language, "Voltar", "Back", "Volver")}
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="rounded-none px-10 py-6 bg-[#2e2019] text-white hover:bg-black font-bold uppercase tracking-[0.2em] text-[10px] shadow-lg transition-all"
              >
                {isLast ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {txt(language, "Solicitar Reserva", "Request Reservation", "Solicitar Reserva")}
                  </>
                ) : (
                  <>
                    {txt(language, "Próxima", "Next", "Siguiente")}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8 text-center max-w-lg mx-auto"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c4a97d]/10 mb-2">
              <ShieldCheck className="w-8 h-8 text-[#c4a97d]" />
            </div>

            <h2 className="text-2xl font-display uppercase tracking-tight text-[#2e2019] font-outfit">
              {txt(language, "Como funciona nossa reserva?", "How does our reservation work?", "¿Cómo funciona nuestra reserva?")}
            </h2>

            <p className="text-sm text-[#2e2019]/60 leading-relaxed font-light">
              {txt(
                language,
                "Para garantir a exclusividade e o padrão ATMOS de atendimento, nosso processo de reserva personalizada segue 3 etapas fundamentais:",
                "To ensure ATMOS exclusivity and service standards, our personalized reservation process follows 3 fundamental steps:",
                "Para garantizar la exclusividad y el estándar de atención ATMOS, nuestro proceso de reserva personalizado sigue 3 pasos fundamentales:"
              )}
            </p>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex gap-4 p-4 border border-[#e4dbcc] bg-[#fcfaf7]">
                <div className="w-8 h-8 rounded-none bg-[#2e2019]/5 flex items-center justify-center shrink-0 shadow-sm font-bold text-[#c4a97d]">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#2e2019] mb-1">Confirmação de Disponibilidade</h4>
                  <p className="text-[11px] text-[#2e2019]/60">Analisamos seu grupo e confirmamos a agenda de nossos guias credenciados.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 border border-[#c4a97d]/30 bg-[#c4a97d]/5">
                <div className="w-8 h-8 rounded-none bg-[#c4a97d]/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-[#c4a97d]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#2e2019] mb-1">Sinal de Curadoria (R$ 1.500)</h4>
                  <p className="text-[11px] text-[#2e2019]/80">Para garantir o bloqueio da agenda e iniciar a curadoria fina de hospedagens, solicitamos o sinal (100% abatido do valor final).</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 border border-[#e4dbcc] bg-[#fcfaf7] opacity-60">
                <div className="w-8 h-8 rounded-none bg-[#2e2019]/5 flex items-center justify-center shrink-0 text-muted-foreground">
                  <CalendarIconLucide className="w-4 h-4 text-[#2e2019]/40" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#2e2019] mb-1">Contrato & Entrega</h4>
                  <p className="text-[11px] text-[#2e2019]/60">Emitimos o contrato de prestação de serviços e entregamos seu roteiro mestre completo.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-[#2e2019]/5">
              <Button
                variant="ghost"
                onClick={() => setShowOnboarding(false)}
                className="rounded-none px-8 h-12 order-2 sm:order-1 text-[10px] uppercase font-bold tracking-widest text-[#2e2019]/40 hover:text-[#2e2019]"
                disabled={isSubmitting}
              >
                {txt(language, "Voltar", "Back", "Volver")}
              </Button>
              <Button
                onClick={handleOnboardingConfirm}
                className="bg-[#c4a97d] text-white hover:bg-[#c4a97d]/90 rounded-none px-10 h-12 gap-2 text-xs font-bold uppercase tracking-widest order-1 sm:order-2 shadow-xl shadow-[#c4a97d]/20"
                disabled={isSubmitting}
              >
                <MessageCircle className="w-4 h-4" />
                {txt(language, "Solicitar via WhatsApp", "Request via WhatsApp", "Solicitar vía WhatsApp")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
