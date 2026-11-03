import { defineConfig } from "vitest/config";

// Integration tests create a database and run the CLI as a child process, hence the long timeout.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], testTimeout: 120_000, hookTimeout: 120_000 },
});
