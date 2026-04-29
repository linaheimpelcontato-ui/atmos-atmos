import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { optimizedUrl } from "@/lib/storage";

const categories = [
  { key: "waterfalls", path: "/cachoeiras", image: optimizedUrl("home/cat-waterfalls.jpg", { quality: 70 }), objectPosition: "center 80%" },
  { key: "experiences", path: "/experiencias", image: optimizedUrl("home/cat-experiences.jpg", { quality: 70 }) },
  { key: "accommodations", path: "/hospedagens", image: optimizedUrl("home/cat-accommodations.jpg", { quality: 70 }) },
  { key: "services", path: "/servicos", image: optimizedUrl("home/cat-services.jpg", { quality: 70 }), objectPosition: "center 25%" },
];

export default function CategoriesSection() {
  const { t } = useLanguage();

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {t("categories.title")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t("categories.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link key={cat.key} to={cat.path} className="group">
              <div className="relative h-72 sm:h-80 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                <img
                  src={cat.image}
                  alt={t(`categories.${cat.key}`)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  style={cat.objectPosition ? { objectPosition: cat.objectPosition } : undefined}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="text-lg font-bold mb-1 drop-shadow-lg">
                    {t(`categories.${cat.key}`)}
                  </h3>
                  <p className="text-sm opacity-80 drop-shadow-md leading-snug">
                    {t(`categories.${cat.key}.desc`)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
