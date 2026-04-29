import { ShieldCheck, Calendar, Wallet, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { type Language } from "@/contexts/LanguageContext";

interface Props {
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

const txt = (lang: Language, pt: string, en: string, es: string) =>
  lang === "en" ? en : lang === "es" ? es : pt;

export default function OnboardingProcess({ language, onConfirm, onCancel }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-6">
          <ShieldCheck className="w-8 h-8 text-accent" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
          {txt(language, "Quase lá. Como funciona nossa curadoria?", "Almost there. How does our curation work?", "Casi listo. ¿Cómo funciona nossa curaduría?")}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-light">
          {txt(
            language,
            "Para garantir a exclusividade e o padrão ATMOS de atendimento, nosso processo de montagem de roteiro personalizado segue 3 etapas fundamentais:",
            "To ensure ATMOS exclusivity and service standards, our personalized itinerary process follows 3 fundamental steps:",
            "Para garantizar la exclusividad y el estándar de atención ATMOS, nuestro proceso de armado de itinerario personalizado sigue 3 pasos fundamentales:"
          )}
        </p>

        <div className="grid grid-cols-1 gap-6 text-left mb-12">
          <div className="flex gap-4 p-5 rounded-2xl bg-muted/50 border border-border/50">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
              <span className="font-bold text-accent">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Análise de Perfil</h4>
              <p className="text-sm text-muted-foreground">Revisamos suas preferências e checamos disponibilidades exclusivas em nossa rede.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-accent text-accent-foreground border border-accent/20">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
               <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Compromisso de Curadoria (Sinal)</h4>
              <p className="text-sm opacity-90">Para iniciarmos o design do seu cronograma e reservar a agenda do guia, solicitamos um sinal de R$ 1.500 (totalmente abatido do valor final do roteiro).</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-muted/50 border border-border/50 opacity-60">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm text-muted-foreground">
               <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Entrega & Ajustes</h4>
              <p className="text-sm text-muted-foreground">Você recebe o roteiro mestre e refinamos cada detalhe até estar perfeito para você.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="rounded-full px-8 h-12 order-2 sm:order-1"
          >
            {txt(language, "Voltar", "Back", "Volver")}
          </Button>
          <Button 
            onClick={onConfirm}
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-10 h-12 gap-2 text-base font-semibold order-1 sm:order-2 shadow-xl shadow-accent/20"
          >
            <MessageCircle className="w-5 h-5" />
            {txt(language, "Entendi e Quero Iniciar", "I understand, let's start", "Entiendo y quiero iniciar")}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
