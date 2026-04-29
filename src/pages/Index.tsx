import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroMain from "@/components/home/HeroMain";
import HeroScratch from "@/components/home/HeroScratch";
import VideoFeature from "@/components/home/VideoFeature";
import AboutAtmosSection from "@/components/home/AboutAtmosSection";
import FeatureShowcase from "@/components/home/FeatureShowcase";
import CuradoriaPreview from "@/components/home/CuradoriaPreview";
import FacilitadorSection from "@/components/home/FacilitadorSection";
import FounderShowcase from "@/components/home/FounderShowcase";
import ExperienceEcosystem from "@/components/home/ExperienceEcosystem";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="overflow-hidden">
        {/* TOP HERO: VIDEO EXCLUSIVE */}
        <HeroMain 
          tagline="O seu espaço para explorar a"
          title="Chapada dos Veadeiros"
        />
        
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
      </main>
      <Footer />
    </div>
  );
};

export default Index;
