// The one place that names where content lives (root CLAUDE.md: content and schemas stay under
// polymath-app-spec/ and are never copied). The G0 schemas are read by @polymath/content-schema
// from polymath-app-spec/schemas; this tool never opens them itself.
import { fileURLToPath } from "node:url";

/** polymath-app-spec/content, the YAML source of truth. */
export const CONTENT_ROOT = fileURLToPath(new URL("../../../polymath-app-spec/content", import.meta.url));

/**
 * What is read below a content root. Skills, edges and modules come from the graph file.
 * content/sample-problem-templates/ is deliberately not read: it holds documentation samples, two
 * of which reuse the keys of production templates (tpl.elec.series-parallel-req-mc,
 * tpl.elec.voltage-divider-vout) with other versions, and doc 07 section 10 step 1 names
 * content/templates/** only.
 */
export const CONTENT_LAYOUT = {
  graph: "mvp-skill-graph.yaml",
  templates: "templates",
  lessons: "lessons",
  reviewLog: "REVIEW-LOG.md",
  prompts: "prompts",
} as const;

/** The only environment variable with a secret (doc 03 section 9.1); never printed. */
export const DATABASE_ENV = "DATABASE_URL_PRIVILEGED";

/** Licences a template or skill may declare (doc 07 section 11). */
export const ALLOWED_LICENSES = ["original", "CC0-1.0", "CC-BY-4.0", "MIT", "licensed-commercial"] as const;
