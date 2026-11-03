// Canonical hashing of content (doc 07 section 10 step 3). The oracle is
// polymath-app-spec/reference/verifiers/tplkit.py `template_sha256`:
//   sha256(json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
// with `authoring_status` and `provenance.review` removed. JavaScript numbers do not distinguish 1
// from 1.0 and print 1e-06 as 0.000001, so the value is built from the YAML syntax tree, which
// keeps the source text of each number, and printed the way Python's json module prints it.
import { createHash } from "node:crypto";

import { isAlias, isMap, isScalar, isSeq, type Document, type Node } from "yaml";

/** A float as Python reads it from YAML (a number written with a point or an exponent). */
export class PyFloat {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

export type Typed = null | boolean | string | number | bigint | PyFloat | Typed[] | { [key: string]: Typed };

const INT_SOURCE = /^[-+]?[0-9]+$|^0x[0-9a-fA-F]+$|^0o[0-7]+$/;

function typedFromNode(node: unknown, doc: Document): Typed {
  if (isAlias(node)) return typedFromNode(node.resolve(doc), doc);
  if (isScalar(node)) {
    const v = node.value;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error(`non-finite number ${String(v)} cannot be hashed`);
      const src = typeof node.source === "string" ? node.source : String(v);
      return INT_SOURCE.test(src) ? v : new PyFloat(v);
    }
    if (v === null || typeof v === "boolean" || typeof v === "string" || typeof v === "bigint") return v;
    throw new Error(`unsupported scalar of type ${typeof v}`);
  }
  if (isMap(node)) {
    const out: { [key: string]: Typed } = {};
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? pair.key.value : undefined;
      if (typeof key !== "string") throw new Error("mapping keys must be strings");
      out[key] = typedFromNode(pair.value, doc);
    }
    return out;
  }
  if (isSeq(node)) return node.items.map((item) => typedFromNode(item, doc));
  if (node === null || node === undefined) return null;
  throw new Error("unsupported YAML node");
}

/** The typed value of a parsed YAML document. */
export function typedFromDocument(doc: Document): Typed {
  return typedFromNode(doc.contents as Node | null, doc);
}

/** Python's repr(float), the form json.dumps uses. */
export function pyFloatRepr(x: number): string {
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const [mant = "", expStr = "0"] = Math.abs(x).toExponential().split("e");
  const exp = Number(expStr);
  const digits = mant.replace(".", "");
  const sign = x < 0 ? "-" : "";
  if (exp < -4 || exp >= 16) {
    const m = digits.length > 1 ? `${digits[0] ?? ""}.${digits.slice(1)}` : digits;
    const e = Math.abs(exp) < 10 ? `0${String(Math.abs(exp))}` : String(Math.abs(exp));
    return `${sign}${m}e${exp < 0 ? "-" : "+"}${e}`;
  }
  if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  if (digits.length <= exp + 1) return `${sign}${digits}${"0".repeat(exp + 1 - digits.length)}.0`;
  return `${sign}${digits.slice(0, exp + 1)}.${digits.slice(exp + 1)}`;
}

// Python sorts keys by code point; JavaScript's default sorts by UTF-16 unit.
function compareCodePoints(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = (x[i]?.codePointAt(0) ?? 0) - (y[i]?.codePointAt(0) ?? 0);
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

/** json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False). */
export function canonicalJson(value: Typed): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof PyFloat) return pyFloatRepr(value.value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort(compareCodePoints);
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k] ?? null)}`).join(",")}}`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function isObject(v: Typed | undefined): v is { [key: string]: Typed } {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof PyFloat);
}

/** Hash of a template body; review sign-offs are valid only for this hash (doc 07 section 8). */
export function templateSha256(template: Typed): string {
  if (!isObject(template)) throw new Error("a template must be a mapping");
  const body: { [key: string]: Typed } = {};
  for (const [k, v] of Object.entries(template)) if (k !== "authoring_status") body[k] = v;
  const provenance = body["provenance"];
  if (!isObject(provenance)) throw new Error("a template needs a provenance mapping");
  const rest: { [key: string]: Typed } = {};
  for (const [k, v] of Object.entries(provenance)) if (k !== "review") rest[k] = v;
  body["provenance"] = rest;
  return sha256Hex(canonicalJson(body));
}

/** Hash of any other content entry, for example a skill without its prerequisites. */
export function entrySha256(entry: Typed, omit: readonly string[] = []): string {
  if (!isObject(entry)) throw new Error("an entry must be a mapping");
  const body: { [key: string]: Typed } = {};
  for (const [k, v] of Object.entries(entry)) if (!omit.includes(k)) body[k] = v;
  return sha256Hex(canonicalJson(body));
}
