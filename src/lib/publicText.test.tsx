import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { publicText } from "./publicText";
afterEach(cleanup);
it("renders legacy localized names and descriptions as text", () => {
  render(<article><h2>{publicText({ pt: "Cachoeira", en: "Waterfall" }, "en")}</h2><p>{publicText({ pt: "Descrição", en: "Description" }, "en")}</p></article>);
  expect(screen.getByRole("heading").textContent).toBe("Waterfall");
  expect(screen.getByText("Description")).toBeTruthy();
});
it("supports strings, missing translations and rejects nested objects", () => {
  expect(publicText("Guia", "pt")).toBe("Guia");
  expect(publicText({ pt: "Guia" }, "en")).toBe("Guia");
  expect(publicText({ pt: { secret: "internal" } }, "pt")).toBe("");
  expect(publicText(null, "pt")).toBe("");
});
