// Violation: packages-pure-io (a pure package reading the file system).
import { readFileSync } from "node:fs";

export const load = (p: string): string => readFileSync(p, "utf8");
