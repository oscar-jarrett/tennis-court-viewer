import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    prerender: {
      routes: ["/"], // Instructs the Nitro crawler to generate a physical index.html
    },
  },
  vite: {
    base: "/tennis-court-viewer/", // Prepends your GitHub repository subfolder path
  },
  nitro: true // Routes the final static client output to .output/public
});