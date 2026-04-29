const BASE_URL = "https://atmos.tur.br";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const DEFAULT_OG_IMAGE = `${SUPABASE_URL}/storage/v1/object/public/assets/home/hero-home-1.jpg`;

interface RouteMeta {
  title: string;
  description: string;
  image?: string;
}

const routes: Record<string, RouteMeta> = {
  "/": {
    title: "ATMOS — Experiências na Chapada dos Veadeiros",
    description:
      "Roteiros personalizados, cachoeiras fora da rota convencional, experiências e hospedagens na Chapada dos Veadeiros. Planeje sua viagem com curadoria ATMOS.",
  },
  "/roteiros": {
    title: "Roteiros Prontos para Chapada dos Veadeiros — ATMOS",
    description:
      "Roteiros de 2 a 7 dias com as melhores cachoeiras, trilhas e experiências da Chapada dos Veadeiros. Clássicos e jurássicos com guia incluso.",
  },
  "/cachoeiras": {
    title: "Cachoeiras e Atrativos da Chapada dos Veadeiros — ATMOS",
    description:
      "Guia completo de cachoeiras da Chapada dos Veadeiros com dificuldade, distância, sazonalidade e fotos.",
  },
  "/experiencias": {
    title: "Experiências na Chapada dos Veadeiros — ATMOS",
    description:
      "Passeios de bike, cavalgadas, voos de balão, mirantes e vivências culturais na Chapada dos Veadeiros.",
  },
  "/hospedagens": {
    title: "Hospedagens na Chapada dos Veadeiros — ATMOS",
    description:
      "Pousadas, chalés e casas selecionadas pela ATMOS em Alto Paraíso, São Jorge e Cavalcante.",
  },
  "/servicos": {
    title: "Serviços Diferenciais para sua Viagem — ATMOS",
    description:
      "Transfer, drone, lanches de trilha e serviços especiais para personalizar sua viagem à Chapada dos Veadeiros.",
  },
  "/imersoes": {
    title: "Imersões na Chapada dos Veadeiros — ATMOS",
    description:
      "Experiências imersivas na Chapada dos Veadeiros voltadas para grupos, projetos especiais e viagens corporativas.",
  },
  "/duvidas": {
    title: "Dúvidas sobre a Chapada dos Veadeiros — ATMOS",
    description:
      "Respostas sobre clima, como chegar, melhor época, o que levar e como funciona o turismo na Chapada dos Veadeiros.",
  },
  "/monte-seu-roteiro": {
    title: "Monte seu Roteiro na Chapada dos Veadeiros — ATMOS",
    description:
      "Crie um roteiro personalizado escolhendo cachoeiras, experiências, hospedagens e serviços.",
  },
  "/wishlist": {
    title: "Meu Roteiro — ATMOS",
    description:
      "Revise sua seleção de cachoeiras, experiências e hospedagens e solicite um orçamento personalizado.",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";
  const meta = routes[path] || routes["/"];
  const image = meta.image || DEFAULT_OG_IMAGE;
  const canonical = `${BASE_URL}${path}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <link rel="canonical" href="${canonical}" />

  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:site_name" content="ATMOS" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${image}" />

  <meta http-equiv="refresh" content="0;url=${canonical}" />
</head>
<body>
  <p>Redirecionando para <a href="${canonical}">ATMOS</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
