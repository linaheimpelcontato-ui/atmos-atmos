import Layout from "@/components/layout/Layout";
import PageSEO from "@/components/seo/PageSEO";

export default function Termos() {
  return (
    <Layout>
      <PageSEO title="Termos de Uso — ATMOS" description="Termos e condições de uso da plataforma ATMOS." path="/termos" />
      <div className="bg-[#f4f3f0] min-h-screen py-32">
        <div className="container max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-display text-[#1A261B] mb-8">Termos de Uso</h1>
          
          <div className="prose prose-stone prose-p:text-[#2C3E2D]/80 prose-headings:text-[#1A261B] max-w-none">
            <p className="lead text-lg mb-8 font-light">
              Bem-vindo à ATMOS. Ao acessar e utilizar o nosso site (atmos.tur.br) e nossos serviços de curadoria de viagens na Chapada dos Veadeiros, você concorda em cumprir os presentes Termos de Uso. Recomendamos que leia atentamente antes de prosseguir com qualquer solicitação.
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">1. Nossos Serviços</h2>
            <p>
              A ATMOS atua como uma plataforma de curadoria e organização de roteiros personalizados para a região da Chapada dos Veadeiros. Nosso site permite que você navegue por experiências, adicione interesses à sua "Wishlist" e solicite um atendimento personalizado (orçamento) via WhatsApp.
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">2. Solicitação de Roteiros e Sinal</h2>
            <p>
              O envio da sua Wishlist não configura uma reserva automática. Ao finalizar a solicitação no site, você será direcionado ao nosso WhatsApp para conversar com um de nossos especialistas. Para garantir a exclusividade da curadoria, bloqueio de datas na nossa agenda e o detalhamento completo do seu roteiro, cobramos um <strong>sinal de compromisso no valor de R$ 1.500</strong>. Esse valor será abatido do custo total do seu pacote de viagem.
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">3. Responsabilidades do Usuário</h2>
            <p>Ao utilizar nossa plataforma, você concorda em:</p>
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li>Fornecer informações verdadeiras, completas e atualizadas ao solicitar orçamentos.</li>
              <li>Não utilizar o site para fins ilícitos, fraudulentos ou que violem os direitos de terceiros.</li>
              <li>Entender que as imagens exibidas no catálogo são ilustrativas, e as condições climáticas e naturais da Chapada dos Veadeiros podem alterar o visual dos atrativos.</li>
            </ul>

            <h2 className="text-2xl font-display mt-10 mb-4">4. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo do site, incluindo textos, logotipos, layout, design e curadoria estrutural de experiências, são de propriedade exclusiva da ATMOS ou licenciados para nosso uso. É proibida a reprodução, cópia ou distribuição sem nossa autorização prévia.
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">5. Limitação de Responsabilidade</h2>
            <p>
              Nós nos esforçamos para manter as informações sobre os atrativos e hospedagens o mais precisas possível. No entanto, horários de funcionamento, regras de acesso a parques e disponibilidade de serviços terceirizados estão sujeitos a alterações sem aviso prévio. A ATMOS não se responsabiliza por imprevistos causados por força maior ou decisões de terceiros (como fechamento de cachoeiras por questões de segurança).
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">6. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos de Uso de tempos em tempos. Recomendamos que você revise esta página periodicamente. O uso continuado dos nossos serviços após quaisquer alterações constitui aceitação dos novos termos.
            </p>

            <p className="text-sm mt-12 text-[#2C3E2D]/50 border-t border-[#1A261B]/10 pt-6">
              Última atualização: Maio de 2026.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
