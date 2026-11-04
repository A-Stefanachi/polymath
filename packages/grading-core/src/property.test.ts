// Property tests (CLAUDE.md section 6): an answer equal to the reference is always correct.
import fc from "fast-check";
import { describe, it } from "vitest";
import { gradeExactNumeric, type NumericSpec } from "./index.ts";

const RUNS = { numRuns: 1000 };

// Units with a prefix, in the same unit as the reference so the property is "grade(x, x) is correct".
const units = ["V", "mV", "kV", "uV", "MV", "A", "mA", "uA", "ohm", "kohm", "Mohm", "mohm", "s", "ms", "min", "W", "mW", "S", "mS", "J", "C"];

const magnitude = fc
  .tuple(fc.double({ min: 1e-12, max: 1e12, noNaN: true }), fc.boolean())
  .map(([m, negative]) => (negative ? -m : m));

describe("grade(x, x)", () => {
  it("is correct for 1000 random magnitudes and units", () => {
    fc.assert(
      fc.property(magnitude, fc.constantFrom(...units), (x, unit) => {
        const spec: NumericSpec = { kind: "numeric", unit, tolerance: { rel: 1e-9 } };
        const r = gradeExactNumeric(`${x} ${unit}`, spec, x);
        return r.correct && r.score === 1 && r.status === undefined;
      }),
      RUNS,
    );
  });

  it("is correct for 1000 random magnitudes written in a prefixed unit and the reference in its base unit", () => {
    const prefixes: [string, number][] = [["m", 1e-3], ["k", 1e3], ["u", 1e-6], ["M", 1e6]];
    fc.assert(
      fc.property(magnitude, fc.constantFrom(...prefixes), fc.constantFrom("V", "A", "ohm", "W"), (x, [p, factor], base) => {
        const spec: NumericSpec = { kind: "numeric", unit: base, tolerance: { rel: 1e-9 } };
        return gradeExactNumeric(`${x} ${p}${base}`, spec, x * factor).correct;
      }),
      RUNS,
    );
  });

  it("is correct for 1000 random complex numbers", () => {
    const part = fc.double({ min: -1e6, max: 1e6, noNaN: true });
    fc.assert(
      fc.property(part, part, (re, im) => {
        const spec: NumericSpec = { kind: "complex", tolerance: { rel: 1e-9, abs: 1e-9 } };
        return gradeExactNumeric(`${re}+${im}j`, spec, [re, im]).correct;
      }),
      RUNS,
    );
  });

  it("is incorrect when the answer differs from the reference by more than twice the band", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1e6, noNaN: true }), (x) => {
        const spec: NumericSpec = { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } };
        return !gradeExactNumeric(`${x * 1.03} V`, spec, x).correct;
      }),
      RUNS,
    );
  });
});
