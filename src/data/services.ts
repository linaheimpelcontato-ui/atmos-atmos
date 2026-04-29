import { type Language } from "@/contexts/LanguageContext";
import { storageUrl } from "@/lib/storage";

export type ServiceCategory = "alimentacao" | "registros" | "transfers" | "especial";

export interface ServiceTier {
  id: string;
  name: Record<Language, string>;
  price: string;
  description: Record<Language, string>;
  includes?: Record<Language, string[]>;
  image?: string;
}

export interface ServiceItem {
  id: string;
  name: Record<Language, string>;
  price?: string;
  image?: string;
  flavors?: Record<Language, string[]>;
}

export interface TransferTable {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  columns: string[];
  rows: { destination: string; values: string[] }[];
}

export interface Service {
  id: string;
  category: ServiceCategory;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  description: Record<Language, string>;
  price?: string;
  imageKey?: string;
  // Detailed info fields restored
  tiers?: ServiceTier[];
  items?: ServiceItem[];
  transferTable?: TransferTable;
  variations?: any[];
  type?: string;
  variables?: any;
  name?: string;
}

export const categoryLabels: Record<ServiceCategory, Record<Language, string>> = {
  alimentacao: { pt: "Alimentação", en: "Food", es: "Alimentación" },
  registros: { pt: "Registros Fotográficos", en: "Photography", es: "Registros Fotográficos" },
  transfers: { pt: "Transfers", en: "Transfers", es: "Transfers" },
  especial: { pt: "Pedidos Especiais", en: "Special Requests", es: "Pedidos Especiales" },
};

