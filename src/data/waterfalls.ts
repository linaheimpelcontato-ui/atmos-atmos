import { type Language } from "@/contexts/LanguageContext";

export type Region = "alto-paraiso" | "sao-jorge" | "sao-joao" | "cavalcante" | "kalunga";
export type Difficulty = "facil" | "moderado" | "dificil";
export type Seasonality = "chuva" | "seca" | "anual";

export interface Waterfall {
  id: string;
  name: Record<Language, string>;
  region: Region;
  difficulty: Difficulty;
  seasonality: Seasonality;
  distanceKm: number;
  distanceCarKm: number;
  requiresGuide: boolean;
  requires4x4?: boolean;
  description: Record<Language, string>;
  imageIndex: number; // 1-6 for placeholder images
  storageId?: string;
}

export const regionLabels: Record<Region, Record<Language, string>> = {
  "alto-paraiso": { pt: "Alto Paraíso", en: "Alto Paraíso", es: "Alto Paraíso" },
  "sao-jorge": { pt: "São Jorge", en: "São Jorge", es: "São Jorge" },
  "sao-joao": { pt: "São João d'Aliança", en: "São João d'Aliança", es: "São João d'Aliança" },
  "cavalcante": { pt: "Cavalcante", en: "Cavalcante", es: "Cavalcante" },
  "kalunga": { pt: "Território Kalunga", en: "Kalunga Territory", es: "Territorio Kalunga" },
};

export const regionDescriptions: Record<Region, Record<Language, string>> = {
  "alto-paraiso": {
    pt: "Alto Paraíso está localizado na região centro-sul da Chapada dos Veadeiros, a aproximadamente 230 km de Brasília. É o município com a melhor estrutura urbana da Chapada, contando com ampla rede de hospedagem, restaurantes, mercados, farmácias, agências e serviços. Excelente ponto de apoio logístico para deslocamentos rumo a São Jorge, Cavalcante ou São João d'Aliança.",
    en: "Alto Paraíso is located in the south-central region of Chapada dos Veadeiros, approximately 230 km from Brasília. It is the municipality with the best urban infrastructure in the Chapada, with a wide network of accommodation, restaurants, markets, pharmacies, agencies and services. Excellent logistics hub for trips to São Jorge, Cavalcante or São João d'Aliança.",
    es: "Alto Paraíso está ubicado en la región centro-sur de Chapada dos Veadeiros, a aproximadamente 230 km de Brasilia. Es el municipio con la mejor infraestructura urbana de la Chapada, con una amplia red de hospedaje, restaurantes, mercados, farmacias, agencias y servicios. Excelente punto de apoyo logístico para desplazamientos hacia São Jorge, Cavalcante o São João d'Aliança.",
  },
  "sao-jorge": {
    pt: "A Vila de São Jorge está localizada no oeste da Chapada dos Veadeiros, dentro do município de Alto Paraíso e a 36 km do centro da cidade. É a porta de entrada oficial para o Parque Nacional, oferecendo acesso direto a trilhas como Saltos, Cânions e Carrossel. Menos urbana e mais rústica, tem infraestrutura básica e uma atmosfera mais tranquila, voltada ao ecoturismo e à contemplação.",
    en: "Vila de São Jorge is located in the west of Chapada dos Veadeiros, within the municipality of Alto Paraíso, 36 km from the city center. It is the official gateway to the National Park, offering direct access to trails such as Saltos, Cânions and Carrossel. Less urban and more rustic, it has basic infrastructure and a quieter atmosphere, focused on ecotourism and contemplation.",
    es: "La Vila de São Jorge está ubicada al oeste de Chapada dos Veadeiros, dentro del municipio de Alto Paraíso, a 36 km del centro de la ciudad. Es la puerta de entrada oficial al Parque Nacional, ofreciendo acceso directo a senderos como Saltos, Cañones y Carrossel. Menos urbana y más rústica, tiene infraestructura básica y una atmósfera más tranquila, enfocada en el ecoturismo y la contemplación.",
  },
  "sao-joao": {
    pt: "Situado ao sul da Chapada, a cerca de 160 km de Brasília, sendo o município mais próximo da capital federal. Tem acesso rápido por estrada asfaltada e está se consolidando como nova fronteira do ecoturismo na região. Boa opção para quem deseja fazer bate-volta de Brasília ou explorar novos roteiros com menor fluxo de visitantes.",
    en: "Located in the south of the Chapada, about 160 km from Brasília, it is the closest municipality to the federal capital. It has quick access via paved roads and is establishing itself as a new ecotourism frontier in the region. Good option for those who want to take day trips from Brasília or explore new routes with fewer visitors.",
    es: "Situado al sur de la Chapada, a unos 160 km de Brasilia, siendo el municipio más cercano a la capital federal. Tiene acceso rápido por carretera asfaltada y se está consolidando como nueva frontera del ecoturismo en la región. Buena opción para quien desea hacer excursiones desde Brasilia o explorar nuevas rutas con menor flujo de visitantes.",
  },
  "cavalcante": {
    pt: "Localizada no norte da Chapada, a cerca de 320 km de Brasília. Abriga algumas das cachoeiras mais famosas do Cerrado, como Ponte de Pedra, Canjica e Catoá. A infraestrutura é mais limitada, mas ainda conta com boas opções de hospedagem e alimentação. Ideal para quem busca vivenciar experiências mais remotas.",
    en: "Located in the north of the Chapada, about 320 km from Brasília. It is home to some of the most famous waterfalls in the Cerrado, such as Ponte de Pedra, Canjica and Catoá. Infrastructure is more limited but still has good accommodation and dining options. Ideal for those seeking more remote experiences.",
    es: "Ubicada al norte de la Chapada, a unos 320 km de Brasilia. Alberga algunas de las cascadas más famosas del Cerrado, como Ponte de Pedra, Canjica y Catoá. La infraestructura es más limitada, pero aún cuenta con buenas opciones de hospedaje y alimentación. Ideal para quienes buscan vivir experiencias más remotas.",
  },
  "kalunga": {
    pt: "Região rural localizada no Território Kalunga, a cerca de 25 km de Cavalcante. É a base para visitar atrações como Santa Bárbara, Candaru e Capivara. A área é a maior comunidade quilombola do país, com importância histórica e cultural. Infraestrutura básica e acesso mais limitado, ideal para quem busca imersão autêntica e experiências guiadas com foco cultural.",
    en: "Rural region located in the Kalunga Territory, about 25 km from Cavalcante. It is the base for visiting attractions such as Santa Bárbara, Candaru and Capivara. The area is the largest quilombola community in the country, with historical and cultural importance. Basic infrastructure and limited access, ideal for those seeking authentic immersion and guided cultural experiences.",
    es: "Región rural ubicada en el Territorio Kalunga, a unos 25 km de Cavalcante. Es la base para visitar atracciones como Santa Bárbara, Candaru y Capivara. El área es la mayor comunidad quilombola del país, con importancia histórica y cultural. Infraestructura básica y acceso limitado, ideal para quienes buscan inmersión auténtica y experiencias guiadas con enfoque cultural.",
  },
};

