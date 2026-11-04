export type Doc = Record<string, unknown>;

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function asDoc(v: unknown): Doc {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Doc) : {};
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Every string below `v` with its dotted path, e.g. `render.stem_md`, `hints.l1`, `answer.options.2.text_md`. */
export function* stringsWithPath(v: unknown, path = ""): Generator<[string, string]> {
  if (typeof v === "string") yield [path, v];
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* stringsWithPath(x, path === "" ? String(i) : `${path}.${String(i)}`);
  else if (typeof v === "object" && v !== null)
    for (const [k, x] of Object.entries(v)) yield* stringsWithPath(x, path === "" ? k : `${path}.${k}`);
}
