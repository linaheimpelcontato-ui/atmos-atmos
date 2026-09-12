import { describe, expect, it } from "vitest";
import { storageUrl, heroUrl, cardUrl } from "./storage";

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
});
