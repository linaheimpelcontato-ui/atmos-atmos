import { useLanguage } from "@/contexts/LanguageContext";
import { storageUrl } from "@/lib/storage";

const joaoAccioly = storageUrl("home/joao-accioly.jpg");

export default function GuideSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-secondary">
      <div className="container max-w-4xl px-4">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-shrink-0">
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg">
              <img src={joaoAccioly} alt="João Accioly" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("guide.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-3">
              {t("guide.text1")}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("guide.text2")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
