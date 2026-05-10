import { Instagram, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { storageUrl } from "@/lib/storage";
import { trackWhatsAppClick } from "@/lib/analytics";

const logoAtmos = storageUrl("home/logo-atmos.png");

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#1A1612] text-[#E4DBCC] relative overflow-hidden pt-32 pb-16">
      {/* MONUMENTAL LOGO WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden z-0">
        <img
          loading="lazy"
          src={logoAtmos}
          alt="ATMOS Watermark"
          className="w-[180vw] max-w-none opacity-80 brightness-0 invert"
          width="1200"
          height="400"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* REFINED 3-COLUMN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-y-0">

          {/* COLUMN 1: Logo & Tagline */}
          <div className="md:col-span-5 flex flex-col items-start translate-y-[-4px]">
            <div className="h-10 md:h-8 flex items-center mb-10">
              <img
                src={logoAtmos}
                alt="ATMOS"
                className="h-full w-auto brightness-0 invert opacity-90"
                width="120"
                height="32"
              />
            </div>
            <div className="flex items-start">
              <h2 className="text-2xl md:text-3xl font-display italic font-light leading-[1.1] opacity-80 max-w-[420px]">
                Curadoria de Experiências na Chapada dos Veadeiros
              </h2>
            </div>
          </div>

          {/* COLUMN 2: Contact Info (Standard Position) */}
          <div className="md:col-start-7 md:col-span-3 flex flex-col items-start">
            <div className="h-10 md:h-8 flex items-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40">Contato</p>
            </div>

            <div className="flex items-center mb-6"> {/* Row 2: Aligned with Curadoria top / Phone */}
              <a
                href="https://wa.me/5511933697400"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-lg font-sans font-light hover:opacity-100 transition-opacity whitespace-nowrap"
                onClick={() => trackWhatsAppClick("footer")}
              >
                <Phone className="h-4 w-4 opacity-50 flex-shrink-0" />
                +55 11 93369-7400
              </a>
            </div>

            <div className="flex items-center"> {/* Row 3: Follow-up Email */}
              <a
                href="mailto:contato@atmoschapada.com"
                className="flex items-center gap-3 text-lg font-sans font-light hover:opacity-100 transition-opacity whitespace-nowrap"
              >
                <Mail className="h-4 w-4 opacity-50 flex-shrink-0" />
                contato@atmoschapada.com
              </a>
            </div>
          </div>

          {/* COLUMN 3: Social Info (Pushed Further Right) */}
          <div className="md:col-start-10 md:col-span-3 flex flex-col items-end text-right">
            <div className="h-10 md:h-8 flex items-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40">Siga-nos</p>
            </div>

            <div className="flex items-center"> {/* Row 2: Specifically aligned with Phone number row */}
              <a
                href="https://www.instagram.com/atmoschapada"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-lg font-sans font-light hover:opacity-100 transition-opacity"
              >
                <Instagram className="h-4 w-4 opacity-50 flex-shrink-0" />
                @atmoschapada
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] uppercase tracking-[0.3em] font-medium opacity-30">
          <div className="flex gap-12">
            <span>© {new Date().getFullYear()} ATMOS</span>
            <Link to="/duvidas" className="hover:opacity-100">{t("nav.faq")}</Link>
            <Link to="/privacidade" className="hover:opacity-100">Privacidade</Link>
            <Link to="/termos" className="hover:opacity-100">Termos</Link>
          </div>
          <div className="flex gap-12">
            <span>Branding by YES NOW</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
