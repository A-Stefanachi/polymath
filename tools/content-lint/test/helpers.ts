// Builds a failing template from a fixture: a base sample template plus a small patch. The bases
// are the real samples under polymath-app-spec/content (never copied), so a fixture stays valid
// when the schema moves and each file shows only what breaks the rule.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse, stringify } from "yaml";

import { CONTENT_ROOT } from "../src/config.ts";

export const FIXTURES = fileURLToPath(new URL("../fixtures", import.meta.url));
export const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const SAMPLES = path.join(CONTENT_ROOT, "sample-problem-templates");
export const BASES: Record<string, string> = {
  numeric: "tpl.elec.voltage-divider-vout",
  choice: "tpl.elec.series-parallel-req-mc",
  code: "tpl.sw.debounce-counter-c",
  spice: "tpl.elec.rc-lowpass-netlist",
  fault: "tpl.elec.divider-fault-drill",
};

type Patch = {
  base: string;
  /** File name when it must differ from `<key>.yaml` (L01). */
  file?: string;
  set?: Record<string, unknown>;
  unset?: string[];
  /** Contents of a --synced file (L03). */
  synced?: Record<string, unknown>;
  /** More templates written next to this one (L21). */
  extra?: Patch[];
};

function expand(v: unknown): unknown {
  if (typeof v === "object" && v !== null && "$repeat" in v) {
    const r = v as { $repeat: string; times: number };
    return r.$repeat.repeat(r.times);
  }
  return v;
}

function walk(doc: unknown, dotted: string): { parent: Record<string, unknown> | unknown[]; key: string } {
  const parts = dotted.split(".");
  let cur = doc as Record<string, unknown> | unknown[];
  for (const p of parts.slice(0, -1)) cur = (cur as Record<string, unknown>)[p] as Record<string, unknown> | unknown[];
  return { parent: cur, key: parts.at(-1) ?? "" };
}

function build(patch: Patch, dir: string): void {
  const doc: unknown = parse(readFileSync(path.join(SAMPLES, `${BASES[patch.base] ?? ""}.yaml`), "utf8"), { schema: "core" });
  for (const [p, v] of Object.entries(patch.set ?? {})) {
    const { parent, key } = walk(doc, p);
    (parent as Record<string, unknown>)[key] = expand(v);
  }
  for (const p of [...(patch.unset ?? [])]) {
    const { parent, key } = walk(doc, p);
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else Reflect.deleteProperty(parent, key);
  }
  const name = patch.file ?? `${(doc as { key: string }).key}.yaml`;
  writeFileSync(path.join(dir, name), stringify(doc));
  for (const e of patch.extra ?? []) build(e, dir);
}

/** Writes the fixture's templates to a new folder and runs the CLI on it. */
export function runFixture(id: string): { status: number | null; output: string } {
  const patch = JSON.parse(readFileSync(path.join(FIXTURES, `${id}.json`), "utf8")) as Patch;
  const dir = mkdtempSync(path.join(tmpdir(), `pm_fix_${id}_`));
  build(patch, dir);
  const args = [CLI, "--content-root", CONTENT_ROOT];
  if (patch.synced) {
    const synced = path.join(dir, "..", `${path.basename(dir)}.synced.json`);
    writeFileSync(synced, JSON.stringify(patch.synced));
    args.push("--synced", synced);
  }
  args.push(dir);
  const run = spawnSync("node", args, { encoding: "utf8" });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}
