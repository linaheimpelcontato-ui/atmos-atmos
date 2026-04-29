import type { Plugin } from "vite";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { loadEnv } from "vite";

const BASE_URL = "https://atmos.tur.br";

interface RouteMeta {
  path: string;
  title: string;
  description: string;
  image?: string;
}

const routes: RouteMeta[] = [
  {
    path: "/",
    title: "ATMOS — Experiências na Chapada dos Veadeiros",
    description:
      "Roteiros personalizados, cachoeiras fora da rota convencional, experiências e hospedagens na Chapada dos Veadeiros. Planeje sua viagem com curadoria ATMOS. Temos uma equipe especializada além de guias bilingues e veículos 4x4, cuidando de cada passo da sua viagem.",
  },
  {
    path: "/roteiros",
    title: "Roteiros Prontos para Chapada dos Veadeiros — ATMOS",
    description:
      "Roteiros de 2 a 7 dias com as melhores cachoeiras, trilhas e experiências da Chapada dos Veadeiros. Clássicos e jurássicos com guia incluso.",
  },
  {
    path: "/cachoeiras",
    title: "Cachoeiras e Atrativos da Chapada dos Veadeiros — ATMOS",
    description:
      "Guia completo de cachoeiras da Chapada dos Veadeiros com dificuldade, distância, sazonalidade e fotos. Filtre e descubra os melhores atrativos.",
  },
  {
    path: "/experiencias",
    title: "Experiências na Chapada dos Veadeiros — ATMOS",
    description:
      "Passeios de bike, cavalgadas, voos de balão, mirantes e vivências culturais na Chapada dos Veadeiros. Atividades além das trilhas.",
  },
  {
    path: "/hospedagens",
    title: "Hospedagens na Chapada dos Veadeiros — ATMOS",
    description:
      "Pousadas, chalés e casas selecionadas pela ATMOS em Alto Paraíso, São Jorge e Cavalcante. Compare preços, comodidades e localização.",
  },
  {
    path: "/servicos",
    title: "Serviços Diferenciais para sua Viagem — ATMOS",
    description:
      "Transfer, drone, lanches de trilha e serviços especiais para personalizar sua viagem à Chapada dos Veadeiros com conforto.",
  },
  {
    path: "/imersoes",
    title: "Imersões na Chapada dos Veadeiros — ATMOS",
    description:
      "Experiências imersivas na Chapada dos Veadeiros voltadas para grupos, projetos especiais e viagens corporativas. A ATMOS desenvolve jornadas completas que integram natureza, bem-estar e conexão, com curadoria de roteiro e acompanhamento ao longo de toda a experiência.",
  },
  {
    path: "/duvidas",
    title: "Dúvidas sobre a Chapada dos Veadeiros — ATMOS",
    description:
      "Respostas sobre clima, como chegar, melhor época, o que levar e como funciona o turismo na Chapada dos Veadeiros.",
  },
  {
    path: "/monte-seu-roteiro",
    title: "Monte seu Roteiro na Chapada dos Veadeiros — ATMOS",
    description:
      "Crie um roteiro personalizado escolhendo cachoeiras, experiências, hospedagens e serviços. Viagem sob medida com curadoria ATMOS.",
  },
  {
    path: "/wishlist",
    title: "Meu Roteiro — ATMOS",
    description:
      "Revise sua seleção de cachoeiras, experiências e hospedagens e solicite um orçamento personalizado.",
  },
];

export default function ogPagesPlugin(): Plugin {
  return {
    name: "vite-plugin-og-pages",
    apply: "build",
    closeBundle() {
      const env = loadEnv("", process.cwd());
      const DEFAULT_OG_IMAGE = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/home/hero-home-1.jpg`;
      const outDir = resolve(process.cwd(), "dist");
      let baseHtml: string;
      try {
        baseHtml = readFileSync(resolve(outDir, "index.html"), "utf-8");
      } catch {
        console.warn("[og-pages] ⚠️ dist/index.html not found, skipping");
        return;
      }

      for (const route of routes) {
        const image = route.image || DEFAULT_OG_IMAGE;
        const url = `${BASE_URL}${route.path}`;

        const ogTags = [
          `<meta property="og:title" content="${route.title}" />`,
          `<meta property="og:description" content="${route.description}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta property="og:image" content="${image}" />`,
          `<meta property="og:site_name" content="ATMOS" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${route.title}" />`,
          `<meta name="twitter:description" content="${route.description}" />`,
          `<meta name="twitter:image" content="${image}" />`,
          `<link rel="canonical" href="${url}" />`,
        ].join("\n    ");

        let html = baseHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
          .replace(
            /<meta name="description" content="[^"]*"\s*\/?>/,
            `<meta name="description" content="${route.description}" />`
          );

        // Insert OG tags before </head>
        html = html.replace("</head>", `    ${ogTags}\n  </head>`);

        if (route.path === "/") {
          writeFileSync(resolve(outDir, "index.html"), html, "utf-8");
          console.log(`[og-pages] ✅ / (index.html)`);
        } else {
          const dir = resolve(outDir, route.path.slice(1));
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, "index.html"), html, "utf-8");
          console.log(`[og-pages] ✅ ${route.path}/index.html`);
        }
      }
    },
  };
}
