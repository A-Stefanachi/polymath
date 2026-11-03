// ESLint part of the module boundary rules (doc 03 section 13.1, CLAUDE.md rules 2.6 and 2.9).
// Only core ESLint rules are used, so every message names the rule it enforces and the
// allowed alternative. The import graph is checked again, resolved, by dependency-cruiser.
import type { Linter } from "eslint";
import tseslint from "typescript-eslint";

type ImportPattern = { group: string[]; message: string };

// Packages that talk to an LLM provider. Only packages/llm may import them (doc 03 section 13.1).
export const LLM_SDK_PATTERNS: ImportPattern = {
  group: [
    "openai",
    "openai/*",
    "@anthropic-ai/*",
    "@openrouter/*",
    "ai",
    "@ai-sdk/*",
    "langchain",
    "langchain/*",
    "@langchain/*",
    "@google/generative-ai",
    "@google/genai",
    "cohere-ai",
    "@mistralai/*",
    "groq-sdk",
    "ollama",
  ],
  message:
    "[llm-sdk-only-in-packages-llm] Only packages/llm imports an LLM SDK; call the LlmClient interface from @polymath/llm (doc 03 section 13.1).",
};

const UI_PATTERNS: ImportPattern[] = [
  {
    group: [
      "**/server/privileged",
      "**/server/privileged/**",
      "@/server/privileged",
      "@/server/privileged/**",
    ],
    message:
      "[ui-no-privileged] UI code never imports server/privileged; call a route handler or a server action that uses it (CLAUDE.md rule 2.6).",
  },
  {
    group: ["@supabase/supabase-js", "pg", "pg/*", "postgres"],
    message:
      "[ui-no-db-client] UI code never creates a Supabase or Postgres client; use the helpers in src/lib (publishable key only) or a route handler (doc 03 section 13.1).",
  },
];

const PURE_IMPORT_PATTERNS: ImportPattern[] = [
  {
    group: [
      "fs",
      "fs/*",
      "node:fs",
      "node:fs/*",
      "net",
      "node:net",
      "http",
      "node:http",
      "https",
      "node:https",
      "http2",
      "node:http2",
      "child_process",
      "node:child_process",
      "dgram",
      "node:dgram",
      "dns",
      "node:dns",
      "tls",
      "node:tls",
      "worker_threads",
      "node:worker_threads",
      "pg",
      "pg/*",
      "postgres",
      "@supabase/*",
    ],
    message:
      "[packages-pure-io] packages/* are pure: no file system, network or database; take the data or the client as an argument (CLAUDE.md rule 2.9).",
  },
];

const ENV_AND_CLOCK = {
  properties: [
    {
      object: "process",
      property: "env",
      message:
        "[packages-pure-env] packages/* never read process.env; take configuration as an argument (CLAUDE.md rule 2.9).",
    },
    {
      object: "Date",
      property: "now",
      message:
        "[packages-pure-clock] packages/* never read the clock; take `now` as an argument (CLAUDE.md rule 2.9).",
    },
    {
      object: "performance",
      property: "now",
      message:
        "[packages-pure-clock] packages/* never read the clock; take `now` as an argument (CLAUDE.md rule 2.9).",
    },
  ],
  syntax: [
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=0]",
      message:
        "[packages-pure-clock] `new Date()` reads the clock; pass `now` in and use `new Date(now)` (CLAUDE.md rule 2.9).",
    },
  ],
  globals: [
    {
      name: "process",
      message:
        "[packages-pure-env] packages/* never use `process`; take configuration as an argument (CLAUDE.md rule 2.9).",
    },
  ],
};

const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
  name,
  message: `[packages-pure-network] packages/* never call \`${name}\`; inject the transport as an argument (CLAUDE.md rule 2.9).`,
}));

function restrictedImports(patterns: ImportPattern[]): Linter.RuleEntry {
  return ["error", { patterns }];
}

const TS_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const TEST_FILES = ["**/*.test.ts", "**/*.test.tsx", "**/test/**", "**/tests/**"];

/** Flat config with only the boundary rules; paths are relative to the repository root. */
export function boundaryEslintConfig(): Linter.Config[] {
  return [
    {
      files: TS_FILES,
      languageOptions: {
        parser: tseslint.parser as Linter.Parser,
        parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
      },
      linterOptions: { reportUnusedDisableDirectives: "off" },
    },
    // Everything in the web app: no LLM SDK.
    {
      files: ["apps/web/src/**"],
      rules: { "no-restricted-imports": restrictedImports([LLM_SDK_PATTERNS]) },
    },
    // Pages, layouts, route handlers and components: also no privileged module or DB client.
    {
      files: ["apps/web/src/app/**", "apps/web/src/components/**"],
      rules: { "no-restricted-imports": restrictedImports([...UI_PATTERNS, LLM_SDK_PATTERNS]) },
    },
    // Route handlers are thin: parse, call domain, map errors (CLAUDE.md section 3, max 60 lines).
    {
      files: ["apps/web/src/app/api/**/route.ts"],
      rules: {
        "max-lines": [
          "error",
          { max: 60, skipBlankLines: true, skipComments: true },
        ],
      },
    },
    // packages/*: pure (no I/O, env or clock) and no LLM SDK. Tests may read their vector files
    // (doc 06 vectors, grader vectors), so purity applies to production source only.
    {
      files: ["packages/*/src/**"],
      ignores: TEST_FILES,
      rules: {
        "no-restricted-imports": restrictedImports([...PURE_IMPORT_PATTERNS, LLM_SDK_PATTERNS]),
        "no-restricted-properties": ["error", ...ENV_AND_CLOCK.properties],
        "no-restricted-syntax": ["error", ...ENV_AND_CLOCK.syntax],
        "no-restricted-globals": ["error", ...ENV_AND_CLOCK.globals, ...NETWORK_GLOBALS],
      },
    },
    // packages/llm is the one package that reaches a provider, so it may import an SDK and use
    // fetch; it stays free of env and clock (keys and time are injected).
    {
      files: ["packages/llm/src/**"],
      ignores: TEST_FILES,
      rules: {
        "no-restricted-imports": restrictedImports(PURE_IMPORT_PATTERNS),
        "no-restricted-globals": ["error", ...ENV_AND_CLOCK.globals],
      },
    },
  ];
}

export const ESLINT_TARGETS = ["apps/web/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"];
