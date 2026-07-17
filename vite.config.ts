import { defineConfig } from "vite";

export default defineConfig({
  base: "/tennis-court-viewer/", 
  resolve: {
    alias: [
      { find: "@", replacement: "/src" },
      { find: "node:async_hooks", replacement: "/src/mock-async-hooks.js" }
    ]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});