import { type Language } from "@/contexts/LanguageContext";

export type ItineraryCategory = "classico" | "jurassico";
export type DurationDays = 2 | 3 | 4 | 5;
export type DayImageKey = string;

export interface ItineraryDay {
  title: Record<Language, string>;
  description?: Record<Language, string>;
  attractions?: Record<Language, string[]>;
  difficulty: "facil" | "moderado" | "dificil";
  imageKey?: DayImageKey;
  images?: string[];
  /** Entrance fee in BRL. 0 = voluntary/free. */
  entranceFee?: number;
  /** True if entrance fee is voluntary (e.g., Couros) */
  voluntaryFee?: boolean;
  /** Trail distance in km (display string, e.g. "7" or "1,5") */
  trailDistanceKm?: string;
  /** Optional associated products for dynamic itineraries */
  items?: any[];
  /** Internal field for image resolution */
  resolvedTitle?: string;
  /** Internal field for UI grouping */
  hasGuide?: boolean;
  dayNumber?: number;
}

export interface ItineraryPricing {
  atmos4x4: { individual: number; dupla: number; trio: number };
  carroProprio: { individual: number; dupla: number; trio: number };
}

export interface ItineraryExtraCosts {
  entranceFees: number;
  equipmentFees?: number;
  equipmentItems?: Record<Language, string>;
}

export interface Itinerary {
  id: string;
  duration: DurationDays;
  category: ItineraryCategory;
  name: Record<Language, string>;
  description: Record<Language, string>;
  days: ItineraryDay[];
  pricing?: ItineraryPricing;
  extraCosts?: ItineraryExtraCosts;
  inclusions?: Record<Language, string[]>;
  guidedDays?: number;
  favorites?: string[];
}

