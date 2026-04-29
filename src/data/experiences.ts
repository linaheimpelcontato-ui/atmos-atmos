import { type Language } from "@/contexts/LanguageContext";

export type ExperienceCategory = "aventura" | "bem-estar" | "cultura" | "contemplacao";

export interface Experience {
  id: string;
  name: Record<Language, string>;
  category: ExperienceCategory;
  priceRange: string;
  description: Record<Language, string>;
  imageKey: string;
}

export const categoryLabels: Record<ExperienceCategory, Record<Language, string>> = {
  aventura: { pt: "Aventura", en: "Adventure", es: "Aventura" },
  "bem-estar": { pt: "Bem-estar", en: "Wellness", es: "Bienestar" },
  cultura: { pt: "Cultura", en: "Culture", es: "Cultura" },
  contemplacao: { pt: "Contemplação", en: "Contemplation", es: "Contemplación" },
};

export const categoryColors: Record<ExperienceCategory, string> = {
  aventura: "bg-red-100 text-red-700",
  "bem-estar": "bg-emerald-100 text-emerald-700",
  cultura: "bg-violet-100 text-violet-700",
  contemplacao: "bg-sky-100 text-sky-700",
};

export const experiences: Experience[] = [
  {
    id: "noturna-imersiva",
    name: {
      pt: "Experiência Noturna Imersiva",
      en: "Immersive Night Experience",
      es: "Experiencia Nocturna Inmersiva",
    },
    category: "contemplacao",
    priceRange: "R$ 600 – R$ 800",
    description: {
      pt: "Viva uma noite diferente sob o céu estrelado da Chapada. Durma em uma oca à beira da Cachoeira do Macacão, desfrutando do silêncio e da energia selvagem do Cerrado. Experimente uma refeição preparada em fogão a lenha e aproveite o dia para se banhar e contemplar as águas da cachoeira.",
      en: "Live a unique night under the starry skies of the Chapada. Sleep in a hut beside Macacão Waterfall, enjoying the silence and wild energy of the Cerrado. Experience a meal prepared on a wood stove and enjoy the day bathing and contemplating the waterfall.",
      es: "Vive una noche diferente bajo el cielo estrellado de la Chapada. Duerme en una choza junto a la Cascada del Macacão, disfrutando del silencio y la energía salvaje del Cerrado. Experimenta una comida preparada en fogón de leña y aprovecha el día para bañarte y contemplar las aguas de la cascada.",
    },
    imageKey: "noturna",
  },
  {
    id: "voo-balao",
    name: {
      pt: "Voo de Balão",
      en: "Hot Air Balloon Ride",
      es: "Vuelo en Globo",
    },
    category: "aventura",
    priceRange: "R$ 450 – R$ 890",
    description: {
      pt: "Uma experiência inesquecível ao amanhecer ou por do sol. Sobrevoe os vales e formações rochosas da Chapada com segurança e silêncio, vendo o Cerrado brilhar sob a luz dourada do sol.",
      en: "An unforgettable experience at sunrise or sunset. Fly over the valleys and rock formations of the Chapada safely and silently, watching the Cerrado shine under the golden sunlight.",
      es: "Una experiencia inolvidable al amanecer o al atardecer. Sobrevuela los valles y formaciones rocosas de la Chapada con seguridad y silencio, viendo el Cerrado brillar bajo la luz dorada del sol.",
    },
    imageKey: "balao",
  },
  {
    id: "voo-paramotor",
    name: {
      pt: "Voo de Paramotor",
      en: "Paramotor Flight",
      es: "Vuelo en Paramotor",
    },
    category: "aventura",
    priceRange: "R$ 450 – R$ 3.500",
    description: {
      pt: "Sinta a força dos ventos da Chapada em um voo panorâmico que une adrenalina e contemplação. Experiência guiada por instrutores especializados, com total segurança.",
      en: "Feel the power of the Chapada winds on a panoramic flight that combines adrenaline and contemplation. Guided experience by specialized instructors, with complete safety.",
      es: "Siente la fuerza de los vientos de la Chapada en un vuelo panorámico que une adrenalina y contemplación. Experiencia guiada por instructores especializados, con total seguridad.",
    },
    imageKey: "paramotor",
  },
  {
    id: "massagem-bem-estar",
    name: {
      pt: "Massagem e Bem-Estar",
      en: "Massage & Wellness",
      es: "Masaje y Bienestar",
    },
    category: "bem-estar",
    priceRange: "R$ 250 – R$ 350",
    description: {
      pt: "Entre uma trilha e outra, um momento de cuidado. Massagens com óleos naturais e técnicas que equilibram corpo e mente, realizadas por terapeutas locais de confiança.",
      en: "Between one trail and another, a moment of care. Massages with natural oils and techniques that balance body and mind, performed by trusted local therapists.",
      es: "Entre un sendero y otro, un momento de cuidado. Masajes con aceites naturales y técnicas que equilibran cuerpo y mente, realizados por terapeutas locales de confianza.",
    },
    imageKey: "massagem",
  },
  {
    id: "yoga-meditacao",
    name: {
      pt: "Yoga e Meditação",
      en: "Yoga & Meditation",
      es: "Yoga y Meditación",
    },
    category: "bem-estar",
    priceRange: "R$ 200 – R$ 600",
    description: {
      pt: "Práticas ao ar livre, em meio ao Cerrado, com professores locais. Uma experiência para se reconectar com o corpo e o território, respirando o ritmo natural da Chapada.",
      en: "Outdoor practices, in the midst of the Cerrado, with local teachers. An experience to reconnect with your body and the territory, breathing the natural rhythm of the Chapada.",
      es: "Prácticas al aire libre, en medio del Cerrado, con profesores locales. Una experiencia para reconectarse con el cuerpo y el territorio, respirando el ritmo natural de la Chapada.",
    },
    imageKey: "yoga",
  },
  {
    id: "passeio-cavalo",
    name: {
      pt: "Passeio a Cavalo",
      en: "Horseback Riding",
      es: "Paseo a Caballo",
    },
    category: "contemplacao",
    priceRange: "R$ 250 – R$ 350",
    description: {
      pt: "Um passeio sereno pelos campos do Cerrado, guiado por condutores locais. Ideal para quem quer conhecer o território de um jeito autêntico e silencioso.",
      en: "A serene ride through the Cerrado fields, guided by local conductors. Ideal for those who want to discover the territory in an authentic and quiet way.",
      es: "Un paseo sereno por los campos del Cerrado, guiado por conductores locales. Ideal para quien quiere conocer el territorio de una manera auténtica y silenciosa.",
    },
    imageKey: "cavalo",
  },
  {
    id: "rapel",
    name: {
      pt: "Rapel",
      en: "Rappelling",
      es: "Rapel",
    },
    category: "aventura",
    priceRange: "R$ 400 – R$ 500",
    description: {
      pt: "Descida vertical com uso de cordas e instrutores especializados. Atividade segura e controlada, ideal para iniciantes ou quem quer aprender técnicas de descida em paredões.",
      en: "Vertical descent using ropes and specialized instructors. Safe and controlled activity, ideal for beginners or those wanting to learn wall descent techniques.",
      es: "Descenso vertical con uso de cuerdas e instructores especializados. Actividad segura y controlada, ideal para principiantes o quienes quieren aprender técnicas de descenso en paredes.",
    },
    imageKey: "rapel",
  },
  {
    id: "canionismo",
    name: {
      pt: "Canionismo",
      en: "Canyoneering",
      es: "Barranquismo",
    },
    category: "aventura",
    priceRange: "R$ 1.000 – R$ 4.000",
    description: {
      pt: "Percurso por cânions com trechos de água, pedras e quedas. A ATMOS oferece opções para todos os níveis: desde roteiros leves para quem nunca praticou até trajetos mais desafiadores para quem já tem experiência.",
      en: "A route through canyons with water sections, rocks and drops. ATMOS offers options for all levels: from light routes for beginners to more challenging paths for the experienced.",
      es: "Recorrido por cañones con tramos de agua, rocas y cascadas. ATMOS ofrece opciones para todos los niveles: desde rutas ligeras para principiantes hasta trayectos más desafiantes para expertos.",
    },
    imageKey: "canionismo",
  },
  {
    id: "rafting",
    name: {
      pt: "Rafting",
      en: "Rafting",
      es: "Rafting",
    },
    category: "aventura",
    priceRange: "R$ 400 – R$ 1.000",
    description: {
      pt: "Desça corredeiras do Cerrado em um rafting seguro e divertido, conduzido por instrutores locais experientes. Ideal pra grupos e viajantes em busca de emoção.",
      en: "Ride the Cerrado rapids in a safe and fun rafting trip, led by experienced local instructors. Ideal for groups and travelers seeking excitement.",
      es: "Desciende rápidos del Cerrado en un rafting seguro y divertido, conducido por instructores locales experimentados. Ideal para grupos y viajeros en busca de emoción.",
    },
    imageKey: "rafting",
  },
  {
    id: "tirolesa",
    name: {
      pt: "Tirolesa Fazenda São Bento",
      en: "São Bento Farm Zipline",
      es: "Tirolesa Hacienda São Bento",
    },
    category: "aventura",
    priceRange: "R$ 200 – R$ 300",
    description: {
      pt: "Sinta a liberdade de cruzar os céus da Chapada em uma tirolesa com 850 metros de extensão e 100 metros de altura. Uma dose perfeita de adrenalina e contemplação.",
      en: "Feel the freedom of crossing the Chapada skies on an 850-meter long zipline at 100 meters high. A perfect dose of adrenaline and contemplation.",
      es: "Siente la libertad de cruzar los cielos de la Chapada en una tirolesa de 850 metros de extensión y 100 metros de altura. Una dosis perfecta de adrenalina y contemplación.",
    },
    imageKey: "tirolesa",
  },
  {
    id: "astro-turismo",
    name: {
      pt: "Astro Turismo",
      en: "Astro Tourism",
      es: "Astro Turismo",
    },
    category: "contemplacao",
    priceRange: "R$ 200 – R$ 300",
    description: {
      pt: "Explore o céu estrelado da Chapada dos Veadeiros em uma jornada guiada pelas constelações. Aprenda sobre astronomia e fenômenos celestes enquanto observa um dos céus mais limpos do Brasil.",
      en: "Explore the starry sky of Chapada dos Veadeiros on a guided journey through the constellations. Learn about astronomy and celestial phenomena while observing one of the clearest skies in Brazil.",
      es: "Explora el cielo estrellado de Chapada dos Veadeiros en una jornada guiada por las constelaciones. Aprende sobre astronomía y fenómenos celestes mientras observas uno de los cielos más limpios de Brasil.",
    },
    imageKey: "astro",
  },
  {
    id: "gota-sat-som",
    name: {
      pt: "Gota Sat Som",
      en: "Gota Sat Som",
      es: "Gota Sat Som",
    },
    category: "bem-estar",
    priceRange: "R$ 40 – R$ 200",
    description: {
      pt: "Um templo de som e silêncio. A Gota Sat Som é um espaço dedicado a música, yoga, meditação, cantos e vivências que cultivam presença e escuta profunda. Com programação semanal, o ambiente recebe práticas que convidam ao centramento.",
      en: "A temple of sound and silence. Gota Sat Som is a space dedicated to music, yoga, meditation, chanting and experiences that cultivate presence and deep listening. With weekly programming, the environment hosts practices that invite centering.",
      es: "Un templo de sonido y silencio. Gota Sat Som es un espacio dedicado a música, yoga, meditación, cantos y vivencias que cultivan presencia y escucha profunda. Con programación semanal, el ambiente acoge prácticas que invitan al centramiento.",
    },
    imageKey: "gota-sat-som",
  },
  {
    id: "mesa-lira",
    name: {
      pt: "Mesa Lira",
      en: "Lyre Table",
      es: "Mesa Lira",
    },
    category: "bem-estar",
    priceRange: "R$ 250 – R$ 350",
    description: {
      pt: "A Mesa Lira é um instrumento de 42 cordas que harmoniza corpo, mente e espírito através da vibração. Seus sons são sentidos no corpo, criando ondas de ressonância que ajudam a relaxar tensões, acalmar o sistema nervoso e equilibrar o campo emocional e energético.",
      en: "The Lyre Table is a 42-string instrument that harmonizes body, mind and spirit through vibration. Its sounds are felt in the body, creating resonance waves that help relax tensions, calm the nervous system and balance the emotional and energetic field.",
      es: "La Mesa Lira es un instrumento de 42 cuerdas que armoniza cuerpo, mente y espíritu a través de la vibración. Sus sonidos se sienten en el cuerpo, creando ondas de resonancia que ayudan a relajar tensiones, calmar el sistema nervioso y equilibrar el campo emocional y energético.",
    },
    imageKey: "mesa-lira",
  },
  {
    id: "aula-forro",
    name: {
      pt: "Aula de Forró",
      en: "Forró Dance Class",
      es: "Clase de Forró",
    },
    category: "cultura",
    priceRange: "R$ 150 – R$ 400",
    description: {
      pt: "Mergulhe na cultura brasileira ao som do forró, ritmo tradicional do Cerrado. Em aulas particulares ou em grupo, você aprende passos e movimentos em um ambiente leve e descontraído, celebrando a música, a dança e a conexão entre pessoas.",
      en: "Dive into Brazilian culture to the sound of forró, a traditional Cerrado rhythm. In private or group classes, you learn steps and moves in a light and relaxed atmosphere, celebrating music, dance and connection between people.",
      es: "Sumérgete en la cultura brasileña al son del forró, ritmo tradicional del Cerrado. En clases particulares o en grupo, aprendes pasos y movimientos en un ambiente ligero y distendido, celebrando la música, la danza y la conexión entre personas.",
    },
    imageKey: "forro",
  },
  {
    id: "danca-fogo",
    name: {
      pt: "Dança com Fogo",
      en: "Fire Dance",
      es: "Danza con Fuego",
    },
    category: "cultura",
    priceRange: "R$ 200 – R$ 400",
    description: {
      pt: "Uma performance para celebrar momentos especiais. A Dança com fogo combina movimento, técnica e poesia visual. A artista conduz o fogo com leveza e precisão, criando atmosferas que encantam quem assiste. Ideal para jantares, encontros e celebrações íntimas.",
      en: "A performance to celebrate special moments. Fire Dance combines movement, technique and visual poetry. The artist guides fire with lightness and precision, creating atmospheres that enchant the audience. Ideal for dinners, gatherings and intimate celebrations.",
      es: "Una performance para celebrar momentos especiales. La Danza con fuego combina movimiento, técnica y poesía visual. La artista conduce el fuego con ligereza y precisión, creando atmósferas que encantan a quien asiste. Ideal para cenas, encuentros y celebraciones íntimas.",
    },
    imageKey: "danca-fogo",
  },
  {
    id: "feira-produtores",
    name: {
      pt: "Feira dos Produtores Locais",
      en: "Local Producers Fair",
      es: "Feria de Productores Locales",
    },
    category: "cultura",
    priceRange: "gastos no local",
    description: {
      pt: "Toda terça, quinta, sábado e domingo agricultores, artesãos e empreendedores da região se reúnem para oferecer produtos artesanais e alimentos frescos, valorizando a economia local e o estilo de vida sustentável. Com um clima acolhedor e comunitário, a feira celebra a cultura do Cerrado.",
      en: "Every Tuesday, Thursday, Saturday and Sunday, farmers, artisans and local entrepreneurs gather to offer handmade products and fresh food, valuing the local economy and sustainable lifestyle. With a welcoming and community atmosphere, the fair celebrates Cerrado culture.",
      es: "Todos los martes, jueves, sábados y domingos agricultores, artesanos y emprendedores de la región se reúnen para ofrecer productos artesanales y alimentos frescos, valorizando la economía local y el estilo de vida sostenible. Con un clima acogedor y comunitario, la feria celebra la cultura del Cerrado.",
    },
    imageKey: "feira",
  },
  {
    id: "celestial-garden",
    name: {
      pt: "Celestial Garden",
      en: "Celestial Garden",
      es: "Celestial Garden",
    },
    category: "cultura",
    priceRange: "gastos no local",
    description: {
      pt: "Loja dedicada a tornar acessíveis plantas etnobotânicas e o conhecimento que as acompanha. Trabalha em parceria com produtores locais e comunidades indígenas, fortalecendo saberes ancestrais e a economia regional. Seu catálogo reúne plantas, extratos, incensos, óleos, cosméticos, livros e artesanatos.",
      en: "A shop dedicated to making ethnobotanical plants and their accompanying knowledge accessible. Working in partnership with local producers and indigenous communities, strengthening ancestral knowledge and the regional economy. Their catalog includes plants, extracts, incenses, oils, cosmetics, books and crafts.",
      es: "Tienda dedicada a hacer accesibles plantas etnobotánicas y el conocimiento que las acompaña. Trabaja en asociación con productores locales y comunidades indígenas, fortaleciendo saberes ancestrales y la economía regional. Su catálogo reúne plantas, extractos, inciensos, aceites, cosméticos, libros y artesanías.",
    },
    imageKey: "celestial-garden",
  },
];

