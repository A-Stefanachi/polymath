// exact_numeric behaviour beyond the shared vectors: limits, units, misconception tags (doc 08 section 2.1).
import { describe, expect, it } from "vitest";
import { convertUnits, gradeExactNumeric, normalizeUnit, UnitDimensionError, UnitParseError, type NumericSpec } from "./index.ts";

const volts: NumericSpec = { kind: "numeric", unit: "V", tolerance: { rel: 0.01, abs: 0.001 }, bare_number_means: "V" };
const complexSpec: NumericSpec = { kind: "complex", tolerance: { abs: 0.01 } };

const parseError = (r: ReturnType<typeof gradeExactNumeric>): unknown => r.graders[0]?.detail["parse_error"];

describe("tolerance band max(abs, rel * |ref|), AC-1 numeric rules", () => {
  it("accepts a value exactly at the absolute band and rejects the first value past it", () => {
    const spec: NumericSpec = { kind: "numeric", unit: "A", tolerance: { abs: 0.001 } };
    expect(gradeExactNumeric("0.001 A", spec, 0).correct).toBe(true);
    expect(gradeExactNumeric("0.0011 A", spec, 0).correct).toBe(false);
  });

  it("uses the relative band when it is wider than the absolute one", () => {
    expect(gradeExactNumeric("2.999 V", volts, 2.97).correct).toBe(true); // band 0.0297
    expect(gradeExactNumeric("3.0 V", volts, 2.97).correct).toBe(false);
  });

  it("treats a missing tolerance as an exact match", () => {
    const exact: NumericSpec = { kind: "numeric", unit: "V", tolerance: {} };
    expect(gradeExactNumeric("2.97 V", exact, 2.97).correct).toBe(true);
    expect(gradeExactNumeric("2.9700001 V", exact, 2.97).correct).toBe(false);
  });
});

describe("input limits", () => {
  it("accepts 64 characters and rejects 65", () => {
    const at = `2.97 V${" ".repeat(58)}`;
    const past = `2.97 V${" ".repeat(59)}`;
    expect(at).toHaveLength(64);
    expect(gradeExactNumeric(at, volts, 2.97).correct).toBe(true);
    const r = gradeExactNumeric(past, volts, 2.97);
    expect(r.status).toBe("invalid_input");
    expect(parseError(r)).toBe("Answer too long.");
  });

  it("accepts a 24-character unit and rejects 25", () => {
    const one = (n: number): string => `V**1.${"0".repeat(n - 5)}`;
    expect(gradeExactNumeric(`2.97 ${one(24)}`, volts, 2.97).correct).toBe(true);
    expect(parseError(gradeExactNumeric(`2.97 ${one(25)}`, volts, 2.97))).toBe("Could not read the unit.");
  });

  it("counts characters, not UTF-16 units, for the 64 limit", () => {
    // 2.97 V + 57 spaces = 63 code points; one astral character makes 64, which is still accepted.
    const r = gradeExactNumeric(`2.97 V${" ".repeat(57)}\u{1F600}`, volts, 2.97);
    expect(parseError(r)).not.toBe("Answer too long.");
  });
});

describe("decimal comma and separators", () => {
  it("reads one comma as a decimal point when there is no dot", () => {
    expect(gradeExactNumeric("2,97 V", volts, 2.97).correct).toBe(true);
  });

  it.each(["1,234.5 V", "1,2,3 V", "1.2,3 V"])("rejects %j as a thousands separator", (text) => {
    expect(parseError(gradeExactNumeric(text, volts, 2.97))).toBe("Please write the number without thousands separators.");
  });
});

