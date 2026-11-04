import { defineConfig } from "vitest/config";

// The runner prints the vector count and the skipped count per function (BL-0033 acceptance test).
export default defineConfig({ test: { silent: false } });
