// The safe expression grammar of doc 07 section 3.3, in TypeScript, for lint only: parse to an AST,
// list the names an expression uses, and evaluate it on sampled draws. Reference: the Python
// parser in polymath-app-spec/reference/verifiers/safe_expr.py. Nothing here calls eval or Function.

export const MAX_LEN = 400;
export const MAX_NODES = 300;
export const MAX_ABS_EXPONENT = 64;

/** The expression is outside the grammar (L04). */
export class ExprSyntaxError extends Error {}
/** The expression is valid but cannot be evaluated here (unknown name, unsupported function). */
export class ExprUnboundError extends Error {}
/** A draw-level failure: division by zero, domain error. The sampler treats it as a rejection. */
export class ExprEvalError extends Error {}

export type Cx = { re: number; im: number };
export type Value = number | boolean | string | Cx;

export const FUNCTIONS = [
  "sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "exp", "log", "log10", "abs", "min", "max",
  "round", "floor", "ceil", "hypot", "re", "im", "conjugate", "phase", "complex",
] as const;
/** `diff` exists only in SymPy mode (template-author expressions); lint cannot evaluate it. */
const SYMPY_ONLY = ["diff"];
export const CONSTANTS: Record<string, Value> = { pi: Math.PI, E: Math.E, j: { re: 0, im: 1 }, True: true, False: false };

type Node =
  | { t: "num"; v: number; imag: boolean }
  | { t: "str"; v: string }
  | { t: "name"; v: string }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "un"; op: string; a: Node }
  | { t: "bool"; op: "and" | "or"; items: Node[] }
  | { t: "cmp"; first: Node; rest: { op: string; n: Node }[] }
  | { t: "if"; test: Node; yes: Node; no: Node }
  | { t: "call"; fn: string; args: Node[] };

type Tok = { k: "num" | "str" | "id" | "op" | "end"; v: string };

const TOKEN =
  /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|\/\/|==|!=|<=|>=|[-+*/%<>(),]))/y;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new ExprSyntaxError(`unexpected character "${src.slice(pos).trim().charAt(0)}"`);
    pos = TOKEN.lastIndex;
    if (m[1] !== undefined) out.push({ k: "num", v: m[1] });
    else if (m[2] !== undefined) out.push({ k: "str", v: m[2].slice(1, -1) });
    else if (m[3] !== undefined) out.push({ k: "id", v: m[3] });
    else out.push({ k: "op", v: m[4] ?? "" });
  }
  out.push({ k: "end", v: "" });
  return out;
}

