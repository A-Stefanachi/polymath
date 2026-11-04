// Units for the exact_numeric grader: the subset of pint's default registry that the templates and the
// shared vectors use (SI base and derived units, SI prefixes, minutes and hours, products, quotients and
// integer or fractional powers). Port of the way numeric_grader.py uses pint (doc 08 section 2.1 step 5):
// parse a unit string, check the dimension, convert. Pure: no I/O, no clock.

/** Exponents of [metre, kilogram, second, ampere, kelvin, mole, candela]. */
type Dim = readonly [number, number, number, number, number, number, number];

interface Unit {
  /** Size of one unit in SI base units. */
  readonly factor: number;
  readonly dim: Dim;
}

/** The unit text cannot be read as a unit expression (pint: UndefinedUnitError or DefinitionSyntaxError). */
export class UnitParseError extends Error {}

/** The units are readable but measure different things (pint: DimensionalityError). */
export class UnitDimensionError extends Error {}

const NONE: Dim = [0, 0, 0, 0, 0, 0, 0];
const d = (m: number, kg: number, s: number, a: number, k = 0, mol = 0, cd = 0): Dim => [m, kg, s, a, k, mol, cd];

const SYMBOLS: Readonly<Record<string, Unit>> = {
  dimensionless: { factor: 1, dim: NONE },
  rad: { factor: 1, dim: NONE },
  m: { factor: 1, dim: d(1, 0, 0, 0) },
  g: { factor: 1e-3, dim: d(0, 1, 0, 0) },
  s: { factor: 1, dim: d(0, 0, 1, 0) },
  min: { factor: 60, dim: d(0, 0, 1, 0) },
  h: { factor: 3600, dim: d(0, 0, 1, 0) },
  hr: { factor: 3600, dim: d(0, 0, 1, 0) },
  d: { factor: 86400, dim: d(0, 0, 1, 0) },
  A: { factor: 1, dim: d(0, 0, 0, 1) },
  K: { factor: 1, dim: d(0, 0, 0, 0, 1) },
  mol: { factor: 1, dim: d(0, 0, 0, 0, 0, 1) },
  cd: { factor: 1, dim: d(0, 0, 0, 0, 0, 0, 1) },
  Hz: { factor: 1, dim: d(0, 0, -1, 0) },
  N: { factor: 1, dim: d(1, 1, -2, 0) },
  Pa: { factor: 1, dim: d(-1, 1, -2, 0) },
  J: { factor: 1, dim: d(2, 1, -2, 0) },
  W: { factor: 1, dim: d(2, 1, -3, 0) },
  Wh: { factor: 3600, dim: d(2, 1, -2, 0) },
  C: { factor: 1, dim: d(0, 0, 1, 1) },
  V: { factor: 1, dim: d(2, 1, -3, -1) },
  F: { factor: 1, dim: d(-2, -1, 4, 2) },
  ohm: { factor: 1, dim: d(2, 1, -3, -2) },
  S: { factor: 1, dim: d(-2, -1, 3, 2) },
  Wb: { factor: 1, dim: d(2, 1, -2, -1) },
  T: { factor: 1, dim: d(0, 1, -2, -1) },
  H: { factor: 1, dim: d(2, 1, -2, -2) },
  // pint also reads these constants as units: "1 e" is a charge, "1 k ohm" is the Boltzmann constant times ohm.
  e: { factor: 1.602176634e-19, dim: d(0, 0, 1, 1) },
  k: { factor: 1.380649e-23, dim: d(2, 1, -2, 0, -1) },
};

const NAMES: Readonly<Record<string, string>> = {
  radian: "rad",
  meter: "m",
  metre: "m",
  gram: "g",
  second: "s",
  sec: "s",
  minute: "min",
  hour: "h",
  day: "d",
  ampere: "A",
  amp: "A",
  kelvin: "K",
  mole: "mol",
  candela: "cd",
  hertz: "Hz",
  newton: "N",
  pascal: "Pa",
  joule: "J",
  watt: "W",
  coulomb: "C",
  volt: "V",
  farad: "F",
  siemens: "S",
  weber: "Wb",
  tesla: "T",
  henry: "H",
};

// [symbol, name, power of ten]. "u" is pint's ASCII alias for micro; the grader already maps µ and μ to it.
const PREFIXES: readonly (readonly [string, string, number])[] = [
  ["Y", "yotta", 24],
  ["Z", "zetta", 21],
  ["E", "exa", 18],
  ["P", "peta", 15],
  ["T", "tera", 12],
  ["G", "giga", 9],
  ["M", "mega", 6],
  ["k", "kilo", 3],
  ["h", "hecto", 2],
  ["da", "deca", 1],
  ["d", "deci", -1],
  ["c", "centi", -2],
  ["m", "milli", -3],
  ["u", "micro", -6],
  ["n", "nano", -9],
  ["p", "pico", -12],
  ["f", "femto", -15],
  ["a", "atto", -18],
  ["z", "zepto", -21],
  ["y", "yocto", -24],
];

// Literal powers of ten keep the same double as pint's prefix table (for example 1e-6, not 10 ** -6).
const POW10: ReadonlyMap<number, number> = new Map(
  [24, 21, 18, 15, 12, 9, 6, 3, 2, 1, -1, -2, -3, -6, -9, -12, -15, -18, -21, -24].map((e) => [e, Number(`1e${e}`)]),
);

