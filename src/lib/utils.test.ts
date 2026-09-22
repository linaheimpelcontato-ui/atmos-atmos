import { expect, it } from "vitest";
import { cn } from "./utils";

it("resolves custom overlay layers and explicit consumer overrides in either order", () => {
  expect(cn("fixed z-overlay", "z-[9999]")).toBe("fixed z-[9999]");
  expect(cn("z-50", "z-overlay")).toBe("z-overlay");
  expect(cn("z-overlay", "z-50")).toBe("z-50");
});
