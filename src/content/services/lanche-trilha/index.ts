import { type Service } from "../../../data/services";

export const lancheTrilha: Service = {
  id: "lanche-trilha",
  category: "alimentacao",
  title: { pt: "Lanche de Trilha", en: "Trail Snack", es: "Merienda de Sendero" },
  subtitle: { pt: "Kits Artesanais", en: "Artisan Kits", es: "Kits Artesanales" },
  description: {
    pt: "Kits de alimentação preparados por produtores locais com ingredientes frescos do Cerrado. Nutritivos e práticos para suas aventuras.",
    en: "Food kits prepared by local producers with fresh Cerrado ingredients. Nutritious and practical for your adventures.",
    es: "Kits de comida preparados por productores locales con ingredientes frescos del Cerrado. Nutritivos y prácticos para sus aventuras.",
  },
  price: "A partir de R$ 25",
  imageKey: "alimentacao",
  items: [
    {
      id: "sanduba",
      name: { pt: "Sanduba Artesanal", en: "Artisan Sandwich", es: "Sandwich Artesanal" },
      price: "R$ 25",
      flavors: {
        pt: ["Teiú Goiás — Lagarto bovino, mostarda de pequi, cebola caramelizada", "FrangaLina — Frango ao pesto de manjericão, relish de tomate", "Sebo na Lomba — Lombo de porco, chutney de manga, parmesão"],
        en: ["Teiú Goiás — Shredded beef, pequi mustard, caramelized onion", "FrangaLina — Chicken pesto, tomato relish", "Sebo na Lomba — Roasted pork loin, mango chutney, parmesan"],
        es: ["Teiú Goiás — Carne deshilachada, mostaza de pequi, cebolla caramelizada", "FrangaLina — Pollo al pesto de albahaca, relish de tomate", "Sebo na Lomba — Lomo de cerdo, chutney de mango, parmesano"],
      },
    },
    // ... other items would be here
  ],
};
