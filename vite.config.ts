import { defineConfig } from "vite";

export default defineConfig({
  base: "/tennis-court-viewer/", // GitHub Pages subfolder
  resolve: {
    alias: [
      { find: '@', replacement: '/src' } // Keeps your @/ imports working!
    ],
  },
});