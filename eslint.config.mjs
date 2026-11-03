// Shared flat config for packages/*. apps/web has its own config that adds Next.js rules.
// Module boundary rules (doc 03 section 13.1) live in tools/boundaries and run as pnpm lint:boundaries.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "polymath-app-spec/**",
      "tools/boundaries/fixtures/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
);
