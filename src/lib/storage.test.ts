import { describe, expect, it } from "vitest";
import { storageUrl, heroUrl, cardUrl, correctStoragePath, exactStorageUrl, optimizedUrl, IMAGE_PRESETS } from "./storage";

describe("storage URL routing", () => {
  it("serves shipped files consistently without altering accented filenames", () => {
    const key = "destaques-categorias/Serviços-Destaque-1.jpg";
    const expected = "/assets/destaques-categorias/Servi%C3%A7os-Destaque-1.jpg";
    expect(storageUrl(key)).toBe(expected);
    expect(heroUrl(key)).toBe(expected);
    expect(cardUrl(key)).toBe(expected);
  });
  it("resolves missing home copies to existing bundled originals", () => {
    expect(storageUrl("home/hero-home.jpg")).toContain("hero-chapada");
    expect(storageUrl("home/exp-massagem.jpg")).toContain("exp-massagem");
    expect(storageUrl("home/waterfall-placeholder-1.jpg")).toContain("waterfall-placeholder-1");
  });
  it("does not fabricate a local path for remote media", () => {
    expect(storageUrl("uploads/new-product/photo.jpg")).toBe("https://assets.atmos.tur.br/uploads/new-product/photo.jpg");
  });
  it("preserves full URLs including signed query parameters", () => {
    const url = "https://bucket.example.com/photo.jpg?token=example&expires=123";
    expect(storageUrl(url)).toBe(url);
  });

  it("normalizes legacy product keys to the canonical R2 layout", () => {
    expect(correctStoragePath("produtos/cachoeiras/Água fria /Água fria -1.jpg"))
      .toBe("produtos/cachoeiras/agua-fria/agua-fria-1.jpg");
    expect(correctStoragePath("produtos/cachoeiras/Almecegas/Almecegas-1.jpg"))
      .toBe("produtos/cachoeiras/almecegas-i-e-ii--sao-bento/almecegas-i-e-ii--sao-bento-1.jpg");
    expect(correctStoragePath("produtos/servicos/lanche.jpg"))
      .toBe("produtos/serviços/lanche-de-trilha-atmos-1.png");
    expect(correctStoragePath("produtos/hospedagens/marley-s-house/marley-s-house-1.jpg"))
      .toBe("produtos/hospedagens/marley-s-house/marley-s-house-1.jpeg");
    expect(correctStoragePath("produtos/experiencias/tirolesa-fazenda-sao-bento/tirolesa-fazenda-sao-bento-1.jpg"))
      .toBe("produtos/experiencias/tirolesa-fazenda-sao-bento/tirolesa-fazenda-sao-bento-1.png");
    expect(correctStoragePath("HOSPEDAGENS/Villa Eya/Villa Eya-1.jpg"))
      .toBe("produtos/hospedagens/villa-eya/villa-eya-1.jpg");
  });

  it("keeps canonical keys stable while fixing the drone -1 alias", () => {
    const canonical = "produtos/serviços/registro-com-drone/registro-com-drone-2.jpg";
    expect(correctStoragePath(canonical)).toBe(canonical);
    expect(correctStoragePath("produtos/serviços/registro-com-drone/registro-com-drone-1.jpg"))
      .toBe("produtos/serviços/registro-com-drone-captacao-com-edicao/registro-com-drone-captacao-com-edicao-1.jpg");
  });

  it("builds an edge-optimized URL for remote R2 media", () => {
    const optimized = optimizedUrl(
      "produtos/cachoeiras/agua-fria/agua-fria-1.jpg",
      { ...IMAGE_PRESETS.card, resize: "cover" },
    );
    const parsed = new URL(optimized);

    expect(parsed.hostname).toBe("wsrv.nl");
    expect(parsed.searchParams.get("url")).toBe(
      "https://assets.atmos.tur.br/produtos/cachoeiras/agua-fria/agua-fria-1.jpg",
    );
    expect(parsed.searchParams.get("w")).toBe("800");
    expect(parsed.searchParams.get("q")).toBe("75");
    expect(parsed.searchParams.get("output")).toBe("webp");
    expect(parsed.searchParams.get("fit")).toBe("cover");
  });

  it("preserves the exact extension returned by a dynamic R2 listing", () => {
    const optimized = optimizedUrl(
      exactStorageUrl("produtos/hospedagens/amana-hotel/amana-hotel-11.jpeg"),
      IMAGE_PRESETS.card,
    );
    const parsed = new URL(optimized);

    expect(parsed.searchParams.get("url")).toBe(
      "https://assets.atmos.tur.br/produtos/hospedagens/amana-hotel/amana-hotel-11.jpeg",
    );
  });

  it("keeps bundled and third-party images out of the R2 image proxy", () => {
    expect(optimizedUrl("home/cat-experiences.jpg", IMAGE_PRESETS.card)).toContain("/assets/");
    expect(optimizedUrl("https://images.example.com/photo.jpg", IMAGE_PRESETS.card))
      .toBe("https://images.example.com/photo.jpg");
  });
});