// Reusable day descriptions by location
const dayDescriptions: Record<string, Record<Language, string>> = {
  segredo: {
    pt: "A Cachoeira do Segredo é uma das mais impressionantes da Chapada dos Veadeiros, com queda de 115 metros em um cânion de paredes rochosas. A trilha passa por vegetação de Cerrado e trechos de mata ciliar, exigindo preparo físico moderado. O poço formado pela queda d'água convida a um banho revigorante.",
    en: "Segredo Waterfall is one of the most impressive in Chapada dos Veadeiros, with a 115-meter drop in a rocky canyon. The trail passes through Cerrado vegetation and riparian forest, requiring moderate physical fitness. The pool formed by the waterfall invites a refreshing swim.",
    es: "La Cascada del Segredo es una de las más impresionantes de Chapada dos Veadeiros, con una caída de 115 metros en un cañón de paredes rocosas. El sendero pasa por vegetación del Cerrado y bosque de ribera, requiriendo condición física moderada. La poza formada por la cascada invita a un baño revitalizante.",
  },
  "vale-da-lua": {
    pt: "O Vale da Lua é uma formação rochosa esculpida pelas águas do Rio São Miguel ao longo de milhões de anos. As pedras arredondadas e as piscinas naturais criam uma paisagem lunar única no mundo. Trilha curta e acessível, ideal para contemplar a força da natureza.",
    en: "Moon Valley is a rock formation sculpted by the waters of the São Miguel River over millions of years. The rounded stones and natural pools create a lunar landscape unique in the world. Short and accessible trail, ideal for contemplating the power of nature.",
    es: "El Valle de la Luna es una formación rocosa esculpida por las aguas del Río São Miguel a lo largo de millones de años. Las piedras redondeadas y las piscinas naturales crean un paisaje lunar único en el mundo. Sendero corto y accesible, ideal para contemplar la fuerza de la naturaleza.",
  },
  macacao: {
    pt: "O Complexo do Macacão é um dos destinos mais selvagens e preservados da Chapada. O acesso exige disposição e preparo, mas a recompensa é um conjunto de cachoeiras intocadas em meio a um cânion de beleza primitiva. Paisagem jurássica em estado bruto.",
    en: "The Macacão Complex is one of the wildest and most preserved destinations in the Chapada. Access requires determination and fitness, but the reward is a set of untouched waterfalls amidst a canyon of primitive beauty. Raw Jurassic landscape.",
    es: "El Complejo del Macacão es uno de los destinos más salvajes y preservados de la Chapada. El acceso exige disposición y preparación, pero la recompensa es un conjunto de cascadas intactas en medio de un cañón de belleza primitiva. Paisaje jurásico en estado bruto.",
  },
  dragao: {
    pt: "A Cachoeira do Dragão é um dos destinos mais remotos e desafiadores da Chapada dos Veadeiros. A trilha exige veículo 4x4 e quadriciclo, passando por paisagens selvagens até chegar a uma queda d'água monumental cercada por formações rochosas impressionantes.",
    en: "Dragão Waterfall is one of the most remote and challenging destinations in Chapada dos Veadeiros. The trail requires a 4x4 vehicle and ATV, passing through wild landscapes to reach a monumental waterfall surrounded by impressive rock formations.",
    es: "La Cascada del Dragão es uno de los destinos más remotos y desafiantes de Chapada dos Veadeiros. El sendero requiere vehículo 4x4 y cuatriciclo, pasando por paisajes salvajes hasta llegar a una cascada monumental rodeada de formaciones rocosas impresionantes.",
  },
  almecegas: {
    pt: "As cachoeiras Almécegas e São Bento ficam na Fazenda São Bento, um dos pontos mais acessíveis e encantadores da Chapada. Almécegas impressiona com seus 45 metros de queda livre, enquanto São Bento oferece um poço amplo e perfeito para banho. Trilhas leves em meio a mata preservada.",
    en: "Almécegas and São Bento waterfalls are at Fazenda São Bento, one of the most accessible and charming spots in the Chapada. Almécegas impresses with its 45-meter free fall, while São Bento offers a wide pool perfect for swimming. Easy trails through preserved forest.",
    es: "Las cascadas Almécegas y São Bento están en la Hacienda São Bento, uno de los puntos más accesibles y encantadores de la Chapada. Almécegas impresiona con sus 45 metros de caída libre, mientras São Bento ofrece una poza amplia y perfecta para bañarse. Senderos ligeros en medio de bosque preservado.",
  },
  macaquinhos: {
    pt: "O Complexo dos Macaquinhos é um verdadeiro parque aquático natural com diversas cachoeiras, poços e tobogãs naturais. O circuito permite explorar várias quedas d'água em sequência, cada uma com sua personalidade. Ideal para quem gosta de se aventurar entre pedras e água.",
    en: "The Macaquinhos Complex is a true natural water park with several waterfalls, pools and natural slides. The circuit allows exploring multiple waterfalls in sequence, each with its own personality. Ideal for those who enjoy adventuring among rocks and water.",
    es: "El Complejo de los Macaquinhos es un verdadero parque acuático natural con diversas cascadas, pozas y toboganes naturales. El circuito permite explorar varias cascadas en secuencia, cada una con su personalidad. Ideal para quienes gustan de aventurarse entre rocas y agua.",
  },
  couros: {
    pt: "As Cataratas dos Couros são um complexo de quedas d'água espetaculares, sendo a Muralha uma das mais altas do Brasil. O acesso é por estrada de terra e a trilha oferece vistas panorâmicas do Cerrado. Um destino que combina grandiosidade e imersão na natureza.",
    en: "The Couros Waterfalls are a complex of spectacular drops, with Muralha being one of the tallest in Brazil. Access is via dirt road and the trail offers panoramic views of the Cerrado. A destination that combines grandeur and immersion in nature.",
    es: "Las Cataratas dos Couros son un complejo de cascadas espectaculares, siendo Muralha una de las más altas de Brasil. El acceso es por camino de tierra y el sendero ofrece vistas panorámicas del Cerrado. Un destino que combina grandiosidad e inmersión en la naturaleza.",
  },
  "ponte-de-pedra": {
    pt: "A Cachoeira Ponte de Pedra é um destino desafiador e recompensador, com uma formação rochosa natural que forma uma ponte sobre o rio. O caminho exige bom preparo físico e o cenário é de tirar o fôlego, com paisagens primitivas e selvagens.",
    en: "Stone Bridge Waterfall is a challenging and rewarding destination, with a natural rock formation that creates a bridge over the river. The path requires good physical fitness and the scenery is breathtaking, with primitive and wild landscapes.",
    es: "La Cascada Puente de Piedra es un destino desafiante y gratificante, con una formación rocosa natural que forma un puente sobre el río. El camino exige buena condición física y el paisaje es impresionante, con paisajes primitivos y salvajes.",
  },
};