export const difficultyLabels: Record<Difficulty, Record<Language, string>> = {
  facil: { pt: "Fácil", en: "Easy", es: "Fácil" },
  moderado: { pt: "Moderado", en: "Moderate", es: "Moderado" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil" },
};

export const seasonalityLabels: Record<Seasonality, Record<Language, string>> = {
  chuva: { pt: "Chuva", en: "Rain", es: "Lluvia" },
  seca: { pt: "Seca", en: "Dry", es: "Seca" },
  anual: { pt: "Anual", en: "Year-round", es: "Anual" },
};

export const waterfalls: Waterfall[] = [
  // ========== 01 — ALTO PARAÍSO (14) ==========
  {
    id: "almecegas-sao-bento",
    name: { pt: "Almécegas I e II & São Bento", en: "Almécegas I & II + São Bento", es: "Almécegas I y II y São Bento" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 32,
    requiresGuide: false,
    description: {
      pt: "Localizadas na Fazenda São Bento, as cachoeiras Almécegas I e II e São Bento formam um dos conjuntos mais visitados da Chapada dos Veadeiros. Almécegas I impressiona pela queda de aproximadamente 45 metros, cercada por paredões de rocha e vegetação densa. Almécegas II tem acesso mais fácil e forma um poço amplo e raso, ideal para banho. São Bento complementa o passeio com uma queda menor em ambiente tranquilo. A fazenda oferece boa estrutura de recepção ao visitante.",
      en: "Complex with three waterfalls on private property. Almécegas I has a 45m drop and Almécegas II is more accessible with a shallow pool.",
      es: "Complejo con tres cascadas en propiedad privada. Almécegas I tiene caída de 45m y Almécegas II es más accesible con pozo poco profundo.",
    },
    imageIndex: 1,
  },
  {
    id: "alpes-goianos",
    name: { pt: "Alpes Goianos", en: "Alpes Goianos", es: "Alpes Goianos" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 2,
    distanceCarKm: 70,
    requiresGuide: false,
    description: {
      pt: "Os Alpes Goianos recebem esse nome por causa da paisagem de campos de altitude que lembra os cenários montanhosos europeus. A cachoeira surge em meio a um vale amplo, com vegetação rasteira e formações rochosas que criam um visual único na Chapada. O acesso é por estrada de terra e trilha relativamente curta. O cenário aberto e a luz natural tornam o lugar especialmente fotogênico. É uma boa opção para quem busca paisagens diferentes das trilhas mais tradicionais.",
      en: "Highland landscape reminiscent of the European Alps. Waterfall in an open and stunning setting.",
      es: "Paisaje de campos de altitud con visual que recuerda a los Alpes europeos. Cascada en escenario abierto y deslumbrante.",
    },
    imageIndex: 4,
  },
  {
    id: "caracol",
    name: { pt: "Caracol", en: "Caracol", es: "Caracol" },
    region: "alto-paraiso",
    difficulty: "moderado",
    seasonality: "seca",
    distanceKm: 3,
    distanceCarKm: 38,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira do Caracol é formada por uma queda que desce em formato espiralado entre as rochas, criando um visual singular. O acesso é feito por trilha que exige atenção em alguns trechos e a presença de guia é obrigatória. Na época de seca, o volume de água diminui mas o cenário continua impressionante. As formações rochosas ao redor reforçam o caráter geológico do lugar. É uma cachoeira que chama a atenção pela originalidade da queda.",
      en: "Spiral-shaped waterfall between rocks. Access during dry season with mandatory guide.",
      es: "Cascada en formato espiral entre rocas. Acceso en época seca con guía obligatorio.",
    },
    imageIndex: 6,
  },
  {
    id: "couros",
    name: { pt: "Couros", en: "Couros", es: "Couros" },
    region: "alto-paraiso",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 5,
    distanceCarKm: 100,
    requiresGuide: false,
    description: {
      pt: "O Complexo do Rio dos Couros reúne algumas das maiores quedas d'água da Chapada dos Veadeiros. A sequência de cachoeiras inclui a Muralha, a Almécegas 1000 e outras quedas que ultrapassam 100 metros de altura. O cenário é grandioso, com paredões de rocha e vales profundos que se revelam ao longo da trilha. O acesso envolve estrada de terra longa e caminhada moderada. É considerado um dos atrativos mais impressionantes da região.",
      en: "The largest waterfalls in the Chapada. Sequence of waterfalls over 100m high in a grandiose setting.",
      es: "Las mayores caídas de agua de la Chapada. Secuencia de cascadas con más de 100m de altura en escenario grandioso.",
    },
    imageIndex: 4,
  },
  {
    id: "loquinhas",
    name: { pt: "Loquinhas", en: "Loquinhas", es: "Loquinhas" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 3,
    distanceCarKm: 10,
    requiresGuide: false,
    description: {
      pt: "A Cachoeira das Loquinhas é um dos atrativos mais acessíveis e populares da Chapada dos Veadeiros. O percurso é feito por passarelas de madeira que conectam diferentes poços naturais ao longo do rio. As piscinas têm águas cristalinas e são rasas o suficiente para banho tranquilo. O ambiente é bem preservado e conta com estrutura de recepção ao visitante. É uma excelente opção para famílias, crianças e quem busca um passeio leve.",
      en: "Complex of natural pools connected by wooden walkways. Perfect for families and relaxing swims.",
      es: "Complejo de pozos naturales conectados por pasarelas de madera. Perfecta para familias y baños relajantes.",
    },
    imageIndex: 2,
  },
  {
    id: "papagaio",
    name: { pt: "Papagaio", en: "Papagaio", es: "Papagaio" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 2,
    distanceCarKm: 70,
    requiresGuide: false,
    description: {
      pt: "A Cachoeira do Papagaio está situada em área de cerrado preservado, com acesso relativamente fácil por trilha curta. A queda forma um poço agradável para banho em meio à vegetação nativa. O cenário é tranquilo e o local costuma ter menos visitantes que outros atrativos da região. É uma boa opção para meio de tarde ou para combinar com outros passeios próximos. A paisagem ao redor complementa a experiência com a beleza típica do cerrado.",
      en: "Easy-access waterfall in a preserved cerrado setting. Good option for mid-afternoon.",
      es: "Cascada de fácil acceso en escenario preservado del cerrado. Buena opción para media tarde.",
    },
    imageIndex: 5,
  },
  {
    id: "sertao-zen",
    name: { pt: "Sertão Zen", en: "Sertão Zen", es: "Sertão Zen" },
    region: "alto-paraiso",
    difficulty: "dificil",
    seasonality: "chuva",
    distanceKm: 18,
    distanceCarKm: 10,
    requiresGuide: true,
    description: {
      pt: "O Sertão Zen é um atrativo conhecido pela trilha longa e desafiadora que atravessa paisagens diversas do Cerrado. O percurso revela cachoeiras espetaculares que ganham volume e intensidade na época de chuva. A caminhada exige preparo físico e a presença de guia é obrigatória. Ao longo do caminho surgem formações rochosas, veredas e trechos de mata preservada. É uma experiência intensa, indicada para quem busca aventura e contato profundo com a natureza.",
      en: "Long and challenging trail leading to spectacular waterfalls during the rainy season. Intense and wild experience.",
      es: "Sendero largo y desafiante que lleva a cascadas espectaculares en la época de lluvias. Experiencia intensa y salvaje.",
    },
    imageIndex: 3,
  },
  {
    id: "simao-correia",
    name: { pt: "Simão Correia", en: "Simão Correia", es: "Simão Correia" },
    region: "alto-paraiso",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 12,
    distanceCarKm: 70,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira Simão Correia apresenta uma queda remota acessível por trilha exigente que atravessa áreas preservadas do Cerrado. O percurso demanda preparo físico e a presença de guia é obrigatória. A cachoeira se destaca pelo cenário isolado e pela força da água que desce entre rochas. O ambiente transmite uma sensação de natureza intocada, longe dos roteiros mais movimentados. É uma opção para visitantes experientes que buscam desafio e exclusividade.",
      en: "Demanding trail with a remote waterfall. Requires physical fitness and mandatory guide.",
      es: "Sendero exigente con cascada remota. Requiere preparación física y guía obligatorio.",
    },
    imageIndex: 6,
  },
  {
    id: "agua-fria",
    name: { pt: "Água Fria", en: "Água Fria", es: "Água Fria" },
    region: "alto-paraiso",
    difficulty: "dificil",
    seasonality: "chuva",
    distanceKm: 4,
    distanceCarKm: 18,
    requiresGuide: false,
    description: {
      pt: "A Cachoeira Água Fria está localizada próxima a Alto Paraíso e é acessível na época de chuva. A trilha é relativamente curta mas conta com trechos técnicos que exigem atenção. A água é gelada e forma um poço cercado por rochas e vegetação densa. O cenário é bastante preservado e o ambiente transmite frescor mesmo nos dias mais quentes. É uma boa opção para quem busca uma cachoeira próxima com caráter aventureiro.",
      en: "Cold-water waterfall accessible during the rainy season. Short trail but with technical sections.",
      es: "Cascada de aguas heladas accesible en la época de lluvias. Sendero corto pero con tramos técnicos.",
    },
    imageIndex: 3,
  },
  {
    id: "urucum-coca-cola",
    name: { pt: "Urucum | Coca Cola", en: "Urucum | Coca Cola", es: "Urucum | Coca Cola" },
    region: "alto-paraiso",
    difficulty: "dificil",
    seasonality: "chuva",
    distanceKm: 3,
    distanceCarKm: 70,
    requiresGuide: true,
    description: {
      pt: "As cachoeiras Urucum e Coca-Cola são conhecidas pela coloração avermelhada da água, resultado do tanino liberado pelas plantas do Cerrado. O visual é único e especialmente impactante na época de chuva, quando o volume de água aumenta. O acesso exige guia obrigatório e a trilha atravessa áreas de vegetação densa. As formações rochosas ao redor complementam o cenário com tons contrastantes. É uma experiência diferente de tudo que se encontra na Chapada.",
      en: "Waterfall with reddish waters from cerrado plant tannins. Unique and impactful visual during rainy season.",
      es: "Cascada de aguas rojizas por el tanino de las plantas del cerrado. Visual único e impactante en época de lluvias.",
    },
    imageIndex: 1,
  },
  {
    id: "anjos-arcanjos",
    name: { pt: "Anjos e Arcanjos", en: "Angels & Archangels", es: "Ángeles y Arcángeles" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 3,
    distanceCarKm: 26,
    requiresGuide: false,
    description: {
      pt: "O complexo de cachoeiras Anjos e Arcanjos é formado por quedas que descem entre formações de quartzito, criando poços de águas cristalinas para banho. A trilha é acessível o ano todo e percorre paisagens abertas do Cerrado. O ambiente tem um caráter contemplativo, com a luz natural realçando as cores das rochas e da vegetação. É uma opção agradável para quem busca tranquilidade e contato com a natureza sem grandes desafios físicos.",
      en: "Mystical waterfall with bathing pool in quartzite scenery. Trail accessible year-round.",
      es: "Cascada mística con pozo para baño en escenario de cuarcita. Sendero accesible todo el año.",
    },
    imageIndex: 5,
  },
  {
    id: "chapada-alta",
    name: { pt: "Chapada Alta", en: "Chapada Alta", es: "Chapada Alta" },
    region: "alto-paraiso",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 6,
    distanceCarKm: 102,
    requiresGuide: true,
    description: {
      pt: "Chapada Alta é um complexo de cachoeiras localizado em uma das áreas mais elevadas da região. A trilha percorre paisagens amplas com visuais panorâmicos do Cerrado e revela diferentes quedas ao longo do caminho. O acesso exige guia obrigatório e o percurso é moderado. As formações rochosas e a vegetação de altitude criam cenários distintos dos demais atrativos. É uma experiência que combina contemplação e caminhada em ambiente preservado.",
      en: "High point of the Chapada with waterfall and panoramic views. Mandatory guide for the trail.",
      es: "Punto elevado de la Chapada con cascada y visual panorámico. Guía obligatorio para el sendero.",
    },
    imageIndex: 4,
  },
  {
    id: "mirante-baleia",
    name: { pt: "Mirante Morro da Baleia", en: "Whale Hill Viewpoint", es: "Mirador Morro da Baleia" },
    region: "alto-paraiso",
    difficulty: "moderado",
    seasonality: "chuva",
    distanceKm: 5,
    distanceCarKm: 38,
    requiresGuide: false,
    description: {
      pt: "O Morro da Baleia é um dos mirantes mais conhecidos da Chapada dos Veadeiros. A formação rochosa lembra o formato de uma baleia e oferece vista panorâmica espetacular do Cerrado. A trilha até o topo é moderada e recompensa com um visual amplo, especialmente na época de chuva, quando o verde domina a paisagem. O nascer e o pôr do sol vistos do mirante são especialmente fotogênicos. É um passeio que combina caminhada leve e contemplação.",
      en: "Viewpoint with spectacular panoramic views. Best during rainy season when green dominates the landscape.",
      es: "Mirador con vista panorámica espectacular. Mejor en la época de lluvias cuando el verde domina el paisaje.",
    },
    imageIndex: 1,
  },
  {
    id: "bona-espero",
    name: { pt: "Bona Espero", en: "Bona Espero", es: "Bona Espero" },
    region: "alto-paraiso",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 1,
    distanceCarKm: 32,
    requiresGuide: false,
    description: {
      pt: "Bona Espero é um atrativo que reúne cachoeira, natureza e história em um mesmo lugar. A propriedade abriga uma comunidade internacional e oferece trilha curta até uma queda d'água em ambiente preservado. O acesso é fácil e o passeio é indicado para quem tem pouco tempo ou busca uma opção leve. O cenário combina vegetação nativa, rochas e águas claras. É uma experiência tranquila que vai além do banho de cachoeira.",
      en: "Easy-access waterfall with short trail. Ideal for those with little time or seeking a light option.",
      es: "Cascada de fácil acceso con sendero corto. Ideal para quien tiene poco tiempo o busca una opción ligera.",
    },
    imageIndex: 2,
  },

  // ========== 02 — SÃO JORGE (11) ==========
  {
    id: "volta-da-serra",
    name: { pt: "Fzda. Volta da Serra", en: "Volta da Serra Farm", es: "Hda. Volta da Serra" },
    region: "sao-jorge",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 3,
    distanceCarKm: 66,
    requiresGuide: false,
    description: {
      pt: "A Fazenda Volta da Serra abriga cachoeiras acessíveis em meio a uma propriedade com boa infraestrutura de apoio ao visitante. As trilhas são relativamente curtas e levam a diferentes quedas e poços naturais. O ambiente é tranquilo e ideal para famílias, crianças e visitantes que buscam um passeio sem grande exigência física. A paisagem mistura vegetação do Cerrado com formações rochosas e água cristalina. É uma ótima opção para um dia de descanso e contato com a natureza.",
      en: "Farm with accessible waterfalls and support infrastructure. Great for families and beginners.",
      es: "Hacienda con cascadas accesibles e infraestructura de apoyo. Excelente para familias y principiantes.",
    },
    imageIndex: 5,
  },
  {
    id: "mirante-janela",
    name: { pt: "Mirante da Janela", en: "Window Viewpoint", es: "Mirador de la Ventana" },
    region: "sao-jorge",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 8,
    distanceCarKm: 80,
    requiresGuide: false,
    description: {
      pt: "Um dos mirantes mais icônicos da Chapada dos Veadeiros, o Mirante da Janela oferece uma vista enquadrada dos saltos do Rio Preto através de uma abertura natural entre rochas. A trilha até o mirante é moderada e percorre paisagens variadas do Cerrado. O visual é especialmente impressionante na época de chuva, quando as quedas ganham volume. É um dos cartões-postais mais fotografados da região. O percurso pode ser combinado com outros atrativos próximos.",
      en: "The most famous viewpoint in the Chapada. Framed view of Rio Preto falls between rocks. A postcard.",
      es: "El mirador más famoso de la Chapada. Vista enmarcada de los saltos del Río Preto entre rocas. Postal.",
    },
    imageIndex: 1,
  },
  {
    id: "canions-cariocas",
    name: { pt: "Cânions e Cariocas", en: "Canyons & Cariocas", es: "Cañones y Cariocas" },
    region: "sao-jorge",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 11,
    distanceCarKm: 76,
    requiresGuide: false,
    description: {
      pt: "Um circuito dentro do Parque Nacional da Chapada dos Veadeiros que revela cânions impressionantes e piscinas naturais formadas entre rochas. A trilha percorre paisagens diversas do Cerrado e oferece diferentes pontos de contemplação ao longo do caminho. As formações rochosas esculpidas pela água criam cenários marcantes. O percurso é moderado e acessível o ano todo. É uma das trilhas mais completas do parque.",
      en: "Trail inside the National Park with impressive canyons and natural pools between rocks.",
      es: "Sendero dentro del Parque Nacional con cañones impresionantes y piscinas naturales entre rocas.",
    },
    imageIndex: 6,
  },
  {
    id: "saltos-corredeiras",
    name: { pt: "Saltos e Corredeiras", en: "Falls & Rapids", es: "Saltos y Correderas" },
    region: "sao-jorge",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 10,
    distanceCarKm: 76,
    requiresGuide: false,
    description: {
      pt: "Trilha clássica do Parque Nacional da Chapada dos Veadeiros que leva a dois saltos impressionantes do Rio Preto, com quedas de aproximadamente 80 e 120 metros de altura. O percurso inclui mirantes com vistas panorâmicas e trechos de corredeiras onde é possível tomar banho. A caminhada é moderada e percorre paisagens abertas do Cerrado. É um dos roteiros mais tradicionais e procurados do parque. O conjunto de saltos e corredeiras cria uma experiência completa.",
      en: "Inside the National Park. Two falls of 80m and 120m with incredible viewpoints and rapids.",
      es: "Dentro del Parque Nacional. Dos saltos de 80m y 120m con miradores increíbles y rápidos.",
    },
    imageIndex: 4,
  },
  {
    id: "sete-quedas",
    name: { pt: "Sete Quedas | Parque Nacional", en: "Seven Falls | National Park", es: "Siete Caídas | Parque Nacional" },
    region: "sao-jorge",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 24,
    distanceCarKm: 76,
    requiresGuide: true,
    description: {
      pt: "A Travessia das Sete Quedas é uma das trilhas mais conhecidas do Parque Nacional da Chapada dos Veadeiros. O percurso acompanha o Rio Preto por cerca de 23 km e revela diferentes paisagens do Cerrado ao longo do caminho. Durante a caminhada surgem corredeiras, pequenas cachoeiras e grandes lajes de pedra esculpidas pela água. A trilha atravessa campos rupestres, veredas e áreas de vegetação preservada. Para muitos visitantes, é uma das experiências mais completas de imersão na natureza da Chapada.",
      en: "The longest trail in the National Park at 24km. Seven waterfalls and spectacular canyons. Dry season only.",
      es: "El sendero más largo del Parque Nacional con 24km. Siete caídas de agua y cañones espectaculares. Solo en seca.",
    },
    imageIndex: 3,
  },
  {
    id: "carrossel",
    name: { pt: "Carrossel | Parque Nacional", en: "Carrossel | National Park", es: "Carrossel | Parque Nacional" },
    region: "sao-jorge",
    difficulty: "moderado",
    seasonality: "seca",
    distanceKm: 10,
    distanceCarKm: 76,
    requiresGuide: false,
    description: {
      pt: "O Carrossel é uma formação rochosa dentro do Parque Nacional onde a água escavou piscinas naturais circulares entre as pedras. O cenário é único e lembra uma escultura natural moldada ao longo de milhares de anos. A trilha até o local é moderada e está disponível apenas na época de seca. As piscinas permitem banho em meio a um ambiente de grande beleza geológica. É um dos atrativos mais singulares do parque.",
      en: "Trail inside the National Park with circular natural pools between rocks. Available in dry season.",
      es: "Sendero dentro del Parque Nacional con piscinas naturales circulares entre rocas. Disponible en seca.",
    },
    imageIndex: 2,
  },
  {
    id: "paraiso-pandavas",
    name: { pt: "Paraíso dos Pandavas", en: "Pandavas Paradise", es: "Paraíso de los Pandavas" },
    region: "sao-jorge",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 40,
    requiresGuide: true,
    description: {
      pt: "Um atrativo conhecido pela beleza natural e pela energia especial do lugar. A cachoeira fica em propriedade particular e o acesso exige guia local obrigatório. O ambiente é de paz e contemplação, com vegetação preservada e águas cristalinas. A trilha é relativamente tranquila e permite apreciar diferentes pontos do rio. É uma experiência que combina natureza e espiritualidade em um cenário marcante.",
      en: "Waterfall on a property with special energy. Local guide required. Environment of peace and contemplation.",
      es: "Cascada en propiedad con energía especial. Guía local obligatorio. Ambiente de paz y contemplación.",
    },
    imageIndex: 5,
  },
  {
    id: "raizama",
    name: { pt: "Raizama", en: "Raizama", es: "Raizama" },
    region: "sao-jorge",
    difficulty: "facil",
    seasonality: "seca",
    distanceKm: 4,
    distanceCarKm: 84,
    requiresGuide: false,
    description: {
      pt: "Um dos lugares mais impactantes da Chapada dos Veadeiros, a Raizama revela uma cachoeira encaixada entre cânions estreitos de quartzito. A trilha percorre o interior do Cerrado e desce até o fundo do vale onde a água corre entre paredões de rocha. O cenário é dramático e a luz que penetra entre as paredes cria efeitos visuais marcantes. O acesso está disponível na época de seca. É uma experiência que combina aventura e contemplação.",
      en: "Trail through the cerrado with a waterfall nestled between canyons. Available during dry season.",
      es: "Sendero por dentro del cerrado con cascada encajada entre cañones. Disponible en época seca.",
    },
    imageIndex: 6,
  },
  {
    id: "segredo",
    name: { pt: "Segredo", en: "Segredo", es: "Segredo" },
    region: "sao-jorge",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 7,
    distanceCarKm: 118,
    requiresGuide: false,
    description: {
      pt: "Uma das cachoeiras mais queridas da Chapada dos Veadeiros, a Cachoeira do Segredo impressiona pela queda de aproximadamente 115 metros em um anfiteatro natural de quartzito. O acesso é feito por trilha moderada que desce até o fundo do vale. O poço formado na base da queda é profundo e cercado por paredões de rocha que amplificam o som da água. O cenário é grandioso e transmite uma sensação de isolamento e imersão na natureza. É um dos atrativos mais marcantes da região.",
      en: "One of the most beautiful waterfalls in the Chapada. 115m drop in a natural quartzite amphitheater.",
      es: "Una de las cascadas más bonitas de la Chapada. Caída de 115m en anfiteatro natural de cuarcita.",
    },
    imageIndex: 3,
  },
  {
    id: "vale-da-lua",
    name: { pt: "Vale da Lua", en: "Moon Valley", es: "Valle de la Luna" },
    region: "sao-jorge",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 1.5,
    distanceCarKm: 70,
    requiresGuide: false,
    description: {
      pt: "Atrativo famoso pelas formações rochosas esculpidas ao longo de milhões de anos pelo Rio São Miguel, criando cenários que lembram a superfície lunar. A água corre entre cavidades e esculturas naturais de quartzito em tons que variam do cinza ao dourado. O acesso é fácil e o local é um dos mais visitados da Chapada. O banho é possível em alguns trechos, mas o principal atrativo é a contemplação das formas geológicas. É um cartão-postal da região.",
      en: "Lunar rock formations sculpted by the São Miguel River over millions of years. A postcard destination.",
      es: "Formaciones rocosas lunares esculpidas por el Río São Miguel a lo largo de millones de años. Postal.",
    },
    imageIndex: 4,
  },
  {
    id: "morada-do-sol",
    name: { pt: "Morada do Sol", en: "Sun's Dwelling", es: "Morada del Sol" },
    region: "sao-jorge",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 80,
    requiresGuide: false,
    description: {
      pt: "Um complexo com clima de refúgio natural, a Morada do Sol reúne cachoeiras, paredões rochosos e poços de águas claras em um ambiente preservado. A trilha é acessível o ano todo e percorre paisagens variadas do Cerrado. O visual é dramático, com formações de rocha que emolduram as quedas d'água. O local é menos movimentado que outros atrativos da região, o que contribui para a tranquilidade. É uma boa opção para quem busca contemplação e banho em cenário impressionante.",
      en: "Waterfall with dramatic scenery and impressive rock walls. Trail accessible year-round.",
      es: "Cascada con visual dramático y paredones impresionantes. Sendero accesible todo el año.",
    },
    imageIndex: 1,
  },

  // ========== 03 — SÃO JOÃO D'ALIANÇA (7) ==========
  {
    id: "bocaina-farias",
    name: { pt: "Bocaina do Farias", en: "Bocaina do Farias", es: "Bocaina do Farias" },
    region: "sao-joao",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 8,
    distanceCarKm: 95,
    requiresGuide: true,
    description: {
      pt: "Atrativo de cachoeira com paisagem típica do Cerrado na região de São João d'Aliança. A trilha é desafiadora e o acesso é restrito à época de seca, com guia obrigatório. A cachoeira revela um cenário remoto e preservado, com formações rochosas e vegetação nativa ao redor. O ambiente transmite uma sensação de isolamento e natureza intocada. É uma opção para visitantes experientes que buscam aventura fora dos roteiros mais conhecidos.",
      en: "Remote waterfall with challenging trail in the São João d'Aliança region. Mandatory guide, dry season only.",
      es: "Cascada remota con sendero desafiante en la región de São João d'Aliança. Guía obligatorio, solo en seca.",
    },
    imageIndex: 6,
  },
  {
    id: "brancas",
    name: { pt: "Brancas", en: "Brancas", es: "Brancas" },
    region: "sao-joao",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 2,
    distanceCarKm: 42,
    requiresGuide: false,
    description: {
      pt: "As Cachoeiras Brancas são lembradas pela clareza da água e pela facilidade de acesso. A trilha é curta e leva a quedas que formam poços amplos e rasos, ideais para banho. O cenário combina rochas claras, vegetação do Cerrado e luz natural abundante. É uma das opções mais acessíveis da região de São João d'Aliança. O ambiente tranquilo e a proximidade da estrada tornam o passeio prático para famílias e visitantes com pouco tempo.",
      en: "Clear-water waterfall with easy access. One of the most accessible in the São João region.",
      es: "Cascada de aguas claras con acceso fácil. Una de las más accesibles de la región de São João.",
    },
    imageIndex: 2,
  },
  {
    id: "dragao",
    name: { pt: "Dragão", en: "Dragon", es: "Dragón" },
    region: "sao-joao",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 6,
    distanceCarKm: 100,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira do Dragão é considerada uma das mais desafiadoras da Chapada dos Veadeiros. O acesso envolve trilha técnica com trechos de rapel e travessias que exigem preparo físico e experiência. A queda é espetacular e surge em meio a um cenário selvagem de paredões rochosos. O guia é obrigatório e o passeio é restrito à época de seca. É uma experiência para os mais corajosos e aventureiros.",
      en: "The feared Dragon trail. Rappelling, crossings and spectacular waterfall for the bravest.",
      es: "El temido sendero del Dragón. Rapel, travesías y cascada espectacular para los más valientes.",
    },
    imageIndex: 3,
  },
  {
    id: "macacão",
    name: { pt: "Macacão", en: "Macacão", es: "Macacão" },
    region: "sao-joao",
    difficulty: "dificil",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 90,
    requiresGuide: true,
    description: {
      pt: "O Complexo de Cachoeiras do Rio Macaco reúne uma sequência de quedas e poços formados ao longo do curso do rio, criando um cenário marcado pelas rochas esculpidas pela água. O acesso acontece por trilha que leva até as margens do rio, onde diferentes pontos de banho aparecem ao longo do percurso. Entre os destaques estão a Escadaria e a Catedral, formações naturais que se tornaram ícones do lugar. A paisagem mistura paredões de pedra, água cristalina e vegetação típica do Cerrado. É considerado um dos atrativos mais impressionantes da Chapada dos Veadeiros.",
      en: "Jurassic canyon with hidden natural pools. One of the most intense experiences in the Chapada.",
      es: "Cañón jurásico con piscinas naturales escondidas. Una de las experiencias más intensas de la Chapada.",
    },
    imageIndex: 6,
  },
  {
    id: "macaquinhos",
    name: { pt: "Macaquinhos", en: "Macaquinhos", es: "Macaquinhos" },
    region: "sao-joao",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 88,
    requiresGuide: false,
    description: {
      pt: "Também conhecido como Santuário das Pedras, o Complexo do Rio Macaquinhos reúne diversas quedas e poços formados pelo encontro do rio com o córrego do Fundão. A água corre entre grandes formações rochosas esculpidas pelo tempo, criando cenários marcantes ao longo do percurso. Entre os destaques estão a Cachoeira da Caverna, o Poço do Jump e o Poço Sereno, pontos bastante procurados para banho. O conjunto de quedas forma piscinas naturais de águas esverdeadas em meio às pedras. É um dos complexos mais completos e impressionantes da Chapada dos Veadeiros.",
      en: "Complex with multiple waterfalls and natural pools, including a natural waterslide.",
      es: "Complejo con múltiples cascadas y piscinas naturales, incluyendo tobogán natural.",
    },
    imageIndex: 2,
  },
  {
    id: "complexo-veadeiros",
    name: { pt: "Complexo Veadeiros", en: "Veadeiros Complex", es: "Complejo Veadeiros" },
    region: "sao-joao",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 3,
    distanceCarKm: 160,
    requiresGuide: false,
    description: {
      pt: "Localizado na região de São João d'Aliança, o Complexo Veadeiros reúne cachoeiras e poços naturais ao longo de uma trilha moderada. O percurso oferece múltiplos pontos de banho em águas cristalinas. A paisagem combina formações rochosas e vegetação típica do Cerrado. O local é menos visitado que outros complexos da Chapada, o que garante mais tranquilidade. É uma boa opção para quem busca um dia de passeio completo com diferentes cenários.",
      en: "Waterfall complex in the south of the Chapada. Moderate trail with multiple swimming spots.",
      es: "Complejo de cascadas en la región sur de la Chapada. Sendero moderado con múltiples puntos de baño.",
    },
    imageIndex: 4,
  },
  {
    id: "cantinho",
    name: { pt: "Cantinho", en: "Cantinho", es: "Cantinho" },
    region: "sao-joao",
    difficulty: "moderado",
    seasonality: "chuva",
    distanceKm: 2,
    distanceCarKm: 166,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira do Cantinho é conhecida pelo ambiente intimista e pela beleza discreta que a diferencia de atrativos maiores. Acessível na época de chuva, a queda forma um poço cercado por vegetação e rochas. O guia é obrigatório e a trilha atravessa paisagens preservadas do Cerrado. O local costuma ter poucos visitantes, o que reforça a sensação de exclusividade. É uma opção para quem busca tranquilidade e contato próximo com a natureza.",
      en: "Intimate waterfall accessible during the rainy season. Mandatory guide for the trail.",
      es: "Cascada intimista accesible en la época de lluvias. Guía obligatorio para el sendero.",
    },
    imageIndex: 5,
  },

  {
    id: "label",
    name: { pt: "Label", en: "Label", es: "Label" },
    region: "sao-joao",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 180,
    requiresGuide: false,
    description: {
      pt: "A Cachoeira Label é um atrativo de dificuldade moderada na região de São João d'Aliança, acessível o ano todo. A trilha de 4 km atravessa paisagens preservadas do Cerrado até revelar uma queda d'água cercada por formações rochosas e vegetação nativa. O ambiente tranquilo e pouco explorado oferece uma experiência de imersão na natureza longe das multidões.",
      en: "Label is a moderate waterfall in the São João d'Aliança region, accessible year-round. The 4 km trail winds through preserved Cerrado landscapes to a waterfall surrounded by rock formations and native vegetation. The quiet, less-visited setting offers an immersive nature experience away from crowds.",
      es: "La Cascada Label es un atractivo de dificultad moderada en la región de São João d'Aliança, accesible todo el año. El sendero de 4 km atraviesa paisajes preservados del Cerrado hasta revelar una caída de agua rodeada de formaciones rocosas y vegetación nativa. El ambiente tranquilo y poco explorado ofrece una experiencia de inmersión en la naturaleza lejos de las multitudes.",
    },
    imageIndex: 6,
  },

  // ========== 04 — CAVALCANTE (7) ==========
  {
    id: "rio-lages",
    name: { pt: "Rio Lages", en: "Rio Lages", es: "Río Lages" },
    region: "cavalcante",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 14,
    distanceCarKm: 350,
    requiresGuide: true,
    description: {
      pt: "O Complexo do Rio Lages reúne diferentes quedas e poços formados pelo encontro de três cursos d'água da região: o próprio Rio Lages, o Córrego Águas Lindas e o Córrego Canjica. O acesso acontece por uma trilha mais desafiadora, em grande parte acompanhando a margem do rio e atravessando trechos de rochas. Ao longo do percurso surgem piscinas naturais de águas cristalinas e quedas fortes esculpidas na pedra. O ambiente preservado e os paredões rochosos criam cenários impactantes em meio ao Cerrado. A experiência recompensa o esforço da caminhada com alguns dos visuais mais marcantes da região.",
      en: "Long and remote trail in the Cavalcante region. One of the most challenging adventures in the Chapada.",
      es: "Sendero largo y remoto en la región de Cavalcante. Una de las aventuras más desafiantes de la Chapada.",
    },
    imageIndex: 3,
  },
  {
    id: "catoa",
    name: { pt: "Catoá", en: "Catoá", es: "Catoá" },
    region: "cavalcante",
    difficulty: "moderado",
    seasonality: "seca",
    distanceKm: 4,
    distanceCarKm: 500,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira Catoá é um atrativo relativamente recente no roteiro turístico da Chapada. Localizada na região de Cavalcante, seu acesso exige uma trilha mais longa, atravessando áreas naturais preservadas. A queda forma um belo poço cercado por vegetação e rochas. O ambiente é silencioso e pouco movimentado, ideal para quem busca experiências mais tranquilas. A visita costuma ser combinada com outros atrativos da região.",
      en: "Spectacular waterfall in the northern Cavalcante region. Dry season access with mandatory guide.",
      es: "Cascada espectacular en la región norte de Cavalcante. Acceso en seca con guía obligatorio.",
    },
    imageIndex: 1,
  },
  {
    id: "canions-sao-felix",
    name: { pt: "Cânions São Félix e Boa Brisa", en: "São Félix & Boa Brisa Canyons", es: "Cañones São Félix y Boa Brisa" },
    region: "cavalcante",
    difficulty: "moderado",
    seasonality: "seca",
    distanceKm: 7,
    distanceCarKm: 360,
    requiresGuide: true,
    description: {
      pt: "O roteiro que leva à Cachoeira Boa Brisa também permite explorar o impressionante Cânion São Félix. A trilha percorre áreas do território Kalunga e revela paisagens marcadas por paredões rochosos e vegetação nativa. A cachoeira não é muito alta, mas forma um belo cenário de águas claras e ambiente tranquilo. O cânion próximo completa o passeio com formações geológicas interessantes. O conjunto cria um percurso bastante diverso.",
      en: "Imposing canyons with waterfalls in wild scenery. Mandatory guide, dry season access.",
      es: "Cañones imponentes con cascadas en escenario salvaje. Guía obligatorio, acceso en seca.",
    },
    imageIndex: 6,
  },
  {
    id: "canjica-aguas-lindas",
    name: { pt: "Canjica e Águas Lindas", en: "Canjica & Águas Lindas", es: "Canjica y Águas Lindas" },
    region: "cavalcante",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 9,
    distanceCarKm: 360,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira do Canjica apresenta duas quedas principais que descem por um paredão rochoso formando um poço claro na base. A água passa por pequenas cavernas e fendas nas pedras antes de chegar ao rio. O cenário combina formações geológicas curiosas e vegetação nativa. A trilha até o local é relativamente tranquila e permite apreciar diferentes pontos do rio. O ambiente é bastante preservado.\n\nO Complexo Águas Lindas reúne diversas quedas e poços naturais espalhados ao longo de um curso d'água cristalino. Durante a trilha surgem várias piscinas naturais formadas entre rochas. Pequenas cascatas e corredeiras acompanham o caminho criando diferentes pontos para banho. A vegetação do Cerrado envolve o percurso e reforça a sensação de imersão na natureza. O passeio permite explorar vários cenários em um único roteiro.",
      en: "Two waterfalls on one trail. Canjica with wide drop and Águas Lindas with crystalline pool.",
      es: "Dos cascadas en un sendero. Canjica con caída ancha y Águas Lindas con pozo cristalino.",
    },
    imageIndex: 2,
  },
  {
    id: "ponte-de-pedra",
    name: { pt: "Ponte de Pedra", en: "Stone Bridge", es: "Puente de Piedra" },
    region: "cavalcante",
    difficulty: "dificil",
    seasonality: "seca",
    distanceKm: 6,
    distanceCarKm: 222,
    requiresGuide: true,
    description: {
      pt: "A Ponte de Pedra é uma impressionante formação natural em formato de arco, esculpida ao longo de milhões de anos pela ação da água e do vento sobre as rochas. A estrutura atravessa o rio formando um cenário único no meio da paisagem do Cerrado. Logo abaixo do arco natural surge um poço de águas caramelo, bastante procurado para banho e contemplação. Em períodos de seca, um segundo poço também pode aparecer, ampliando a área para mergulho. O local ainda oferece mirantes naturais que revelam belas vistas do vale ao redor.",
      en: "Natural rock formation shaped like a bridge over a waterfall. One of the most impressive in Brazil.",
      es: "Formación rocosa natural en forma de puente sobre cascada. Una de las más impresionantes de Brasil.",
    },
    imageIndex: 4,
  },
  {
    id: "prata",
    name: { pt: "Prata", en: "Silver", es: "Plata" },
    region: "cavalcante",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 14,
    distanceCarKm: 330,
    requiresGuide: true,
    description: {
      pt: "O Complexo Rio do Prata reúne diversas cachoeiras formadas ao longo do curso do rio que atravessa um vale de grande beleza natural. Durante a trilha surgem diferentes quedas, corredeiras e poços de águas cristalinas espalhados pelo percurso. A caminhada revela paisagens amplas do Cerrado e formações rochosas impressionantes. Algumas quedas se destacam pela altura, enquanto outras formam piscinas naturais ideais para banho. O conjunto cria um dos roteiros mais completos da região.",
      en: "Silver cascade on dark rock wall. Long trail with contrasting and unique scenery.",
      es: "Caída plateada en paredón de roca oscura. Sendero largo con escenario contrastante y único.",
    },
    imageIndex: 3,
  },
  {
    id: "veredas",
    name: { pt: "Veredas", en: "Veredas", es: "Veredas" },
    region: "cavalcante",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 4,
    distanceCarKm: 200,
    requiresGuide: false,
    description: {
      pt: "A Fazenda Veredas está localizada na estrada que liga Cavalcante a Colinas do Sul, a poucos quilômetros da cidade. Dentro da propriedade ficam algumas das cachoeiras mais altas da região, com destaque para a Cachoeira Veredas, que impressiona pela altura e pela paisagem ao redor. O acesso acontece por trilha que atravessa o cânion e exige atenção em alguns trechos. Além da queda principal, a fazenda abriga outros atrativos como a Veredinha, a Toca da Onça, o Véu de Noiva e o Poço Encantado. O local também possui estrutura de hospedagem, restaurante e áreas de descanso.",
      en: "Waterfall among buriti palm groves. Immersion in the typical cerrado landscape.",
      es: "Cascada entre veredas de buritis. Inmersión en el paisaje típico del cerrado.",
    },
    imageIndex: 5,
  },

  // ========== 05 — TERRITÓRIO KALUNGA (4) ==========
  {
    id: "candaru",
    name: { pt: "Candaru", en: "Candaru", es: "Candaru" },
    region: "kalunga",
    difficulty: "moderado",
    seasonality: "anual",
    distanceKm: 1,
    distanceCarKm: 245,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira Candaru é uma das grandes quedas da região da Comunidade do Engenho II, em Cavalcante. Apesar de menos conhecida que Santa Bárbara ou Capivara, impressiona pela força da água e pelas formações rochosas que estruturam seu paredão. A queda se distribui por degraus naturais de pedra que conduzem a água até um amplo poço. O cenário transmite uma sensação de isolamento e grandiosidade típica da Chapada. A trilha até o local revela paisagens abertas do Cerrado e trechos de mata preservada.",
      en: "Waterfall in the Kalunga Territory with short trail. Local guide required. Cultural immersion.",
      es: "Cascada en el Territorio Kalunga con sendero corto. Guía local obligatorio. Inmersión cultural.",
    },
    imageIndex: 2,
  },
  {
    id: "capivara",
    name: { pt: "Capivara", en: "Capivara", es: "Capivara" },
    region: "kalunga",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 1.6,
    distanceCarKm: 245,
    requiresGuide: true,
    description: {
      pt: "A Cachoeira da Capivara apresenta uma queda elegante que escorre entre rochas e vegetação aquática. A água forma um poço amplo e refrescante, bastante procurado para banho nos dias mais quentes. O local marca a junção de cursos d'água que descem pelas pedras formando pequenas cascatas ao redor. A paisagem combina luz intensa, rochas claras e vegetação típica do Cerrado. O ambiente é tranquilo e convida a permanecer por mais tempo apreciando o cenário.",
      en: "Neighbor to Santa Bárbara, with equally blue waters and fewer visitors. Local guide required.",
      es: "Vecina de Santa Bárbara, con aguas igualmente azules y menos visitantes. Guía local obligatorio.",
    },
    imageIndex: 5,
  },
  {
    id: "curriola-guardiao",
    name: { pt: "Curriola (Guardião)", en: "Curriola (Guardian)", es: "Curriola (Guardián)" },
    region: "kalunga",
    difficulty: "dificil",
    seasonality: "anual",
    distanceKm: 6,
    distanceCarKm: 360,
    requiresGuide: true,
    description: {
      pt: "Localizada no Vale do Moleque, a Cachoeira do Guardião é um atrativo ainda pouco visitado na Chapada dos Veadeiros. O acesso envolve estrada de terra e trilha que atravessa paisagens preservadas do Cerrado. A queda surge entre paredões de pedra formando um poço profundo de águas escuras. O contraste entre a rocha e o tom azul da água cria um cenário marcante. O local transmite sensação de natureza intocada.",
      en: "Imposing waterfall in the Kalunga Territory. Demanding trail with mandatory local guide.",
      es: "Cascada imponente en el Territorio Kalunga. Sendero exigente con guía local obligatorio.",
    },
    imageIndex: 3,
  },
  {
    id: "santa-barbara",
    name: { pt: "Santa Bárbara", en: "Santa Bárbara", es: "Santa Bárbara" },
    region: "kalunga",
    difficulty: "facil",
    seasonality: "anual",
    distanceKm: 3,
    distanceCarKm: 245,
    requiresGuide: true,
    description: {
      pt: "Uma das cachoeiras mais famosas da região de Cavalcante, conhecida pela água extremamente azul e transparente, formando um poço amplo e muito fotogênico. O acesso envolve caminhada e controle de visitação em períodos de maior movimento, o que ajuda a preservar o lugar. O banho é marcante: água fria, cor intensa e cenário lindo. É uma experiência \"cartão-postal\", mas ainda assim com sensação de natureza forte e viva — um clássico que realmente entrega.",
      en: "The most famous waterfall in Brazil. Turquoise waters in a paradise setting in Kalunga Territory. Guide required.",
      es: "La cascada más famosa de Brasil. Aguas turquesa en escenario paradisíaco en el Territorio Kalunga. Guía obligatorio.",
    },
    imageIndex: 2,
  },
  // ========== CAVALCANTE (adicional) ==========
  {
    id: "boqueirao",
    name: { pt: "Boqueirão", en: "Boqueirão", es: "Boqueirão" },
    region: "cavalcante",
    difficulty: "facil",
    seasonality: "seca",
    distanceKm: 1,
    distanceCarKm: 320,
    requiresGuide: true,
    description: {
      pt: "O Boqueirão é um cânion estreito formado pela erosão do rio ao longo de milhares de anos, criando paredões rochosos impressionantes que se erguem acima do curso d'água. O acesso é fácil, com trilha curta de apenas 1 km, mas a presença de guia é obrigatória. Na época de seca, o nível da água baixa e revela formações geológicas fascinantes nas paredes do cânion. É um dos atrativos mais singulares da região de Cavalcante.",
      en: "Boqueirão is a narrow canyon carved by the river over thousands of years, with impressive rock walls rising above the waterway. Easy access with a short 1km trail, but a guide is mandatory. During the dry season, the water level drops revealing fascinating geological formations.",
      es: "Boqueirão es un cañón estrecho formado por la erosión del río a lo largo de miles de años, con impresionantes paredes rocosas. Acceso fácil con sendero corto de 1km, pero guía obligatorio. En la época seca, el nivel del agua baja revelando formaciones geológicas fascinantes.",
    },
    imageIndex: 3,
  },
];