function baseUnit(token: string): Unit | undefined {
  const bySymbol = Object.hasOwn(SYMBOLS, token) ? SYMBOLS[token] : undefined;
  if (bySymbol) return bySymbol;
  const symbol = Object.hasOwn(NAMES, token) ? NAMES[token] : undefined;
  return symbol === undefined ? undefined : SYMBOLS[symbol];
}

function resolve(token: string): Unit | undefined {
  const exact = baseUnit(token);
  if (exact) return exact;
  // Exact names win over prefix splits ("min" is a minute, not milli-inch), as in pint.
  for (const [symbol, name, exp] of PREFIXES) {
    const scale = POW10.get(exp) ?? 1;
    // A symbol prefix goes with a unit symbol ("mV"), a name prefix with a unit name ("millivolt").
    if (token.startsWith(symbol) && Object.hasOwn(SYMBOLS, token.slice(symbol.length))) {
      const base = SYMBOLS[token.slice(symbol.length)];
      if (base) return { factor: base.factor * scale, dim: base.dim };
    }
    if (token.startsWith(name) && Object.hasOwn(NAMES, token.slice(name.length))) {
      const base = baseUnit(token.slice(name.length));
      if (base) return { factor: base.factor * scale, dim: base.dim };
    }
  }
  // pint accepts English plurals: "volts", "ohms", "mins".
  if (token.length > 1 && token.endsWith("s")) return resolve(token.slice(0, -1));
  return undefined;
}

type Token =
  | { readonly kind: "name"; readonly text: string }
  | { readonly kind: "num"; readonly value: number }
  | { readonly kind: "op"; readonly text: "*" | "/" | "**" | "-" };

const TOKEN = /\s*(?:([A-Za-z]+)|((?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE]-?[0-9]+)?)|(\*\*|\*|\/|-))/y;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const trimmedLength = text.trimEnd().length;
  while (pos < trimmedLength) {
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(text);
    if (!m) throw new UnitParseError(`cannot read unit text at position ${pos}`);
    pos = TOKEN.lastIndex;
    if (m[1] !== undefined) tokens.push({ kind: "name", text: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: "num", value: Number(m[2]) });
    else tokens.push({ kind: "op", text: m[3] as "*" | "/" | "**" | "-" });
  }
  return tokens;
}

class Parser {
  private i = 0;
  private readonly tokens: readonly Token[];

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  parse(): Unit {
    if (this.tokens.length === 0) throw new UnitParseError("empty unit");
    let acc = this.factor();
    while (this.i < this.tokens.length) {
      const t = this.tokens[this.i];
      if (t?.kind === "op" && (t.text === "*" || t.text === "/")) {
        this.i += 1;
        const rhs = this.factor();
        acc = t.text === "*" ? combine(acc, rhs, 1) : combine(acc, rhs, -1);
      } else if (t?.kind === "name" || t?.kind === "num") {
        acc = combine(acc, this.factor(), 1); // juxtaposition, "V A", is a product
      } else {
        throw new UnitParseError("misplaced operator");
      }
    }
    return acc;
  }

  private factor(): Unit {
    const t = this.tokens[this.i];
    this.i += 1;
    let unit: Unit;
    if (t?.kind === "name") {
      const found = resolve(t.text);
      if (!found) throw new UnitParseError(`unknown unit ${t.text}`);
      unit = found;
    } else if (t?.kind === "num") {
      // A bare 1 is allowed ("1/s"); any other number is not a unit.
      if (t.value !== 1) throw new UnitParseError("a number is not a unit");
      unit = { factor: 1, dim: NONE };
    } else {
      throw new UnitParseError("expected a unit");
    }
    const next = this.tokens[this.i];
    if (next?.kind === "op" && next.text === "**") {
      this.i += 1;
      return power(unit, this.exponent());
    }
    return unit;
  }

  // Exponents are right-associative numbers with an optional minus: "V**2", "s**-1", "m**2**2".
  private exponent(): number {
    let sign = 1;
    let t = this.tokens[this.i];
    if (t?.kind === "op" && t.text === "-") {
      sign = -1;
      this.i += 1;
      t = this.tokens[this.i];
    }
    if (t?.kind !== "num") throw new UnitParseError("expected an exponent");
    this.i += 1;
    const next = this.tokens[this.i];
    if (next?.kind === "op" && next.text === "**") {
      this.i += 1;
      return sign * t.value ** this.exponent();
    }
    return sign * t.value;
  }
}

function combine(a: Unit, b: Unit, sign: 1 | -1): Unit {
  const dim = a.dim.map((x, k) => x + sign * (b.dim[k] ?? 0)) as unknown as Dim;
  return { factor: sign === 1 ? a.factor * b.factor : a.factor / b.factor, dim };
}

function power(u: Unit, e: number): Unit {
  return { factor: u.factor ** e, dim: u.dim.map((x) => x * e) as unknown as Dim };
}

/** Parse a unit expression such as `mV`, `kohm`, `V/A`, `s**-1` or `V A`. Throws UnitParseError. */
function parseUnit(text: string): Unit {
  return new Parser(tokenize(text)).parse();
}

/**
 * Convert `value` from `fromUnit` to `toUnit`, like `ureg.Quantity(value, fromUnit).to(toUnit).magnitude`.
 * Throws UnitDimensionError when the dimensions differ and UnitParseError when either text is unreadable.
 */
export function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  const from = parseUnit(fromUnit);
  const to = parseUnit(toUnit);
  if (!from.dim.every((x, k) => Math.abs(x - (to.dim[k] ?? 0)) < 1e-9)) {
    throw new UnitDimensionError("dimensions differ");
  }
  return (value * from.factor) / to.factor;
}
