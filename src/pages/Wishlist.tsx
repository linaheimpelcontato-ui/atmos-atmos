import { useState, useRef, useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";
import { trackQuoteSubmit, trackWhatsAppClick, trackQuestionnaireStart } from "@/lib/analytics";
import { format } from "date-fns";
import { ptBR, enUS, es as esLocale } from "date-fns/locale";
import Layout from "@/components/layout/Layout";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useWishlist, type WishlistItemType } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Trash2,
  Droplets,
  Sparkles,
  Home,
  Wrench,
  Map,
  ArrowRight,
  MessageCircle,
  X,
  ClipboardList,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import QuoteQuestionnaire, {
  type QuoteAnswers,
} from "@/components/wishlist/QuoteQuestionnaire";
import { storageUrl } from "@/lib/storage";
import OnboardingProcess from "@/components/wishlist/OnboardingProcess";
import ImmersionQuestionnaire from "@/components/immersions/ImmersionQuestionnaire";

/* ── i18n helpers ─────────────────────────────────────────── */

const txt = (lang: Language, pt: string, en: string, es: string) =>
  lang === "en" ? en : lang === "es" ? es : pt;

const signalIntent = (lang: Language) => txt(
  lang,
  "\n\n*Estou ciente do sinal de compromisso (R$ 1.500) para garantir a exclusividade da curadoria e agendamento.*",
  "\n\n*I am aware of the commitment deposit (R$ 1,500) to ensure curation exclusivity and scheduling.*",
  "\n\n*Soy consciente de la señal de compromiso (R$ 1.500) para garantizar la exclusividad de la curaduría y programación.*"
);

const typeLabel: Record<WishlistItemType, Record<Language, string>> = {
  itinerary: { pt: "Roteiros", en: "Itineraries", es: "Itinerarios" },
  waterfall: { pt: "Cachoeiras", en: "Waterfalls", es: "Cascadas" },
  experience: { pt: "Experiências", en: "Experiences", es: "Experiencias" },
  accommodation: { pt: "Hospedagens", en: "Stays", es: "Hospedajes" },
  service: { pt: "Serviços", en: "Services", es: "Servicios" },
};

const typeIcon: Record<WishlistItemType, React.ElementType> = {
  itinerary: Map,
  waterfall: Droplets,
  experience: Sparkles,
  accommodation: Home,
  service: Wrench,
};

const groupOrder: WishlistItemType[] = [
  "itinerary",
  "waterfall",
  "experience",
  "accommodation",
  "service",
];

const dateLocale = (lang: Language) =>
  lang === "en" ? enUS : lang === "es" ? esLocale : ptBR;

