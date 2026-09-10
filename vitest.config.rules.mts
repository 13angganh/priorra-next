import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate config for firestore-rules tests, which require a
// running Firestore emulator. Run with:
//   firebase emulators:start   (in one terminal)
//   npm run test:rules         (in another)
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/firestore-rules/**/*.test.ts"],
    globals: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
