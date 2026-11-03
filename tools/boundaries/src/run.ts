// Runs the three parts of the module boundary check (doc 03 section 13.1) on one repository
// root and returns every violation. The root is a parameter so the fixture tests can point it
// at small fake repositories under tools/boundaries/fixtures.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cruise, type ICruiseOptions, type ICruiseResult } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";
import { ESLint } from "eslint";

import { CRUISE_TARGETS, FORBIDDEN } from "./depcruise-rules.ts";
import { boundaryEslintConfig, ESLINT_TARGETS } from "./eslint-rules.ts";

export type Violation = {
  tool: "eslint" | "dependency-cruiser" | "python";
  rule: string;
  file: string;
  line?: number;
  message: string;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_TSCONFIG = "apps/web/tsconfig.json";

export async function eslintViolations(root: string): Promise<Violation[]> {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: boundaryEslintConfig(),
    errorOnUnmatchedPattern: false,
  });
  const results = await eslint.lintFiles(ESLINT_TARGETS);
  const found: Violation[] = [];
  for (const result of results) {
    for (const msg of result.messages) {
      // Fatal parse errors have no ruleId; they still fail the check.
      // Boundary messages carry their rule id as `[rule-id]`; core rules such as max-lines don't.
      const tagged = /\[([a-z0-9-]+)\]/.exec(msg.message);
      found.push({
        tool: "eslint",
        rule: tagged?.[1] ?? msg.ruleId ?? "parse-error",
        file: path.relative(root, result.filePath),
        line: msg.line,
        message: msg.message,
      });
    }
  }
  return found;
}

export async function cruiseViolations(root: string): Promise<Violation[]> {
  const targets = CRUISE_TARGETS.filter((t) => existsSync(path.join(root, t)));
  if (targets.length === 0) return [];
  const tsconfigPath = path.join(root, WEB_TSCONFIG);
  const hasTsconfig = existsSync(tsconfigPath);
  const options: ICruiseOptions = {
    baseDir: root,
    validate: true,
    ruleSet: { forbidden: FORBIDDEN },
    exclude: { path: "(^|/)(node_modules|\\.next|dist|coverage)/" },
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
  };
  const transpile = hasTsconfig ? { tsConfig: extractTSConfig(tsconfigPath) } : undefined;
  // The web app's `@/*` path alias (apps/web/tsconfig.json) is given to the resolver directly:
  // the tsconfig has no baseUrl (deprecated in TypeScript 6), which the tsconfig-paths resolver
  // that dependency-cruiser uses needs.
  const output = await cruise(
    targets,
    options,
    { bustTheCache: true, alias: { "@": path.join(root, "apps/web/src") } },
    transpile,
  );
  const result = output.output as ICruiseResult;
  return result.summary.violations.map((v) => ({
    tool: "dependency-cruiser" as const,
    rule: v.rule.name,
    file: v.from,
    message: `imports ${v.to}: ${FORBIDDEN.find((r) => r.name === v.rule.name)?.comment ?? ""}`,
  }));
}

export function pythonViolations(root: string): Violation[] {
  const python = process.env["PYTHON"] ?? "python3";
  const run = spawnSync(python, ["-B", path.join(HERE, "check_python.py"), "--root", root], {
    encoding: "utf8",
  });
  if (run.error) throw run.error;
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`check_python.py failed (exit ${String(run.status)}): ${run.stderr}`);
  }
  return run.stdout
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line): Violation => {
      const m = /^(.+?):(\d+) \[([a-z0-9-]+)\] (.*)$/.exec(line);
      if (!m) return { tool: "python", rule: "unknown", file: line, message: line };
      return {
        tool: "python",
        rule: m[3] ?? "unknown",
        file: m[1] ?? line,
        line: Number(m[2]),
        message: m[4] ?? line,
      };
    });
}

export async function checkBoundaries(root: string): Promise<Violation[]> {
  const [lint, graph] = await Promise.all([eslintViolations(root), cruiseViolations(root)]);
  return [...lint, ...graph, ...pythonViolations(root)];
}
