import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    ssr: false, // This is the correct way to disable SSR in Lovable's wrapper
  },
});