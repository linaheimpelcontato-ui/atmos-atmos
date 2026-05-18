import { useState, useRef, useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";
import { trackQuestionnaireStart } from "@/lib/analytics";
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
  ChevronLeft,
  Check
} from "lucide-react";
import { storageUrl } from "@/lib/storage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import WishlistReservationForm from "@/components/wishlist/WishlistReservationForm";

/* ── i18n helpers ─────────────────────────────────────────── */

const txt = (lang: Language, pt: string, en: string, es: string) =>
  lang === "en" ? en : lang === "es" ? es : pt;

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

const Wishlist = () => {
  const { language } = useLanguage();
  const { items, removeItem, clearWishlist, count } = useWishlist();
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    setIsFormOpen(true);
    trackQuestionnaireStart("quote");
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
            <div className="lg:col-span-8 space-y-10">
              
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

            {/* Right Sidebar: Inclusions & Important Info */}
            <div className="lg:col-span-4 space-y-8">
              {/* Incluso no Roteiro Box */}
              <div className="border border-[#2e2019]/10 bg-[#fcfaf7] p-8 shadow-sm">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#c4a97d] mb-4 block">
                  ATMOS EXPERIENCE
                </span>
                <h3 className="text-xl font-display text-[#2e2019] uppercase tracking-wider mb-6 font-outfit">
                  Incluso no roteiro
                </h3>
                <ul className="space-y-4">
                  {[
                    "Guiamento ATMOS especializado",
                    "Curadoria completa do roteiro",
                    "Registros fotográficos",
                    "Assistência ATMOS 360° durante toda a viagem"
                  ].map((text, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-[#c4a97d]/10 flex items-center justify-center text-[#c4a97d] shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-[#2e2019]/80 font-light">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Importante Saber Box */}
              <div className="border border-[#2e2019]/10 bg-[#fcfaf7] p-8 shadow-sm">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#c4a97d] mb-4 block">
                  CONDIÇÕES E LOGÍSTICA
                </span>
                <h3 className="text-xl font-display text-[#2e2019] uppercase tracking-wider mb-6 font-outfit">
                  Importante saber
                </h3>
                <p className="text-sm text-[#2e2019]/70 leading-relaxed font-light mb-4">
                  As hospedagens <strong className="text-[#2e2019]">não estão inclusas</strong> no valor do roteiro.
                </p>
                <p className="text-xs text-[#2e2019]/60 leading-relaxed font-light">
                  Recomendamos reservar 1 noite antes e 1 noite após o roteiro para chegada e retorno. A ATMOS oferece curadoria completa de hospedagens para organizar essas etapas com praticidade e conforto.
                </p>
              </div>
            </div>

            {/* Final CTA Bar - Refined & Minimalist */}
            <div className="lg:col-span-12 mt-20 pb-20 border-t border-[#1A261B]/10 pt-20 text-center" id="final-step">
              <div className="max-w-3xl mx-auto relative z-10">
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
              </div>
            </div>

            {/* Reservation Form Modal Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="max-w-xl md:max-w-2xl bg-[#fcfaf7] border border-[#e4dbcc] p-6 md:p-10 text-[#2e2019] rounded-none focus:outline-none focus-visible:outline-none">
                <WishlistReservationForm
                  items={items}
                  language={language}
                  onClose={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>

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
