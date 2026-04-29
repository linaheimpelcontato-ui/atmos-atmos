import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    text: "O João entende a montanha como ninguém. Ele nos levou em horários vazios para as cachoeiras mais intocadas e finalizou o dia com um pôr do sol exclusivo. Absolutamente inesquecível.",
    author: "Marcella C.",
    location: "São Paulo, SP"
  },
  {
    text: "Viajamos em família com duas crianças. A paciência, segurança e o domínio territorial da ATMOS fizeram a diferença de uma forma que nunca teríamos alcançado viajando sozinhos.",
    author: "Lucas e Beatriz",
    location: "Rio de Janeiro, RJ"
  },
  {
    text: "Não é apenas um passeio, é uma imersão. Do momento que fomos buscados no aeroporto até o último dia, cada segundo foi roteirizado de forma tão fluida e orgânica. Superou minhas expectativas.",
    author: "Ricardo V.",
    location: "Brasília, DF"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background border-t">
      <div className="container px-4 max-w-7xl">
        <div className="mb-16 flex flex-col items-center">
          <span className="text-accent text-xs font-bold uppercase tracking-[0.2em] mb-4">Relatos Reais</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center">O que dizem nossos viajantes</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="bg-secondary/50 rounded-2xl p-8 lg:p-10 flex flex-col items-start border border-border/50"
            >
              <div className="flex gap-1 mb-6 text-yellow-500">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed font-light mb-8 flex-1 italic text-lg">
                "{t.text}"
              </p>
              <div>
                <strong className="block text-foreground font-semibold tracking-tight">{t.author}</strong>
                <span className="text-sm text-muted-foreground">{t.location}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
