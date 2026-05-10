import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sun,
  CloudRain,
  Car,
  Plane,
  Home,
  Compass,
  Calendar,
  Droplets,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

interface FAQItem {
  icon: React.ElementType;
  question: string;
  answer: string[];
}

const faqData = {
  pt: [
    {
      title: "Clima e Época",
      items: [
        {
          icon: Sun,
          question: "Qual a melhor época para visitar?",
          answer: [
            "A Chapada dos Veadeiros pode ser visitada o ano todo, mas a experiência muda conforme a estação.",
            "De Maio a Setembro (Seca): O céu é azul profundo, quase sem nuvens. É a melhor época para ver o pôr do sol e as águas estão bem cristalinas. Junho e Julho são os meses mais frios à noite.",
            "De Outubro a Abril (Chuva): A vegetação fica exuberante e verde. As quedas d'água ficam volumosas e impressionantes. É quando o Cerrado floresce.",
          ],
        },
        {
          icon: CloudRain,
          question: "E se chover durante minha viagem?",
          answer: [
            "As chuvas no Cerrado costumam ser passageiras e intensas. Elas raramente impedem os passeios.",
            "Nossos guias monitoram constantemente as condições de segurança e o volume das águas. Caso um atrativo ofereça risco por tromba d'água, o roteiro é adaptado para locais seguros sem perder o encantamento.",
          ],
        },
      ],
    },
    {
      title: "Logística e Acesso",
      items: [
        {
          icon: Plane,
          question: "Como chegar à Chapada?",
          answer: [
            "O aeroporto mais próximo é o de Brasília (BSB). De lá, a viagem é feita por estrada até Alto Paraíso de Goiás (aprox. 230km).",
            "Oferecemos serviço de transfer privativo para sua comodidade, ou você pode alugar um carro. A estrada é asfaltada e bem sinalizada até a entrada da cidade.",
          ],
        },
        {
          icon: Car,
          question: "Preciso de carro 4x4?",
          answer: [
            "Para a maioria das cachoeiras tradicionais, um carro comum chega bem. Porém, os atrativos mais selvagens e exclusivos (região dos Couros, Macacão, Dragão) exigem 4x4.",
            "Nos nossos roteiros com transporte incluído, utilizamos veículos 4x4 preparados para levar você aos lugares mais remotos com total conforto e segurança.",
          ],
        },
        {
          icon: Home,
          question: "Onde devo me hospedar?",
          answer: [
            "Alto Paraíso: É a cidade principal, com melhor estrutura de restaurantes, bancos e lojas. Ideal para quem busca conveniência.",
            "Vila de São Jorge: Fica na entrada do Parque Nacional. Tem um clima rústico e charmoso, com ruas de terra e ótimos restaurantes.",
            "Cavalcante: Mais remota e selvagem, ideal para quem quer explorar a região das comunidades Kalunga e a cachoeira Santa Bárbara.",
          ],
        },
      ],
    },
    {
      title: "Dicas Práticas",
      items: [
        {
          icon: Calendar,
          question: "Quantos dias são ideais?",
          answer: [
            "Recomendamos no mínimo 4 a 5 dias para conhecer os principais pontos sem pressa.",
            "Se você quer uma imersão profunda e visitar lugares mais remotos como Cavalcante e as Cataratas dos Couros, 7 a 8 dias é o tempo perfeito.",
          ],
        },
        {
          icon: Droplets,
          question: "As trilhas são difíceis?",
          answer: [
            "Temos opções para todos os níveis de preparo físico. Desde trilhas curtas de 1km até travessias desafiadoras.",
            "Em nossa curadoria, classificamos cada atrativo por nível de dificuldade para que você escolha o que mais se adequa ao seu perfil.",
          ],
        },
        {
          icon: Compass,
          question: "Preciso de guia para tudo?",
          answer: [
            "Embora alguns lugares permitam visitação sem guia, a experiência com um especialista ATMOS é transformadora.",
            "O guia traz segurança, conhecimento sobre a fauna, flora e geologia, além de levar você aos melhores horários e ângulos para fotos, longe das multidões.",
          ],
        },
      ],
    },
  ],
  en: [
    {
      title: "Weather and Season",
      items: [
        {
          icon: Sun,
          question: "When is the best time to visit?",
          answer: [
            "Chapada dos Veadeiros can be visited year-round, but the experience changes with the season.",
            "May to September (Dry): The sky is deep blue, almost cloudless. Best time for sunsets and crystal clear water. June and July are the coldest months at night.",
            "October to April (Rainy): Vegetation becomes lush and green. Waterfalls are voluminous and impressive. This is when the Cerrado blooms.",
          ],
        },
        {
          icon: CloudRain,
          question: "What if it rains during my trip?",
          answer: [
            "Rain in the Cerrado is usually passing and intense. It rarely prevents tours.",
            "Our guides constantly monitor safety conditions and water volume. If an attraction offers risk due to flash floods, the itinerary is adapted to safe locations without losing the charm.",
          ],
        },
      ],
    },
    {
      title: "Logistics and Access",
      items: [
        {
          icon: Plane,
          question: "How to get to Chapada?",
          answer: [
            "The nearest airport is Brasília (BSB). From there, the trip is by road to Alto Paraíso de Goiás (approx. 230km).",
            "We offer private transfer services for your convenience, or you can rent a car. The road is paved and well-signposted until the city entrance.",
          ],
        },
        {
          icon: Car,
          question: "Do I need a 4x4 car?",
          answer: [
            "For most traditional waterfalls, a regular car is fine. However, wilder and more exclusive attractions (Couros region, Macacão, Dragão) require 4x4.",
            "In our itineraries with transport included, we use 4x4 vehicles prepared to take you to the most remote places with total comfort and safety.",
          ],
        },
      ],
    },
    {
      title: "Practical Tips",
      items: [
        {
          icon: Calendar,
          question: "How many days are ideal?",
          answer: [
            "We recommend at least 4 to 5 days to visit the main points without rushing.",
            "If you want deep immersion and to visit more remote places like Cavalcante and Cataratas dos Couros, 7 to 8 days is the perfect time.",
          ],
        },
      ],
    },
  ],
  es: [
    {
      title: "Clima y Temporada",
      items: [
        {
          icon: Sun,
          question: "¿Cuál es la mejor época para visitar?",
          answer: [
            "Chapada dos Veadeiros se puede visitar todo el año, pero la experiencia cambia según la estación.",
            "De Mayo a Septiembre (Seca): El cielo es azul profundo, casi sin nubes. Es la mejor época para ver el atardecer y las aguas están muy cristalinas.",
            "De Octubre a Abril (Lluvia): La vegetación se vuelve exuberante y verde. Las caídas de agua son voluminosas e impresionantes.",
          ],
        },
      ],
    },
    {
      title: "Logística y Acceso",
      items: [
        {
          icon: Plane,
          question: "¿Cómo llegar a la Chapada?",
          answer: [
            "El aeropuerto más cercano es el de Brasilia (BSB). Desde allí, el viaje es por carretera hasta Alto Paraíso de Goiás (aprox. 230km).",
            "Ofrecemos servicio de traslado privado para su comodidad, o puede alquilar un coche.",
          ],
        },
      ],
    },
  ],
};

