// File walking and per-file scanning for pnpm claims:lint (BL-0006).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { splitLines, pyStrip } from "./pyre.ts";
import { hitsInLine, type PatternSource } from "./rules.ts";

export type Finding = {
  file: string;
  line: number;
  category: string;
  fragment: string;
  source: PatternSource;
  snippet: string;
  /** Why the hit is excused, or undefined for a violation. */
  reason?: string;
};

export type AllowEntry = { path: string; reason: string };

/** Scans one file's text. Every hit is a violation; allow-listed files are handled by the caller. */
export function scanText(text: string): Finding[] {
  const lines = splitLines(text);
  const out: Finding[] = [];
  lines.forEach((ln, i) => {
    for (const hit of hitsInLine(ln)) {
      out.push({
        file: "",
        line: i + 1,
        category: hit.category,
        fragment: hit.fragment,
        source: hit.source,
        snippet: pyStrip(ln).slice(0, 160),
      });
    }
  });
  return out;
}

// What claims:lint scans, from the repository root (BL-0006: app strings, content, prompts and
// docs; the spec folders live under polymath-app-spec/ per the root CLAUDE.md).
export const SCAN_DIRS = [
  "apps/web/src",
  "packages",
  "prompts",
  "polymath-app-spec/docs",
  "polymath-app-spec/content",
  "polymath-app-spec/backlog",
];
export const SCAN_FILES = ["README.md", "CLAUDE.md", "AGENTS.md", "polymath-app-spec/README.md", "polymath-app-spec/CLAUDE.md"];
const EXTS = new Set([".md", ".yaml", ".yml", ".txt", ".json", ".sql", ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP_DIRS = new Set(["__pycache__", ".pytest_cache", "node_modules", ".git", ".next", "dist", "coverage", "fixtures"]);
// Test files quote forbidden strings on purpose (tutor adversarial cases, this lint's own tests).
const SKIP_FILE = /\.test\.[cm]?[jt]sx?$/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (EXTS.has(path.extname(name).toLowerCase()) && !SKIP_FILE.test(name)) {
      out.push(full);
    }
  }
}

export function repoFiles(root: string): string[] {
  const out: string[] = [];
  for (const d of SCAN_DIRS) walk(path.join(root, d), out);
  for (const f of SCAN_FILES) {
    const p = path.join(root, f);
    try {
      if (statSync(p).isFile()) out.push(p);
    } catch {
      // optional file
    }
  }
  return out;
}

const decoder = new TextDecoder("utf-8", { fatal: true });

/** File text with universal newlines, or undefined when it is not UTF-8 (skipped, as in the reference). */
export function readText(file: string): string | undefined {
  try {
    return decoder.decode(readFileSync(file)).replace(/\r\n?/g, "\n");
  } catch {
    return undefined;
  }
}

export function loadAllowlist(file: string): AllowEntry[] {
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${file}: expected an array`);
  return raw.map((e: unknown, i) => {
    if (
      typeof e !== "object" ||
      e === null ||
      typeof (e as AllowEntry).path !== "string" ||
      typeof (e as AllowEntry).reason !== "string" ||
      (e as AllowEntry).reason.trim().length < 10
    ) {
      throw new Error(`${file}[${String(i)}]: each entry needs "path" and a "reason" of at least 10 characters`);
    }
    return { path: (e as AllowEntry).path, reason: (e as AllowEntry).reason };
  });
}

export type RepoResult = { files: number; findings: Finding[] };

export function scanRepo(root: string, allow: AllowEntry[]): RepoResult {
  const files = repoFiles(root);
  const findings: Finding[] = [];
  for (const file of files) {
    const text = readText(file);
    if (text === undefined) continue;
    const rel = path.relative(root, file).split(path.sep).join("/");
    const allowed = allow.find((a) => a.path === rel);
    for (const f of scanText(text)) {
      findings.push({ ...f, file: rel, ...(allowed ? { reason: `allowlist: ${allowed.reason}` } : {}) });
    }
  }
  return { files: files.length, findings };
}
