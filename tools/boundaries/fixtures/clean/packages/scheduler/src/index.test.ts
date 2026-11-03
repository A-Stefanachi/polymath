// Allowed: a test may read its vector file from disk.
import { readFileSync } from "node:fs";

export const vectors: unknown = JSON.parse(readFileSync("vectors.json", "utf8"));
