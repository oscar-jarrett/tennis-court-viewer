import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Explicitly forces TanStack Start to compile as a static SPA
    spa: {
      enabled: true,
      prerender: {
        enabled: true,
      }
    }
  },
  vite: {
    base: "/tennis-court-viewer/", // Prepends GitHub repository subfolder path
  },
  nitro: true // Creates the output in .output/public
});