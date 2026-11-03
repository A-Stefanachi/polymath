// Python `re` compatibility for the patterns ported from reference/lint_claims.py.
// Python 3 string patterns treat every Unicode letter and digit as a word character for `\b`
// and `\w`; JavaScript's `\b` and `\w` are ASCII only, even with the `u` flag. A pattern such as
// `\b2\s?σ\b` therefore matches different text in the two languages. pyRegExp rewrites `\b`,
// `\B` and `\w` (outside character classes) into Unicode property forms so the TypeScript lint
// and the reference script agree hit for hit (BL-0194 parity test).

const WORD = String.raw`[\p{L}\p{N}_]`;
const BOUNDARY = String.raw`(?:(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_]))`;
const NOT_BOUNDARY = String.raw`(?:(?<=[\p{L}\p{N}_])(?=[\p{L}\p{N}_])|(?<![\p{L}\p{N}_])(?![\p{L}\p{N}_]))`;

export function translatePython(source: string): string {
  let out = "";
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\" && i + 1 < source.length) {
      const next = source[i + 1];
      if (!inClass && next === "b") out += BOUNDARY;
      else if (!inClass && next === "B") out += NOT_BOUNDARY;
      else if (next === "w") out += inClass ? String.raw`\p{L}\p{N}_` : WORD;
      else out += `${ch}${next ?? ""}`;
      i++;
      continue;
    }
    if (ch === "[" && !inClass) inClass = true;
    else if (ch === "]" && inClass) inClass = false;
    out += ch;
  }
  return out;
}

/** A RegExp that behaves like Python's `re.compile(source, re.I if ignoreCase else 0)`. */
export function pyRegExp(source: string, ignoreCase: boolean): RegExp {
  return new RegExp(translatePython(source), ignoreCase ? "iu" : "u");
}

// Every line boundary Python's str.splitlines() recognises. The two Unicode separators are built
// from their code points so no raw U+2028/U+2029 sits in this source file (it would end a regex
// literal).
const UNICODE_SEPARATORS = String.fromCharCode(0x2028, 0x2029);
const BREAKS = `\\r\\n|[\\n\\r\\v\\f\\x1c\\x1d\\x1e\\x85${UNICODE_SEPARATORS}]`;
const LINE_BREAK = new RegExp(BREAKS, "u");
const TRAILING_BREAK = new RegExp(`(?:${BREAKS})$`, "u");

/** Python's str.splitlines(): no trailing empty line. */
export function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(LINE_BREAK);
  if (TRAILING_BREAK.test(text)) lines.pop();
  return lines;
}

// Python counts the information separators U+001C to U+001F and U+0085 as whitespace too.
const PY_SPACE = `[\\s\\x1c-\\x1f\\x85]`;
const STRIP = new RegExp(`^${PY_SPACE}+|${PY_SPACE}+$`, "gu");

const LSTRIP = new RegExp(`^${PY_SPACE}+`, "u");

/** Python's str.strip() with no argument: Unicode whitespace on both ends. */
export function pyStrip(text: string): string {
  return text.replace(STRIP, "");
}

/** Python's str.lstrip() with no argument. */
export function pyLstrip(text: string): string {
  return text.replace(LSTRIP, "");
}