class Parser {
  private i = 0;
  nodes = 0;
  private readonly toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  private peek(): Tok {
    return this.toks[this.i] ?? { k: "end", v: "" };
  }
  private next(): Tok {
    const t = this.peek();
    this.i++;
    return t;
  }
  private isOp(v: string): boolean {
    const t = this.peek();
    return t.k === "op" && t.v === v;
  }
  private isKw(v: string): boolean {
    const t = this.peek();
    return t.k === "id" && t.v === v;
  }
  private count(): void {
    if (++this.nodes > MAX_NODES) throw new ExprSyntaxError(`more than ${String(MAX_NODES)} AST nodes`);
  }
  parse(): Node {
    const n = this.ternary();
    if (this.peek().k !== "end") throw new ExprSyntaxError(`unexpected "${this.peek().v}"`);
    return n;
  }
  private ternary(): Node {
    const yes = this.or();
    if (this.isKw("if")) {
      this.next();
      const test = this.or();
      if (!this.isKw("else")) throw new ExprSyntaxError('conditional expression needs "else"');
      this.next();
      const no = this.ternary();
      this.count();
      return { t: "if", test, yes, no };
    }
    return yes;
  }
  private or(): Node {
    const items = [this.and()];
    while (this.isKw("or")) {
      this.next();
      items.push(this.and());
    }
    if (items.length === 1) return items[0] as Node;
    this.count();
    return { t: "bool", op: "or", items };
  }
  private and(): Node {
    const items = [this.not()];
    while (this.isKw("and")) {
      this.next();
      items.push(this.not());
    }
    if (items.length === 1) return items[0] as Node;
    this.count();
    return { t: "bool", op: "and", items };
  }
  private not(): Node {
    if (this.isKw("not")) {
      this.next();
      this.count();
      return { t: "un", op: "not", a: this.not() };
    }
    return this.compare();
  }
  private compare(): Node {
    const first = this.sum();
    const rest: { op: string; n: Node }[] = [];
    while (["==", "!=", "<", "<=", ">", ">="].some((o) => this.isOp(o))) {
      const op = this.next().v;
      rest.push({ op, n: this.sum() });
    }
    if (rest.length === 0) return first;
    this.count();
    return { t: "cmp", first, rest };
  }
  private sum(): Node {
    let a = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.next().v;
      this.count();
      a = { t: "bin", op, a, b: this.term() };
    }
    return a;
  }
  private term(): Node {
    let a = this.unary();
    while (["*", "/", "//", "%"].some((o) => this.isOp(o))) {
      const op = this.next().v;
      this.count();
      a = { t: "bin", op, a, b: this.unary() };
    }
    return a;
  }
  private unary(): Node {
    if (this.isOp("-") || this.isOp("+")) {
      const op = this.next().v;
      this.count();
      return { t: "un", op, a: this.unary() };
    }
    return this.power();
  }
  private power(): Node {
    const a = this.atom();
    if (this.isOp("**")) {
      this.next();
      this.count();
      return { t: "bin", op: "**", a, b: this.unary() };
    }
    return a;
  }
  private atom(): Node {
    const t = this.next();
    this.count();
    if (t.k === "num") return { t: "num", v: Number(t.v), imag: false };
    if (t.k === "str") return { t: "str", v: t.v };
    if (t.k === "id") {
      if (this.isOp("(")) {
        this.next();
        const args: Node[] = [];
        if (!this.isOp(")")) {
          args.push(this.ternary());
          while (this.isOp(",")) {
            this.next();
            args.push(this.ternary());
          }
        }
        if (!this.isOp(")")) throw new ExprSyntaxError("missing )");
        this.next();
        if (args.length > 4) throw new ExprSyntaxError("more than 4 arguments");
        if (this.isOp("=")) throw new ExprSyntaxError("keyword arguments are not allowed");
        return { t: "call", fn: t.v, args };
      }
      if (["and", "or", "not", "if", "else", "lambda", "for", "in", "is"].includes(t.v)) throw new ExprSyntaxError(`unexpected "${t.v}"`);
      return { t: "name", v: t.v };
    }
    if (t.k === "op" && t.v === "(") {
      const inner = this.ternary();
      if (!this.isOp(")")) throw new ExprSyntaxError("missing )");
      this.next();
      return inner;
    }
    throw new ExprSyntaxError(t.k === "end" ? "unexpected end of expression" : `unexpected "${t.v}"`);
  }
}

export type Parsed = { node: Node; names: string[]; calls: string[] };

function walk(n: Node, names: Set<string>, calls: Set<string>): void {
  switch (n.t) {
    case "name": names.add(n.v); break;
    case "bin": walk(n.a, names, calls); walk(n.b, names, calls); break;
    case "un": walk(n.a, names, calls); break;
    case "bool": n.items.forEach((x) => { walk(x, names, calls); }); break;
    case "cmp": walk(n.first, names, calls); n.rest.forEach((r) => { walk(r.n, names, calls); }); break;
    case "if": walk(n.test, names, calls); walk(n.yes, names, calls); walk(n.no, names, calls); break;
    case "call": calls.add(n.fn); n.args.forEach((x) => { walk(x, names, calls); }); break;
    default: break;
  }
}

function checkPowers(n: Node): void {
  if (n.t === "bin" && n.op === "**") {
    const b = n.b.t === "un" && n.b.a.t === "num" ? n.b.a : n.b;
    if (b.t === "num" && Math.abs(b.v) > MAX_ABS_EXPONENT) throw new ExprSyntaxError(`exponent ${String(b.v)} exceeds ${String(MAX_ABS_EXPONENT)}`);
  }
  if (n.t === "bin") { checkPowers(n.a); checkPowers(n.b); }
  else if (n.t === "un") checkPowers(n.a);
  else if (n.t === "bool") n.items.forEach(checkPowers);
  else if (n.t === "cmp") { checkPowers(n.first); n.rest.forEach((r) => { checkPowers(r.n); }); }
  else if (n.t === "if") { checkPowers(n.test); checkPowers(n.yes); checkPowers(n.no); }
  else if (n.t === "call") n.args.forEach(checkPowers);
}

