import { defineConfig } from "vite";

export default defineConfig({
  base: "/tennis-court-viewer/", // Tells the bundler we are on GitHub Pages
  resolve: {
    alias: [
      { find: "@", replacement: "/src" }, // Keeps your component imports working
      { find: "node:async_hooks", replacement: "/src/mock-async-hooks.js" } // Points to the physical mock file we will create
    ]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});