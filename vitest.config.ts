import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig sets `jsx: preserve` for the Next compiler, which would leave JSX
  // untransformed under test. Vite 8 transforms via Oxc and lets the Vite config
  // win over tsconfig, so configure the React 17+ automatic runtime here to load
  // `.tsx` modules (e.g. lib/pdf/template.tsx) without a per-file React import.
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    // Mirror tsconfig's `@/*` → `./*` path alias so test files (and the source
    // modules they import) can resolve `@/lib/...` at runtime, not just at
    // type-check time.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
