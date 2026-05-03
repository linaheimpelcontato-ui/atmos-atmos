import { useLanguage } from "@/contexts/LanguageContext";
export default function AboutSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-secondary">
      <div className="container max-w-3xl text-center px-4">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
          {t("about.title")}
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-4">
          {t("about.text1")}
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t("about.text2")}
        </p>
      </div>
    </section>
  );
}
