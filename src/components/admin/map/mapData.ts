// SVG map data for Chapada dos Veadeiros region
// Coordinates in 1200x900 viewBox — geography based on reference map
// Orientation: North up, Alto Paraíso center-south, Cavalcante center-north

export const VIEWBOX = "0 0 1200 900";

// Municipality boundary lines (subtle dashed borders — not filled polygons)
export const municipalityBorders = [
  // Alto Paraíso de Goiás — central
  {
    name: "Alto Paraíso de Goiás",
    path: "M 340 520 L 420 440 L 520 400 L 620 420 L 680 480 L 660 580 L 600 640 L 500 660 L 400 620 L 340 560 Z",
    labelX: 510, labelY: 540,
  },
  // Cavalcante — north-central (largest municipality)
  {
    name: "Cavalcante",
    path: "M 420 440 L 460 340 L 520 260 L 620 220 L 740 240 L 820 300 L 800 400 L 720 440 L 680 480 L 620 420 L 520 400 Z",
    labelX: 640, labelY: 340,
  },
  // Colinas do Sul — west
  {
    name: "Colinas do Sul",
    path: "M 180 400 L 240 340 L 320 360 L 420 440 L 340 520 L 340 560 L 280 540 L 200 480 Z",
    labelX: 290, labelY: 440,
  },
  // São João d'Aliança — south
  {
    name: "São João d'Aliança",
    path: "M 340 560 L 400 620 L 500 660 L 540 740 L 460 780 L 360 760 L 300 700 L 280 620 Z",
    labelX: 400, labelY: 700,
  },
  // Teresina de Goiás — northeast
  {
    name: "Teresina de Goiás",
    path: "M 740 240 L 820 180 L 900 200 L 920 280 L 860 340 L 820 300 Z",
    labelX: 850, labelY: 260,
  },
  // Nova Roma — east
  {
    name: "Nova Roma",
    path: "M 820 300 L 860 340 L 920 400 L 940 500 L 880 540 L 800 500 L 720 440 L 800 400 Z",
    labelX: 860, labelY: 440,
  },
  // Monte Alegre de Goiás — far east
  {
    name: "Monte Alegre de Goiás",
    path: "M 920 400 L 980 380 L 1040 440 L 1060 540 L 1000 580 L 940 500 Z",
    labelX: 1000, labelY: 490,
  },
  // Campos Belos — far northeast
  {
    name: "Campos Belos",
    path: "M 900 200 L 980 160 L 1060 200 L 1080 300 L 1040 380 L 980 380 L 920 280 Z",
    labelX: 1000, labelY: 280,
  },
];

// National Park area (Parque Nacional da Chapada dos Veadeiros)
export const nationalPark = {
  name: "Parque Nacional da Chapada dos Veadeiros",
  // Roughly between Alto Paraíso, São Jorge, and south Cavalcante
  path: "M 400 420 Q 430 380 480 370 Q 540 360 580 380 Q 610 400 620 440 Q 610 480 580 500 Q 540 510 490 500 Q 450 490 420 470 Q 400 450 400 420 Z",
  labelX: 510, labelY: 440,
};

// Kalunga Territory — northeast, within Cavalcante
export const kalungaTerritory = {
  name: "Território Kalunga",
  path: "M 620 240 Q 680 220 740 240 Q 790 270 800 320 Q 790 370 750 390 Q 700 400 660 380 Q 630 350 620 300 Q 610 260 620 240 Z",
  labelX: 710, labelY: 310,
};

// Towns / Vilas (small dots with labels)
export const towns = [
  { name: "Alto Paraíso de Goiás", x: 520, y: 530, size: 5, isMain: true },
  { name: "São Jorge", x: 410, y: 460, size: 4, isMain: true },
  { name: "Cavalcante", x: 660, y: 320, size: 5, isMain: true },
  { name: "Colinas do Sul", x: 260, y: 430, size: 3, isMain: false },
  { name: "Teresina de Goiás", x: 850, y: 240, size: 3, isMain: false },
  { name: "São João d'Aliança", x: 420, y: 720, size: 3, isMain: false },
  { name: "Nova Roma", x: 850, y: 440, size: 3, isMain: false },
  { name: "Monte Alegre", x: 1000, y: 480, size: 2.5, isMain: false },
  { name: "Campos Belos", x: 1000, y: 260, size: 2.5, isMain: false },
];

// Roads
export const roads = [
  // GO-118 — main road from south through Alto Paraíso to Cavalcante
  {
    name: "GO-118",
    path: "M 480 780 Q 500 720 510 660 Q 520 600 520 540 Q 530 480 560 440 Q 600 400 640 360 Q 660 340 660 320",
    width: 2,
    isMain: true,
  },
  // GO-239 — Alto Paraíso to São Jorge (west)
  {
    name: "GO-239",
    path: "M 520 530 Q 490 520 460 500 Q 440 480 420 465 Q 410 460 400 458",
    width: 1.5,
    isMain: true,
  },
  // GO-132 — Cavalcante heading northeast
  {
    name: "GO-132",
    path: "M 660 320 Q 700 300 740 280 Q 780 260 820 240 Q 850 230 880 220",
    width: 1.5,
    isMain: false,
  },
  // Secondary road — Cavalcante to Kalunga communities
  {
    name: "",
    path: "M 660 340 Q 690 360 720 380 Q 740 390 760 400",
    width: 1,
    isMain: false,
  },
  // Road to Colinas do Sul
  {
    name: "",
    path: "M 440 480 Q 380 470 340 460 Q 300 450 270 440",
    width: 1,
    isMain: false,
  },
];

