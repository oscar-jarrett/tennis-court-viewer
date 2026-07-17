import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    prerender: {
      routes: ["/"], // <-- Instructs the compiler to generate a static index.html at build time
    },
  },
  vite: {
    base: "/tennis-court-viewer/", // <-- Matches your GitHub subfolder path
  },
});