const pageLabels = {
  pt: {
    title: "Dúvidas Frequentes",
    subtitle: "Tudo o que você precisa saber para planejar sua jornada mística e inesquecível pela Chapada dos Veadeiros.",
    contactTitle: "Ainda tem dúvidas?",
    contactDesc: "Nossa equipe de curadores está pronta para ajudar você a desenhar a viagem perfeita.",
    contactBtn: "Falar com Consultor",
  },
  en: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know to plan your mystical and unforgettable journey through Chapada dos Veadeiros.",
    contactTitle: "Still have questions?",
    contactDesc: "Our team of curators is ready to help you design the perfect trip.",
    contactBtn: "Talk to a Consultant",
  },
  es: {
    title: "Dudas Frecuentes",
    subtitle: "Todo lo que necesitas saber para planificar tu jornada mística e inolvidable por la Chapada dos Veadeiros.",
    contactTitle: "¿Aún tienes dudas?",
    contactDesc: "Nuestro equipo de curadores está listo para ayudarte a diseñar el viaje perfecto.",
    contactBtn: "Hablar con um Consultor",
  },
};

const linkLabels = {
  pt: { text: "Ver Roteiros Prontos", path: "/roteiros" },
  en: { text: "See Ready-Made Itineraries", path: "/roteiros" },
  es: { text: "Ver Itinerarios Listos", path: "/roteiros" },
};

