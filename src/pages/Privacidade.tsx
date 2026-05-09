import Layout from "@/components/layout/Layout";
import PageSEO from "@/components/seo/PageSEO";

export default function Privacidade() {
  return (
    <Layout>
      <PageSEO title="Política de Privacidade — ATMOS" description="Saiba como a ATMOS protege seus dados." path="/privacidade" />
      <div className="bg-[#f4f3f0] min-h-screen py-32">
        <div className="container max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-display text-[#1A261B] mb-8">Política de Privacidade</h1>
          
          <div className="prose prose-stone prose-p:text-[#2C3E2D]/80 prose-headings:text-[#1A261B] max-w-none">
            <p className="lead text-lg mb-8 font-light">
              A ATMOS Experiências na Chapada dos Veadeiros valoriza a sua privacidade e se compromete a proteger os dados pessoais que você compartilha conosco. Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">1. Dados que Coletamos</h2>
            <p>Podemos coletar as seguintes informações quando você utiliza nosso site, solicita orçamentos ou contrata nossos serviços:</p>
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li><strong>Dados de Contato:</strong> Nome, e-mail, telefone (WhatsApp) e endereço.</li>
              <li><strong>Dados de Viagem:</strong> Preferências de roteiro, datas da viagem, número de pessoas, idades e informações sobre mobilidade.</li>
              <li><strong>Dados de Navegação (Cookies):</strong> Endereço IP, tipo de navegador, páginas visitadas e tempo de permanência, capturados através de ferramentas como Google Analytics e Meta Pixel, apenas após o seu consentimento.</li>
            </ul>

            <h2 className="text-2xl font-display mt-10 mb-4">2. Como Usamos seus Dados</h2>
            <p>Utilizamos suas informações para as seguintes finalidades:</p>
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li>Elaborar orçamentos personalizados e organizar a sua curadoria de viagem.</li>
              <li>Entrar em contato via WhatsApp ou e-mail para dar continuidade ao seu atendimento.</li>
              <li>Melhorar a experiência do nosso site e personalizar campanhas de marketing (se você aceitar os cookies de publicidade).</li>
            </ul>

            <h2 className="text-2xl font-display mt-10 mb-4">3. Compartilhamento de Dados</h2>
            <p>
              A ATMOS não vende ou aluga seus dados pessoais. Seus dados podem ser compartilhados apenas com prestadores de serviço estritamente necessários para a execução da sua viagem (ex: guias locais, pousadas, sistemas de pagamento), sempre sob compromisso de confidencialidade.
            </p>

            <h2 className="text-2xl font-display mt-10 mb-4">4. Seus Direitos</h2>
            <p>Você tem o direito de solicitar a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li>Acesso aos dados que possuímos sobre você.</li>
              <li>A correção de dados incompletos ou desatualizados.</li>
              <li>A exclusão dos seus dados do nosso banco (exceto aqueles que precisamos manter por obrigação legal ou fiscal).</li>
            </ul>

            <h2 className="text-2xl font-display mt-10 mb-4">5. Contato</h2>
            <p>
              Se tiver dúvidas sobre esta Política de Privacidade ou quiser exercer seus direitos, entre em contato conosco através do e-mail: <strong>atmosexperiencias@gmail.com</strong>
            </p>

            <p className="text-sm mt-12 text-[#2C3E2D]/50 border-t border-[#1A261B]/10 pt-6">
              Última atualização: Maio de 2026. Reservamo-nos o direito de atualizar esta política periodicamente.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
