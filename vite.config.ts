import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/tennis-court-viewer/", // <-- standard Vite settings must be nested inside this block
  },
  nitro: true 
});