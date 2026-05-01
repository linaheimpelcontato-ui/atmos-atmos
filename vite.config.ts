import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import sitemapPlugin from "./vite-plugin-sitemap";
import ogPagesPlugin from "./vite-plugin-og-pages";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // host: "0.0.0.0",
    port: 8084,
    hmr: {
      overlay: false,
      clientPort: 8084,
    },
  },
  plugins: [react(), mode === "development" && componentTagger() /*, sitemapPlugin(), ogPagesPlugin()*/].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
