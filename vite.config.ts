import { defineConfig } from "vite";

// This tiny plugin mocks the Node.js backend requirements
// so the compiler doesn't crash when building your static client files.
const mockNodeModules = () => ({
  name: "mock-node-modules",
  resolveId(id) {
    if (id === "node:async_hooks") return "\0node:async_hooks";
  },
  load(id) {
    if (id === "\0node:async_hooks") return "export const AsyncLocalStorage = class {};";
  }
});

export default defineConfig({
  base: "/tennis-court-viewer/", // Tells the bundler we are on GitHub Pages
  resolve: {
    alias: {
      "@": "/src" // Keeps your component imports working
    }
  },
  plugins: [mockNodeModules()],
  build: {
    outDir: "dist", // Standard Vite output folder
    emptyOutDir: true
  }
});