export const itineraries: Itinerary[] = [
  // ========== 2 DIAS ==========
  {
    id: "2d-classico",
    duration: 2,
    category: "classico",
    name: {
      pt: "Roteiro Clássico — 2 Dias",
      en: "Classic Itinerary — 2 Days",
      es: "Itinerario Clásico — 2 Días",
    },
    description: {
      pt: "Dois dias para viver a Chapada dos Veadeiros em sua plenitude, com cachoeiras icônicas e trilhas acessíveis.",
      en: "Two days to experience Chapada dos Veadeiros in its fullness, with iconic waterfalls and accessible trails.",
      es: "Dos días para vivir Chapada dos Veadeiros en su plenitud, con cascadas icónicas y senderos accesibles.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Segredo", en: "Day 1 — Segredo", es: "Día 1 — Segredo" },
        description: dayDescriptions.segredo,
        attractions: {
          pt: ["Cachoeira do Segredo", "Trilha de 7km ida e volta", "Saída 9h — Retorno 17h"],
          en: ["Segredo Waterfall", "7km round-trip trail", "Departure 9am — Return 5pm"],
          es: ["Cascada del Segredo", "Sendero de 7km ida y vuelta", "Salida 9h — Regreso 17h"],
        },
        difficulty: "moderado",
        imageKey: "segredo",
        entranceFee: 70,
        trailDistanceKm: "7",
      },
      {
        title: { pt: "Dia 2 — Vale da Lua", en: "Day 2 — Moon Valley", es: "Día 2 — Valle de la Luna" },
        description: dayDescriptions["vale-da-lua"],
        attractions: {
          pt: ["Vale da Lua", "Trilha de 1,5km ida e volta", "Saída 9h — Retorno 15h"],
          en: ["Moon Valley", "1.5km round-trip trail", "Departure 9am — Return 3pm"],
          es: ["Valle de la Luna", "Sendero de 1,5km ida y vuelta", "Salida 9h — Regreso 15h"],
        },
        difficulty: "facil",
        imageKey: "vale-da-lua",
        entranceFee: 50,
        trailDistanceKm: "1,5",
      },
    ],
    pricing: {
      atmos4x4: { individual: 2800, dupla: 1520, trio: 1000 },
      carroProprio: { individual: 1200, dupla: 680, trio: 440 },
    },
    extraCosts: { entranceFees: 120 },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },
  {
    id: "2d-jurassico",
    duration: 2,
    category: "jurassico",
    name: {
      pt: "Roteiro Jurássico — 2 Dias",
      en: "Jurassic Itinerary — 2 Days",
      es: "Itinerario Jurásico — 2 Días",
    },
    description: {
      pt: "Dois dias de aventura intensa com trilhas desafiadoras no Complexo do Macacão e na Cachoeira do Dragão.",
      en: "Two days of intense adventure with challenging trails at Macacão Complex and Dragão Waterfall.",
      es: "Dos días de aventura intensa con senderos desafiantes en el Complejo del Macacão y la Cascada del Dragão.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Complexo do Macacão", en: "Day 1 — Macacão Complex", es: "Día 1 — Complejo del Macacão" },
        description: dayDescriptions.macacao,
        attractions: {
          pt: ["Complexo do Macacão", "Trilha de 4km ida e volta", "Saída 8h — Retorno 18h"],
          en: ["Macacão Complex", "4km round-trip trail", "Departure 8am — Return 6pm"],
          es: ["Complejo del Macacão", "Sendero de 4km ida y vuelta", "Salida 8h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "macacao",
        entranceFee: 70,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 2 — Cachoeira do Dragão", en: "Day 2 — Dragão Waterfall", es: "Día 2 — Cascada del Dragão" },
        description: dayDescriptions.dragao,
        attractions: {
          pt: ["Cachoeira do Dragão", "Trilha de 6km ida e volta", "Saída 7h — Retorno 18h"],
          en: ["Dragão Waterfall", "6km round-trip trail", "Departure 7am — Return 6pm"],
          es: ["Cascada del Dragão", "Sendero de 6km ida y vuelta", "Salida 7h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "dragao",
        entranceFee: 190,
        trailDistanceKm: "6",
      },
    ],
    pricing: {
      atmos4x4: { individual: 3000, dupla: 1600, trio: 1080 },
      carroProprio: { individual: 1400, dupla: 800, trio: 560 },
    },
    extraCosts: {
      entranceFees: 260,
      equipmentFees: 190,
      equipmentItems: {
        pt: "Quadriciclo, Neoprene, Sapatilha",
        en: "ATV, Neoprene, Water shoes",
        es: "Cuatriciclo, Neopreno, Zapatilla",
      },
    },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },

  // ========== 3 DIAS ==========
  {
    id: "3d-classico",
    duration: 3,
    category: "classico",
    name: {
      pt: "Roteiro Clássico — 3 Dias",
      en: "Classic Itinerary — 3 Days",
      es: "Itinerario Clásico — 3 Días",
    },
    description: {
      pt: "Três dias para viver a Chapada dos Veadeiros em sua plenitude, combinando cachoeiras icônicas e trilhas acessíveis.",
      en: "Three days to experience Chapada dos Veadeiros in its fullness, combining iconic waterfalls and accessible trails.",
      es: "Tres días para vivir Chapada dos Veadeiros en su plenitud, combinando cascadas icónicas y senderos accesibles.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Almécegas & São Bento", en: "Day 1 — Almécegas & São Bento", es: "Día 1 — Almécegas y São Bento" },
        description: dayDescriptions.almecegas,
        attractions: {
          pt: ["Cachoeira Almécegas", "Cachoeira São Bento", "Trilha de 4km ida e volta", "Saída 9h — Retorno 16h"],
          en: ["Almécegas Waterfall", "São Bento Waterfall", "4km round-trip trail", "Departure 9am — Return 4pm"],
          es: ["Cascada Almécegas", "Cascada São Bento", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 16h"],
        },
        difficulty: "facil",
        imageKey: "almecegas-sao-bento",
        entranceFee: 91,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 2 — Segredo", en: "Day 2 — Segredo", es: "Día 2 — Segredo" },
        description: dayDescriptions.segredo,
        attractions: {
          pt: ["Cachoeira do Segredo", "Trilha de 7km ida e volta", "Saída 9h — Retorno 17h"],
          en: ["Segredo Waterfall", "7km round-trip trail", "Departure 9am — Return 5pm"],
          es: ["Cascada del Segredo", "Sendero de 7km ida y vuelta", "Salida 9h — Regreso 17h"],
        },
        difficulty: "moderado",
        imageKey: "segredo",
        entranceFee: 70,
        trailDistanceKm: "7",
      },
      {
        title: { pt: "Dia 3 — Vale da Lua", en: "Day 3 — Moon Valley", es: "Día 3 — Valle de la Luna" },
        description: dayDescriptions["vale-da-lua"],
        attractions: {
          pt: ["Vale da Lua", "Trilha de 1,5km ida e volta", "Saída 9h — Retorno 15h"],
          en: ["Moon Valley", "1.5km round-trip trail", "Departure 9am — Return 3pm"],
          es: ["Valle de la Luna", "Sendero de 1,5km ida y vuelta", "Salida 9h — Regreso 15h"],
        },
        difficulty: "facil",
        imageKey: "vale-da-lua",
        entranceFee: 50,
        trailDistanceKm: "1,5",
      },
    ],
    pricing: {
      atmos4x4: { individual: 4200, dupla: 2280, trio: 1500 },
      carroProprio: { individual: 1800, dupla: 1020, trio: 660 },
    },
    extraCosts: { entranceFees: 211 },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },
  {
    id: "3d-jurassico",
    duration: 3,
    category: "jurassico",
    name: {
      pt: "Roteiro Jurássico — 3 Dias",
      en: "Jurassic Itinerary — 3 Days",
      es: "Itinerario Jurásico — 3 Días",
    },
    description: {
      pt: "Três dias de aventura com trilhas desafiadoras, passando por Macaquinhos, Macacão e a temida Cachoeira do Dragão.",
      en: "Three days of adventure with challenging trails, through Macaquinhos, Macacão and the feared Dragão Waterfall.",
      es: "Tres días de aventura con senderos desafiantes, pasando por Macaquinhos, Macacão y la temida Cascada del Dragão.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Macaquinhos", en: "Day 1 — Macaquinhos", es: "Día 1 — Macaquinhos" },
        description: dayDescriptions.macaquinhos,
        attractions: {
          pt: ["Complexo dos Macaquinhos", "Trilha de 4km ida e volta", "Saída 9h — Retorno 18h"],
          en: ["Macaquinhos Complex", "4km round-trip trail", "Departure 9am — Return 6pm"],
          es: ["Complejo de los Macaquinhos", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "macaquinhos",
        entranceFee: 60,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 2 — Complexo do Macacão", en: "Day 2 — Macacão Complex", es: "Día 2 — Complejo del Macacão" },
        description: dayDescriptions.macacao,
        attractions: {
          pt: ["Complexo do Macacão", "Trilha de 4km ida e volta", "Saída 8h — Retorno 18h"],
          en: ["Macacão Complex", "4km round-trip trail", "Departure 8am — Return 6pm"],
          es: ["Complejo del Macacão", "Sendero de 4km ida y vuelta", "Salida 8h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "macacao",
        entranceFee: 70,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 3 — Cachoeira do Dragão", en: "Day 3 — Dragão Waterfall", es: "Día 3 — Cascada del Dragão" },
        description: dayDescriptions.dragao,
        attractions: {
          pt: ["Cachoeira do Dragão", "Trilha de 6km ida e volta", "Saída 7h — Retorno 18h"],
          en: ["Dragão Waterfall", "6km round-trip trail", "Departure 7am — Return 6pm"],
          es: ["Cascada del Dragão", "Sendero de 6km ida y vuelta", "Salida 7h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "dragao",
        entranceFee: 190,
        trailDistanceKm: "6",
      },
    ],
    pricing: {
      atmos4x4: { individual: 4500, dupla: 2400, trio: 1620 },
      carroProprio: { individual: 2100, dupla: 1200, trio: 840 },
    },
    extraCosts: {
      entranceFees: 320,
      equipmentFees: 190,
      equipmentItems: {
        pt: "Quadriciclo, Neoprene, Sapatilha",
        en: "ATV, Neoprene, Water shoes",
        es: "Cuatriciclo, Neopreno, Zapatilla",
      },
    },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },

  // ========== 4 DIAS ==========
  {
    id: "4d-classico",
    duration: 4,
    category: "classico",
    name: {
      pt: "Roteiro Clássico — 4 Dias",
      en: "Classic Itinerary — 4 Days",
      es: "Itinerario Clásico — 4 Días",
    },
    description: {
      pt: "Quatro dias para viver a Chapada dos Veadeiros em sua plenitude, combinando cachoeiras icônicas, trilhas acessíveis e a região dos Couros.",
      en: "Four days to experience Chapada dos Veadeiros in its fullness, combining iconic waterfalls, accessible trails and the Couros region.",
      es: "Cuatro días para vivir Chapada dos Veadeiros en su plenitud, combinando cascadas icónicas, senderos accesibles y la región de los Couros.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Almécegas & São Bento", en: "Day 1 — Almécegas & São Bento", es: "Día 1 — Almécegas y São Bento" },
        description: dayDescriptions.almecegas,
        attractions: {
          pt: ["Cachoeira Almécegas", "Cachoeira São Bento", "Trilha de 4km ida e volta", "Saída 9h — Retorno 16h"],
          en: ["Almécegas Waterfall", "São Bento Waterfall", "4km round-trip trail", "Departure 9am — Return 4pm"],
          es: ["Cascada Almécegas", "Cascada São Bento", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 16h"],
        },
        difficulty: "facil",
        imageKey: "almecegas-sao-bento",
        entranceFee: 91,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 2 — Segredo", en: "Day 2 — Segredo", es: "Día 2 — Segredo" },
        description: dayDescriptions.segredo,
        attractions: {
          pt: ["Cachoeira do Segredo", "Trilha de 7km ida e volta", "Saída 9h — Retorno 17h"],
          en: ["Segredo Waterfall", "7km round-trip trail", "Departure 9am — Return 5pm"],
          es: ["Cascada del Segredo", "Sendero de 7km ida y vuelta", "Salida 9h — Regreso 17h"],
        },
        difficulty: "moderado",
        imageKey: "segredo",
        entranceFee: 70,
        trailDistanceKm: "7",
      },
      {
        title: { pt: "Dia 3 — Vale da Lua", en: "Day 3 — Moon Valley", es: "Día 3 — Valle de la Luna" },
        description: dayDescriptions["vale-da-lua"],
        attractions: {
          pt: ["Vale da Lua", "Trilha de 1,5km ida e volta", "Saída 9h — Retorno 15h"],
          en: ["Moon Valley", "1.5km round-trip trail", "Departure 9am — Return 3pm"],
          es: ["Valle de la Luna", "Sendero de 1,5km ida y vuelta", "Salida 9h — Regreso 15h"],
        },
        difficulty: "facil",
        imageKey: "vale-da-lua",
        entranceFee: 50,
        trailDistanceKm: "1,5",
      },
      {
        title: { pt: "Dia 4 — Cataratas dos Couros", en: "Day 4 — Couros Waterfalls", es: "Día 4 — Cataratas dos Couros" },
        description: dayDescriptions.couros,
        attractions: {
          pt: ["Catarata dos Couros", "Trilha de 5km ida e volta", "Saída 9h — Retorno 18h"],
          en: ["Couros Waterfalls", "5km round-trip trail", "Departure 9am — Return 6pm"],
          es: ["Cataratas dos Couros", "Sendero de 5km ida y vuelta", "Salida 9h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "couros",
        entranceFee: 0,
        voluntaryFee: true,
        trailDistanceKm: "10",
      },
    ],
    pricing: {
      atmos4x4: { individual: 5600, dupla: 3040, trio: 2000 },
      carroProprio: { individual: 2400, dupla: 1360, trio: 880 },
    },
    extraCosts: { entranceFees: 211 },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },
  {
    id: "4d-jurassico",
    duration: 4,
    category: "jurassico",
    name: {
      pt: "Roteiro Jurássico — 4 Dias",
      en: "Jurassic Itinerary — 4 Days",
      es: "Itinerario Jurásico — 4 Días",
    },
    description: {
      pt: "Quatro dias de aventura intensa com Couros, Macaquinhos, Macacão e a Cachoeira do Dragão. Para os verdadeiros aventureiros.",
      en: "Four days of intense adventure with Couros, Macaquinhos, Macacão and Dragão Waterfall. For true adventurers.",
      es: "Cuatro días de aventura intensa con Couros, Macaquinhos, Macacão y la Cascada del Dragão. Para los verdaderos aventureros.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Cataratas dos Couros", en: "Day 1 — Couros Waterfalls", es: "Día 1 — Cataratas dos Couros" },
        description: dayDescriptions.couros,
        attractions: {
          pt: ["Catarata dos Couros", "Trilha de 6km ida e volta", "Saída 9h — Retorno 18h"],
          en: ["Couros Waterfalls", "6km round-trip trail", "Departure 9am — Return 6pm"],
          es: ["Cataratas dos Couros", "Sendero de 6km ida y vuelta", "Salida 9h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "couros",
        entranceFee: 0,
        voluntaryFee: true,
        trailDistanceKm: "10",
      },
      {
        title: { pt: "Dia 2 — Macaquinhos", en: "Day 2 — Macaquinhos", es: "Día 2 — Macaquinhos" },
        description: dayDescriptions.macaquinhos,
        attractions: {
          pt: ["Complexo dos Macaquinhos", "Trilha de 4km ida e volta", "Saída 8h30 — Retorno 18h"],
          en: ["Macaquinhos Complex", "4km round-trip trail", "Departure 8:30am — Return 6pm"],
          es: ["Complejo de los Macaquinhos", "Sendero de 4km ida y vuelta", "Salida 8h30 — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "macaquinhos",
        entranceFee: 60,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 3 — Complexo do Macacão", en: "Day 3 — Macacão Complex", es: "Día 3 — Complejo del Macacão" },
        description: dayDescriptions.macacao,
        attractions: {
          pt: ["Complexo do Macacão", "Trilha de 4km ida e volta", "Saída 8h — Retorno 18h"],
          en: ["Macacão Complex", "4km round-trip trail", "Departure 8am — Return 6pm"],
          es: ["Complejo del Macacão", "Sendero de 4km ida y vuelta", "Salida 8h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "macacao",
        entranceFee: 70,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 4 — Cachoeira do Dragão", en: "Day 4 — Dragão Waterfall", es: "Día 4 — Cascada del Dragão" },
        description: dayDescriptions.dragao,
        attractions: {
          pt: ["Cachoeira do Dragão", "Trilha de 6km ida e volta", "Saída 7h — Retorno 18h"],
          en: ["Dragão Waterfall", "6km round-trip trail", "Departure 7am — Return 6pm"],
          es: ["Cascada del Dragão", "Sendero de 6km ida y vuelta", "Salida 7h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "dragao",
        entranceFee: 190,
        trailDistanceKm: "6",
      },
    ],
    pricing: {
      atmos4x4: { individual: 6000, dupla: 3200, trio: 2160 },
      carroProprio: { individual: 2800, dupla: 1600, trio: 1120 },
    },
    extraCosts: {
      entranceFees: 320,
      equipmentFees: 190,
      equipmentItems: {
        pt: "Quadriciclo, Neoprene, Sapatilha",
        en: "ATV, Neoprene, Water shoes",
        es: "Cuatriciclo, Neopreno, Zapatilla",
      },
    },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Equipamentos e quadriciclo no Dragão (obrigatório)", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Equipment and ATV at Dragão (mandatory)", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Equipos y cuatriciclo en el Dragão (obligatorio)", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },

  // ========== 5 DIAS ==========
  {
    id: "5d-classico",
    duration: 5,
    category: "classico",
    name: {
      pt: "Roteiro Clássico — 5 Dias",
      en: "Classic Itinerary — 5 Days",
      es: "Itinerario Clásico — 5 Días",
    },
    description: {
      pt: "Cinco dias para viver a Chapada dos Veadeiros em sua plenitude, com Almécegas, Segredo, Macaquinhos, Vale da Lua e Couros.",
      en: "Five days to experience Chapada dos Veadeiros in its fullness, with Almécegas, Segredo, Macaquinhos, Moon Valley and Couros.",
      es: "Cinco días para vivir Chapada dos Veadeiros en su plenitud, con Almécegas, Segredo, Macaquinhos, Valle de la Luna y Couros.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Almécegas & São Bento", en: "Day 1 — Almécegas & São Bento", es: "Día 1 — Almécegas y São Bento" },
        description: dayDescriptions.almecegas,
        attractions: {
          pt: ["Cachoeira Almécegas", "Cachoeira São Bento", "Trilha de 4km ida e volta", "Saída 9h — Retorno 16h"],
          en: ["Almécegas Waterfall", "São Bento Waterfall", "4km round-trip trail", "Departure 9am — Return 4pm"],
          es: ["Cascada Almécegas", "Cascada São Bento", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 16h"],
        },
        difficulty: "facil",
        imageKey: "almecegas-sao-bento",
        entranceFee: 91,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 2 — Segredo", en: "Day 2 — Segredo", es: "Día 2 — Segredo" },
        description: dayDescriptions.segredo,
        attractions: {
          pt: ["Cachoeira do Segredo", "Trilha de 7km ida e volta", "Saída 9h — Retorno 17h"],
          en: ["Segredo Waterfall", "7km round-trip trail", "Departure 9am — Return 5pm"],
          es: ["Cascada del Segredo", "Sendero de 7km ida y vuelta", "Salida 9h — Regreso 17h"],
        },
        difficulty: "moderado",
        imageKey: "segredo",
        entranceFee: 70,
        trailDistanceKm: "7",
      },
      {
        title: { pt: "Dia 3 — Macaquinhos", en: "Day 3 — Macaquinhos", es: "Día 3 — Macaquinhos" },
        description: dayDescriptions.macaquinhos,
        attractions: {
          pt: ["Complexo dos Macaquinhos", "Trilha de 4km ida e volta", "Saída 9h — Retorno 17h"],
          en: ["Macaquinhos Complex", "4km round-trip trail", "Departure 9am — Return 5pm"],
          es: ["Complejo de los Macaquinhos", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 17h"],
        },
        difficulty: "moderado",
        imageKey: "macaquinhos",
        entranceFee: 60,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 4 — Vale da Lua", en: "Day 4 — Moon Valley", es: "Día 4 — Valle de la Luna" },
        description: dayDescriptions["vale-da-lua"],
        attractions: {
          pt: ["Vale da Lua", "Trilha de 1,5km ida e volta", "Saída 9h — Retorno 15h"],
          en: ["Moon Valley", "1.5km round-trip trail", "Departure 9am — Return 3pm"],
          es: ["Valle de la Luna", "Sendero de 1,5km ida y vuelta", "Salida 9h — Regreso 15h"],
        },
        difficulty: "facil",
        imageKey: "vale-da-lua",
        entranceFee: 50,
        trailDistanceKm: "1,5",
      },
      {
        title: { pt: "Dia 5 — Cataratas dos Couros", en: "Day 5 — Couros Waterfalls", es: "Día 5 — Cataratas dos Couros" },
        description: dayDescriptions.couros,
        attractions: {
          pt: ["Catarata dos Couros", "Trilha de 5km ida e volta", "Saída 9h — Retorno 18h"],
          en: ["Couros Waterfalls", "5km round-trip trail", "Departure 9am — Return 6pm"],
          es: ["Cataratas dos Couros", "Sendero de 5km ida y vuelta", "Salida 9h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "couros",
        entranceFee: 0,
        voluntaryFee: true,
        trailDistanceKm: "10",
      },
    ],
    pricing: {
      atmos4x4: { individual: 7000, dupla: 3800, trio: 2500 },
      carroProprio: { individual: 3000, dupla: 1700, trio: 1100 },
    },
    extraCosts: { entranceFees: 271 },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },
  {
    id: "5d-jurassico",
    duration: 5,
    category: "jurassico",
    name: {
      pt: "Roteiro Jurássico — 5 Dias",
      en: "Jurassic Itinerary — 5 Days",
      es: "Itinerario Jurásico — 5 Días",
    },
    description: {
      pt: "Cinco dias de imersão total com Couros, Macaquinhos, Ponte de Pedra, Macacão e Dragão. O desafio máximo da ATMOS.",
      en: "Five days of total immersion with Couros, Macaquinhos, Ponte de Pedra, Macacão and Dragão. ATMOS' ultimate challenge.",
      es: "Cinco días de inmersión total con Couros, Macaquinhos, Ponte de Pedra, Macacão y Dragão. El desafío máximo de ATMOS.",
    },
    days: [
      {
        title: { pt: "Dia 1 — Cataratas dos Couros", en: "Day 1 — Couros Waterfalls", es: "Día 1 — Cataratas dos Couros" },
        description: dayDescriptions.couros,
        attractions: {
          pt: ["Catarata dos Couros", "Trilha de 5km ida e volta", "Saída 8h — Retorno 18h"],
          en: ["Couros Waterfalls", "5km round-trip trail", "Departure 8am — Return 6pm"],
          es: ["Cataratas dos Couros", "Sendero de 5km ida y vuelta", "Salida 8h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "couros",
        entranceFee: 0,
        voluntaryFee: true,
        trailDistanceKm: "10",
      },
      {
        title: { pt: "Dia 2 — Macaquinhos", en: "Day 2 — Macaquinhos", es: "Día 2 — Macaquinhos" },
        description: dayDescriptions.macaquinhos,
        attractions: {
          pt: ["Complexo dos Macaquinhos", "Trilha de 4km ida e volta", "Saída 9h — Retorno 18h"],
          en: ["Macaquinhos Complex", "4km round-trip trail", "Departure 9am — Return 6pm"],
          es: ["Complejo de los Macaquinhos", "Sendero de 4km ida y vuelta", "Salida 9h — Regreso 18h"],
        },
        difficulty: "moderado",
        imageKey: "macaquinhos",
        entranceFee: 60,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 3 — Ponte de Pedra", en: "Day 3 — Stone Bridge", es: "Día 3 — Puente de Piedra" },
        description: dayDescriptions["ponte-de-pedra"],
        attractions: {
          pt: ["Cachoeira Ponte de Pedra", "Trilha de 6km ida e volta", "Saída 7h — Retorno 18h"],
          en: ["Stone Bridge Waterfall", "6km round-trip trail", "Departure 7am — Return 6pm"],
          es: ["Cascada Puente de Piedra", "Sendero de 6km ida y vuelta", "Salida 7h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "ponte-de-pedra",
        entranceFee: 50,
        trailDistanceKm: "8",
      },
      {
        title: { pt: "Dia 4 — Complexo do Macacão", en: "Day 4 — Macacão Complex", es: "Día 4 — Complejo del Macacão" },
        description: dayDescriptions.macacao,
        attractions: {
          pt: ["Complexo do Macacão", "Trilha de 4km ida e volta", "Saída 8h — Retorno 18h"],
          en: ["Macacão Complex", "4km round-trip trail", "Departure 8am — Return 6pm"],
          es: ["Complejo del Macacão", "Sendero de 4km ida y vuelta", "Salida 8h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "macacao",
        entranceFee: 70,
        trailDistanceKm: "4",
      },
      {
        title: { pt: "Dia 5 — Cachoeira do Dragão", en: "Day 5 — Dragão Waterfall", es: "Día 5 — Cascada del Dragão" },
        description: dayDescriptions.dragao,
        attractions: {
          pt: ["Cachoeira do Dragão", "Trilha de 6km ida e volta", "Saída 7h — Retorno 18h"],
          en: ["Dragão Waterfall", "6km round-trip trail", "Departure 7am — Return 6pm"],
          es: ["Cascada del Dragão", "Sendero de 6km ida y vuelta", "Salida 7h — Regreso 18h"],
        },
        difficulty: "dificil",
        imageKey: "dragao",
        entranceFee: 190,
        trailDistanceKm: "6",
      },
    ],
    pricing: {
      atmos4x4: { individual: 7500, dupla: 4000, trio: 2700 },
      carroProprio: { individual: 3500, dupla: 2000, trio: 1400 },
    },
    extraCosts: {
      entranceFees: 370,
      equipmentFees: 190,
      equipmentItems: {
        pt: "Quadriciclo, Neoprene, Sapatilha",
        en: "ATV, Neoprene, Water shoes",
        es: "Cuatriciclo, Neopreno, Zapatilla",
      },
    },
    inclusions: {
      pt: ["Guiamento ATMOS especializado", "Curadoria completa do roteiro", "Equipamentos e quadriciclo no Dragão (obrigatório)", "Registros fotográficos", "Assistência ATMOS 360° durante toda a viagem"],
      en: ["Specialized ATMOS guiding", "Complete itinerary curation", "Equipment and ATV at Dragão (mandatory)", "Photo records", "ATMOS 360° assistance throughout the trip"],
      es: ["Guía ATMOS especializado", "Curaduría completa del itinerario", "Equipos y cuatriciclo en el Dragão (obligatorio)", "Registros fotográficos", "Asistencia ATMOS 360° durante todo el viaje"],
    },
  },
];

export const getDurations = (): DurationDays[] => [2, 3, 4, 5];

export const getItinerariesByDuration = (duration: DurationDays, list: Itinerary[] = itineraries): Itinerary[] =>
  list.filter((i) => i.duration === duration);

export const getItineraryById = (id: string, list: Itinerary[] = itineraries): Itinerary | undefined =>
  list.find((i) => i.id === id);