describe("units", () => {
  it("asks for a unit when none is typed and the template has no bare_number_means", () => {
    const spec: NumericSpec = { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } };
    expect(parseError(gradeExactNumeric("2.97", spec, 2.97))).toBe("Please include a unit.");
  });

  it("marks a bare number in the detail", () => {
    const detail = gradeExactNumeric("2.97", volts, 2.97).graders[0]?.detail;
    expect(detail).toMatchObject({ bare_number: true, typed_unit: "", parsed: 2.97 });
  });

  it("names the typed unit when the dimension is wrong", () => {
    expect(parseError(gradeExactNumeric("2.97 A", volts, 2.97))).toBe("The unit 'A' has the wrong dimension for this question.");
  });

  it("names the typed unit when it cannot be interpreted", () => {
    expect(parseError(gradeExactNumeric("2.97 foo", volts, 2.97))).toBe("Could not interpret the unit 'foo'.");
  });

  it.each([
    ["1000 mV", 1],
    ["1 kV", 1000],
    ["1 volt", 1],
    ["1 millivolt", 0.001],
    ["5 uV", 5e-6],
    ["5 µV", 5e-6],
    ["5 μV", 5e-6],
    ["2 W/A", 2],
    ["3 A*ohm", 3],
    ["3 A Ω", 3],
    ["3 A Ω", 3],
    ["2 V**2/V", 2],
    ["2 V^2/V", 2],
    ["2 V/A*A", 2],
  ])("converts %j to %d V", (text, volt) => {
    const r = gradeExactNumeric(text, { ...volts, tolerance: { rel: 1e-9 } }, volt);
    expect(parseError(r)).toBeUndefined();
    expect(r.correct).toBe(true);
  });

  it("converts through the SI prefix table", () => {
    const expected: [string, number][] = [
      ["Y", 1e24], ["Z", 1e21], ["E", 1e18], ["P", 1e15], ["T", 1e12], ["G", 1e9], ["M", 1e6], ["k", 1e3],
      ["h", 1e2], ["da", 10], ["d", 0.1], ["c", 0.01], ["m", 1e-3], ["u", 1e-6], ["n", 1e-9], ["p", 1e-12],
      ["f", 1e-15], ["a", 1e-18], ["z", 1e-21], ["y", 1e-24],
    ];
    for (const [prefix, factor] of expected) {
      expect(convertUnits(1, `${prefix}ohm`, "ohm")).toBeCloseTo(factor, 30);
      expect(convertUnits(1, `${prefix}ohm`, "ohm") / factor).toBeCloseTo(1, 12);
    }
  });

  it("prefers an exact unit over a prefix split, as pint does (min is a minute)", () => {
    expect(convertUnits(1, "min", "s")).toBe(60);
    expect(convertUnits(1, "mm", "m")).toBeCloseTo(1e-3, 15);
    expect(convertUnits(1, "Pa", "N/m**2")).toBeCloseTo(1, 12);
  });

  it("normalizes unit text the way the reference does", () => {
    expect(normalizeUnit(" kΩ ")).toBe("kohm");
    expect(normalizeUnit("kOhms")).toBe("kohm");
    expect(normalizeUnit("µs")).toBe("us");
    expect(normalizeUnit("m^2")).toBe("m**2");
  });

  it("raises typed errors from convertUnits", () => {
    expect(() => convertUnits(1, "V", "A")).toThrow(UnitDimensionError);
    expect(() => convertUnits(1, "volx", "V")).toThrow(UnitParseError);
    expect(() => convertUnits(1, "V", "")).toThrow(UnitParseError);
  });

  it.each(["V/", "/V", "V.A", "V-A", "V**", "V***2", "V*2", "2*V", "(V)", "V!"])("cannot interpret the unit %j", (unit) => {
    const r = gradeExactNumeric(`2.97 ${unit}`, volts, 2.97);
    expect(r.status).toBe("invalid_input");
  });

  it("does not look up inherited object properties as units", () => {
    expect(() => convertUnits(1, "constructor", "V")).toThrow(UnitParseError);
    expect(() => convertUnits(1, "toString", "V")).toThrow(UnitParseError);
  });
});

describe("number forms", () => {
  it.each(["two", "", "   ", "e1", "--1", "1.2.3", "inf", "nan", "0x10", "1 000"])("rejects %j", (text) => {
    const r = gradeExactNumeric(text, { ...volts, bare_number_means: null }, 2.97);
    expect(r.status).toBe("invalid_input");
    expect(r.correct).toBe(false);
  });

  it.each(["+2.97 V", "2.97e0 V", "297e-2 V", "2.97E0 V", " 2.97 V ", ".297e1 V"])("reads %j as 2.97 V", (text) => {
    expect(gradeExactNumeric(text, volts, 2.97).correct).toBe(true);
  });
});