/** Parses against the grammar. Throws ExprSyntaxError; does not look names up (see `names`). */
export function parseExpr(src: string): Parsed {
  if (typeof src !== "string" || src.trim() === "") throw new ExprSyntaxError("empty expression");
  if (src.length > MAX_LEN) throw new ExprSyntaxError(`longer than ${String(MAX_LEN)} characters`);
  const parser = new Parser(tokenize(src));
  const node = parser.parse();
  checkPowers(node);
  const names = new Set<string>();
  const calls = new Set<string>();
  walk(node, names, calls);
  for (const c of calls) {
    if (!(FUNCTIONS as readonly string[]).includes(c) && !SYMPY_ONLY.includes(c)) throw new ExprSyntaxError(`function "${c}" is not allowed`);
  }
  return { node, names: [...names], calls: [...calls] };
}

// ------------------------------------------------------------------------------------ evaluation

const isCx = (v: Value): v is Cx => typeof v === "object";
const cx = (re: number, im: number): Cx => ({ re, im });

function toCx(v: Value): Cx {
  if (isCx(v)) return v;
  if (typeof v === "number") return cx(v, 0);
  if (typeof v === "boolean") return cx(v ? 1 : 0, 0);
  throw new ExprEvalError("string used as a number");
}
function num(v: Value): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (isCx(v)) {
    if (v.im === 0) return v.re;
    throw new ExprEvalError("complex value where a real number is needed");
  }
  throw new ExprEvalError("string used as a number");
}
function simplify(c: Cx): Value {
  return c.im === 0 ? c.re : c;
}

function arith(op: string, a: Value, b: Value): Value {
  if (isCx(a) || isCx(b)) {
    const x = toCx(a);
    const y = toCx(b);
    switch (op) {
      case "+": return simplify(cx(x.re + y.re, x.im + y.im));
      case "-": return simplify(cx(x.re - y.re, x.im - y.im));
      case "*": return simplify(cx(x.re * y.re - x.im * y.im, x.re * y.im + x.im * y.re));
      case "/": {
        const d = y.re * y.re + y.im * y.im;
        if (d === 0) throw new ExprEvalError("division by zero");
        return simplify(cx((x.re * y.re + x.im * y.im) / d, (x.im * y.re - x.re * y.im) / d));
      }
      case "**": {
        if (Number.isInteger(y.re) && y.im === 0 && Math.abs(y.re) <= MAX_ABS_EXPONENT) {
          let r: Cx = cx(1, 0);
          for (let k = 0; k < Math.abs(y.re); k++) r = toCx(arith("*", r, x));
          return y.re < 0 ? arith("/", 1, r) : simplify(r);
        }
        throw new ExprEvalError("complex power is not evaluated by lint");
      }
      default: throw new ExprEvalError(`operator ${op} on complex values`);
    }
  }
  const x = num(a);
  const y = num(b);
  switch (op) {
    case "+": return x + y;
    case "-": return x - y;
    case "*": return x * y;
    case "/":
      if (y === 0) throw new ExprEvalError("division by zero");
      return x / y;
    case "//":
      if (y === 0) throw new ExprEvalError("division by zero");
      return Math.floor(x / y);
    case "%":
      if (y === 0) throw new ExprEvalError("modulo by zero");
      return x - y * Math.floor(x / y);
    case "**": {
      const r = Math.pow(x, y);
      if (Number.isNaN(r)) {
        // A negative base with a fractional exponent is complex in Python.
        throw new ExprEvalError("complex result of a power");
      }
      if (!Number.isFinite(r)) throw new ExprEvalError("overflow");
      return r;
    }
    default: throw new ExprEvalError(`unknown operator ${op}`);
  }
}

function equal(a: Value, b: Value): boolean {
  if (typeof a === "string" || typeof b === "string") return a === b;
  const x = toCx(a);
  const y = toCx(b);
  return x.re === y.re && x.im === y.im;
}

function truthy(v: Value): boolean {
  if (typeof v === "string") return v !== "";
  if (isCx(v)) return v.re !== 0 || v.im !== 0;
  return Boolean(v);
}

function real1(name: string, f: (x: number) => number): (a: Value[]) => Value {
  return (a) => {
    if (a.length !== 1) throw new ExprEvalError(`${name} takes 1 argument`);
    const r = f(num(a[0] as Value));
    if (Number.isNaN(r)) throw new ExprEvalError(`${name}: domain error`);
    return r;
  };
}

