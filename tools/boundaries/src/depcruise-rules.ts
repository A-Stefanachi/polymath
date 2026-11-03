// dependency-cruiser part of the module boundary rules (doc 03 section 13.1): rules on the
// resolved import graph, so a relative path or a workspace link can't slip past them.
import type { IForbiddenRuleType } from "dependency-cruiser";

// Test files may read vector files from disk (doc 06 and grader vectors); purity is about
// production source.
const TEST_FILE = "(\\.test\\.tsx?$|/tests?/)";

const LLM_SDK_PATH =
  "(^|/)node_modules/(openai|@anthropic-ai|@openrouter|ai|@ai-sdk|langchain|@langchain|@google/generative-ai|@google/genai|cohere-ai|@mistralai|groq-sdk|ollama)/";

export const FORBIDDEN: IForbiddenRuleType[] = [
  {
    name: "ui-no-privileged",
    comment:
      "UI code never imports server/privileged; call a route handler or server action that uses it (CLAUDE.md rule 2.6).",
    severity: "error",
    from: { path: "^apps/web/src/(app|components)/" },
    to: { path: "^apps/web/src/server/privileged/" },
  },
  {
    name: "packages-not-to-apps-or-services",
    comment: "packages/* are shared and pure; they never import app or service code (doc 03 section 13.1).",
    severity: "error",
    from: { path: "^packages/" },
    to: { path: "^(apps|services|tools)/" },
  },
  {
    name: "packages-pure-io",
    comment:
      "packages/* are pure: no file system, network or database module; take data or a client as an argument (CLAUDE.md rule 2.9).",
    severity: "error",
    from: { path: "^packages/", pathNot: TEST_FILE },
    to: {
      dependencyTypes: ["core"],
      path: "^(node:)?(fs|net|http|https|http2|child_process|dgram|dns|tls|worker_threads|cluster)(/|$)",
    },
  },
  {
    name: "packages-no-db-client",
    comment: "packages/* never import a database client (CLAUDE.md rule 2.9).",
    severity: "error",
    from: { path: "^packages/", pathNot: TEST_FILE },
    to: { path: "(^|/)node_modules/(pg|postgres|@supabase)/" },
  },
  {
    name: "core-packages-isolated",
    comment:
      "packages/scheduler and packages/grading-core depend on no workspace code but each other and shared-types (doc 03 section 13.1).",
    severity: "error",
    from: { path: "^packages/(scheduler|grading-core)/" },
    to: { path: "^packages/", pathNot: "^packages/(scheduler|grading-core|shared-types)/" },
  },
  {
    name: "llm-sdk-only-in-packages-llm",
    comment:
      "Only packages/llm imports an LLM SDK; others call the LlmClient interface (doc 03 section 13.1).",
    severity: "error",
    from: { pathNot: "^packages/llm/" },
    to: { path: LLM_SDK_PATH },
  },
];

export const CRUISE_TARGETS = ["apps/web/src", "packages"];
