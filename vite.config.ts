import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    ssr: false, // Safely strips Node.js dependencies and forces a client-only build
  },
  vite: {
    base: "/tennis-court-viewer/", // GitHub Pages subfolder
  }
});