const FUNCS: Record<string, (a: Value[]) => Value> = {
  sqrt: (a) => {
    const v = a[0] as Value;
    if (isCx(v)) throw new ExprEvalError("sqrt of a complex value is not evaluated by lint");
    const x = num(v);
    return x < 0 ? cx(0, Math.sqrt(-x)) : Math.sqrt(x);
  },
  sin: real1("sin", Math.sin), cos: real1("cos", Math.cos), tan: real1("tan", Math.tan),
  asin: real1("asin", Math.asin), acos: real1("acos", Math.acos), atan: real1("atan", Math.atan),
  exp: real1("exp", Math.exp), log: real1("log", (x) => (x > 0 ? Math.log(x) : NaN)),
  log10: real1("log10", (x) => (x > 0 ? Math.log10(x) : NaN)),
  floor: real1("floor", Math.floor), ceil: real1("ceil", Math.ceil),
  atan2: (a) => Math.atan2(num(a[0] as Value), num(a[1] as Value)),
  hypot: (a) => Math.hypot(...a.map(num)),
  abs: (a) => {
    const v = a[0] as Value;
    return isCx(v) ? Math.hypot(v.re, v.im) : Math.abs(num(v));
  },
  min: (a) => Math.min(...a.map(num)),
  max: (a) => Math.max(...a.map(num)),
  round: (a) => {
    const x = num(a[0] as Value);
    const d = a.length > 1 ? num(a[1] as Value) : 0;
    const f = 10 ** d;
    return Math.round(x * f) / f;
  },
  re: (a) => toCx(a[0] as Value).re,
  im: (a) => toCx(a[0] as Value).im,
  conjugate: (a) => {
    const z = toCx(a[0] as Value);
    return simplify(cx(z.re, -z.im));
  },
  phase: (a) => {
    const z = toCx(a[0] as Value);
    return Math.atan2(z.im, z.re);
  },
  complex: (a) => simplify(cx(num(a[0] as Value), a.length > 1 ? num(a[1] as Value) : 0)),
};

export type Env = Record<string, Value>;

function ev(n: Node, env: Env): Value {
  switch (n.t) {
    case "num": return n.v;
    case "str": return n.v;
    case "name": {
      if (n.v in env) return env[n.v] as Value;
      if (n.v in CONSTANTS) return CONSTANTS[n.v] as Value;
      throw new ExprUnboundError(`unknown name "${n.v}"`);
    }
    case "un": {
      const v = ev(n.a, env);
      if (n.op === "not") return !truthy(v);
      if (n.op === "+") return v;
      return arith("-", 0, v);
    }
    case "bin": return arith(n.op, ev(n.a, env), ev(n.b, env));
    case "bool": {
      const vals = n.items.map((x) => ev(x, env));
      return n.op === "and" ? vals.every(truthy) : vals.some(truthy);
    }
    case "cmp": {
      let left = ev(n.first, env);
      for (const r of n.rest) {
        const right = ev(r.n, env);
        let ok: boolean;
        if (r.op === "==") ok = equal(left, right);
        else if (r.op === "!=") ok = !equal(left, right);
        else {
          const x = num(left);
          const y = num(right);
          ok = r.op === "<" ? x < y : r.op === "<=" ? x <= y : r.op === ">" ? x > y : x >= y;
        }
        if (!ok) return false;
        left = right;
      }
      return true;
    }
    case "if": return truthy(ev(n.test, env)) ? ev(n.yes, env) : ev(n.no, env);
    case "call": {
      const f = FUNCS[n.fn];
      if (!f) throw new ExprUnboundError(`function "${n.fn}" is not evaluated by lint`);
      return f(n.args.map((x) => ev(x, env)));
    }
  }
}

/** Evaluates a parsed expression. Throws ExprUnboundError (cannot decide) or ExprEvalError (rejected draw). */
export function evaluate(p: Parsed, env: Env): Value {
  return ev(p.node, env);
}

/** Numeric magnitude of a value for tolerance comparisons. */
export function magnitude(v: Value): number {
  return isCx(v) ? Math.hypot(v.re, v.im) : num(v);
}

/** |a - b| for real or complex values. */
export function distance(a: Value, b: Value): number {
  const x = toCx(a);
  const y = toCx(b);
  return Math.hypot(x.re - y.re, x.im - y.im);
}
