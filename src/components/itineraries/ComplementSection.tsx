import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { optimizedUrl } from "@/lib/storage";

const complements = [
  {
    key: "experiences",
    path: "/monte-seu-roteiro/experiencias",
    image: optimizedUrl("home/cat-experiences.jpg", { width: 640, quality: 75 })
  },
  {
    key: "accommodations",
    path: "/monte-seu-roteiro/hospedagens",
    image: optimizedUrl("home/cat-accommodations.jpg", { width: 640, quality: 75 })
  },
  {
    key: "services",
    path: "/monte-seu-roteiro/servicos",
    image: optimizedUrl("home/cat-services.jpg", { width: 640, quality: 75 })
  }
];

const sectionLabels = {
  pt: {
    title: "Complemente seu Roteiro",
    subtitle: "Adicione hospedagem, experiências e serviços extras para tornar sua aventura ainda mais completa."
  },
  en: {
    title: "Complement Your Itinerary",
    subtitle: "Add accommodation, experiences and extra services to make your adventure even more complete."
  },
  es: {
    title: "Complementa tu Itinerario",
    subtitle: "Agrega hospedaje, experiencias y servicios extra para hacer tu aventura aún más completa."
  }
};

export default function ComplementSection() {
  const { language = "pt", t } = useLanguage();
  const l = sectionLabels[language as keyof typeof sectionLabels] || sectionLabels.pt;

  return (
    <section className="py-24 md:py-32 bg-[#F8F9F8] overflow-hidden">
      <div className="container px-4">
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#C5A267] mb-4 block">
              Expansão do Roteiro
            </span>
            <h2 className="text-3xl md:text-5xl font-display text-[#1A261B] mb-6 tracking-tight">
              {l.title}
            </h2>
            <p className="max-w-xl mx-auto text-[#1A261B]/60 text-lg font-light leading-relaxed">
              {l.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {complements.map((cat, idx) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
            >
              <Link to={cat.path} className="group block relative">
                <div className="relative h-[450px] rounded-[2rem] overflow-hidden shadow-xl transition-all duration-700 group-hover:shadow-2xl group-hover:-translate-y-2">
                  <img
                    src={cat.image}
                    alt={t(`categories.${cat.key}`)}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
                  />

                  {/* Premium overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A261B]/90 via-[#1A261B]/20 to-transparent transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <h3 className="text-2xl font-display mb-2">
                      {t(`categories.${cat.key}`)}
                    </h3>
                    <p className="text-sm text-white/70 font-light leading-relaxed mb-6 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      {t(`categories.${cat.key}.desc`)}
                    </p>
                    <div className="h-px w-0 bg-[#C5A267] transition-all duration-700 group-hover:w-full" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}