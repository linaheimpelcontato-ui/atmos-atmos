import path from "node:path";
import { describe, expect, it } from "vitest";
import { homologViteConfig } from "../../scripts/homolog-config.mjs";

describe("homolog development isolation", () => {
  it("uses a cache separate from the normal development server and Vitest", () => {
    const root = process.cwd();
    const config = homologViteConfig(root, "http://127.0.0.1:54321");
    expect(config.root).toBe(root);
    expect(config.mode).toBe("homolog");
    expect(config.cacheDir).toBe(path.resolve(root, "node_modules/.vite-homolog"));
    expect(config.cacheDir).not.toBe(path.resolve(root, "node_modules/.vite"));
    expect(config.server).toEqual({
      host: "127.0.0.1", port: 8088, strictPort: true, hmr: { clientPort: 8088 },
    });
  });

  it.each([undefined, "", "https://remote.supabase.co", "http://127.0.0.1:54322"])(
    "refuses an unexpected database URL: %s", (url) => {
      expect(() => homologViteConfig(process.cwd(), url)).toThrow("Homologação exige");
    },
  );
});
