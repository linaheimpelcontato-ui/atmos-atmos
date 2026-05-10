import React, { Suspense, lazy } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroMain from "@/components/home/HeroMain";

// Below the fold components - Lazy Loaded
const HeroScratch = lazy(() => import("@/components/home/HeroScratch"));
const VideoFeature = lazy(() => import("@/components/home/VideoFeature"));
const AboutAtmosSection = lazy(() => import("@/components/home/AboutAtmosSection"));
const FeatureShowcase = lazy(() => import("@/components/home/FeatureShowcase"));
const CuradoriaPreview = lazy(() => import("@/components/home/CuradoriaPreview"));
const FacilitadorSection = lazy(() => import("@/components/home/FacilitadorSection"));
const FounderShowcase = lazy(() => import("@/components/home/FounderShowcase"));
const ExperienceEcosystem = lazy(() => import("@/components/home/ExperienceEcosystem"));

import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO 
        title="Experiências Exclusivas na Chapada dos Veadeiros" 
        description="A ATMOS oferece a melhor curadoria de experiências, roteiros personalizados e guias bilingues na Chapada dos Veadeiros. Descubra o turismo de luxo consciente."
        keywords="Chapada dos Veadeiros, turismo de luxo, guia bilingue, roteiros personalizados, experiências exclusivas, Alto Paraíso"
      />
      <Header />
      <main className="overflow-hidden">
        {/* TOP HERO: VIDEO EXCLUSIVE - LOADED IMMEDIATELY */}
        <HeroMain 
          tagline="O seu espaço para explorar a"
          title="Chapada dos Veadeiros"
        />
        
        <Suspense fallback={<div className="h-20" />}>
          {/* EXPANDING CARD: AS REQUESTED */}
          <VideoFeature />
          
          <AboutAtmosSection />
          <CuradoriaPreview />
          <FeatureShowcase />
          <ExperienceEcosystem />
          <FacilitadorSection />
          <FounderShowcase />
          
          {/* BOTTOM CTA: ROTATING RINGS ANIMATION (ORIGINAL) */}
          <HeroScratch 
            tagline="Faça seu cadastro" 
            title="Sua viagem começa agora" 
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
