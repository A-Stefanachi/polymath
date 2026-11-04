import { defineConfig } from "vitest/config";

// The fixture test starts the CLI once per rule, hence the long timeout.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], testTimeout: 120_000 },
});
