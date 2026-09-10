import { defineConfig } from "vitest/config";
import path from "node:path";

// Test config only — production build still uses next build/Turbopack.
// Vitest is scoped to tests/unit and tests/integration; tests/e2e is
// reserved for a browser-based runner (Playwright) per Architecture
// Proposal section 11.6, not covered by this config.
//
// firestore-rules tests are EXCLUDED here — they require a running
// Firestore emulator (firebase emulators:start) and would fail
// `npm run test` in any environment without one. Run them explicitly
// via `npm run test:rules` (see package.json and
// vitest.config.rules.mts) once the emulator is running.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/integration/firestore-rules/**"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
