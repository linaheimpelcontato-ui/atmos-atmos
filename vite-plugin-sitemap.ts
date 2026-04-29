import type { Plugin } from "vite";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { loadEnv } from "vite";

export default function sitemapPlugin(): Plugin {
  return {
    name: "vite-plugin-sitemap",
    apply: "build",
    async closeBundle() {
      const env = loadEnv("", process.cwd());
      const EDGE_FN_URL = `${env.VITE_SUPABASE_URL}/functions/v1/sitemap`;
      try {
        console.log("[sitemap] Fetching sitemap from edge function…");
        const res = await fetch(EDGE_FN_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const outDir = resolve(process.cwd(), "dist");
        mkdirSync(outDir, { recursive: true });
        writeFileSync(resolve(outDir, "sitemap.xml"), xml, "utf-8");
        console.log("[sitemap] ✅ dist/sitemap.xml written");
      } catch (err) {
        console.warn("[sitemap] ⚠️ Failed to fetch sitemap, skipping:", err);
      }
    },
  };
}
