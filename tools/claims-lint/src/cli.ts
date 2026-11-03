// pnpm claims:lint [--root DIR] [--show-allowed] [--selftest]
// The claims policy of contract section 8 over app strings, content, prompts and docs (BL-0006,
// FR-126, ST-CLAIM-01), with the allow-context rule of reference/lint_claims.py (BL-0194).
// --show-allowed also lists every excused hit and why: read it whenever a section with an
// exclusion heading is edited, because the rule is lexical (00f section 9).
// Exit 0 when clean, 1 on any violation or a failed self-test, 2 when the lint could not run.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadAllowlist, scanRepo } from "./scan.ts";
import { SELFTEST_CASES, selftest } from "./selftest.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST = path.join(HERE, "..", "allowlist.json");

const { values } = parseArgs({
  options: {
    root: { type: "string", default: path.join(HERE, "..", "..", "..") },
    "show-allowed": { type: "boolean", default: false },
    selftest: { type: "boolean", default: false },
  },
});

function runSelftest(): void {
  const failures = selftest();
  for (const f of failures) console.log(`SELFTEST FAIL: ${f}`);
  console.log(
    failures.length === 0
      ? `claims:lint selftest ok (${String(SELFTEST_CASES)} cases)`
      : `claims:lint selftest FAILED (${String(failures.length)})`,
  );
  process.exitCode = failures.length === 0 ? 0 : 1;
}

function runLint(): void {
  const root = path.resolve(values.root ?? ".");
  const { files, findings } = scanRepo(root, loadAllowlist(ALLOWLIST));
  let violations = 0;
  let excused = 0;
  for (const f of findings) {
    if (f.reason === undefined) {
      violations++;
      console.log(`${f.file}:${String(f.line)}: VIOLATION [${f.category}] '${f.fragment}' :: ${f.snippet}`);
    } else {
      excused++;
      if (values["show-allowed"]) {
        console.log(`${f.file}:${String(f.line)}: allowed(${f.reason}) [${f.category}] '${f.fragment}'`);
      }
    }
  }
  console.log(
    `claims:lint: scanned ${String(files)} files, ${String(violations)} violation(s), ${String(excused)} hit(s) excused`,
  );
  process.exitCode = violations > 0 ? 1 : 0;
}

try {
  if (values.selftest) runSelftest();
  else runLint();
} catch (error) {
  console.error("claims:lint could not run:", error);
  process.exitCode = 2;
}
