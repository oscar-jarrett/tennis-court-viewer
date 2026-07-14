// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, nitro (build-only), componentTagger (dev-only),
// VITE_* env injection, @ path alias, React/TanStack dedupe, error logger
// plugins, and sandbox detection. Do not add those plugins manually.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// On Vercel CI the `VERCEL` env var is set — pin the nitro preset to "vercel"
// so the build emits a Vercel-compatible output. Inside the Lovable sandbox
// this is ignored (Cloudflare is forced). Locally, `nitro: true` force-enables
// the deploy plugin (default would skip it outside Lovable).
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts.
    server: { entry: "server" },
  },
  nitro: isVercel ? { preset: "vercel" } : true,
});