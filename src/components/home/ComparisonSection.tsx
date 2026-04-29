import { CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const ComparisonSection = () => {
  return (
    <section className="py-24 md:py-32 bg-secondary">
      <div className="container px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Por que viajar conosco?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A diferença entre uma boa viagem e uma experiência inesquecível está nos detalhes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* SEM ATMOS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-background rounded-3xl p-8 md:p-12 border border-border flex flex-col items-start"
          >
            <h3 className="text-xl md:text-2xl font-semibold mb-8 text-foreground/60">Viajando por conta própria...</h3>
            <ul className="space-y-6 flex-1 w-full">
              {[
                "Você monta o roteiro pescando infos desatualizadas na internet",
                "Precisa dirigir na terra batida por até 2h sem conhecer a pista",
                "Descobre na portaria que os horários de entrada já encerraram",
                "Divide trilhas cheias nos horários de pico",
                "Zero estrutura caso falte sinal de celular ou aconteça um imprevisto"
              ].map((text, idx) => (
                <li key={idx} className="flex gap-4 opacity-50">
                  <XCircle className="w-6 h-6 text-foreground/40 shrink-0" />
                  <span className="leading-snug">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* COM ATMOS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-accent text-accent-foreground rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-start"
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-8">A Experiência Atmos</h3>
            <ul className="space-y-6 flex-1 w-full relative z-10">
              {[
                "Curadoria e cronogramas desenhados para o seu perfil",
                "Transporte premium 4x4 da porta da sua base até as trilhas",
                "Acessos exclusivos e horários inteligentes fugindo da multidão",
                "Guia bilíngue treinado em resgate focado na sua imersão natural",
                "Equipamento de segurança, comunicação off-grid e seguro aventura"
              ].map((text, idx) => (
                <li key={idx} className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 shrink-0" strokeWidth={2.5} />
                  <span className="leading-snug font-medium">{text}</span>
                </li>
              ))}
            </ul>
            
            {/* Decals */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
