import { useState } from "react";
import PageSEO from "@/components/seo/PageSEO";
import Layout from "@/components/layout/Layout";
import { storageUrl } from "@/lib/storage";
import ParallaxDivider from "@/components/home/ParallaxDivider";
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
  ArrowRight,
  MessageCircle,
  Sparkles,
  CheckCircle2
} from "lucide-react";

const heroImg = storageUrl("imersoes/imersoes-hero.jpg");
const parallax1 = storageUrl("imersoes/parallax-imersoes-1.jpg");

export default function GruposImersoes() {
  const [showForm, setShowForm] = useState(false);

  return (
    <Layout>
      <PageSEO
        title="Grupos e Imersões | Área de Parceiros ATMOS"
        description="Portal exclusivo para parceiros ATMOS: facilitadores, agências e empresas. Planeje sua próxima imersão na Chapada dos Veadeiros com suporte local especializado."
        path="/grupos-e-imersoes"
      />

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt="Grupos e Imersões"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container px-4 text-center relative z-10 pt-20">
          <span className="text-[#A88B4C] uppercase tracking-[0.4em] text-xs font-bold mb-4 block">Área de Parceiros</span>
          <h1 className="text-4xl md:text-6xl font-display text-white mb-6">Grupos e Imersões</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-light">
            O suporte local de alta performance que o seu projeto precisa na Chapada dos Veadeiros.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 bg-[#FAF9F6]">
        <div className="container px-4 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display text-[#1A1612] mb-8">Sua visão, nossa operação.</h2>
          <p className="text-[#1A1612]/70 text-lg leading-relaxed mb-12">
            Entendemos que conduzir um grupo exige energia total na facilitação. Por isso, a ATMOS assume a responsabilidade por toda a complexidade logística e operacional, entregando uma experiência de padrão internacional para seus clientes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
              <Map className="w-8 h-8 text-[#A88B4C] mb-4" />
              <h3 className="font-display text-xl mb-2 text-[#1A1612]">Curadoria</h3>
              <p className="text-sm text-[#1A1612]/60">Acesso aos melhores spots, muitos fora do roteiro comercial.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
              <Car className="w-8 h-8 text-[#A88B4C] mb-4" />
              <h3 className="font-display text-xl mb-2 text-[#1A1612]">Logística</h3>
              <p className="text-sm text-[#1A1612]/60">Frota 4x4 própria e equipe local coordenada em tempo real.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
              <Camera className="w-8 h-8 text-[#A88B4C] mb-4" />
              <h3 className="font-display text-xl mb-2 text-[#1A1612]">Registros</h3>
              <p className="text-sm text-[#1A1612]/60">Documentação profissional (foto/vídeo/drone) inclusa no pacote.</p>
            </div>
          </div>
        </div>
      </section>

      <ParallaxDivider image={parallax1} alt="Chapada dos Veadeiros" />

      {/* Services Grid */}
      <section className="py-24 bg-[#1A1612] text-white">
        <div className="container px-4 max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-[#A88B4C] uppercase tracking-widest text-xs font-bold mb-2 block">Full Service</span>
            <h2 className="text-3xl md:text-5xl font-display">O que entregamos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[
              { title: "Hospedagens Únicas", desc: "Casas de design, vilas privativas e pousadas boutique com selo de qualidade ATMOS." },
              { title: "Gastronomia Afetiva", desc: "Catering completo com foco em ingredientes locais e restrições alimentares respeitadas." },
              { title: "Guias Especializados", desc: "Condutores bilíngues e especialistas em geologia, botânica e história local." },
              { title: "Gestão de Riscos", desc: "Protocolos de segurança rigorosos e seguro viagem incluso para todos os participantes." },
              { title: "Suporte 24/7", desc: "Um concierge dedicado para resolver qualquer imprevisto durante a jornada." },
              { title: "Kit de Boas-Vindas", desc: "Mimos curados e materiais de apoio personalizados para o seu grupo." }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-[#A88B4C] flex-shrink-0" />
                <div>
                  <h4 className="font-display text-lg mb-1">{item.title}</h4>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Questionnaire */}
      <section id="questionario" className="py-24 bg-white">
        <div className="container px-4 max-w-3xl mx-auto">
          {!showForm ? (
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#FAF9F6] mb-4">
                <Sparkles className="w-10 h-10 text-[#A88B4C]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-display text-[#1A1612]">Vamos planejar o próximo passo?</h2>
              <p className="text-[#1A1612]/60 text-lg font-light">
                Para podermos elaborar uma proposta sob medida, precisamos entender alguns detalhes do seu grupo. O preenchimento leva menos de 2 minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  onClick={() => setShowForm(true)}
                  className="bg-[#A88B4C] hover:bg-[#C5A96A] text-white rounded-full px-10 h-14 text-lg gap-2"
                >
                  Iniciar Briefing
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <a 
                  href="https://wa.me/5511933697400" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#1A1612]/60 hover:text-[#1A1612] transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar direto com consultor
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF9F6] p-8 md:p-12 rounded-3xl border border-black/5 shadow-xl relative">
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-6 right-6 text-[#1A1612]/40 hover:text-[#1A1612]"
              >
                Voltar
              </button>
              <ImmersionQuestionnaire onClose={() => setShowForm(false)} />
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