// Rivers — main (thicker, more glow)
export const rivers = {
  main: [
    {
      name: "Rio Tocantinzinho",
      path: "M 300 340 Q 340 380 370 420 Q 400 470 420 520 Q 440 570 450 620 Q 460 670 470 730 Q 475 760 480 790",
      width: 3.5,
    },
    {
      name: "Rio Preto",
      path: "M 580 240 Q 570 290 560 340 Q 550 380 540 420 Q 530 460 520 510 Q 510 560 500 610 Q 495 650 490 700",
      width: 3,
    },
    {
      name: "Rio Paranã",
      path: "M 840 160 Q 850 220 860 280 Q 870 340 880 400 Q 890 460 900 520 Q 910 580 920 640",
      width: 4,
    },
  ],
  secondary: [
    {
      name: "Rio São Bartolomeu",
      path: "M 440 440 Q 460 460 480 470 Q 500 480 520 475",
      width: 1.5,
    },
    {
      name: "Ribeirão dos Couros",
      path: "M 470 400 Q 480 430 485 460",
      width: 1.2,
    },
    {
      name: "Rio das Almas",
      path: "M 260 460 Q 280 500 300 540 Q 320 580 340 620 Q 350 650 360 690",
      width: 1.5,
    },
    {
      name: "Rio dos Macacos",
      path: "M 700 280 Q 710 320 720 360 Q 725 380 730 420",
      width: 1.2,
    },
    {
      name: "Rio Claro",
      path: "M 600 460 Q 620 500 640 540 Q 650 570 660 600",
      width: 1.2,
    },
    {
      name: "Córrego dos Couros",
      path: "M 400 480 Q 390 500 380 530",
      width: 0.8,
    },
  ],
};

// Terrain zones — radial gradients to simulate elevation
export const terrainZones = [
  // Chapada plateau — lighter, elevated feel
  { cx: 500, cy: 460, rx: 180, ry: 120, color: "#2a5512", opacity: 0.15 },
  // Valley near Tocantinzinho — darker
  { cx: 380, cy: 560, rx: 100, ry: 80, color: "#0d1f05", opacity: 0.2 },
  // Northern highlands — Cavalcante area
  { cx: 680, cy: 300, rx: 140, ry: 100, color: "#243d10", opacity: 0.12 },
  // Eastern cerrado — drier, slightly warmer tone
  { cx: 900, cy: 400, rx: 160, ry: 140, color: "#2d4a12", opacity: 0.1 },
];

// Fog/mist areas — white semi-transparent blurs in valleys
export const fogZones = [
  { x: 350, y: 500, width: 120, height: 60, opacity: 0.06 },
  { x: 440, y: 580, width: 100, height: 40, opacity: 0.04 },
  { x: 680, y: 380, width: 80, height: 50, opacity: 0.05 },
  { x: 240, y: 450, width: 90, height: 45, opacity: 0.04 },
  { x: 560, y: 340, width: 70, height: 35, opacity: 0.03 },
];

// Flora — much more dense, spread across the entire map
export const flora: { type: string; x: number; y: number; scale: number }[] = [];

// Generate dense vegetation
const floraTypes = ["buriti", "pequi", "jatoba", "cerrado_bush", "grass_tuft"];
const rng = (seed: number) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};
const rand = rng(42);
for (let i = 0; i < 120; i++) {
  const x = 140 + rand() * 920;
  const y = 160 + rand() * 680;
  const type = floraTypes[Math.floor(rand() * floraTypes.length)];
  const scale = 0.3 + rand() * 0.6;
  flora.push({ type, x, y, scale });
}

// Fauna positions
export const fauna = [
  { type: "lobo-guara", x: 480, y: 490, scale: 0.5 },
  { type: "lobo-guara", x: 720, y: 360, scale: 0.4 },
  { type: "arara", x: 390, y: 400, scale: 0.5 },
  { type: "arara", x: 650, y: 260, scale: 0.4 },
  { type: "arara", x: 560, y: 500, scale: 0.35 },
  { type: "tucano", x: 800, y: 340, scale: 0.4 },
  { type: "tucano", x: 320, y: 500, scale: 0.35 },
];

// Point type config (unchanged)
export const pointTypeConfig = {
  waterfall: { label: "Cachoeira", color: "#3B82C4", icon: "💧" },
  experience: { label: "Experiência", color: "#C49A3C", icon: "⭐" },
  accommodation: { label: "Hospedagem", color: "#8DB654", icon: "🏡" },
} as const;

export type PointType = keyof typeof pointTypeConfig;
