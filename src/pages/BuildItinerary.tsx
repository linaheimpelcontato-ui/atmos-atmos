import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";

import { useLanguage } from "@/contexts/LanguageContext";
import { Droplets, Sparkles, Home, Wrench, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { storageUrl } from "@/lib/storage";

const catWaterfalls = storageUrl("home/cat-waterfalls.jpg");
const catExperiences = storageUrl("home/cat-experiences.jpg");
const catAccommodations = storageUrl("home/cat-accommodations.jpg");
const catServices = storageUrl("home/cat-services.jpg");

const steps = [
  {
    number: 1,
    icon: Droplets,
    titleKey: "paths.custom.bullet1",
    path: "/monte-seu-roteiro/cachoeiras",
    image: catWaterfalls,
    objectPosition: "center 80%",
    descPt: "Explore mais de 35 cachoeiras e atrativos naturais da Chapada. Filtre por região, dificuldade e sazonalidade.",
    descEn: "Explore 35+ waterfalls and natural attractions. Filter by region, difficulty and season.",
    descEs: "Explora más de 35 cascadas y atractivos naturales. Filtra por región, dificultad y temporada.",
  },
  {
    number: 2,
    icon: Sparkles,
    titleKey: "paths.custom.bullet2",
    path: "/monte-seu-roteiro/experiencias",
    image: catExperiences,
    descPt: "Descubra 17 vivências únicas: aventura, bem-estar, cultura e contemplação curadas pela ATMOS.",
    descEn: "Discover 17 unique experiences: adventure, wellness, culture and contemplation curated by ATMOS.",
    descEs: "Descubre 17 vivencias únicas: aventura, bienestar, cultura y contemplación curadas por ATMOS.",
  },
  {
    number: 3,
    icon: Home,
    titleKey: "paths.custom.bullet3",
    path: "/monte-seu-roteiro/hospedagens",
    image: catAccommodations,
    descPt: "Escolha entre 30+ hospedagens selecionadas: pousadas, chalés, casas de temporada e lodges.",
    descEn: "Choose from 30+ hand-picked stays: inns, chalets, vacation homes and lodges.",
    descEs: "Elige entre 30+ hospedajes seleccionados: posadas, chalets, casas de temporada y lodges.",
  },
  {
    number: 4,
    icon: Wrench,
    titleKey: "Serviços extras",
    path: "/monte-seu-roteiro/servicos",
    image: catServices,
    objectPosition: "center 25%",
    descPt: "Complemente com registro de drone, lanche de trilha, transfer aeroporto e pedidos especiais.",
    descEn: "Add drone footage, trail snacks, airport transfer and special requests.",
    descEs: "Complementa con registro con drone, snacks de sendero, transfer aeropuerto y pedidos especiales.",
  },
];

const BuildItinerary = () => {
  const { t, language } = useLanguage();
  const { count } = useWishlist();

  const getDesc = (step: typeof steps[0]) => {
    if (language === "en") return step.descEn;
    if (language === "es") return step.descEs;
    return step.descPt;
  };

  const pageTitle = {
    pt: "Monte seu Roteiro",
    en: "Build Your Itinerary",
    es: "Arma tu Itinerario",
  };

  const pageSubtitle = {
    pt: "Crie sua experiência sob medida na Chapada dos Veadeiros. Siga os passos abaixo, adicione o que quiser na wishlist e envie seu orçamento via WhatsApp.",
    en: "Create your tailor-made experience in Chapada dos Veadeiros. Follow the steps below, add what you want to your wishlist and send your quote via WhatsApp.",
    es: "Crea tu experiencia a medida en Chapada dos Veadeiros. Sigue los pasos, agrega lo que quieras a la wishlist y envía tu presupuesto por WhatsApp.",
  };

  const viewCart = {
    pt: "Ver minha Wishlist",
    en: "View my Wishlist",
    es: "Ver mi Wishlist",
  };

  return (
    <Layout>
      <PageSEO
        title="Monte seu Roteiro na Chapada dos Veadeiros"
        description="Crie um roteiro personalizado escolhendo cachoeiras, experiências, hospedagens e serviços. Viagem sob medida com curadoria ATMOS."
        path="/novo-roteiro"
      />
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{pageTitle[language]}</h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
            {pageSubtitle[language]}
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-24">
        <div className="container px-4 max-w-4xl">
          <div className="space-y-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="flex flex-col sm:flex-row items-stretch gap-0 bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="relative w-full sm:w-48 md:w-56 h-44 sm:h-auto flex-shrink-0">
                    <img
                      src={step.image}
                      alt={t(step.titleKey)}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={step.objectPosition ? { objectPosition: step.objectPosition } : undefined}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent sm:bg-gradient-to-b sm:from-transparent sm:to-black/20" />
                    {/* Step number overlay */}
                    <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {t(step.titleKey)}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {getDesc(step)}
                    </p>
                    <Button asChild variant="outline" className="rounded-full gap-2 w-fit">
                      <Link to={step.path}>
                        {language === "pt" ? "Explorar" : language === "en" ? "Explore" : "Explorar"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12">

          </div>

          {/* Cart CTA */}
          <div className="mt-12 text-center">
            <Button asChild size="lg" className="rounded-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8">
              <Link to="/wishlist">
                <ShoppingBag className="h-5 w-5" />
                {viewCart[language]}
                {count > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-1">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BuildItinerary;
