import { useState } from "react";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import ParallaxDivider from "@/components/home/ParallaxDivider";
import { storageUrl } from "@/lib/storage";

const parallaxImersoes1 = storageUrl("imersoes/parallax-imersoes-1.jpg");
const parallaxImersoes2 = storageUrl("imersoes/parallax-imersoes-2.jpg");

import { Button } from "@/components/ui/button";
import ImmersionQuestionnaire from "@/components/immersions/ImmersionQuestionnaire";
import {
  Users,
  Map,
  Car,
  Home,
  Utensils,
  Camera,
  Shield,
  Globe,
  Leaf,
  Sparkles,
  Palette,
  Heart,
  MessageCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";

const heroImg = storageUrl("imersoes/imersoes-hero.jpg");
const infraImg = storageUrl("imersoes/imersoes-infra.jpg");

const labels = {
  pt: {
    heroTitle: "Retiros & Imersões",
    heroSubtitle: "Parcerias para facilitadores, vivências, retiros e imersões na Chapada dos Veadeiros",
    forWhom: "Juntos, fortalecemos o território",
    forWhomDesc: "Este espaço é para quem já conduz grupos e busca uma base sólida para realizar experiências imersivas na Chapada dos Veadeiros.",
    audiences: [
      { icon: "users", title: "Facilitadores e Professores", desc: "Instrutores e educadores que promovem retiros e imersões com propósito." },
      { icon: "globe", title: "Agências de Viagem", desc: "Parcerias para roteiros integrados e experiências sob curadoria ATMOS." },
      { icon: "sparkles", title: "Projetos e Marcas", desc: "Ativações, eventos corporativos, experiências de turismo regenerativo." },
      { icon: "users2", title: "Grupos Corporativos", desc: "Parcerias para roteiros integrados e experiências sob curadoria ATMOS." },
    ],
    partnerTitle: "Formato de Parceria",
    partnerSteps: [
      "Você como facilitador é responsável pela venda das vagas para o seu público.",
      "Nós fornecemos toda a infraestrutura: roteiro, equipe local, transporte, hospedagens, refeições, ingressos e registros.",
      "Roteiro estruturado e testado, com flexibilidade para inserção de outras preferências do grupo.",
      "O valor do pacote é fixado por pessoa, e você pode aplicar sua margem sobre esse valor na venda final ao seu grupo.",
    ],
    infraTitle: "O que oferecemos",
    infraItems: [
      { icon: "map", title: "Roteiros fora da rota", desc: "Roteiros prontos e personalizados do zero com o cliente." },
      { icon: "users", title: "Guias especializados e bilíngues", desc: "Guias especializados com veículos 4x4 para conduzir as jornadas." },
      { icon: "home", title: "Curadoria de hospedagens", desc: "Pousadas, vilas e casas únicas escolhidas pela ATMOS." },
      { icon: "utensils", title: "Refeições e lanches", desc: "Alimentação artesanal com produtores regionais do cerrado." },
      { icon: "car", title: "Transporte 4x4", desc: "Veículos preparados para todas as trilhas e acessos da região." },
      { icon: "camera", title: "Registro com drone", desc: "Captação profissional com drone e câmera durante toda a imersão." },
    ],
    diffTitle: "Diferenciais ATMOS",
    diffs: [
      { icon: "sparkles", title: "Curadoria 360°", desc: "Do planejamento à vivência, a ATMOS cuida de cada detalhe da jornada." },
      { icon: "globe", title: "Atendimento bilíngue", desc: "Suporte real e presente do início ao fim da viagem." },
      { icon: "heart", title: "Rede de parceiros", desc: "Parceiros locais escolhidos a dedo: hospedagens, restaurantes e experiências." },
      { icon: "leaf", title: "Sustentabilidade local", desc: "Valorizamos a economia da Chapada e os produtores regionais." },
      { icon: "palette", title: "Conteúdo e estética", desc: "Uma marca que traduz o Cerrado com olhar cinematográfico e autêntico." },
      { icon: "shield", title: "Experiências com propósito", desc: "Mais do que passeios, vivências transformadoras que conectam ao território." },
    ],
    materialsTitle: "Materiais de Apoio",
    materialsDesc: "A experiência ATMOS vai além da viagem. Criamos materiais digitais de apoio para que nossos parceiros ofereçam aos seus clientes.",
    materials: [
      { title: "Menu de Cachoeiras", link: "/monte-seu-roteiro/cachoeiras" },
      { title: "Curadoria de Hospedagens", link: "/monte-seu-roteiro/hospedagens" },
      { title: "Experiências Extras", link: "/monte-seu-roteiro/experiencias" },
      { title: "Serviços Adicionais", link: "/monte-seu-roteiro/servicos" },
    ],
    ctaTitle: "Embarque nessa atmosfera",
    ctaDesc: "Vamos juntos respirar o Cerrado de um jeito que transforma.",
    ctaButton: "Fale com a gente",
    ctaWhatsapp: "11 93369-7400",
  },
  en: {
    heroTitle: "Retreats & Immersions",
    heroSubtitle: "Partnerships for facilitators, experiences, retreats and immersions in Chapada dos Veadeiros",
    forWhom: "Together, we strengthen the territory",
    forWhomDesc: "This space is for those who already lead groups and are looking for a solid base to create immersive experiences in Chapada dos Veadeiros.",
    audiences: [
      { icon: "users", title: "Facilitators & Teachers", desc: "Instructors and educators who promote retreats and immersions with purpose." },
      { icon: "globe", title: "Travel Agencies", desc: "Partnerships for integrated itineraries and ATMOS curated experiences." },
      { icon: "sparkles", title: "Projects & Brands", desc: "Activations, corporate events, regenerative tourism experiences." },
      { icon: "users2", title: "Corporate Groups", desc: "Partnerships for integrated itineraries and ATMOS curated experiences." },
    ],
    partnerTitle: "Partnership Format",
    partnerSteps: [
      "As a facilitator, you are responsible for selling spots to your audience.",
      "We provide all infrastructure: itinerary, local team, transport, accommodations, meals, tickets and recordings.",
      "Structured and tested itinerary, with flexibility for inserting other group preferences.",
      "The package value is fixed per person, and you can apply your margin on the final sale to your group.",
    ],
    infraTitle: "What we offer",
    infraItems: [
      { icon: "map", title: "Off-the-beaten-path itineraries", desc: "Ready and custom itineraries built from scratch." },
      { icon: "users", title: "Specialized bilingual guides", desc: "Specialized guides with 4x4 vehicles to lead journeys." },
      { icon: "home", title: "Accommodation curation", desc: "Inns, villas and unique homes selected by ATMOS." },
      { icon: "utensils", title: "Meals & snacks", desc: "Artisanal food with regional cerrado producers." },
      { icon: "car", title: "4x4 Transport", desc: "Vehicles prepared for all trails and access in the region." },
      { icon: "camera", title: "Drone footage", desc: "Professional capture with drone and camera throughout the immersion." },
    ],
    diffTitle: "ATMOS Differentials",
    diffs: [
      { icon: "sparkles", title: "360° Curation", desc: "From planning to experience, ATMOS takes care of every detail." },
      { icon: "globe", title: "Bilingual service", desc: "Real and present support from start to finish." },
      { icon: "heart", title: "Partner network", desc: "Handpicked local partners: accommodations, restaurants and experiences." },
      { icon: "leaf", title: "Local sustainability", desc: "We value Chapada's economy and regional producers." },
      { icon: "palette", title: "Content & aesthetics", desc: "A brand that translates the Cerrado with a cinematic and authentic eye." },
      { icon: "shield", title: "Purposeful experiences", desc: "More than tours, transformative experiences that connect to the territory." },
    ],
    materialsTitle: "Support Materials",
    materialsDesc: "The ATMOS experience goes beyond the trip. We create digital support materials for our partners to offer their clients.",
    materials: [
      { title: "Waterfall Menu", link: "/monte-seu-roteiro/cachoeiras" },
      { title: "Accommodation Curation", link: "/monte-seu-roteiro/hospedagens" },
      { title: "Extra Experiences", link: "/monte-seu-roteiro/experiencias" },
      { title: "Additional Services", link: "/monte-seu-roteiro/servicos" },
    ],
    ctaTitle: "Join this atmosphere",
    ctaDesc: "Let's breathe the Cerrado together in a way that transforms.",
    ctaButton: "Talk to us",
    ctaWhatsapp: "11 9 70530005",
  },
  es: {
    heroTitle: "Retiros e Inmersiones",
    heroSubtitle: "Alianzas para facilitadores, vivencias, retiros e inmersiones en Chapada dos Veadeiros",
    forWhom: "Juntos, fortalecemos el territorio",
    forWhomDesc: "Este espacio es para quienes ya conducen grupos y buscan una base sólida para realizar experiencias inmersivas en Chapada dos Veadeiros.",
    audiences: [
      { icon: "users", title: "Facilitadores y Profesores", desc: "Instructores y educadores que promueven retiros e inmersiones con propósito." },
      { icon: "globe", title: "Agencias de Viaje", desc: "Alianzas para itinerarios integrados y experiencias bajo curaduría ATMOS." },
      { icon: "sparkles", title: "Proyectos y Marcas", desc: "Activaciones, eventos corporativos, experiencias de turismo regenerativo." },
      { icon: "users2", title: "Grupos Corporativos", desc: "Alianzas para itinerarios integrados y experiencias bajo curaduría ATMOS." },
    ],
    partnerTitle: "Formato de Alianza",
    partnerSteps: [
      "Usted como facilitador es responsable de la venta de vacantes para su público.",
      "Nosotros proporcionamos toda la infraestructura: itinerario, equipo local, transporte, hospedajes, comidas, entradas y registros.",
      "Itinerario estructurado y probado, con flexibilidad para inserción de otras preferencias del grupo.",
      "El valor del paquete es fijado por persona, y usted puede aplicar su margen sobre ese valor en la venta final a su grupo.",
    ],
    infraTitle: "Qué ofrecemos",
    infraItems: [
      { icon: "map", title: "Itinerarios fuera de ruta", desc: "Itinerarios listos y personalizados desde cero." },
      { icon: "users", title: "Guías especializados y bilingües", desc: "Guías especializados con vehículos 4x4 para conducir las jornadas." },
      { icon: "home", title: "Curaduría de hospedajes", desc: "Posadas, villas y casas únicas seleccionadas por ATMOS." },
      { icon: "utensils", title: "Comidas y meriendas", desc: "Alimentación artesanal con productores regionales del cerrado." },
      { icon: "car", title: "Transporte 4x4", desc: "Vehículos preparados para todos los senderos y accesos de la región." },
      { icon: "camera", title: "Registro con drone", desc: "Captación profesional con drone y cámara durante toda la inmersión." },
    ],
    diffTitle: "Diferenciales ATMOS",
    diffs: [
      { icon: "sparkles", title: "Curaduría 360°", desc: "De la planificación a la vivencia, ATMOS cuida cada detalle." },
      { icon: "globe", title: "Atención bilingüe", desc: "Soporte real y presente de inicio a fin del viaje." },
      { icon: "heart", title: "Red de socios", desc: "Socios locales elegidos a dedo: hospedajes, restaurantes y experiencias." },
      { icon: "leaf", title: "Sustentabilidad local", desc: "Valoramos la economía de la Chapada y los productores regionales." },
      { icon: "palette", title: "Contenido y estética", desc: "Una marca que traduce el Cerrado con mirada cinematográfica y auténtica." },
      { icon: "shield", title: "Experiencias con propósito", desc: "Más que paseos, vivencias transformadoras que conectan con el territorio." },
    ],
    materialsTitle: "Materiales de Apoyo",
    materialsDesc: "La experiencia ATMOS va más allá del viaje. Creamos materiales digitales de apoyo para que nuestros socios ofrezcan a sus clientes.",
    materials: [
      { title: "Menú de Cascadas", link: "/monte-seu-roteiro/cachoeiras" },
      { title: "Curaduría de Hospedajes", link: "/monte-seu-roteiro/hospedagens" },
      { title: "Experiencias Extras", link: "/monte-seu-roteiro/experiencias" },
      { title: "Servicios Adicionales", link: "/monte-seu-roteiro/servicos" },
    ],
    ctaTitle: "Embárquese en esta atmósfera",
    ctaDesc: "Vamos juntos a respirar el Cerrado de una manera que transforma.",
    ctaButton: "Hable con nosotros",
    ctaWhatsapp: "11 9 70530005",
  },
};

const iconComponents: Record<string, React.ElementType> = {
  users: Users,
  users2: Users,
  globe: Globe,
  sparkles: Sparkles,
  map: Map,
  home: Home,
  utensils: Utensils,
  car: Car,
  camera: Camera,
  shield: Shield,
  leaf: Leaf,
  palette: Palette,
  heart: Heart,
};

const Immersions = () => {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const l = labels[language];
  const whatsappLink = `https://wa.me/5511933697400?text=${encodeURIComponent(
    language === "pt"
      ? "Olá! Tenho interesse em uma parceria de imersão na Chapada dos Veadeiros."
      : language === "en"
      ? "Hello! I'm interested in an immersion partnership in Chapada dos Veadeiros."
      : "¡Hola! Tengo interés en una alianza de inmersión en Chapada dos Veadeiros."
  )}`;

  return (
    <Layout>
      <PageSEO
        title="Imersões na Chapada dos Veadeiros"
        description="Experiências imersivas na Chapada dos Veadeiros voltadas para grupos, projetos especiais e viagens corporativas. A ATMOS desenvolve jornadas completas que integram natureza, bem-estar e conexão, com curadoria de roteiro e acompanhamento ao longo de toda a experiência."
        path="/imersoes"
      />
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt={l.heroTitle}
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-white/80 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-4 block">Parcerias ATMOS</span>
          <h1 className="text-5xl md:text-7xl font-display text-white mb-6 drop-shadow-sm leading-tight">{l.heroTitle}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-sm">
            {l.heroSubtitle}
          </p>
        </div>
      </section>

      {/* For Whom */}
      <section className="py-16 md:py-24 bg-[#FDFCFB]">
        <div className="container px-4 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-display text-[#1A261B] mb-6">
              {l.forWhom}
            </h2>
            <p className="text-muted-foreground font-light text-lg max-w-2xl mx-auto leading-relaxed">
              {l.forWhomDesc}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {l.audiences.map((a, i) => {
              const Icon = iconComponents[a.icon] || Users;
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl p-6 text-center space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">{a.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {a.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ParallaxDivider image={parallaxImersoes1} alt="Via Láctea na Chapada" />

      {/* Partnership Format */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container px-4 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10">
            {l.partnerTitle}
          </h2>
          <div className="space-y-5">
            {l.partnerSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-primary-foreground/90 leading-relaxed pt-1.5 text-sm md:text-base">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container px-4 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-12">
            {l.infraTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {l.infraItems.map((item, i) => {
                const Icon = iconComponents[item.icon] || Map;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src={infraImg}
                alt={l.infraTitle}
                className="w-full h-64 md:h-80 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <ParallaxDivider image={parallaxImersoes2} alt="Cânion na Chapada" />

      {/* Differentials */}
      <section className="py-16 md:py-24 bg-muted">
        <div className="container px-4 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-12">
            {l.diffTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {l.diffs.map((d, i) => {
              const Icon = iconComponents[d.icon] || Sparkles;
              return (
                <div
                  key={i}
                  className="bg-background border border-border rounded-2xl p-6 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-foreground">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {d.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support Materials */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container px-4 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-accent" />
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">
              {l.materialsTitle}
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            {l.materialsDesc}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {l.materials.map((m, i) => (
              <a
                key={i}
                href={m.link}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-3 hover:shadow-md hover:border-accent/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-accent font-bold text-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground text-center">
                  {m.title}
                </span>
                <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container px-4 max-w-2xl mx-auto">
          {!showForm ? (
            <div className="text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold">
                {language === "pt" ? "Pronto para solicitar seu orçamento?" : language === "en" ? "Ready to request your quote?" : "¿Listo para solicitar su presupuesto?"}
              </h2>
              <p className="opacity-80 leading-relaxed max-w-lg mx-auto">
                {language === "pt"
                  ? "Vamos fazer algumas perguntas rápidas sobre sua imersão para montar o orçamento perfeito. Em seguida, você será direcionado ao nosso atendimento via WhatsApp."
                  : language === "en"
                  ? "We'll ask a few quick questions about your immersion to put together the perfect quote. Then you'll be directed to our WhatsApp support."
                  : "Vamos a hacer algunas preguntas rápidas sobre su inmersión para armar el presupuesto perfecto. Luego será dirigido a nuestra atención por WhatsApp."}
              </p>
              <div className="flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setShowForm(true)}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-lg px-8"
                >
                  <MessageCircle className="h-5 w-5" />
                  {language === "pt" ? "Solicitar Orçamento" : language === "en" ? "Request Quote" : "Solicitar Presupuesto"}
                </Button>
                <a href="/" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                  {language === "pt" ? "Continuar explorando" : language === "en" ? "Continue exploring" : "Seguir explorando"}
                </a>
              </div>
            </div>
          ) : (
            <ImmersionQuestionnaire onClose={() => setShowForm(false)} />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Immersions;
