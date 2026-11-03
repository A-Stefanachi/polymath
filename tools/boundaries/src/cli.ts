// pnpm lint:boundaries [--root DIR]: the module boundary rules of doc 03 section 13.1.
// Exit 0 when clean, 1 on any violation, 2 when the check itself could not run.
import path from "node:path";
import { parseArgs } from "node:util";

import { checkBoundaries } from "./run.ts";

const { values } = parseArgs({ options: { root: { type: "string", default: "." } } });
const root = path.resolve(values.root ?? ".");

try {
  const violations = await checkBoundaries(root);
  for (const v of violations) {
    const where = v.line === undefined ? v.file : `${v.file}:${String(v.line)}`;
    console.log(`${where} [${v.rule}] (${v.tool}) ${v.message}`);
  }
  if (violations.length > 0) {
    console.log(`lint:boundaries: ${String(violations.length)} violation(s)`);
    process.exitCode = 1;
  } else {
    console.log("lint:boundaries: no violations");
  }
} catch (error) {
  console.error("lint:boundaries could not run:", error);
  process.exitCode = 2;
}
