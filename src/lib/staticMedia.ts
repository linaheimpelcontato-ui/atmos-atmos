// Files shipped with the site; never send these to a remote bucket or image proxy.
const publicFiles = new Set<string>([
  "destaques-categorias/Cachoeira-Destaque-1.jpg",
  "destaques-categorias/Cachoeira-Destaque-2.jpg",
  "destaques-categorias/Cachoeira-Destaque-3.jpg",
  "destaques-categorias/Cachoeira-Destaque-4.jpg",
  "destaques-categorias/Cachoeira-Destaque-5.jpg",
  "destaques-categorias/Experiencias-Destaque-1.jpeg",
  "destaques-categorias/Experiencias-Destaque-2.jpeg",
  "destaques-categorias/Experiencias-Destaque-3.jpeg",
  "destaques-categorias/Experiencias-Destaque-4.jpeg",
  "destaques-categorias/Experiencias-Destaque-5.jpeg",
  "destaques-categorias/Hospedagens-Destaque-1.jpeg",
  "destaques-categorias/Hospedagens-Destaque-2.avif",
  "destaques-categorias/Hospedagens-Destaque-3.jpeg",
  "destaques-categorias/Hospedagens-Destaque-4.jpg",
  "destaques-categorias/Hospedagens-Destaque-5.jpeg",
  "destaques-categorias/Serviços-Destaque-1.jpg",
  "destaques-categorias/Serviços-Destaque-2.jpg",
  "destaques-categorias/Serviços-Destaque-3.jpg",
  "destaques-categorias/Serviços-Destaque-4.jpg",
  "duvidas/duvidas-bg.jpg",
  "home/Acao.png",
  "home/Atendimentoatmos.png",
  "home/ConteudoEstetica.png",
  "home/Curadoria360.png",
  "home/ExperienciasComProposito.png",
  "home/Identificacao.png",
  "home/Joao/joao-1.jpg",
  "home/Joao/joao-2.jpg",
  "home/Joao/joao-4.jpg",
  "home/Joao/joao-5.jpg",
  "home/Joao/joao-6.jpg",
  "home/Pensamento.png",
  "home/RedeParceiros.png",
  "home/Sentido.png",
  "home/SustentabilidadeLocal.png",
  "home/about-bg.jpg",
  "home/curadoria-bg.jpg",
  "home/exclusividade-rocks.jpg",
  "home/foto-login.jpg",
  "home/guides/guia-aline.jpg",
  "home/guides/guia-anacarolina.jpg",
  "home/guides/guia-aurora.jpg",
  "home/guides/guia-big.jpg",
  "home/guides/guia-camilla.jpg",
  "home/guides/guia-chico.jpg",
  "home/guides/guia-gudu.jpg",
  "home/guides/guia-henrique.jpg",
  "home/guides/guia-jessica.jpg",
  "home/guides/guia-joao.jpg",
  "home/guides/guia-leocanastra.jpg",
  "home/guides/guia-magela.jpg",
  "home/guides/guia-naia.jpg",
  "home/guides/guia-nissen.jpg",
  "home/guides/guia-pedropilla.jpg",
  "home/guides/guia-raphaelmaia.jpg",
  "home/guides/guia-thiagoalmanamala.jpg",
  "home/guides/guia-thiagoqueiroz.jpg",
  "home/guides/guia-tony.jpg",
  "home/guides/guia-victoria.jpg",
  "home/guides/guia-vini.jpg",
  "home/guides/guia-yago.jpg",
  "home/leaf-texture - horizontal.jpg",
  "home/leaf-texture.jpg",
  "home/logo-atmos.png",
  "home/simboloatmos.png",
  "preferencias/preferencias-bg.jpeg",
  "proposta-visual-cliente/leaf-texture - horizontal.jpg",
  "proposta-visual-cliente/propostavisualbg.jpg"
]);
const bundled = import.meta.glob<string>("../assets/*.{jpg,jpeg,png,webp,avif,svg}", {
  eager: true, query: "?url", import: "default",
});

export function staticMediaUrl(path: string): string | undefined {
  if (publicFiles.has(path)) {
    return `/assets/${path.split("/").map(encodeURIComponent).join("/")}`;
  }
  if (path.startsWith("home/")) {
    const file = path.slice(5);
    return bundled[`../assets/${file === "hero-home.jpg" ? "hero-chapada.jpg" : file}`];
  }
}
