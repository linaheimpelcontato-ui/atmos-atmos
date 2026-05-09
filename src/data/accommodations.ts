import { type Language } from "@/contexts/LanguageContext";

export type AccRegion = "alto-paraiso" | "sao-jorge" | "cavalcante" | "teresina-goias" | "moinho" | "campo-alegre" | "tocantins";
export type AccType = "pousada" | "chale" | "casa" | "lodge";
export type Amenity =
  | "piscina" | "piscina-aquecida" | "piscina-privada"
  | "cafe" | "restaurante" | "spa" | "vista" | "cozinha" | "pet"
  | "hidro" | "sauna" | "ofuro" | "jardim"
  | "varanda" | "lareira" | "wifi" | "estacionamento"
  | "beach-tenis" | "ev-charger" | "energia-solar" | "self-checkin"
  | "cachoeira-privada" | "academia"
  | "banheira" | "ar-condicionado" | "churrasqueira";

export interface Accommodation {
  id: string;
  name: string;
  region: AccRegion | string;
  type: AccType;
  priceRange: string;
  capacity: string;
  units: number;
  totalCapacity: number;
  instagram?: string;
  amenities: Amenity[];
  description: Record<Language, string>;
  imageIndex: number;
  website?: string;
  phone?: string;
  email?: string;
  bookingUrl?: string;
  longDescription?: Record<Language, string>;
  storageId?: string;
}

/** Generate a set of image indices for carousel from the primary imageIndex */
export function getImageIndices(imageIndex: number): number[] {
  const indices = [imageIndex];
  for (let i = 1; i <= 3; i++) {
    indices.push(((imageIndex - 1 + i) % 6) + 1);
  }
  return indices;
}

/** Parse "R$ 300 – R$ 500" or "R$ 1.000 – R$ 2.000" → [300, 500] or [1000, 2000] */
export function parsePriceRange(priceRange: string): [number, number] {
  const parts = priceRange.split("–").map((s) => s.trim());
  const parse = (s: string) => {
    const cleaned = s.replace(/[^\d]/g, "");
    return parseInt(cleaned) || 0;
  };
  if (parts.length < 2) return [0, 10000];
  return [parse(parts[0]), parse(parts[1])];
}

/** Get global min/max across all accommodations */
export function getGlobalPriceRange(): [number, number] {
  let min = Infinity, max = 0;
  for (const a of accommodations) {
    const [lo, hi] = parsePriceRange(a.priceRange);
    if (lo < min) min = lo;
    if (hi > max) max = hi;
  }
  return [min, max];
}

/** Get global min/max units across all accommodations */
export function getGlobalUnitsRange(): [number, number] {
  let min = Infinity, max = 0;
  for (const a of accommodations) {
    if (a.units < min) min = a.units;
    if (a.units > max) max = a.units;
  }
  return [min, max];
}

/** Get global min/max totalCapacity across all accommodations */
export function getGlobalCapacityRange(): [number, number] {
  let min = Infinity, max = 0;
  for (const a of accommodations) {
    if (a.totalCapacity < min) min = a.totalCapacity;
    if (a.totalCapacity > max) max = a.totalCapacity;
  }
  return [min, max];
}

export const accRegionLabels: Record<AccRegion, Record<Language, string>> = {
  "alto-paraiso": { pt: "Alto Paraíso", en: "Alto Paraíso", es: "Alto Paraíso" },
  "sao-jorge": { pt: "São Jorge", en: "São Jorge", es: "São Jorge" },
  "cavalcante": { pt: "Cavalcante", en: "Cavalcante", es: "Cavalcante" },
  "teresina-goias": { pt: "Teresina de Goiás", en: "Teresina de Goiás", es: "Teresina de Goiás" },
  "moinho": { pt: "Vila do Moinho", en: "Moinho Village", es: "Vila do Moinho" },
  "campo-alegre": { pt: "Campo Alegre", en: "Campo Alegre", es: "Campo Alegre" },
  "tocantins": { pt: "Tocantins", en: "Tocantins", es: "Tocantins" },
};

export const accTypeLabels: Record<AccType, Record<Language, string>> = {
  pousada: { pt: "Pousada", en: "Inn", es: "Posada" },
  chale: { pt: "Chalé / Bangalô", en: "Chalet / Bungalow", es: "Cabaña / Bungalow" },
  casa: { pt: "Casa de Temporada", en: "Vacation Home", es: "Casa Vacacional" },
  lodge: { pt: "Lodge / Hotel", en: "Lodge / Hotel", es: "Lodge / Hotel" },
};

export const accTypeColors: Record<AccType, string> = {
  pousada: "bg-amber-100 text-amber-700",
  chale: "bg-emerald-100 text-emerald-700",
  casa: "bg-sky-100 text-sky-700",
  lodge: "bg-violet-100 text-violet-700",
};

export const amenityLabels: Record<Amenity, Record<Language, string>> = {
  piscina: { pt: "Piscina compartilhada", en: "Shared pool", es: "Piscina compartida" },
  "piscina-aquecida": { pt: "Piscina aquecida", en: "Heated pool", es: "Piscina climatizada" },
  "piscina-privada": { pt: "Piscina privada", en: "Private pool", es: "Piscina privada" },
  cafe: { pt: "Café da manhã incluso", en: "Breakfast included", es: "Desayuno incluido" },
  restaurante: { pt: "Restaurante", en: "Restaurant", es: "Restaurante" },
  spa: { pt: "Spa", en: "Spa", es: "Spa" },
  vista: { pt: "Vista panorâmica", en: "Panoramic view", es: "Vista panorámica" },
  cozinha: { pt: "Cozinha", en: "Kitchen", es: "Cocina" },
  pet: { pt: "Pet friendly", en: "Pet friendly", es: "Pet friendly" },
  hidro: { pt: "Hidromassagem", en: "Hot tub", es: "Hidromasaje" },
  sauna: { pt: "Sauna", en: "Sauna", es: "Sauna" },
  ofuro: { pt: "Ofurô", en: "Ofuro bath", es: "Ofuro" },
  jardim: { pt: "Jardim", en: "Garden", es: "Jardín" },
  varanda: { pt: "Varanda", en: "Veranda", es: "Terraza" },
  lareira: { pt: "Lareira / Fogueira", en: "Fireplace / Fire pit", es: "Chimenea / Fogata" },
  wifi: { pt: "Wi-Fi", en: "Wi-Fi", es: "Wi-Fi" },
  estacionamento: { pt: "Estacionamento", en: "Parking", es: "Estacionamiento" },
  "beach-tenis": { pt: "Beach tênis", en: "Beach tennis", es: "Beach tenis" },
  "ev-charger": { pt: "Carregador EV", en: "EV charger", es: "Cargador EV" },
  "energia-solar": { pt: "Energia solar", en: "Solar energy", es: "Energía solar" },
  "self-checkin": { pt: "Self check-in", en: "Self check-in", es: "Self check-in" },
  "cachoeira-privada": { pt: "Cachoeira privada", en: "Private waterfall", es: "Cascada privada" },
  
  academia: { pt: "Academia / Fitness", en: "Gym / Fitness", es: "Gimnasio / Fitness" },
  banheira: { pt: "Banheira", en: "Bathtub", es: "Bañera" },
  "ar-condicionado": { pt: "Ar-condicionado", en: "Air conditioning", es: "Aire acondicionado" },
  churrasqueira: { pt: "Churrasqueira", en: "BBQ grill", es: "Parrilla" },
};