// Helper functions
export const getRegions = (): Region[] => ["alto-paraiso", "sao-jorge", "sao-joao", "cavalcante", "kalunga"];
export const getDifficulties = (): Difficulty[] => ["facil", "moderado", "dificil"];
export const getSeasonalities = (): Seasonality[] => ["chuva", "seca", "anual"];

export const TRAIL_DISTANCE_MAX = 25;
export const CAR_DISTANCE_MAX = 500;

export const filterWaterfalls = (
  regions?: Region[],
  difficulties?: Difficulty[],
  seasonalities?: Seasonality[],
  searchQuery?: string,
  trailMax?: number,
  carMax?: number,
  list: Waterfall[] = waterfalls
): Waterfall[] => {
  const query = searchQuery?.trim().toLowerCase() || "";
  return list.filter((w) => {
    if (regions && regions.length > 0 && !regions.includes(w.region)) return false;
    if (difficulties && difficulties.length > 0 && !difficulties.includes(w.difficulty)) return false;
    if (seasonalities && seasonalities.length > 0 && !seasonalities.includes(w.seasonality)) return false;
    if (trailMax !== undefined && w.distanceKm > trailMax) return false;
    if (carMax !== undefined && w.distanceCarKm > carMax) return false;
    if (query) {
      const matchesName = Object.values(w.name).some((n) =>
        n.toLowerCase().includes(query)
      );
      if (!matchesName) return false;
    }
    return true;
  });
};