describe("complex answers", () => {
  const ref = [3, -2] as const;

  it.each(["3-2j", "3 - 2i", "(3-2j)", "3+-2j", "3.00-2.00j", "30e-1-20e-1j", "3-2*j", "(1+j)**2+3-2j-2j"])(
    "accepts %j",
    (text) => {
      // the last case is 2j + 3 - 2j - 2j = 3 - 2j
      expect(gradeExactNumeric(text, complexSpec, ref).correct).toBe(true);
    },
  );

  it("checks each part against the tolerance at the limit and just past it", () => {
    expect(gradeExactNumeric("3.01-2j", complexSpec, ref).correct).toBe(true);
    expect(gradeExactNumeric("3.011-2j", complexSpec, ref).correct).toBe(false);
    expect(gradeExactNumeric("3-2.011j", complexSpec, ref).correct).toBe(false);
  });

  it.each(["__import__('os')", "3-2j; 1", "3,2", "1/2", "3 -", "(((", "()", "010", "3e", "j(2)", "3-2J", "ii"])(
    "rejects %j as invalid input without evaluating it",
    (text) => {
      const r = gradeExactNumeric(text, complexSpec, ref);
      expect(r.status).toBe("invalid_input");
      expect(r.score).toBe(0);
    },
  );

  it("uses the two different messages of the reference", () => {
    expect(parseError(gradeExactNumeric("3,2", complexSpec, ref))).toBe("Use only digits, + - and j. Example: 3 - 2j");
    expect(parseError(gradeExactNumeric("3-", complexSpec, ref))).toBe("Could not read the complex number. Example: 3 - 2j");
  });

  it("bounds exponents at 64 and results at about 1e300", () => {
    expect(gradeExactNumeric("2**64", complexSpec, ref).status).toBeUndefined();
    expect(gradeExactNumeric("2**65", complexSpec, ref).status).toBe("invalid_input");
    expect(gradeExactNumeric("1e200**2", complexSpec, ref).status).toBe("invalid_input");
  });

  it("follows Python precedence and principal roots", () => {
    const parsed = (text: string): unknown => gradeExactNumeric(text, complexSpec, ref).graders[0]?.detail["parsed"];
    expect(parsed("-2**2")).toEqual([-4, 0]);
    expect(parsed("2**-1")).toEqual([0.5, 0]);
    expect(parsed("2**3**2")).toEqual([512, 0]);
    expect(parsed("j**2")).toEqual([-1, 0]);
    const root = parsed("(-4)**0.5") as number[];
    expect(root[0]).toBeCloseTo(0, 12);
    expect(root[1]).toBeCloseTo(2, 12);
  });

  it("limits the input to 64 characters after spaces are removed", () => {
    const at = `3-2j${"+0".repeat(30)}`;
    expect(at).toHaveLength(64);
    expect(gradeExactNumeric(at, complexSpec, ref).correct).toBe(true);
    expect(gradeExactNumeric(`${at}0`, complexSpec, ref).status).toBe("invalid_input");
    expect(gradeExactNumeric(`3 - 2j${" ".repeat(80)}`, complexSpec, ref).correct).toBe(true);
  });

  it("refuses a spec that does not match the reference type", () => {
    expect(() => gradeExactNumeric("3-2j", complexSpec, 3)).toThrow(TypeError);
    expect(() => gradeExactNumeric("3 V", volts, [3, 0])).toThrow(TypeError);
    expect(() => gradeExactNumeric("3 V", { kind: "numeric", tolerance: {} }, 3)).toThrow(TypeError);
  });
});

describe("misconception tags", () => {
  const wrong = [
    { tag: "mc.swapped", value: 0.33, feedback_md: "That is the drop across R1." },
    { tag: "mc.silent", value: 3.3 },
  ];

  it("tags a wrong answer that matches a known mistake and uses its feedback", () => {
    const r = gradeExactNumeric("0.33 V", volts, 2.97, wrong);
    expect(r).toMatchObject({ score: 0, correct: false, misconception_tags: ["mc.swapped"], feedback: "That is the drop across R1." });
  });

  it("keeps the tag but falls back to the default feedback when the mistake has none", () => {
    const r = gradeExactNumeric("3.3 V", volts, 2.97, wrong);
    expect(r.misconception_tags).toEqual(["mc.silent"]);
    expect(r.feedback).toBe("Not quite. Check your method and units.");
  });

  it("gives no tags for an unrelated wrong answer, and never for a correct one", () => {
    expect(gradeExactNumeric("1 V", volts, 2.97, wrong).misconception_tags).toEqual([]);
    expect(gradeExactNumeric("2.97 V", volts, 2.97, [{ tag: "mc.x", value: 2.97 }])).toMatchObject({
      correct: true,
      misconception_tags: [],
      feedback: "Correct.",
    });
  });

  it("matches complex wrong answers part by part", () => {
    const r = gradeExactNumeric("2+3j", complexSpec, [3, -2], [{ tag: "mc.c", value: [2, 3] }]);
    expect(r.misconception_tags).toEqual(["mc.c"]);
  });

  it("reports the reference result shape for a correct answer", () => {
    expect(gradeExactNumeric("2.97 V", volts, 2.97)).toEqual({
      score: 1,
      correct: true,
      graders: [
        { type: "exact_numeric", score: 1, detail: { parsed: 2.97, unit: "V", reference: 2.97, bare_number: false, typed_unit: "V" } },
      ],
      feedback: "Correct.",
      misconception_tags: [],
    });
  });
});