/** Parse minimum price from priceRange string. Returns null for "gastos no local" etc. */
export function parseMinPrice(priceRange: string): number | null {
  const match = priceRange.match(/R\$\s*([\d.,]+)/);
  if (!match) return null;
  return parseInt(match[1].replace(/\./g, "").replace(",", ""));
}

/** Get [min, max] price range across all experiences (ignoring free ones). */
export function getExperiencePriceRange(): [number, number] {
  let min = Infinity;
  let max = 0;
  for (const e of experiences) {
    const p = parseMinPrice(e.priceRange);
    if (p !== null) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
  }
  return [min === Infinity ? 0 : min, max];
}

// Helper functions
export const getCategories = (): ExperienceCategory[] => [
  "aventura",
  "bem-estar",
  "cultura",
  "contemplacao",
];

export const filterExperiences = (
  categories?: ExperienceCategory[],
  searchQuery?: string,
  priceMax?: number,
  list: Experience[] = experiences
): Experience[] => {
  const query = searchQuery?.trim().toLowerCase() || "";
  return list.filter((e) => {
    if (categories && categories.length > 0 && !categories.includes(e.category)) return false;
    if (query) {
      const matchesName = Object.values(e.name).some((n) =>
        n.toLowerCase().includes(query)
      );
      if (!matchesName) return false;
    }
    if (priceMax !== undefined) {
      const minPrice = parseMinPrice(e.priceRange);
      if (minPrice !== null && minPrice > priceMax) return false;
    }
    return true;
  });
};
