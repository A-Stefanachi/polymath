// Restricted evaluator for rectangular complex answers. Port of what numeric_grader.parse_complex needs from
// safe_expr.evaluate with no names but `j` and no functions: numbers (Python literal rules), `j`, parentheses,
// unary + -, binary + - * and ** (doc 08 section 2.1, complex). Hand-written parser; there is no eval.

export type Complex = readonly [number, number];

/** The text is not an expression in the allowed grammar, or evaluating it failed. */
export class ExprError extends Error {}

const MAX_ABS_EXPONENT = 64;
const MAX_LOG10_RESULT = 300;

type Token =
  | { readonly kind: "num"; readonly value: Complex }
  | { readonly kind: "name"; readonly text: string }
  | { readonly kind: "op"; readonly text: "+" | "-" | "*" | "**" | "(" | ")" };

// Python number literals: 1, 1.5, .5, 1., 1e3, 2j. A plain integer with a leading zero ("010") is a syntax error.
const NUMBER = /(?:[0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)(?:[eE][+-]?[0-9]+)?j?/y;
const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < text.length) {
    const ch = text.charAt(pos);
    if (ch === "*") {
      const double = text.charAt(pos + 1) === "*";
      tokens.push({ kind: "op", text: double ? "**" : "*" });
      pos += double ? 2 : 1;
    } else if (ch === "+" || ch === "-" || ch === "(" || ch === ")") {
      tokens.push({ kind: "op", text: ch });
      pos += 1;
    } else if (/[0-9.]/.test(ch)) {
      NUMBER.lastIndex = pos;
      const m = NUMBER.exec(text);
      if (!m) throw new ExprError("syntax error");
      let literal = m[0];
      const imaginary = literal.endsWith("j");
      if (imaginary) literal = literal.slice(0, -1);
      if (!imaginary && /^0[0-9]*[1-9][0-9]*$/.test(literal)) throw new ExprError("leading zeros are not permitted");
      const value = Number(literal);
      tokens.push({ kind: "num", value: imaginary ? [0, value] : [value, 0] });
      pos += m[0].length;
    } else if (/[A-Za-z_]/.test(ch)) {
      NAME.lastIndex = pos;
      const m = NAME.exec(text);
      if (!m) throw new ExprError("syntax error");
      tokens.push({ kind: "name", text: m[0] });
      pos += m[0].length;
    } else {
      throw new ExprError("syntax error");
    }
  }
  return tokens;
}

const mul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const abs = (a: Complex): number => Math.hypot(a[0], a[1]);

function intPow(a: Complex, n: number): Complex {
  let result: Complex = [1, 0];
  let base = a;
  let k = Math.abs(n);
  while (k > 0) {
    if (k % 2 === 1) result = mul(result, base);
    base = mul(base, base);
    k = Math.floor(k / 2);
  }
  if (n >= 0) return result;
  const den = result[0] * result[0] + result[1] * result[1];
  if (den === 0) throw new ExprError("division by zero");
  return [result[0] / den, -result[1] / den];
}

// safe_expr._safe_pow: the exponent is bounded by 64 and the result by about 1e300, then Python's a ** b.
function safePow(a: Complex, b: Complex): Complex {
  if (abs(b) > MAX_ABS_EXPONENT) throw new ExprError(`exponent exceeds the allowed magnitude ${MAX_ABS_EXPONENT}`);
  const fa = abs(a);
  if (fa > 0 && abs(b) * Math.log10(fa) > MAX_LOG10_RESULT) throw new ExprError("power result would be too large");
  let result: Complex;
  if (fa === 0) {
    if (b[0] === 0 && b[1] === 0) return [1, 0];
    if (b[1] !== 0 || b[0] < 0) throw new ExprError("zero cannot be raised to that power");
    return [0, 0];
  }
  if (b[1] === 0 && Number.isInteger(b[0])) {
    result = a[1] === 0 ? [Math.pow(a[0], b[0]), 0] : intPow(a, b[0]);
  } else if (a[1] === 0 && b[1] === 0 && a[0] > 0) {
    result = [Math.pow(a[0], b[0]), 0];
  } else {
    // Principal value: exp(b * ln a).
    const logRe = Math.log(fa);
    const logIm = Math.atan2(a[1], a[0]);
    const re = b[0] * logRe - b[1] * logIm;
    const im = b[0] * logIm + b[1] * logRe;
    const scale = Math.exp(re);
    result = [scale * Math.cos(im), scale * Math.sin(im)];
  }
  if (!Number.isFinite(result[0]) || !Number.isFinite(result[1])) throw new ExprError("evaluation failed: overflow");
  return result;
}

class Parser {
  private i = 0;
  private readonly tokens: readonly Token[];

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  parse(): Complex {
    const v = this.sum();
    if (this.i < this.tokens.length) throw new ExprError("syntax error");
    return v;
  }

  private peekOp(...ops: string[]): string | undefined {
    const t = this.tokens[this.i];
    return t?.kind === "op" && ops.includes(t.text) ? t.text : undefined;
  }

  private sum(): Complex {
    let acc = this.product();
    for (let op = this.peekOp("+", "-"); op !== undefined; op = this.peekOp("+", "-")) {
      this.i += 1;
      const rhs = this.product();
      acc = op === "+" ? [acc[0] + rhs[0], acc[1] + rhs[1]] : [acc[0] - rhs[0], acc[1] - rhs[1]];
    }
    return acc;
  }

  private product(): Complex {
    let acc = this.unary();
    while (this.peekOp("*")) {
      this.i += 1;
      acc = mul(acc, this.unary());
    }
    return acc;
  }

  // Python: -2 ** 2 is -(2 ** 2), and 2 ** -1 is allowed.
  private unary(): Complex {
    const op = this.peekOp("+", "-");
    if (op !== undefined) {
      this.i += 1;
      const v = this.unary();
      // 0 - x, not -x: negating a real value must not leave an imaginary -0, which flips the branch of ** below.
      return op === "-" ? [0 - v[0], 0 - v[1]] : v;
    }
    return this.power();
  }

  private power(): Complex {
    const base = this.primary();
    if (this.peekOp("**")) {
      this.i += 1;
      return safePow(base, this.unary());
    }
    return base;
  }

  private primary(): Complex {
    const t = this.tokens[this.i];
    this.i += 1;
    if (t?.kind === "num") return t.value;
    if (t?.kind === "name") {
      if (t.text === "j") return [0, 1];
      throw new ExprError(`unknown name '${t.text}'`);
    }
    if (t?.kind === "op" && t.text === "(") {
      const v = this.sum();
      if (!this.peekOp(")")) throw new ExprError("syntax error");
      this.i += 1;
      return v;
    }
    throw new ExprError("syntax error");
  }
}

/** Evaluate an expression over numbers, `j`, parentheses, + - * and **. Throws ExprError. */
export function evaluateComplex(expr: string): Complex {
  return new Parser(tokenize(expr)).parse();
}