/** Get all amenity keys for filter UI */
export const getAllAmenities = (): Amenity[] => Object.keys(amenityLabels) as Amenity[];

export const accommodations: Accommodation[] = [
  // ========== ALTO PARAÍSO ==========
  {
    id: "vila-toa",
    name: "Vila Toá",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 600 – R$ 900",
    capacity: "2",
    units: 17,
    totalCapacity: 34,
    instagram: "vilatoa",
    amenities: ["cafe", "restaurante", "piscina", "vista", "beach-tenis", "ev-charger", "wifi", "estacionamento"],
    description: {
      pt: "Bangalôs privativos com piscina de borda infinita e vista panorâmica. Café da manhã e restaurante no local.",
      en: "Private bungalows with infinity pool and panoramic views. Breakfast and on-site restaurant.",
      es: "Bungalows privativos con piscina de borde infinito y vista panorámica. Desayuno y restaurante en el lugar.",
    },
    imageIndex: 1,
    website: "https://vilatoa.com.br",
    bookingUrl: "https://vilatoa.com.br/reservas",
    longDescription: {
      pt: "A Vila Toá oferece 17 bangalôs privativos em três categorias — Cubo, Iglu e Cubo Sol — todos imersos na natureza do cerrado com vista panorâmica. A piscina de borda infinita é o destaque, com vista aberta para o horizonte. O espaço conta com restaurante próprio, quadra de beach tênis, parede de escalada, carregador para veículos elétricos, Wi-Fi e estacionamento. Ideal para casais que buscam conforto e contato com a natureza.",
      en: "Vila Toá offers 17 private bungalows in three categories — Cubo, Iglu and Cubo Sol — all immersed in the cerrado nature with panoramic views. The infinity pool is the highlight, with an open horizon view. The space features its own restaurant, beach tennis court, climbing wall, EV charger, Wi-Fi and parking. Ideal for couples seeking comfort and contact with nature.",
      es: "Vila Toá ofrece 17 bungalows privativos en tres categorías — Cubo, Iglu y Cubo Sol — todos inmersos en la naturaleza del cerrado con vista panorámica. La piscina de borde infinito es el punto destacado, con vista abierta al horizonte. El espacio cuenta con restaurante propio, cancha de beach tenis, pared de escalada, cargador para vehículos eléctricos, Wi-Fi y estacionamiento. Ideal para parejas que buscan confort y contacto con la naturaleza.",
    },
  },
  {
    id: "vila-baru",
    name: "Vila Baru",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 600 – R$ 900",
    capacity: "2–14",
    units: 7,
    totalCapacity: 28,
    instagram: "vila.baru",
    amenities: ["cafe", "restaurante", "piscina", "hidro", "sauna", "academia", "estacionamento"],
    description: {
      pt: "Bangalôs e casas com piscina de borda infinita, hidromassagem e sauna. Próximo ao centro, ideal para casais e grupos.",
      en: "Bungalows and houses with infinity pool, hot tub and sauna. Close to downtown, ideal for couples and groups.",
      es: "Bungalows y casas con piscina de borde infinito, hidromasaje y sauna. Cerca del centro, ideal para parejas y grupos.",
    },
    imageIndex: 2,
    website: "https://vilabaru.com.br",
    bookingUrl: "https://vilabaru.com.br/reservas",
    longDescription: {
      pt: "A Vila Baru é uma pousada localizada na Estância Paraíso, em Alto Paraíso de Goiás. Oferece bangalôs e casas para casais e grupos de até 14 hóspedes, com piscina de borda infinita, hidromassagem, sauna e fitness center. O espaço conta com restaurante, café da manhã incluso e programa de fidelidade. Endereço: Rua das Curicacas, Q8 L1, Estância Paraíso.",
      en: "Vila Baru is an inn located in Estância Paraíso, Alto Paraíso de Goiás. It offers bungalows and houses for couples and groups of up to 14 guests, with infinity pool, hot tub, sauna and fitness center. The space features a restaurant, breakfast included and a loyalty program. Address: Rua das Curicacas, Q8 L1, Estância Paraíso.",
      es: "Vila Baru es una posada ubicada en Estância Paraíso, Alto Paraíso de Goiás. Ofrece bungalows y casas para parejas y grupos de hasta 14 huéspedes, con piscina de borde infinito, hidromasaje, sauna y fitness center. El espacio cuenta con restaurante, desayuno incluido y programa de fidelidad. Dirección: Rua das Curicacas, Q8 L1, Estância Paraíso.",
    },
  },
  {
    id: "espaco-horus",
    name: "Espaço Hórus",
    region: "alto-paraiso",
    type: "chale",
    priceRange: "R$ 300 – R$ 500",
    capacity: "2–10",
    units: 3,
    totalCapacity: 10,
    instagram: "espacohoruschapada",
    amenities: ["cozinha", "jardim"],
    description: {
      pt: "Retiro espiritual com chalés privativos e espaço para eventos. BioGeometria, cristais e energia elevada da Chapada.",
      en: "Spiritual retreat with private chalets and event space. BioGeometry, crystals and the elevated energy of Chapada.",
      es: "Retiro espiritual con chalés privativos y espacio para eventos. BioGeometría, cristales y energía elevada de la Chapada.",
    },
    imageIndex: 6,
    website: "https://www.espacohoruschapadadosveadeiros.com",
    longDescription: {
      pt: "O Espaço Hórus é um santuário espiritual em Alto Paraíso, construído com base na BioGeometria — arquitetura que harmoniza frequências e potencializa a energia do espaço. O nome Hórus, o Deus-Falcão egípcio dos Céus, reflete a visão elevada e a ordem cósmica do lugar, ideal para retiros de autoconhecimento, yoga, meditação e vivências. Localizado no Paralelo 14, absorve toda a potência energética da Chapada dos Veadeiros. Capacidade para até 10 pessoas em chalés privativos.",
      en: "Espaço Hórus is a spiritual sanctuary in Alto Paraíso, built based on BioGeometry — architecture that harmonizes frequencies and enhances the energy of the space. The name Horus, the Egyptian Falcon-God of the Heavens, reflects the elevated vision and cosmic order of the place, ideal for self-knowledge retreats, yoga, meditation and experiences. Located on Parallel 14, it absorbs all the energetic power of Chapada dos Veadeiros. Capacity for up to 10 people in private chalets.",
      es: "Espaço Hórus es un santuario espiritual en Alto Paraíso, construido con base en la BioGeometría — arquitectura que armoniza frecuencias y potencia la energía del espacio. El nombre Horus, el Dios-Halcón egipcio de los Cielos, refleja la visión elevada y el orden cósmico del lugar, ideal para retiros de autoconocimiento, yoga, meditación y vivencias. Ubicado en el Paralelo 14, absorbe toda la potencia energética de Chapada dos Veadeiros. Capacidad para hasta 10 personas en chalés privativos.",
    },
  },
  {
    id: "villa-eya",
    name: "Villa Eyá",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.000 – R$ 2.000",
    capacity: "2–4",
    units: 3,
    totalCapacity: 12,
    instagram: "villaeyachapada",
    amenities: ["piscina-privada", "hidro", "cozinha", "vista"],
    description: {
      pt: "Vila de casas com design contemporâneo, rooftop panorâmico, piscina com vista e banheira de hidromassagem.",
      en: "Village of contemporary design houses with panoramic rooftop, pool with view and hot tub.",
      es: "Villa de casas con diseño contemporáneo, rooftop panorámico, piscina con vista e hidromasaje.",
    },
    imageIndex: 3,
    website: "https://villaeyachapada.com",
    phone: "+55 61 99942-5454",
    bookingUrl: "https://villaeyachapada.com/reservas",
    longDescription: {
      pt: "A Villa Eyá é um refúgio eco-chic em Alto Paraíso com 3 residências exclusivas — Infinito, Sorriso e Abraço — cada uma com design único e integração total com a natureza. As residências contam com piscina privativa, banheira de hidromassagem, cozinha equipada e vista panorâmica para o cerrado. Um conceito de hospitalidade que une luxo, sustentabilidade e experiências sensoriais.",
      en: "Villa Eyá is an eco-chic retreat in Alto Paraíso with 3 exclusive residences — Infinito, Sorriso and Abraço — each with unique design and full integration with nature. The residences feature private pool, hot tub, equipped kitchen and panoramic cerrado views. A hospitality concept that combines luxury, sustainability and sensory experiences.",
      es: "Villa Eyá es un refugio eco-chic en Alto Paraíso con 3 residencias exclusivas — Infinito, Sorriso y Abraço — cada una con diseño único e integración total con la naturaleza. Las residencias cuentan con piscina privativa, hidromasaje, cocina equipada y vista panorámica al cerrado. Un concepto de hospitalidad que une lujo, sostenibilidad y experiencias sensoriales.",
    },
  },
  {
    id: "vila-chapada",
    name: "Vila Chapada",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 500 – R$ 700",
    capacity: "2–4",
    units: 1,
    totalCapacity: 4,
    instagram: "vilachapada",
    amenities: ["cozinha", "vista", "varanda"],
    description: {
      pt: "Casa independente com cozinha completa e varanda com vista. Próxima a cachoeiras.",
      en: "Independent house with full kitchen and veranda with view. Close to waterfalls.",
      es: "Casa independiente con cocina completa y terraza con vista. Cerca de cascadas.",
    },
    imageIndex: 2,
    longDescription: {
      pt: "A Vila Chapada é uma casa de temporada independente em Alto Paraíso, ideal para quem busca autonomia e privacidade. Com cozinha completa equipada, varanda com vista para o cerrado e jardim privativo, o espaço combina o conforto de lar com a magia da natureza da Chapada dos Veadeiros. Estrategicamente localizada próxima às principais cachoeiras da região.",
      en: "Vila Chapada is an independent vacation home in Alto Paraíso, ideal for those seeking autonomy and privacy. With a fully equipped kitchen, veranda with cerrado views and private garden, the space combines home comfort with the magic of Chapada dos Veadeiros nature. Strategically located close to the main waterfalls in the region.",
      es: "Vila Chapada es una casa vacacional independiente en Alto Paraíso, ideal para quienes buscan autonomía y privacidad. Con cocina completa equipada, terraza con vista al cerrado y jardín privativo, el espacio combina el confort del hogar con la magia de la naturaleza de Chapada dos Veadeiros. Estratégicamente ubicada cerca de las principales cascadas de la región.",
    },
  },
  {
    id: "vila-cerrado",
    name: "Vila Cerrado",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 700 – R$ 1.000",
    capacity: "2",
    units: 5,
    totalCapacity: 16,
    instagram: "vila_cerrado",
    amenities: ["piscina", "restaurante", "spa", "pet", "wifi", "self-checkin"],
    description: {
      pt: "Pousada com arquitetura ecológica, piscina natural, restaurante sensorial e spa com terapias.",
      en: "Inn with ecological architecture, natural pool, sensory restaurant and therapy spa.",
      es: "Posada con arquitectura ecológica, piscina natural, restaurante sensorial y spa con terapias.",
    },
    imageIndex: 4,
    website: "https://vilacerrado.com.br",
    bookingUrl: "https://book.omnibees.com/hotel/18750",
    longDescription: {
      pt: "A Vila Cerrado é uma pousada boutique sustentável em Alto Paraíso com conceito de casa-hotel: a afetividade de um lar com serviço de hotel. São 5 acomodações únicas — Casa Buriti (2p), Casa Copaíba (4p), Casa Jatobá (4p), Chalé Baru (3p) e Chalé Pequi (3p). Experiências incluem o Templo Ser (magia dos 4 elementos) e o Café Sensus (sensorial e regional). Pet friendly, self check-in, concierge virtual e Wi-Fi de 100mb exclusivo por casa.",
      en: "Vila Cerrado is a sustainable boutique inn in Alto Paraíso with a house-hotel concept: the warmth of a home with hotel service. It features 5 unique accommodations — Casa Buriti (2p), Casa Copaíba (4p), Casa Jatobá (4p), Chalé Baru (3p) and Chalé Pequi (3p). Experiences include Templo Ser (magic of the 4 elements) and Café Sensus (sensory and regional). Pet friendly, self check-in, virtual concierge and 100mb Wi-Fi per house.",
      es: "Vila Cerrado es una posada boutique sustentable en Alto Paraíso con concepto de casa-hotel: la afectividad de un hogar con servicio de hotel. Son 5 alojamientos únicos — Casa Buriti (2p), Casa Copaíba (4p), Casa Jatobá (4p), Chalé Baru (3p) y Chalé Pequi (3p). Experiencias incluyen Templo Ser (magia de los 4 elementos) y Café Sensus (sensorial y regional). Pet friendly, self check-in, concierge virtual y Wi-Fi de 100mb por casa.",
    },
  },
  {
    id: "villa-azaleia",
    name: "Villa Azaleia",
    region: "alto-paraiso",
    type: "chale",
    priceRange: "R$ 500 – R$ 700",
    capacity: "2",
    units: 4,
    totalCapacity: 8,
    instagram: "villaazaleia",
    amenities: ["piscina", "cafe", "cozinha", "vista", "varanda"],
    description: {
      pt: "Chalés com varanda, piscina com vista, cozinha compacta e café da manhã incluso.",
      en: "Chalets with veranda, pool with view, compact kitchen and breakfast included.",
      es: "Chalés con terraza, piscina con vista, cocina compacta y desayuno incluido.",
    },
    imageIndex: 5,
    website: "https://villaazaleiachales.com.br",
    longDescription: {
      pt: "Localizada no coração da Chapada dos Veadeiros, em Alto Paraíso, a Villa Azaleia oferece a combinação perfeita entre conforto e natureza. Os chalés privativos são o refúgio ideal para quem busca tranquilidade, exclusividade e uma imersão total nas belezas naturais da região. Com piscina com vista, varanda, cozinha compacta e café da manhã incluso.",
      en: "Located in the heart of Chapada dos Veadeiros, in Alto Paraíso, Villa Azaleia offers the perfect combination of comfort and nature. The private chalets are the ideal retreat for those seeking tranquility, exclusivity and total immersion in the region's natural beauty. Features pool with view, veranda, compact kitchen and breakfast included.",
      es: "Ubicada en el corazón de Chapada dos Veadeiros, en Alto Paraíso, Villa Azaleia ofrece la combinación perfecta entre confort y naturaleza. Los chalés privativos son el refugio ideal para quienes buscan tranquilidad, exclusividad e inmersión total en las bellezas naturales de la región. Con piscina con vista, terraza, cocina compacta y desayuno incluido.",
    },
  },
  {
    id: "vila-suindara",
    name: "Vila Suindara",
    region: "alto-paraiso",
    type: "chale",
    priceRange: "R$ 350 – R$ 700",
    capacity: "2",
    units: 3,
    totalCapacity: 6,
    instagram: "vilasuindara",
    amenities: ["vista", "jardim", "hidro", "varanda"],
    description: {
      pt: "Vila de chalés equipados com varanda com vista, jardim amplo, ambiente silencioso e hidromassagem.",
      en: "Village of equipped chalets with view veranda, large garden, quiet ambiance and hot tub.",
      es: "Villa de chalés equipados con terraza con vista, jardín amplio, ambiente silencioso e hidromasaje.",
    },
    imageIndex: 1,
    longDescription: {
      pt: "A Vila Suindara é uma vila de chalés privativos em Alto Paraíso, projetada para quem deseja silêncio, privacidade e imersão na natureza do cerrado. Cada chalé conta com varanda panorâmica, hidromassagem e jardim amplo com vegetação nativa. O nome Suindara — a coruja-do-campo do cerrado — reflete a essência do espaço: tranquilidade, contemplação e conexão com os ritmos naturais.",
      en: "Vila Suindara is a village of private chalets in Alto Paraíso, designed for those who seek silence, privacy and immersion in the cerrado nature. Each chalet features a panoramic veranda, hot tub and large garden with native vegetation. The name Suindara — the barn owl of the cerrado — reflects the essence of the space: tranquility, contemplation and connection with natural rhythms.",
      es: "Vila Suindara es una villa de chalés privativos en Alto Paraíso, diseñada para quienes desean silencio, privacidad e inmersión en la naturaleza del cerrado. Cada chalé cuenta con terraza panorámica, hidromasaje y jardín amplio con vegetación nativa. El nombre Suindara — la lechuza del cerrado — refleja la esencia del espacio: tranquilidad, contemplación y conexión con los ritmos naturales.",
    },
  },
  {
    id: "vila-abaton",
    name: "Vila Abaton",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 600 – R$ 1.000",
    capacity: "2",
    units: 5,
    totalCapacity: 10,
    instagram: "vilaabaton",
    amenities: ["piscina", "hidro", "jardim", "pet", "vista", "spa", "cafe", "varanda"],
    description: {
      pt: "Pousada com piscina ao ar livre, banheira, jardim exuberante, varandas privativas e pet friendly.",
      en: "Inn with outdoor pool, bathtub, lush garden, private verandas and pet friendly.",
      es: "Posada con piscina al aire libre, bañera, jardín exuberante, terrazas privativas y pet friendly.",
    },
    imageIndex: 4,
    website: "https://vilaabaton.com.br",
    phone: "+55 62 99526-9904",
    email: "vilaabaton@gmail.com",
    longDescription: {
      pt: "A Vila Abaton é uma pousada em Alto Paraíso com 5 acomodações únicas — Casa do Céu, Suíte Bambu, Chalé da Floresta, Loft da Árvore e Suíte das Pedras. O espaço oferece piscina natural, spa, café da manhã artesanal, Templo do Fogo, Espaço Zen para yoga e meditação, e horta orgânica. Pet friendly, com jardim exuberante e varandas privativas em cada unidade.",
      en: "Vila Abaton is an inn in Alto Paraíso with 5 unique accommodations — Casa do Céu, Suíte Bambu, Chalé da Floresta, Loft da Árvore and Suíte das Pedras. The space offers a natural pool, spa, artisan breakfast, Fire Temple, Zen Space for yoga and meditation, and organic garden. Pet friendly, with lush garden and private verandas in each unit.",
      es: "Vila Abaton es una posada en Alto Paraíso con 5 alojamientos únicos — Casa do Céu, Suíte Bambu, Chalé da Floresta, Loft da Árvore y Suíte das Pedras. El espacio ofrece piscina natural, spa, desayuno artesanal, Templo del Fuego, Espacio Zen para yoga y meditación, y huerto orgánico. Pet friendly, con jardín exuberante y terrazas privativas en cada unidad.",
    },
  },
  {
    id: "rustik-chapada",
    name: "Rustik Chapada",
    region: "alto-paraiso",
    type: "chale",
    priceRange: "R$ 500 – R$ 700",
    capacity: "2",
    units: 3,
    totalCapacity: 6,
    instagram: "rustikchapada",
    amenities: ["hidro", "cozinha", "lareira"],
    description: {
      pt: "Bangalôs com hidromassagem, lareira externa, cozinha compacta e clima reservado.",
      en: "Bungalows with hot tub, outdoor fireplace, compact kitchen and private atmosphere.",
      es: "Bungalows con hidromasaje, chimenea externa, cocina compacta y ambiente reservado.",
    },
    imageIndex: 3,
    longDescription: {
      pt: "O Rustik Chapada é um refúgio de bangalôs em Alto Paraíso. Cada bangalô oferece hidromassagem privativa, lareira externa, cozinha compacta e um ambiente de total privacidade e reserva. Localizado na Rua João Bernardes Rabelo, é ideal para casais que buscam uma experiência intimista e aconchegante.",
      en: "Rustik Chapada is a bungalow retreat in Alto Paraíso. Each bungalow offers a private hot tub, outdoor fireplace, compact kitchen and total privacy. Located on Rua João Bernardes Rabelo, it's ideal for couples seeking an intimate and cozy experience.",
      es: "Rustik Chapada es un refugio de bungalows en Alto Paraíso. Cada bungalow ofrece hidromasaje privativo, chimenea externa, cocina compacta y total privacidad. Ubicado en Rua João Bernardes Rabelo, es ideal para parejas que buscan una experiencia íntima y acogedora.",
    },
  },
  {
    id: "pousada-maya",
    name: "Pousada Maya",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 500 – R$ 1.500",
    capacity: "2",
    units: 9,
    totalCapacity: 18,
    instagram: "pousadamayaoficial",
    amenities: ["piscina", "spa", "hidro", "restaurante", "cafe", "vista", "varanda"],
    description: {
      pt: "Pousada com piscina com vista, spa e hidromassagem, restaurante interno e café da manhã. Suítes com varanda.",
      en: "Inn with pool with view, spa and hot tub, on-site restaurant and breakfast. Suites with veranda.",
      es: "Posada con piscina con vista, spa e hidromasaje, restaurante interno y desayuno. Suites con terraza.",
    },
    imageIndex: 5,
    website: "https://pousadamaya.com.br",
    bookingUrl: "https://hbook.hsystem.com.br/Booking?companyId=68cc0e33133b3e7ce71b98a9",
    longDescription: {
      pt: "Com 25 anos de história, a Pousada Maya é um refúgio de paz a apenas 1km do centro de Alto Paraíso, aos pés de um morro com área de preservação. Construída segundo a filosofia Feng Shui, conta com 9 suítes únicas — Shanti, Maya, Zen Loft, Palipalan, Brisa, Jasmim, Paraíso, Guará e mais — todas com enxoval Trousseau. O espaço oferece piscina com vista panorâmica, spa com terapias holísticas, restaurante com culinária autoral e café da manhã artesanal.",
      en: "With 25 years of history, Pousada Maya is a peaceful retreat just 1km from downtown Alto Paraíso, at the foot of a hill with a preservation area. Built according to Feng Shui philosophy, it has 9 unique suites — Shanti, Maya, Zen Loft, Palipalan, Brisa, Jasmim, Paraíso, Guará and more — all with Trousseau linens. The space offers a pool with panoramic views, spa with holistic therapies, restaurant with signature cuisine and artisan breakfast.",
      es: "Con 25 años de historia, Pousada Maya es un refugio de paz a solo 1km del centro de Alto Paraíso, al pie de un cerro con área de preservación. Construida según la filosofía Feng Shui, cuenta con 9 suites únicas — Shanti, Maya, Zen Loft, Palipalan, Brisa, Jasmim, Paraíso, Guará y más — todas con ropa de cama Trousseau. El espacio ofrece piscina con vista panorámica, spa con terapias holísticas, restaurante con cocina autoral y desayuno artesanal.",
    },
  },
  {
    id: "casa-poema",
    name: "Casa Poema",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.500 – R$ 2.000",
    capacity: "2–6",
    units: 1,
    totalCapacity: 6,
    instagram: "casa_poema",
    amenities: ["piscina-privada", "cozinha", "vista", "jardim", "cafe"],
    description: {
      pt: "Casa de temporada com piscina privativa, cozinha completa, varanda com vista e jardim amplo.",
      en: "Vacation home with private pool, full kitchen, veranda with view and large garden.",
      es: "Casa vacacional con piscina privativa, cocina completa, terraza con vista y jardín amplio.",
    },
    imageIndex: 3,
    website: "https://www.casapoema.com.br",
    longDescription: {
      pt: "A Casa Poema é um santuário de sossego no coração da Chapada dos Veadeiros, projetada com design moderno e minimalista em perfeita sintonia com a natureza. O café da manhã é 100% artesanal, produzido com itens frescos da estação — a maioria da própria horta — incluindo pães de fermentação natural, geleia de frutas, iogurte, granola, queijos e bolos. Arquitetura elegante com piscina privativa, cozinha completa, varanda com vista e jardim amplo.",
      en: "Casa Poema is a sanctuary of tranquility in the heart of Chapada dos Veadeiros, designed with a modern, minimalist aesthetic in perfect harmony with nature. Breakfast is 100% artisan, made with fresh seasonal items — mostly from their own garden — including sourdough bread, fruit jam, yogurt, granola, cheeses and cakes. Elegant architecture with private pool, full kitchen, veranda with view and large garden.",
      es: "Casa Poema es un santuario de tranquilidad en el corazón de Chapada dos Veadeiros, diseñada con estética moderna y minimalista en perfecta armonía con la naturaleza. El desayuno es 100% artesanal, preparado con ingredientes frescos de temporada — la mayoría de su propio huerto — incluyendo panes de fermentación natural, mermelada de frutas, yogur, granola, quesos y pasteles. Arquitectura elegante con piscina privativa, cocina completa, terraza con vista y jardín amplio.",
    },
  },
  {
    id: "casa-horizonte",
    name: "Casa Horizonte",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.100 – R$ 1.500",
    capacity: "2–4",
    units: 1,
    totalCapacity: 4,
    amenities: ["cozinha", "vista", "jardim", "pet", "piscina-aquecida", "sauna"],
    description: {
      pt: "Casa de temporada com cozinha equipada, varanda panorâmica, jardim privativo e pet friendly. Próxima ao centro.",
      en: "Vacation home with equipped kitchen, panoramic veranda, private garden and pet friendly. Close to downtown.",
      es: "Casa vacacional con cocina equipada, terraza panorámica, jardín privativo y pet friendly. Cerca del centro.",
    },
    imageIndex: 1,
  },
  {
    id: "casa-kanaro",
    name: "Casa Kanarô",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.200 – R$ 2.700",
    capacity: "4–6",
    units: 1,
    totalCapacity: 6,
    instagram: "casakanaro",
    amenities: ["ofuro", "cozinha", "jardim", "lareira", "varanda"],
    description: {
      pt: "Casa de temporada com ofurô privativo, acesso ao rio, cozinha completa, área de fogueira e jardim com terraço.",
      en: "Vacation home with private ofuro bath, river access, full kitchen, fire pit area and garden with terrace.",
      es: "Casa vacacional con ofuro privativo, acceso al río, cocina completa, área de fogata y jardín con terraza.",
    },
    imageIndex: 5,
    longDescription: {
      pt: "A Casa Kanarô é uma casa de temporada de alto padrão em Alto Paraíso, projetada para grupos de 4 a 6 hóspedes. O destaque é o ofurô privativo ao ar livre, perfeito para relaxar sob o céu estrelado do cerrado. A casa conta com acesso ao rio, área de fogueira, terraço amplo, jardim privativo e cozinha completa. O nome Kanarô remete à memória afetiva e ao pertencimento — uma casa que convida a ficar.",
      en: "Casa Kanarô is a high-standard vacation home in Alto Paraíso, designed for groups of 4 to 6 guests. The highlight is the private outdoor ofuro bath, perfect for relaxing under the starry cerrado sky. The house features river access, fire pit area, large terrace, private garden and full kitchen. The name Kanarô evokes affectionate memory and belonging — a house that invites you to stay.",
      es: "Casa Kanarô es una casa vacacional de alto estándar en Alto Paraíso, diseñada para grupos de 4 a 6 huéspedes. El punto destacado es el ofuro privativo al aire libre, perfecto para relajarse bajo el cielo estrellado del cerrado. La casa cuenta con acceso al río, área de fogata, terraza amplia, jardín privativo y cocina completa. El nombre Kanarô evoca memoria afectiva y pertenencia — una casa que invita a quedarse.",
    },
  },
  {
    id: "casa-alta",
    name: "Casa Alta",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.000 – R$ 1.500",
    capacity: "2",
    units: 1,
    totalCapacity: 2,
    instagram: "casaaltachapada",
    amenities: ["ofuro", "cozinha", "vista"],
    description: {
      pt: "Casa de temporada com design contemporâneo, ofurô privativo, cozinha equipada, vista para o cerrado e ambiente silencioso.",
      en: "Vacation home with contemporary design, private ofuro bath, equipped kitchen, cerrado view and quiet ambiance.",
      es: "Casa vacacional con diseño contemporáneo, ofuro privativo, cocina equipada, vista al cerrado y ambiente silencioso.",
    },
    imageIndex: 3,
    longDescription: {
      pt: "A Casa Alta é uma casa de temporada de design contemporâneo em Alto Paraíso, criada para casais que buscam exclusividade, silêncio e uma imersão estética na natureza. O ofurô privativo é o grande destaque — perfeito para banhos relaxantes com vista para o cerrado. Com cozinha equipada, decoração curada e ambiente de total privacidade, a Casa Alta entrega uma experiência de alto padrão integrada à paisagem do cerrado.",
      en: "Casa Alta is a contemporary design vacation home in Alto Paraíso, created for couples seeking exclusivity, silence and an aesthetic immersion in nature. The private ofuro bath is the main highlight — perfect for relaxing baths with cerrado views. With an equipped kitchen, curated decor and total privacy, Casa Alta delivers a high-standard experience integrated with the cerrado landscape.",
      es: "Casa Alta es una casa vacacional de diseño contemporáneo en Alto Paraíso, creada para parejas que buscan exclusividad, silencio e inmersión estética en la naturaleza. El ofuro privativo es el gran punto destacado — perfecto para baños relajantes con vista al cerrado. Con cocina equipada, decoración curada y ambiente de total privacidad, Casa Alta entrega una experiencia de alto estándar integrada al paisaje del cerrado.",
    },
  },
  {
    id: "mariri-jungle-lodge",
    name: "Mariri Jungle Lodge",
    region: "alto-paraiso",
    type: "lodge",
    priceRange: "R$ 900 – R$ 1.200",
    capacity: "2",
    units: 5,
    totalCapacity: 10,
    instagram: "maririjunglelodge",
    amenities: ["piscina", "restaurante", "energia-solar"],
    description: {
      pt: "Lodge ecológico com casas na árvore, piscina natural, restaurante vegan, trilhas e vivências. Energia solar.",
      en: "Ecological lodge with treehouses, natural pool, vegan restaurant, trails and experiences. Solar energy.",
      es: "Lodge ecológico con casas en los árboles, piscina natural, restaurante vegano, senderos y vivencias. Energía solar.",
    },
    imageIndex: 4,
    website: "https://www.maririjunglelodge.com",
    phone: "+55 61 3142-5662",
    bookingUrl: "https://www.maririjunglelodge.com/formulario-pre-reserva",
    longDescription: {
      pt: "O Mariri Jungle Lodge é um lodge ecológico em Alto Paraíso que oferece casas na árvore, retiros temáticos e day use. Integrado ao Santuário Silvestre Mariri, o espaço funciona com energia solar e conta com piscina natural, restaurante com culinária vegan, trilhas e vivências na natureza. Espaço LGBTQIAPN+ friendly com programação regular de retiros de yoga, meditação e reconexão.",
      en: "Mariri Jungle Lodge is an ecological lodge in Alto Paraíso offering treehouses, themed retreats and day use. Integrated with the Mariri Wildlife Sanctuary, the space runs on solar energy and features a natural pool, restaurant with vegan cuisine, trails and nature experiences. LGBTQIAPN+ friendly space with regular yoga, meditation and reconnection retreats.",
      es: "Mariri Jungle Lodge es un lodge ecológico en Alto Paraíso que ofrece casas en los árboles, retiros temáticos y day use. Integrado al Santuario Silvestre Mariri, el espacio funciona con energía solar y cuenta con piscina natural, restaurante con cocina vegana, senderos y vivencias en la naturaleza. Espacio LGBTQIAPN+ friendly con programación regular de retiros de yoga, meditación y reconexión.",
    },
  },
  {
    id: "vila-komorebi",
    name: "Vila Komorebí",
    region: "alto-paraiso",
    type: "chale",
    priceRange: "R$ 600 – R$ 800",
    capacity: "2–4",
    units: 3,
    totalCapacity: 8,
    amenities: ["piscina-privada", "cozinha", "vista", "jardim", "pet", "varanda"],
    description: {
      pt: "Chalés com piscina no rooftop, cozinha completa, varanda com vista, jardim privativo e pet friendly.",
      en: "Chalets with rooftop pool, full kitchen, veranda with view, private garden and pet friendly.",
      es: "Chalés con piscina en rooftop, cocina completa, terraza con vista, jardín privativo y pet friendly.",
    },
    imageIndex: 2,
    longDescription: {
      pt: "A Vila Komorebí — palavra japonesa que descreve a luz do sol filtrada pelas folhas das árvores — é um conjunto de chalés privativos em Alto Paraíso com uma piscina panorâmica no rooftop. Cada chalé conta com cozinha completa, varanda com vista para o cerrado e jardim privativo. O espaço é pet friendly e oferece acomodações para 2 a 4 pessoas em um ambiente de tranquilidade e beleza natural.",
      en: "Vila Komorebí — a Japanese word describing sunlight filtered through tree leaves — is a set of private chalets in Alto Paraíso featuring a panoramic rooftop pool. Each chalet includes a full kitchen, veranda with cerrado views and private garden. The space is pet friendly and offers accommodations for 2 to 4 people in an environment of tranquility and natural beauty.",
      es: "Vila Komorebí — palabra japonesa que describe la luz del sol filtrada por las hojas de los árboles — es un conjunto de chalés privativos en Alto Paraíso con piscina panorámica en el rooftop. Cada chalé cuenta con cocina completa, terraza con vista al cerrado y jardín privativo. El espacio es pet friendly y ofrece alojamiento para 2 a 4 personas en un ambiente de tranquilidad y belleza natural.",
    },
  },
  {
    id: "casa-de-shiva",
    name: "Pousada Casa de Shiva",
    region: "alto-paraiso",
    type: "pousada",
    priceRange: "R$ 500 – R$ 800",
    capacity: "2",
    units: 6,
    totalCapacity: 12,
    instagram: "pousadacasadeshivaoficial",
    amenities: ["piscina-aquecida", "spa", "sauna", "vista", "cafe"],
    description: {
      pt: "Pousada com piscina aquecida, suítes com sauna e spa, vista panorâmica e café da manhã à la carte.",
      en: "Inn with heated pool, suites with sauna and spa, panoramic views and à la carte breakfast.",
      es: "Posada con piscina climatizada, suites con sauna y spa, vista panorámica y desayuno a la carta.",
    },
    imageIndex: 6,
    website: "https://pousadacasadeshiva.com",
    longDescription: {
      pt: "Shiva representa a energia da renovação, o fogo que destrói para abrir novos caminhos. Com este espírito, a Casa de Shiva é um santuário de beleza, conforto e bem-estar em meio à paisagem da Chapada dos Veadeiros. Um refúgio para esquecer as preocupações, o barulho da cidade e a rotina, reconectando-se à natureza. Piscina aquecida, suítes com sauna e spa, vista panorâmica e café da manhã à la carte.",
      en: "Shiva represents the energy of renewal, the fire that destroys to open new paths. With this spirit, Casa de Shiva is a sanctuary of beauty, comfort and well-being amidst the landscape of Chapada dos Veadeiros. A retreat to forget worries, city noise and routine, reconnecting with nature. Heated pool, suites with sauna and spa, panoramic views and à la carte breakfast.",
      es: "Shiva representa la energía de la renovación, el fuego que destruye para abrir nuevos caminos. Con este espíritu, Casa de Shiva es un santuario de belleza, confort y bienestar en medio del paisaje de Chapada dos Veadeiros. Un refugio para olvidar preocupaciones, el ruido de la ciudad y la rutina, reconectándose con la naturaleza. Piscina climatizada, suites con sauna y spa, vista panorámica y desayuno a la carta.",
    },
  },
  {
    id: "morro-da-luz",
    name: "Morro da Luz",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 500 – R$ 1.500",
    capacity: "2–12",
    units: 4,
    totalCapacity: 12,
    amenities: ["piscina-aquecida", "vista", "ofuro", "cozinha"],
    description: {
      pt: "Casas e bangalôs com piscina aquecida, vista panorâmica, ofurô e cozinha completa. Opção de chef.",
      en: "Houses and bungalows with heated pool, panoramic views, ofuro bath and full kitchen. Chef option available.",
      es: "Casas y bungalows con piscina climatizada, vista panorámica, ofuro y cocina completa. Opción de chef.",
    },
    imageIndex: 1,
    website: "https://www.morrodaluz.com",
  },
  {
    id: "marleys-house",
    name: "Marley's House",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 1.000 – R$ 1.200",
    capacity: "2–4",
    units: 1,
    totalCapacity: 4,
    instagram: "marleys.house",
    amenities: ["cafe", "vista", "cozinha", "jardim"],
    description: {
      pt: "Casa de temporada com vista ampla do cerrado, jardim, cozinha equipada e café da manhã incluso. Atmosfera leve e descontraída.",
      en: "Vacation home with wide cerrado views, garden, equipped kitchen and breakfast included. Light and relaxed atmosphere.",
      es: "Casa vacacional con vista amplia del cerrado, jardín, cocina equipada y desayuno incluido. Atmósfera ligera y relajada.",
    },
    imageIndex: 2,
    longDescription: {
      pt: "A Marley's House é uma casa de temporada com o espírito vibrante e acolhedor do nome que carrega. Em Alto Paraíso, oferece uma vista ampla para o cerrado, jardim privativo, cozinha completamente equipada e café da manhã incluso preparado com carinho. Com atmosfera leve, artística e descontraída, é o espaço ideal para casais e pequenos grupos que buscam uma experiência autêntica e cheia de personalidade na Chapada dos Veadeiros.",
      en: "Marley's House is a vacation home with the vibrant and welcoming spirit of its name. In Alto Paraíso, it offers wide cerrado views, a private garden, fully equipped kitchen and an affectionately prepared breakfast included. With a light, artistic and relaxed atmosphere, it is the ideal space for couples and small groups seeking an authentic and personality-filled experience in Chapada dos Veadeiros.",
      es: "Marley's House es una casa vacacional con el espíritu vibrante y acogedor del nombre que lleva. En Alto Paraíso, ofrece una vista amplia al cerrado, jardín privativo, cocina completamente equipada y desayuno incluido preparado con cariño. Con atmósfera ligera, artística y relajada, es el espacio ideal para parejas y grupos pequeños que buscan una experiencia auténtica y llena de personalidad en Chapada dos Veadeiros.",
    },
  },
  {
    id: "nossa-casa-arvore",
    name: "A Nossa Casa da Árvore",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 900 – R$ 1.100",
    capacity: "2",
    units: 1,
    totalCapacity: 2,
    instagram: "anossacasadaarvore",
    amenities: ["hidro", "cozinha", "vista", "varanda"],
    description: {
      pt: "Casa com vista para o cerrado, jacuzzi ao ar livre, cozinha equipada, total privacidade e silêncio. Varanda panorâmica.",
      en: "House with cerrado views, outdoor jacuzzi, equipped kitchen, total privacy and silence. Panoramic veranda.",
      es: "Casa con vista al cerrado, jacuzzi al aire libre, cocina equipada, total privacidad y silencio. Terraza panorámica.",
    },
    imageIndex: 4,
    longDescription: {
      pt: "A Nossa Casa da Árvore é uma experiência única de hospedagem em Alto Paraíso: uma casa íntima com varanda panorâmica e jacuzzi ao ar livre, criada para quem deseja total privacidade, silêncio e imersão na paisagem do cerrado. Com cozinha equipada e design que dialoga com a natureza ao redor, é perfeita para casais em busca de romantismo e reconexão. Ao cair da noite, o céu estrelado do cerrado é o espetáculo.",
      en: "A Nossa Casa da Árvore is a unique accommodation experience in Alto Paraíso: an intimate house with a panoramic veranda and outdoor jacuzzi, created for those who desire total privacy, silence and immersion in the cerrado landscape. With an equipped kitchen and design that dialogues with surrounding nature, it is perfect for couples seeking romance and reconnection. At nightfall, the starry cerrado sky is the spectacle.",
      es: "A Nossa Casa da Árvore es una experiencia única de hospedaje en Alto Paraíso: una casa íntima con terraza panorámica y jacuzzi al aire libre, creada para quienes desean total privacidad, silencio e inmersión en el paisaje del cerrado. Con cocina equipada y diseño que dialoga con la naturaleza circundante, es perfecta para parejas en busca de romanticismo y reconexión. Al caer la noche, el cielo estrellado del cerrado es el espectáculo.",
    },
  },
  {
    id: "vila-libelula",
    name: "Vila Libélula",
    region: "alto-paraiso",
    type: "casa",
    priceRange: "R$ 600 – R$ 800",
    capacity: "2",
    units: 1,
    totalCapacity: 2,
    instagram: "vilalibelula",
    amenities: ["hidro", "vista", "cozinha", "varanda"],
    description: {
      pt: "Casa intimista na natureza, ambiente acolhedor com banheira de hidromassagem, varanda com vista e cozinha completa.",
      en: "Intimate house in nature, welcoming ambiance with hot tub, veranda with view and full kitchen.",
      es: "Casa intimista en la naturaleza, ambiente acogedor con bañera de hidromasaje, terraza con vista y cocina completa.",
    },
    imageIndex: 6,
    longDescription: {
      pt: "A Vila Libélula — inspirada na leveza e graça da libélula, símbolo de transformação — é uma casa intimista em Alto Paraíso rodeada pela natureza exuberante do cerrado. Com banheira de hidromassagem privativa, varanda panorâmica e cozinha completa, o espaço oferece todo o conforto em um ambiente acolhedor e discreto. Ideal para casais que buscam descanso, privacidade e a magia silenciosa da natureza da Chapada.",
      en: "Vila Libélula — inspired by the lightness and grace of the dragonfly, symbol of transformation — is an intimate house in Alto Paraíso surrounded by the lush cerrado nature. With a private hot tub, panoramic veranda and full kitchen, the space offers all the comfort in a welcoming and discreet environment. Ideal for couples seeking rest, privacy and the silent magic of Chapada's nature.",
      es: "Vila Libélula — inspirada en la ligereza y gracia de la libélula, símbolo de transformación — es una casa intimista en Alto Paraíso rodeada por la exuberante naturaleza del cerrado. Con bañera de hidromasaje privativa, terraza panorámica y cocina completa, el espacio ofrece todo el confort en un ambiente acogedor y discreto. Ideal para parejas que buscan descanso, privacidad y la magia silenciosa de la naturaleza de la Chapada.",
    },
  },

  // ========== SÃO JORGE ==========
  {
    id: "amana-hotel",
    name: "Amaná Hotel",
    region: "sao-jorge",
    type: "lodge",
    priceRange: "R$ 1.000 – R$ 2.000",
    capacity: "2",
    units: 10,
    totalCapacity: 20,
    instagram: "amanahotelchapada",
    amenities: ["piscina-aquecida", "restaurante", "spa", "sauna", "hidro", "beach-tenis", "academia", "cachoeira-privada", "ar-condicionado", "cafe", "estacionamento"],
    description: {
      pt: "Hotel com bangalôs exclusivos, piscina aquecida com vista, restaurante próprio, spa, sauna e cachoeira com trilha privada.",
      en: "Hotel with exclusive bungalows, heated pool with view, own restaurant, spa, sauna and waterfall with private trail.",
      es: "Hotel con bungalows exclusivos, piscina climatizada con vista, restaurante propio, spa, sauna y cascada con sendero privado.",
    },
    imageIndex: 1,
    website: "https://amanahotelchapada.com",
    phone: "+55 61 99508-0641",
    bookingUrl: "https://amanahotelchapada.com/reservas",
    longDescription: {
      pt: "O Amaná Hotel é um refúgio de luxo em São Jorge com bangalôs exclusivos em três categorias — Amaná (85m²), Angaturama (68m²) e Aneci (62m²). Cada bangalô conta com cama Super King, rouparia Trousseau de 600 fios e máquina Nespresso. O hotel oferece piscina aquecida de 20 metros, cachoeiras privadas com trilhas exclusivas, spa completo, sauna, quadra de beach tênis, fitness center e lounge de eventos. Restaurante com gastronomia autoral e café da manhã incluso.",
      en: "Amaná Hotel is a luxury retreat in São Jorge with exclusive bungalows in three categories — Amaná (85m²), Angaturama (68m²) and Aneci (62m²). Each bungalow features a Super King bed, Trousseau 600-thread linens and Nespresso machine. The hotel offers a 20-meter heated pool, private waterfalls with exclusive trails, full spa, sauna, beach tennis court, fitness center and event lounge. Restaurant with signature cuisine and breakfast included.",
      es: "El Amaná Hotel es un refugio de lujo en São Jorge con bungalows exclusivos en tres categorías — Amaná (85m²), Angaturama (68m²) y Aneci (62m²). Cada bungalow cuenta con cama Super King, ropa de cama Trousseau de 600 hilos y máquina Nespresso. El hotel ofrece piscina climatizada de 20 metros, cascadas privadas con senderos exclusivos, spa completo, sauna, cancha de beach tenis, fitness center y lounge de eventos. Restaurante con gastronomía autoral y desayuno incluido.",
    },
  },
  {
    id: "bagua-bangalos",
    name: "Baguá Bangalôs",
    region: "sao-jorge",
    type: "chale",
    priceRange: "R$ 800 – R$ 2.000",
    capacity: "2",
    units: 20,
    totalCapacity: 40,
    instagram: "baguabangalos",
    amenities: ["piscina", "sauna", "hidro", "cafe", "lareira", "ar-condicionado"],
    description: {
      pt: "Bangalôs privativos com piscina com vista para o cerrado, sauna e hidromassagem ao ar livre, lounge com fogueira e café da manhã.",
      en: "Private bungalows with cerrado view pool, outdoor sauna and hot tub, fireplace lounge and breakfast.",
      es: "Bungalows privativos con piscina con vista al cerrado, sauna e hidromasaje al aire libre, lounge con fogata y desayuno.",
    },
    imageIndex: 5,
    website: "https://baguabangalos.com.br",
    bookingUrl: "https://baguabangalos.com.br/reservas",
    longDescription: {
      pt: "O Baguá Bangalôs é um refúgio em São Jorge com 16 bangalôs e 4 cabanas em diversas categorias — Loft, Panorama (140m²), Baguá (82m²), Safari (72m²), Preguiça (100m²), Cerrado (60m²), Cabana Zazu, João de Barro e Casa Maria. O espaço conta com piscina com vista para o cerrado, sauna a vapor, jacuzzi ao ar livre, lounge com fogueira e café da manhã incluso. Cada unidade oferece privacidade e integração com a paisagem do cerrado.",
      en: "Baguá Bangalôs is a retreat in São Jorge with 16 bungalows and 4 cabins in various categories — Loft, Panorama (140m²), Baguá (82m²), Safari (72m²), Preguiça (100m²), Cerrado (60m²), Cabana Zazu, João de Barro and Casa Maria. The space features a pool with cerrado views, steam sauna, outdoor jacuzzi, fire pit lounge and breakfast included. Each unit offers privacy and integration with the cerrado landscape.",
      es: "Baguá Bangalôs es un refugio en São Jorge con 16 bungalows y 4 cabañas en diversas categorías — Loft, Panorama (140m²), Baguá (82m²), Safari (72m²), Preguiça (100m²), Cerrado (60m²), Cabana Zazu, João de Barro y Casa Maria. El espacio cuenta con piscina con vista al cerrado, sauna de vapor, jacuzzi al aire libre, lounge con fogata y desayuno incluido. Cada unidad ofrece privacidad e integración con el paisaje del cerrado.",
    },
  },
  {
    id: "refugio-veadeiros",
    name: "Refúgio Veadeiros",
    region: "sao-jorge",
    type: "casa",
    priceRange: "R$ 900 – R$ 1.100",
    capacity: "2",
    units: 2,
    totalCapacity: 4,
    instagram: "refugioveadeiros",
    amenities: ["vista", "hidro", "cozinha"],
    description: {
      pt: "Containers transformados em suítes com vista panorâmica do cerrado, banheira de hidromassagem e cozinha equipada. Privacidade total.",
      en: "Containers transformed into suites with panoramic cerrado view, hot tub and equipped kitchen. Total privacy.",
      es: "Containers transformados en suites con vista panorámica del cerrado, bañera de hidromasaje y cocina equipada. Total privacidad.",
    },
    imageIndex: 3,
  },

  // ========== CAVALCANTE ==========
  {
    id: "terra-gaia",
    name: "Terra Gaia",
    region: "cavalcante",
    type: "chale",
    priceRange: "R$ 500 – R$ 800",
    capacity: "2–8",
    units: 3,
    totalCapacity: 6,
    instagram: "terragaia.chapada",
    amenities: ["piscina", "vista", "ofuro", "cozinha", "cafe", "energia-solar", "varanda"],
    description: {
      pt: "Retiro com chalés, suítes espaçosas, piscina com vista para o cerrado e espaços de descanso e contemplação.",
      en: "Retreat with chalets, spacious suites, pool with cerrado view and relaxation and contemplation spaces.",
      es: "Retiro con chalés, suites espaciosas, piscina con vista al cerrado y espacios de descanso y contemplación.",
    },
    imageIndex: 6,
    website: "https://terragaiapousada.com.br",
    phone: "+55 61 99818-1220",
    longDescription: {
      pt: "A Terra Gaia é um refúgio sustentável em Cavalcante com 3 chalés iguais, cada um com quarto, banheiro, cozinha, deck/varanda e ofurô rústico de pedra com água aquecida. A piscina natural, sem produtos químicos e com pedras no fundo, mantém o aspecto de cachoeira com conforto. O espaço funciona com energia solar e água própria, oferecendo café da manhã com deliciosas opções regionais.",
      en: "Terra Gaia is a sustainable retreat in Cavalcante with 3 identical chalets, each with bedroom, bathroom, kitchen, deck/veranda and rustic stone ofuro with heated water. The natural pool, chemical-free with stone bottom, maintains a waterfall feel with comfort. The space runs on solar energy and has its own water source, offering breakfast with delicious regional options.",
      es: "Terra Gaia es un refugio sustentable en Cavalcante con 3 chalés iguales, cada uno con habitación, baño, cocina, deck/terraza y ofuro rústico de piedra con agua caliente. La piscina natural, sin productos químicos y con piedras en el fondo, mantiene el aspecto de cascada con confort. El espacio funciona con energía solar y agua propia, ofreciendo desayuno con deliciosas opciones regionales.",
    },
  },
];

// Helpers
export const getAccRegions = (): AccRegion[] => ["alto-paraiso", "sao-jorge", "cavalcante"];
export const getAccTypes = (): AccType[] => ["pousada", "chale", "casa", "lodge"];

export const filterAccommodations = (
  regions?: AccRegion[],
  types?: AccType[],
  searchQuery?: string,
  priceMax?: number,
  amenities?: Amenity[],
  unitsMin?: number,
  capacityMin?: number,
  list: Accommodation[] = accommodations
): Accommodation[] => {
  const query = searchQuery?.trim().toLowerCase() || "";
  return list.filter((a) => {
    if (regions && regions.length > 0 && !regions.includes(a.region)) return false;
    if (types && types.length > 0 && !types.includes(a.type)) return false;
    if (query && !a.name.toLowerCase().includes(query)) return false;
    if (priceMax) {
      const [lo] = parsePriceRange(a.priceRange);
      if (lo > priceMax) return false;
    }
    if (amenities && amenities.length > 0) {
      if (!amenities.every((am) => a.amenities.includes(am))) return false;
    }
    if (unitsMin != null && a.units < unitsMin) return false;
    if (capacityMin != null && a.totalCapacity < capacityMin) return false;
    return true;
  });
};
