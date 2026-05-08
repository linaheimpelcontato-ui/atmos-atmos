import { useState, useMemo } from "react";
import PageSEO from "@/components/seo/PageSEO";

import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";

const heroServicos = storageUrl("servicos/hero-servicos.jpg");
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts } from "@/hooks/useProducts";
import { type Service, services as staticServices } from "@/data/services";
import ServiceCard from "@/components/services/ServiceCard";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";

const pageLabels = {
  pt: {
    title: "Serviços Diferenciais",
    subtitle:
      "Personalize sua experiência com serviços exclusivos ATMOS. Cada detalhe foi pensado para ampliar o conforto, o registro e a imersão na Chapada dos Veadeiros.",
    howTitle: "Como funciona",
    howText:
      "Depois de definir seu roteiro com a curadoria ATMOS, você pode personalizar sua viagem com serviços e detalhes extras. Esses diferenciais foram pensados para ampliar o conforto, o registro e a imersão na Chapada dos Veadeiros e podem ser incluídos em qualquer roteiro ATMOS.",
  },
  en: {
    title: "Premium Services",
    subtitle:
      "Customize your experience with exclusive ATMOS services. Every detail was designed to enhance comfort, recording and immersion in Chapada dos Veadeiros.",
    howTitle: "How it works",
    howText:
      "After defining your itinerary with ATMOS curation, you can customize your trip with extra services and details. These differentials were designed to enhance comfort, recording and immersion in Chapada dos Veadeiros and can be included in any ATMOS itinerary.",
  },
  es: {
    title: "Servicios Diferenciales",
    subtitle:
      "Personalice su experiencia con servicios exclusivos ATMOS. Cada detalle fue pensado para ampliar el confort, el registro y la inmersión en Chapada dos Veadeiros.",
    howTitle: "Cómo funciona",
    howText:
      "Después de definir su itinerario con la curaduría ATMOS, puede personalizar su viaje con servicios y detalles extras. Estos diferenciales fueron pensados para ampliar el confort, el registro y la inmersión en Chapada dos Veadeiros y pueden ser incluidos en cualquier itinerario ATMOS.",
  },
};

const Services = () => {
  const { language } = useLanguage();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const l = pageLabels[language];

  const { data: dbProducts = [] } = useProducts("service");

  const services = useMemo(() => {
    const merged = [...staticServices];
    
    dbProducts.forEach(dbProduct => {
      const staticIdx = merged.findIndex(s => s.id === dbProduct.source_id);
      const dbVars = (dbProduct.variables || {}) as any;
      
      const mapped: Service = {
        id: dbProduct.source_id || dbProduct.id,
        category: (dbVars.service_type || (staticIdx > -1 ? merged[staticIdx].category : "especial")) as any,
        title: {
          pt: dbProduct.name,
          en: (staticIdx > -1 ? merged[staticIdx].title.en : dbProduct.name),
          es: (staticIdx > -1 ? merged[staticIdx].title.es : dbProduct.name),
        },
        subtitle: {
          pt: dbVars.subcategory || (staticIdx > -1 ? merged[staticIdx].subtitle.pt : ""),
          en: (staticIdx > -1 ? merged[staticIdx].subtitle.en : (dbVars.subcategory || "")),
          es: (staticIdx > -1 ? merged[staticIdx].subtitle.es : (dbVars.subcategory || "")),
        },
        description: {
          pt: dbProduct.description || "",
          en: (staticIdx > -1 ? merged[staticIdx].description.en : dbProduct.description || ""),
          es: (staticIdx > -1 ? merged[staticIdx].description.es : dbProduct.description || ""),
        },
        price: dbProduct.unit_price ? `R$ ${dbProduct.unit_price}` : (staticIdx > -1 ? merged[staticIdx].price : undefined),
        imageKey: staticIdx > -1 ? merged[staticIdx].imageKey : (dbVars.imageKey || dbProduct.source_id || dbProduct.id),
        storageId: dbVars.storage_id || (staticIdx > -1 ? merged[staticIdx].id : dbProduct.id),
        tiers: dbVars.tiers || (staticIdx > -1 ? merged[staticIdx].tiers : undefined),
        items: dbVars.items || (staticIdx > -1 ? merged[staticIdx].items : undefined),
        transferTable: dbVars.transferTable || (staticIdx > -1 ? merged[staticIdx].transferTable : undefined),
      };

      if (staticIdx > -1) {
        merged[staticIdx] = mapped;
      } else {
        merged.push(mapped);
      }
    });
    
    return merged;
  }, [dbProducts]);

  return (
    <Layout>
      <PageSEO
        title="Serviços Diferenciais para sua Viagem"
        description="Transfer, drone, lanches de trilha e serviços especiais para personalizar sua viagem à Chapada dos Veadeiros com conforto."
        path="/servicos"
      />
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroServicos}
          alt="Serviços na Chapada dos Veadeiros"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-white/80 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-4 block">Serviços ATMOS</span>
          <h1 className="text-5xl md:text-7xl font-display text-white mb-6 drop-shadow-sm leading-tight">{l.title}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-sm">
            {l.subtitle}
          </p>
        </div>
      </section>



      {/* How it works */}
      <section className="py-10 md:py-14 bg-[#FDFCFB]">
        <div className="container px-4 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-display text-[#1A261B] mb-4">
            {l.howTitle}
          </h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base font-light">
            {l.howText}
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="pb-16 md:pb-24 bg-[#FDFCFB]">
        <div className="container px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {services.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                onClick={() => setSelectedService(svc)}
              />
            ))}
          </div>
        </div>
      </section>

      <ServiceDetailDialog
        service={selectedService}
        open={!!selectedService}
        onOpenChange={(open) => !open && setSelectedService(null)}
      />
    </Layout>
  );
};

export default Services;
