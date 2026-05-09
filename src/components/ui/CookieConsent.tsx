import { useState, useEffect } from "react";
import { Button } from "./button";
import { ShieldCheck } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verifica se já existe uma escolha de consentimento
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);

    // Atualiza o consentimento do Google Analytics / GTM em tempo real
    if (window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
      });
    }
    
    // Dispara um evento pro GTM saber que o consentimento foi dado agora
    if (window.dataLayer) {
      window.dataLayer.push({ event: 'cookie_consent_granted' });
    }
  };

  const declineCookies = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-[9999] p-4 md:p-6 animate-in slide-in-from-bottom-5">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-2 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Privacidade e Cookies
            </h3>
            <p className="text-sm text-gray-600">
              Utilizamos cookies e tecnologias similares para melhorar a sua
              experiência, analisar o tráfego do site e personalizar anúncios.
              Ao clicar em "Aceitar", você concorda com o uso de todos os
              cookies. <a href="/privacidade" className="underline hover:text-primary">Saiba mais</a>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={declineCookies}
          >
            Recusar Opcionais
          </Button>
          <Button
            className="w-full md:w-auto bg-primary text-white hover:bg-primary/90"
            onClick={acceptCookies}
          >
            Aceitar e Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
