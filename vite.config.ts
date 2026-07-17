import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Force the underlying Nitro engine to build a static site specifically for GitHub Pages
  nitro: {
    preset: 'github-pages',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/tennis-court-viewer/'], 
    },
  } as any, // <-- This 'as any' silences the TypeScript error!
  
  tanstackStart: {
    ssr: false, // Keep Node.js dependencies out of the client bundle
  },
  
  vite: {
    base: "/tennis-court-viewer/", 
  }
});