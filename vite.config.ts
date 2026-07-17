import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: true // This forces the Nitro engine to run during Vercel builds
});