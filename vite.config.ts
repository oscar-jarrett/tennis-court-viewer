import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // This forces the engine to export a pure, static HTML/JS site!
  nitro: { preset: "static" }, 
});