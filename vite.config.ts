import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    ssr: false, // This is the magic key! It completely disables Server-Side Rendering
  },
  nitro: { 
    preset: "static" 
  },
});