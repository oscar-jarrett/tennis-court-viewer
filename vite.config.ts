import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    prerender: {
      routes: ["/"], // Generates a static index.html
    },
  },
  vite: {
    base: "/tennis-court-viewer/", // Prepend GitHub subfolder path
  },
  nitro: true // <-- MUST be active to output to .output/public!
});