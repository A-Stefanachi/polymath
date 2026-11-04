// Constants of the G1 rules in one place. Content itself stays under polymath-app-spec/content and
// is never copied (root CLAUDE.md).
import { fileURLToPath } from "node:url";

/** polymath-app-spec/content, the YAML source of truth. */
export const CONTENT_ROOT = fileURLToPath(new URL("../../../polymath-app-spec/content", import.meta.url));

/** The skill graph file and the prompt folder below a content root. */
export const GRAPH_FILE = "mvp-skill-graph.yaml";
export const PROMPTS_DIR = "prompts";

/** Licences a template or skill may declare (doc 07 section 11). */
export const ALLOWED_LICENSES = ["original", "CC0-1.0", "CC-BY-4.0", "MIT", "licensed-commercial"] as const;

/**
 * Named SVG figure templates the figure renderer knows (L17). The renderer is a later task; until it
 * exists this list is the registry, and a new figure adds its name here in the same change.
 */
export const KNOWN_SVG_TEMPLATES = ["divider_v1", "rc_lowpass_v1", "series_parallel_r1_r2r3_v1"] as const;
