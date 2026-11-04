// G1 static lint, rules L01 to L27 of doc 07 section 7. One implementation, used by `pnpm
// content:lint` and by content:sync.
import { modelOf } from "./model.ts";
import * as r from "./rules.ts";
import { l05, l11, l12, l13 } from "./sampled.ts";
import { compilerAvailable, l15, l16, l18 } from "./tools.ts";
import type { Finding, LintOptions, Severity, TemplateInput } from "./types.ts";

export { CONTENT_ROOT, GRAPH_FILE, ALLOWED_LICENSES, PROMPTS_DIR } from "./config.ts";
export { licenceMessages } from "./rules.ts";
export type { Finding, LintOptions, Severity, SyncedTemplate, TemplateInput } from "./types.ts";

type Rule = { id: string; severity: Severity; run: (ctx: r.Ctx) => string[] };

/** Rule ids and severities as in the doc 07 section 7 table. L01 here is the file-name half; the schema half is G0. */
export const RULES: readonly Rule[] = [
  { id: "L01", severity: "E", run: r.l01 },
  { id: "L02", severity: "E", run: r.l02 },
  { id: "L03", severity: "E", run: r.l03 },
  { id: "L04", severity: "E", run: r.l04 },
  { id: "L05", severity: "E", run: l05 },
  { id: "L06", severity: "W", run: r.l06 },
  { id: "L07", severity: "E", run: r.l07 },
  { id: "L08", severity: "E", run: r.l08 },
  { id: "L09", severity: "E", run: r.l09 },
  { id: "L10", severity: "E", run: r.l10 },
  { id: "L11", severity: "E", run: l11 },
  { id: "L12", severity: "E", run: l12 },
  { id: "L13", severity: "E", run: l13 },
  { id: "L14", severity: "E", run: r.l14 },
  { id: "L15", severity: "E", run: l15 },
  { id: "L16", severity: "E", run: l16 },
  { id: "L17", severity: "E", run: r.l17 },
  { id: "L18", severity: "E", run: l18 },
  { id: "L19", severity: "E", run: r.l19 },
  { id: "L20", severity: "E", run: r.l20 },
  { id: "L21", severity: "W", run: r.l21 },
  { id: "L22", severity: "E", run: r.l22 },
  { id: "L23", severity: "E", run: r.l23 },
  { id: "L24", severity: "E", run: r.l24 },
  { id: "L25", severity: "E", run: r.l25 },
  { id: "L26", severity: "W", run: r.l26 },
  { id: "L27", severity: "E", run: r.l27 },
];

/** Runs L01 to L27 on G0-valid templates. A rule that throws is reported as a finding, never swallowed. */
export function lintTemplates(templates: readonly TemplateInput[], opts: LintOptions): Finding[] {
  const out: Finding[] = [];
  let compilerWarned = false;
  for (const { file, doc, sha256 } of templates) {
    const ctx: r.Ctx = { file, t: doc, all: templates, opts, model: modelOf(doc), sha256 };
    for (const rule of RULES) {
      let messages: string[];
      try {
        messages = rule.run(ctx);
      } catch (error) {
        messages = [`the rule failed to run: ${error instanceof Error ? error.message : "unknown error"}`];
      }
      for (const message of messages) out.push({ file, rule: rule.id, severity: rule.severity, message });
    }
    if (doc["grader_type"] === "code_tests" && !compilerAvailable() && !compilerWarned) {
      compilerWarned = true;
      out.push({ file, rule: "L15", severity: "W", message: "no C compiler (gcc) on PATH: the compile check was skipped" });
    }
  }
  return out;
}
