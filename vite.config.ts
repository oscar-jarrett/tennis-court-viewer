import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Tells TanStack Start to skip compiling Node server assets completely
  // and run purely as a high-performance, client-side SPA
  tanstackStart: {
    spa: {
      enabled: true,
    }
  },
  vite: {
    base: "/tennis-court-viewer/", // Prepends GitHub repository subfolder path
  },
  nitro: true // Compiles cleanly straight into .output/public
});