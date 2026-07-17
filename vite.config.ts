import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true, // Compiles purely as a client-side Single Page App
    },
    prerender: {
      enabled: false, // <-- Explicitly prevents the pipeline from trying to prerender "/"
    }
  },
  vite: {
    base: "/tennis-court-viewer/", // Prepends your GitHub repo name
  },
  nitro: true // Keeps the final compilation output targeted to .output/public
});