export default function FAQ() {
  const { language = "pt" } = useLanguage();
  const faqs = faqData[language as keyof typeof faqData] || faqData.pt;
  const labels = pageLabels[language as keyof typeof pageLabels] || pageLabels.pt;
  const links = linkLabels[language as keyof typeof linkLabels] || linkLabels.pt;

  const whatsappLink = `https://wa.me/5511933697400?text=${encodeURIComponent(
    language === "pt"
      ? "Olá! Tenho uma dúvida sobre a Chapada dos Veadeiros."
      : language === "en"
      ? "Hello! I have a question about Chapada dos Veadeiros."
      : "¡Hola! Tengo una duda sobre Chapada dos Veadeiros."
  )}`;

  return (
    <Layout>
      <PageSEO
        title={`${labels.title} — Planeje sua Viagem | ATMOS`}
        description="Saiba tudo sobre o clima, logística, melhor época e trilhas na Chapada dos Veadeiros. Tire suas dúvidas e planeje sua jornada com a ATMOS."
        keywords="quando ir chapada dos veadeiros, melhor epoca chapada, clima chapada dos veadeiros, como chegar alto paraiso, trilhas chapada dos veadeiros, guia chapada dos veadeiros"
        path="/duvidas"
      />

      {/* Cinematic Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-[#0A0F0A]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src={storageUrl("duvidas/duvidas-bg.jpg")}
            alt="ATMOS FAQ"
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>

        <div className="container px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#C5A267]/20 border border-[#C5A267]/30 text-[#C5A267] text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
              Informativo ATMOS
            </span>
            <h1 className="text-5xl md:text-8xl font-display text-white mb-8 tracking-tight leading-[0.9]">
              {labels.title.split(" ").map((word, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 + (i * 0.1), ease: [0.16, 1, 0.3, 1] }}
                    className="block"
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-light">
              {labels.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-24 md:py-32 bg-[#FDFCFB] relative overflow-hidden">
        <div className="container px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {faqs.map((category, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="mb-16 md:mb-24 last:mb-0"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-[#1A261B]/10" />
                  <h2 className="text-[11px] uppercase font-bold tracking-[0.4em] text-[#C5A267]">
                    {category.title}
                  </h2>
                  <div className="h-px flex-1 bg-[#1A261B]/10" />
                </div>

                <Accordion type="single" collapsible className="space-y-4">
                  {category.items.map((faq, fIdx) => (
                    <AccordionItem
                      key={fIdx}
                      value={`item-${idx}-${fIdx}`}
                      className="border border-[#1A261B]/5 rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:border-[#C5A267]/30 hover:shadow-xl hover:shadow-[#C5A267]/5"
                    >
                      <AccordionTrigger className="px-6 py-6 md:px-8 hover:no-underline group">
                        <div className="flex items-center gap-6 text-left">
                          <div className="h-12 w-12 rounded-xl bg-[#1A261B]/5 flex items-center justify-center text-[#C5A267] transition-colors group-hover:bg-[#C5A267]/10">
                            {faq.icon && <faq.icon className="w-5 h-5" />}
                          </div>
                          <span className="text-lg md:text-xl font-medium text-[#1A261B] tracking-tight group-hover:text-[#C5A267] transition-colors">
                            {faq.question}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-8 md:px-8 md:pl-[104px]">
                        <div className="space-y-4 text-muted-foreground leading-relaxed md:text-lg font-light">
                          {faq.answer.map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </Layout>
  );
}
