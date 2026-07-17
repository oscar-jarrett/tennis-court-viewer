import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Force Nitro to generate the final index.html for GitHub Pages
  nitro: {
    preset: 'github-pages',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/tennis-court-viewer/'], 
    },
  } as any,
  
  tanstackStart: {
    ssr: false, // Keep Node.js dependencies out of the client bundle
  },
  
  vite: {
    base: "/tennis-court-viewer/", 
    resolve: {
      alias: [
        { find: "@", replacement: "/src" },
        // Our magic crash-preventer
        { find: "node:async_hooks", replacement: "/src/mock-async-hooks.js" }
      ]
    }
  }
});