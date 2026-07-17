import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // We use the Lovable wrapper so you get all your Tailwind and CSS plugins back!
  vite: {
    base: "/tennis-court-viewer/", 
    resolve: {
      alias: [
        { find: "@", replacement: "/src" },
        // Inject the magic crash-preventer directly into Lovable's pipeline
        { find: "node:async_hooks", replacement: "/src/mock-async-hooks.js" }
      ]
    }
  }
});