function buildWhatsAppMessage(
  items: { type: WishlistItemType; name: string; details?: string }[],
  answers: QuoteAnswers,
  lang: Language
) {
  const greeting = txt(
    lang,
    "Olá! Gostaria de solicitar um orçamento. Seguem minhas informações e interesses:",
    "Hello! I'd like to request a quote. Here are my details and interests:",
    "¡Hola! Me gustaría solicitar un presupuesto. Aquí mis datos e intereses:"
  );

  const answerLines: string[] = [];
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
  if (answers.numDays) answerLines.push(`• ${txt(lang, "Dias de passeio", "Tour days", "Días de paseo")}: ${answers.numDays}`);
  if (answers.groupSize) answerLines.push(`• ${txt(lang, "Pessoas no grupo", "People in group", "Personas en el grupo")}: ${answers.groupSize}`);
  if (answers.children) answerLines.push(`• ${txt(lang, "Crianças", "Children", "Niños")}: ${answers.children}`);
  if (answers.mobility) answerLines.push(`• ${txt(lang, "Mobilidade", "Mobility", "Movilidad")}: ${answers.mobility}${answers.mobilityDetails ? ` (${answers.mobilityDetails})` : ""}`);
  if (answers.transport) answerLines.push(`• ${txt(lang, "Transporte", "Transport", "Transporte")}: ${answers.transport}`);
  if (answers.hasAccommodation) answerLines.push(`• ${txt(lang, "Hospedagem reservada", "Accommodation booked", "Hospedaje reservado")}: ${answers.hasAccommodation}${answers.accommodationLocation ? ` (${answers.accommodationLocation})` : ""}`);
  if (answers.notes) answerLines.push(`• ${txt(lang, "Observações", "Notes", "Observaciones")}: ${answers.notes}`);

  const answersBlock = answerLines.length > 0 ? `*${txt(lang, "Minhas informações", "My details", "Mis datos")}*\n${answerLines.join("\n")}` : "";

  const grouped = groupOrder
    .map((type) => {
      const ofType = items.filter((i) => i.type === type);
      if (ofType.length === 0) return null;
      const label = typeLabel[type][lang];
      const list = ofType.map((i) => `  • ${i.name}${i.details ? ` (${i.details})` : ""}`).join("\n");
      return `*${label}*\n${list}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const closing = txt(lang, "Aguardo retorno. Obrigado(a)!", "Looking forward to hearing from you. Thanks!", "Espero su respuesta. ¡Gracias!");
  return [greeting, answersBlock, grouped, closing, signalIntent(lang)].filter(Boolean).join("\n\n");
}

const Wishlist = () => {
  const { language } = useLanguage();
  const { items, removeItem, clearWishlist, count } = useWishlist();
  const { user } = useAuth();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState<QuoteAnswers | null>(null);
  const [questionnaireMode, setQuestionnaireMode] = useState<"quote" | "immersion">("quote");
  const questionnaireRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pageTitle = txt(language, "Seu Projeto Atmos", "Your Atmos Project", "Tu Proyecto Atmos");
  const pageSubtitle = txt(
    language,
    "Esta é a prévia da sua jornada. Cada escolha aqui compõe o DNA do roteiro sob medida que nosso time irá desenhar para você. Revise sua curadoria e prossiga para o detalhamento final.",
    "This is the preview of your journey. Each choice here composes the DNA of the bespoke itinerary our team will design for you. Review your curation and proceed to the final detailing.",
    "Esta es la vista previa de su viaje. Cada elección aquí compone el ADN del itinerario a medida que nuestro equipo diseñará para usted. Revise su curaduría y proceda al detallado final."
  );

  const handleStartQuote = () => {
    setShowQuestionnaire(true);
    setQuestionnaireMode("quote");
    trackQuestionnaireStart("quote");
    setTimeout(() => {
      questionnaireRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCancelQuestionnaire = () => {
    setShowQuestionnaire(false);
    setQuestionnaireMode("quote");
  };

  const handleQuoteComplete = async (answers: QuoteAnswers) => {
    setPendingAnswers(answers);
    setShowQuestionnaire(false);
    setShowOnboarding(true);
    setTimeout(() => {
      questionnaireRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleOnboardingConfirm = async () => {
    if (!pendingAnswers) return;
    try {
      const quoteData = {
        user_id: user?.id ?? null,
        user_name: user?.user_metadata?.full_name ?? null,
        user_email: user?.email ?? null,
        user_phone: user?.user_metadata?.phone ?? null,
        items: items,
        answers: pendingAnswers,
        status: "pending",
        language,
      };

      const { error } = await (supabase as any).from("quote_requests").insert(quoteData);

      if (error) {
        console.error("Error saving quote request:", error);
      } else if (user?.email) {
        // Instant sync with prospects table using lookup-then-action
        const normalizedEmail = user.email.toLowerCase();
        const { data: existing } = await (supabase as any).from("prospects").select("id").eq("email", normalizedEmail).maybeSingle();
        
        const prospectData = {
          name: user.user_metadata?.full_name || "Cliente Site",
          email: normalizedEmail,
          phone: user.user_metadata?.phone,
          segment: "b2c",
          source: "site",
          notes: `Solicitação via Wishlist. Itens: ${items.length}.`,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await (supabase as any).from("prospects").update(prospectData).eq("id", existing.id);
        } else {
          await (supabase as any).from("prospects").insert(prospectData);
        }
      }
    } catch (e) {
      console.error("Exception in onboarding confirm:", e);
    }

    const message = buildWhatsAppMessage(items, pendingAnswers, language);
    const encoded = encodeURIComponent(message);
    trackQuoteSubmit(items.length);
    trackWhatsAppClick("quote_wishlist");
    window.open(`https://wa.me/5511933697400?text=${encoded}`, "_blank");
    setShowOnboarding(false);
    setPendingAnswers(null);
  };

  if (count === 0) {
    return (
      <Layout hideWishlist={true}>
        <PageSEO title="Meu Roteiro — ATMOS" description="Revise sua seleção e solicite um orçamento personalizado." path="/wishlist" />
        <section className="bg-[#1A261B] text-white py-32">
          <div className="container px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-display mb-6">{pageTitle}</h1>
            <p className="text-xl opacity-60 max-w-2xl mx-auto font-light italic">{pageSubtitle}</p>
          </div>
        </section>

        <section className="py-32 flex flex-col items-center justify-center min-h-[50vh]">
          <Heart className="h-16 w-16 text-[#2C3E2D]/10 mb-8" />
          <h2 className="text-2xl font-display text-[#1A261B] mb-4">Sua lista está vazia</h2>
          <p className="text-[#2C3E2D]/60 mb-12 max-w-md text-center">
            Explore nossa curadoria e selecione o que mais te inspira para começarmos a planejar sua jornada.
          </p>
          <Button asChild className="rounded-full px-10 py-6 bg-[#1A261B] hover:bg-black text-white font-bold uppercase tracking-widest text-xs">
            <Link to="/monte-seu-roteiro">Começar a Explorar</Link>
          </Button>
        </section>
      </Layout>
    );
  }

  const grouped = groupOrder
    .map((type) => ({
      type,
      items: items.filter((i) => i.type === type),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Layout hideWishlist={true}>
      <PageSEO title="Meu Roteiro — ATMOS" description="Revise sua seleção e solicite um orçamento personalizado." path="/wishlist" />
      
      {/* Editorial Header - Light & Premium with Background */}
      <section className="relative min-h-[40vh] flex items-center bg-[#1A261B] overflow-hidden">
        {/* Background Image - User provided */}
        <div className="absolute inset-0 z-0">
          <img loading="lazy" 
            src={storageUrl("preferencias/preferencias-bg.jpeg")} 
            className="w-full h-full object-cover"
            alt="Preferências Background"
          />
          {/* Subtle gradient for text readability only, removed green blur */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="container relative z-10 px-6 max-w-7xl mx-auto py-20">
          <div className="max-w-4xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white/40 uppercase tracking-[0.5em] text-[10px] md:text-[11px] font-bold mb-6 block"
            >
              Roteiro Personalizado
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-8xl font-display text-white mb-8 leading-tight"
            >
              Suas <span className="opacity-40 italic">preferências</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 font-light text-xl max-w-2xl leading-relaxed"
            >
              Revisite tudo que você selecionou como suas preferências. Estes itens são a base que usaremos para criar seu roteiro personalizado e garantir que cada detalhe da sua jornada na Chapada seja impecável.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-16 bg-white">
        <div className="container px-4 max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left: Items List */}
            <div className="lg:col-span-12 space-y-10">
              
              <div className="flex items-center justify-between border-b border-[#1A261B]/10 pb-4">
                <div>
                  <h2 className="text-2xl font-display text-[#1A261B]">Itens Escolhidos</h2>
                  <p className="text-sm text-[#2C3E2D]/50 mt-1 uppercase tracking-widest font-bold">
                    {count} {txt(language, "Interesses", "Interests", "Intereses")}
                  </p>
                </div>
                <button
                  onClick={clearWishlist}
                  className="text-[10px] uppercase tracking-widest font-bold text-red-800 hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  {txt(language, "Remover todos", "Remove all", "Eliminar todos")}
                </button>
              </div>

              {grouped.map(({ type, items: groupItems }) => {
                const Icon = typeIcon[type];
                return (
                  <div key={type} className="space-y-10 group/section">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1A261B]/5 flex items-center justify-center text-[#1A261B]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-display text-[#1A261B] uppercase tracking-widest pt-1">
                          {typeLabel[type][language]}
                        </h3>
                      </div>
                      <div className="h-[1px] flex-1 bg-[#1A261B]/10" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2C3E2D]/40">
                         {groupItems.length} {groupItems.length === 1 ? "seleção" : "seleções"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {groupItems.map((item) => (
                        <motion.div
                          layout
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative aspect-[3/4] rounded-[2px] bg-[#1A261B] shadow-lg overflow-hidden cursor-default"
                        >
                          {/* Image Layer */}
                          <div className="absolute inset-0 w-full h-full">
                            {(() => {
                              // Correctly map buckets for all item types
                              const bucketMap: Record<string, string> = {
                                'accommodation': 'hospedagens',
                                'experience': 'experiencias',
                                'waterfall': 'cachoeiras',
                                'service': 'servicos'
                              };

                              const bucket = bucketMap[item.type] || 'cachoeiras';
                              
                              // Handle specific ID overrides for waterfalls
                              let storageId = item.id;
                              if (item.type === 'waterfall') {
                                storageId = storageId.replace('macacão', 'macacao').replace('canions-cariocas', 'cariocas');
                              }

                              const finalUrl = item.imageUrl || storageUrl(`${bucket}/${storageId}-1.jpg`);

                              return finalUrl ? (
                                <img loading="lazy" 
                                  src={finalUrl} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#1A261B] flex items-center justify-center">
                                  <Icon className="h-12 w-12 text-white/5" />
                                </div>
                              );
                            })()}
                            {/* Overlay/Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                          </div>

                          {/* Top Controls */}
                          <div className="absolute top-4 right-4 z-20">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="h-9 w-9 bg-black/20 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 transition-all transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Content Layer */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                            <span className="text-[8px] uppercase tracking-[0.4em] font-bold text-white/50 mb-2 block">
                              SELEÇÃO ATMOS
                            </span>
                            <h4 className="text-2xl font-display text-white mb-3 leading-tight">{item.name}</h4>
                            <p className="text-[10px] text-white/60 font-light uppercase tracking-[0.2em] line-clamp-1 pb-4">
                              {item.details}
                            </p>
                            <div className="h-[1px] w-full bg-white/10" />
                            <div className="pt-4 flex justify-between items-center text-[8px] uppercase font-bold tracking-widest text-white/30">
                               <span>ID: {item.id.slice(0, 8)}</span>
                               <span className="text-[#a4b595]">VERIFIED</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final CTA Bar - Refined & Minimalist */}
            <div className="lg:col-span-12 mt-20 pb-20 border-t border-[#1A261B]/10 pt-20 text-center" id="final-step" ref={questionnaireRef}>
              <AnimatePresence mode="wait">
                {!showQuestionnaire && !showOnboarding ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-3xl mx-auto relative z-10"
                  >
                    <span className="text-[10px] uppercase tracking-[0.6em] font-bold text-[#1A261B]/40 mb-6 block">PROXIMO PASSO</span>
                    <h2 className="text-4xl md:text-6xl font-display text-[#1A261B] mb-8 leading-tight">O Toque Final da Atmos</h2>
                    <p className="text-[#2C3E2D]/60 mb-12 text-xl font-light leading-relaxed max-w-2xl mx-auto">
                      Suas escolhas definem a alma da experiência. Agora, responda a perguntas rápidas para que nosso time consiga criar o seu roteiro.
                    </p>
                    <Button
                      size="lg"
                      className="rounded-full px-16 py-10 bg-[#1A261B] hover:bg-black text-white font-bold uppercase tracking-[0.3em] text-[12px] shadow-2xl transition-all hover:scale-105"
                      onClick={handleStartQuote}
                    >
                      Prosseguir para Roteiro
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ) : showQuestionnaire ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-4xl mx-auto"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <button onClick={handleCancelQuestionnaire} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#1A261B]/40 hover:text-[#1A261B] transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Voltar para lista
                       </button>
                    </div>
                    <QuoteQuestionnaire
                      language={language}
                      onComplete={handleQuoteComplete}
                      onCancel={handleCancelQuestionnaire}
                      onSwitchToImmersion={() => setQuestionnaireMode("immersion")}
                    />
                  </motion.div>
                ) : showOnboarding ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-4xl mx-auto"
                  >
                    <OnboardingProcess 
                      language={language}
                      onConfirm={handleOnboardingConfirm}
                      onCancel={() => setShowOnboarding(false)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-12 text-center mt-8 pb-20">
               <Link to="/monte-seu-roteiro" className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1A261B]/40 hover:text-[#1A261B] transition-colors border-b border-transparent hover:border-[#1A261B] pb-1">
                 Adicionar Mais Itens
               </Link>
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Wishlist;