export const services: Service[] = [
  // ========== REGISTROS FOTOGRÁFICOS ==========
  {
    id: "diaria-captacao-drone",
    category: "registros",
    title: { pt: "Diária de Captação Drone", en: "Drone Capture Day", es: "Diaria de Captación Drone" },
    subtitle: { pt: "Fotos e Vídeos Brutos", en: "Raw Photos & Videos", es: "Fotos y Videos Brutos" },
    description: {
      pt: "Captação do dia inteiro com drone, acompanhando seu ritmo natural de trilha. Ideal para quem quer ter tudo registrado em alta qualidade para editar depois.",
      en: "Full day of drone capture, following your natural trail pace. Ideal for those who want high-quality raw footage to edit later.",
      es: "Captación del día completo con drone, siguiendo tu ritmo natural de sendero. Ideal para quienes quieren tener todo registrado en alta calidad para editar después.",
    },
    price: "R$ 400",
    imageKey: "registros",
    tiers: [
      {
        id: "drone-basico",
        name: { pt: "Diária de Captação", en: "Day Capture", es: "Diaria de Captación" },
        price: "R$ 400",
        description: {
          pt: "Captação do dia inteiro com drone, acompanhando seu ritmo natural de trilha.",
          en: "Full day capture with drone, following your natural trail rhythm.",
          es: "Captación del día entero con drone, acompañando su ritmo natural de sendero.",
        },
        includes: {
          pt: ["Fotos e vídeos brutos em alta qualidade", "Cenas aéreas dos atrativos visitados", "Capturas espontâneas do percurso", "Registro natural, sem direção", "Entrega via link organizadinho por pastas"],
          en: ["High quality raw photos and videos", "Aerial scenes of visited attractions", "Spontaneous captures of the trail", "Natural recording, no direction", "Delivery via organized link"],
          es: ["Fotos y videos brutos en alta calidad", "Escenas aéreas de los atractivos visitados", "Capturas espontáneas del recorrido", "Registro natural, sin dirección", "Entrega vía link organizado"],
        },
      }
    ]
  },
  {
    id: "diaria-captacao-edicao-drone",
    category: "registros",
    title: { pt: "Diária Captação e Edição Drone", en: "Drone Capture & Edit Day", es: "Diaria Captación y Edición Drone" },
    subtitle: { pt: "Conteúdo Finalizado", en: "Finished Content", es: "Contenido Finalizado" },
    description: {
      pt: "Captação completa do seu passeio + edição profissional que realça a estética da Chapada. Você recebe o material pronto para postar.",
      en: "Complete capture of your tour + professional editing that enhances the Chapada aesthetic. You receive the material ready to post.",
      es: "Captación completa de tu tour + edición profesional que realza la estética de la Chapada. Recibes el material listo para publicar.",
    },
    price: "R$ 500",
    imageKey: "registros",
    tiers: [
      {
        id: "drone-edicao",
        name: { pt: "Captação com Edição", en: "Capture with Editing", es: "Captación con Edición" },
        price: "R$ 500",
        description: {
          pt: "Captação completa do seu passeio + edição profissional (color) que realça a estética da Chapada.",
          en: "Complete capture of your tour + professional editing (color grading) that enhances Chapada's aesthetics.",
          es: "Captación completa de su paseo + edición profesional (color) que realza la estética de la Chapada.",
        },
        includes: {
          pt: ["Todo o conteúdo bruto", "Vídeos editados com select de cortes e coloração", "Seleção das melhores fotos", "Tratamento leve para manter naturalidade", "Entrega via link organizadinho por pastas"],
          en: ["All raw content", "Edited videos with cut selection and color grading", "Best photos selection", "Light treatment to maintain naturalness", "Delivery via organized link"],
          es: ["Todo el contenido bruto", "Videos editados con selección de cortes y coloración", "Selección de las mejores fotos", "Tratamiento leve para mantener naturalidad", "Entrega vía link organizado"],
        },
      }
    ]
  },
  {
    id: "diaria-fotografo",
    category: "registros",
    title: { pt: "Diária Fotógrafo", en: "Photographer Day", es: "Diaria Fotógrafo" },
    subtitle: { pt: "Registro Profissional", en: "Professional Coverage", es: "Cobertura Profesional" },
    description: {
      pt: "Um fotógrafo dedicado para registrar os melhores momentos da sua expedição com olhar artístico e profissional.",
      en: "A dedicated photographer to capture the best moments of your expedition with an artistic and professional eye.",
      es: "Un fotógrafo dedicado para capturar los mejores momentos de tu expedición con una mirada artística y profesional.",
    },
    price: "Sob consulta",
    imageKey: "especial",
  },
  // ========== ALIMENTAÇÃO ==========
  {
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
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80",
        flavors: {
          pt: ["Teiú Goiás — Lagarto bovino, mostarda de pequi, cebola caramelizada", "FrangaLina — Frango ao pesto de manjericão, relish de tomate", "Sebo na Lomba — Lombo de porco, chutney de manga, parmesão"],
          en: ["Teiú Goiás — Shredded beef, pequi mustard, caramelized onion", "FrangaLina — Chicken pesto, tomato relish", "Sebo na Lomba — Roasted pork loin, mango chutney, parmesan"],
          es: ["Teiú Goiás — Carne deshilachada, mostaza de pequi, cebolla caramelizada", "FrangaLina — Pollo al pesto de albahaca, relish de tomate", "Sebo na Lomba — Lomo de cerdo, chutney de mango, parmesano"],
        },
      },
      {
        id: "sanduba-veg",
        name: { pt: "Sanduba Artesanal Veg", en: "Artisan Veg Sandwich", es: "Sandwich Artesanal Veg" },
        price: "R$ 25",
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80",
        flavors: {
          pt: ["BabagaNussa — Falafel, pasta de berinjela, gergelim", "Salamaleico — Ricota com zaatar, confitado de abobrinhas", "Cogumestíveis — Ricota com cenoura, cogumelos"],
          en: ["BabagaNussa — Falafel, eggplant paste, sesame", "Salamaleico — Ricotta with zaatar, zucchini confit", "Cogumestíveis — Ricotta with carrot, mushrooms"],
          es: ["BabagaNussa — Falafel, pasta de berenjena, sésamo", "Salamaleico — Ricota con zaatar, confitado de calabacines", "Cogumestíveis — Ricota con zanahoria, champiñones"],
        },
      },
      {
        id: "sanduba-kids",
        name: { pt: "Sanduba Artesanal Infantil", en: "Kids Artisan Sandwich", es: "Sandwich Artesanal Infantil" },
        price: "R$ 25",
        image: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=400&q=80",
        flavors: {
          pt: ["Queijo — Mussarela, tomatinhos, pesto", "Frango — Frango desfiado, tomatinhos", "Cogumelos — Ricota com cenoura, cogumelo"],
          en: ["Cheese — Mozzarella, tomatoes, pesto", "Chicken — Shredded chicken, tomatoes", "Mushrooms — Ricotta with carrot, mushroom"],
          es: ["Queso — Muzzarella, tomatitos, pesto", "Pollo — Pollo deshilachado, tomatitos", "Champiñones — Ricota con zanahoria, champiñón"],
        },
      },
      {
        id: "acai",
        name: { pt: "Açaí", en: "Açaí Bowl", es: "Açaí" },
        price: "R$ 16",
        image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80",
        flavors: {
          pt: ["Musa Banana — Açaí com banana, aveia e melado", "Tropical — Açaí com manga, hortelã e melado", "TerRaiz — Açaí com farinha de jatobá e melado"],
          en: ["Musa Banana — Açaí with banana, oats and molasses", "Tropical — Açaí with mango, mint and molasses", "TerRaiz — Açaí with jatobá flour and molasses"],
          es: ["Musa Banana — Açaí con banana, avena y melaza", "Tropical — Açaí con mango, menta y melaza", "TerRaiz — Açaí con harina de jatobá y melaza"],
        },
      },
      {
        id: "brownie",
        name: { pt: "Brownie de Cacau e Baru", en: "Cocoa & Baru Brownie", es: "Brownie de Cacao y Baru" },
        price: "R$ 8",
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80",
      },
      {
        id: "cookie",
        name: { pt: "Cookie de Jatobá", en: "Jatobá Cookie", es: "Cookie de Jatobá" },
        price: "R$ 8",
        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80",
      },
      {
        id: "doce-leite",
        name: { pt: "Doce de Leite da Chapada", en: "Chapada Dulce de Leche", es: "Dulce de Leche de la Chapada" },
        price: "R$ 25",
        image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&q=80",
        flavors: {
          pt: ["Tradicional — Leite orgânico, açúcar demerara, sal marinho", "Com Café — Leite orgânico, açúcar demerara, café, sal marinho"],
          en: ["Traditional — Organic milk, demerara sugar, sea salt", "With Coffee — Organic milk, demerara sugar, coffee, sea salt"],
          es: ["Tradicional — Leche orgánica, azúcar demerara, sal marina", "Con Café — Leche orgánica, azúcar demerara, café, sal marina"],
        },
      },
      {
        id: "cubinhos-proteicos",
        name: { pt: "Cubinhos Proteicos", en: "Protein Cubes", es: "Cubitos Proteicos" },
        price: "R$ 15",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
        flavors: {
          pt: ["Paçoca — Banana, amendoim e blend proteico", "Cacau — Banana, tâmara, cacau e blend proteico", "Tropical — Banana, abacaxi, manga e maracujá"],
          en: ["Paçoca — Banana, peanut and protein blend", "Cocoa — Banana, date, cocoa and protein blend", "Tropical — Banana, pineapple, mango and passion fruit"],
          es: ["Paçoca — Banana, maní y blend proteico", "Cacao — Banana, dátil, cacao y blend proteico", "Tropical — Banana, piña, mango y maracuyá"],
        },
      },
      {
        id: "cubinhos-energeticos",
        name: { pt: "Cubinhos Energéticos", en: "Energy Cubes", es: "Cubitos Energéticos" },
        price: "R$ 15",
        image: "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?w=400&q=80",
        flavors: {
          pt: ["Força do Cerrado — Banana, baru e jatobá", "Açaí com Guaraná — Banana, açaí e guaraná", "Tropical — Banana, abacaxi, manga e maracujá"],
          en: ["Cerrado Force — Banana, baru and jatobá", "Açaí with Guaraná — Banana, açaí and guaraná", "Tropical — Banana, pineapple, mango and passion fruit"],
          es: ["Fuerza del Cerrado — Banana, baru y jatobá", "Açaí con Guaraná — Banana, açaí y guaraná", "Tropical — Banana, piña, mango y maracuyá"],
        },
      },
    ],
  },
  // ========== TRANSFERS ==========
  {
    id: "transfer-compartilhado",
    category: "transfers",
    title: { pt: "Transfer Aeroporto Carro Compartilhado", en: "Shared Airport Transfer", es: "Transfer Aeropuerto Auto Compartido" },
    subtitle: { pt: "Custo-benefício", en: "Cost-benefit", es: "Costo-beneficio" },
    description: {
      pt: "Transfer compartilhado partindo do Aeroporto de Brasília para os principais centros da Chapada. Praticidade para viajantes solo.",
      en: "Shared transfer from Brasília Airport to the main hubs of Chapada. Practicality for solo travelers.",
      es: "Transfer compartido desde el Aeropuerto de Brasilia hacia los principais centros de la Chapada. Practicidad para viajeros solos.",
    },
    price: "R$ 260",
    imageKey: "transfers",
    transferTable: {
      id: "compartilhado",
      name: { pt: "Carro Compartilhado", en: "Shared Car", es: "Auto Compartido" },
      description: {
        pt: "Ideal para viajantes solo ou duplas que querem praticidade com ótimo custo-benefício.",
        en: "Ideal for solo travelers or couples who want practicality with great cost-benefit.",
        es: "Ideal para viajeros solo o parejas que quieren praticidad con excelente costo-beneficio.",
      },
      columns: ["Destino", "Preço"],
      rows: [
        { destination: "Alto Paraíso", values: ["R$ 260/pessoa"] },
        { destination: "São Jorge", values: ["R$ 440/pessoa"] },
        { destination: "Cavalcante", values: ["R$ 440/pessoa"] },
      ],
    }
  },
  {
    id: "transfer-particular",
    category: "transfers",
    title: { pt: "Transfer Aeroporto Carro Particular", en: "Private Airport Transfer", es: "Transfer Aeropuerto Auto Particular" },
    subtitle: { pt: "Até 4 pessoas", en: "Up to 4 people", es: "Hasta 4 personas" },
    description: {
      pt: "Conforto e exclusividade em carro particular com flexibilidade de horário e trajeto direto para sua hospedagem.",
      en: "Comfort and exclusivity in a private car with flexible hours and direct route to your accommodation.",
      es: "Confort y exclusividad en auto particular con flexibilidad de horario y trayecto directo a tu hospedaje.",
    },
    price: "R$ 1.200",
    imageKey: "transfers",
    transferTable: {
      id: "particular",
      name: { pt: "Carro Particular (até 4)", en: "Private Car (up to 4)", es: "Auto Particular (hasta 4)" },
      description: {
        pt: "Perfeito para grupos pequenos, garantindo privacidade, flexibilidade de horário e conforto.",
        en: "Perfect for small groups, ensuring privacy, schedule flexibility and comfort.",
        es: "Perfecto para grupos pequeños, garantizando privacidad, flexibilidad de horario y confort.",
      },
      columns: ["Destino", "Preço"],
      rows: [
        { destination: "Alto Paraíso", values: ["R$ 1.200"] },
        { destination: "São Jorge", values: ["R$ 1.400"] },
        { destination: "Cavalcante", values: ["R$ 1.600"] },
      ],
    }
  },
  {
    id: "van-particular",
    category: "transfers",
    title: { pt: "Van Particular", en: "Private Van", es: "Van Particular" },
    subtitle: { pt: "Para grupos", en: "For groups", es: "Para grupos" },
    description: {
      pt: "Ideal para grupos maiores que buscam viajar juntos com espaço e organização desde a chegada em Brasília.",
      en: "Ideal for larger groups looking to travel together with space and organization from arrival in Brasília.",
      es: "Ideal para grupos más grandes que buscan viajar juntos con espacio y organización desde la llegada a Brasilia.",
    },
    price: "Sob consulta",
    imageKey: "transfers",
    transferTable: {
      id: "van",
      name: { pt: "Van Particular", en: "Private Van", es: "Van Particular" },
      description: {
        pt: "Ideal para grupos grandes, garantindo organização desde o primeiro momento da viagem.",
        en: "Ideal for large groups, ensuring organization from the first moment of the trip.",
        es: "Ideal para grupos grandes, garantizando organización desde el primer momento del viaje.",
      },
      columns: ["Destino", "10 pessoas", "15 pessoas", "20 pessoas"],
      rows: [
        { destination: "Alto Paraíso", values: ["R$ 3.000", "R$ 3.600", "R$ 5.000"] },
        { destination: "São Jorge", values: ["R$ 3.200", "R$ 4.000", "R$ 5.200"] },
        { destination: "Cavalcante", values: ["R$ 3.400", "R$ 5.000", "R$ 5.400"] },
      ],
    }
  },
  // ========== PEDIDOS ESPECIAIS ==========
  {
    id: "pedidos-especiais",
    category: "especial",
    title: { pt: "Pedidos Especiais", en: "Special Requests", es: "Pedidos Especiales" },
    subtitle: { pt: "Experiências Sob Medida", en: "Tailored Experience", es: "Experiencias a Medida" },
    description: {
      pt: "Celebrações, surpresas românticas, aniversários ou logísticas complexas. Realizamos o seu desejo para tornar a viagem inesquecível.",
      en: "Celebrations, romantic surprises, birthdays or complex logistics. We make your wish come true to make the trip unforgettable.",
      es: "Celebraciones, sorpresas románticas, cumpleaños o logísticas complejas. Cumplimos tu desejo para que el viaje sea inolvidable.",
    },
    price: "Sob consulta",
    imageKey: "especial",
  },
];

export const getServiceCategories = (): ServiceCategory[] => ["alimentacao", "registros", "transfers", "especial"];
