// Runs the TypeScript grader (packages/grading-core) on the parity cases and prints one JSON document,
// shaped like tools/parity/grade_py.py (BL-0019). This script reads the vector files; the package does not.
import { readFileSync } from "node:fs";
import { gradeExactNumeric, type Complex, type NumericSpec, type WrongAnswer } from "../../packages/grading-core/src/index.ts";

interface Section {
  readonly name: string;
  readonly spec: NumericSpec;
  readonly reference: number | Complex;
  readonly wrong: readonly WrongAnswer[];
  readonly inputs: readonly string[];
}

interface VectorSection {
  readonly spec: NumericSpec;
  readonly reference: number | Complex;
  readonly cases: readonly { readonly input: string }[];
}

const root = new URL("../../", import.meta.url);
const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, root), "utf8"));

const vectors = read("polymath-app-spec/reference/verifiers/tests/grader_vectors.json") as Record<string, VectorSection>;
const extra = read("tools/parity/extra-cases.json") as { sections: (Omit<Section, "wrong"> & { wrong?: WrongAnswer[] })[] };

const sections: Section[] = [
  ...(["numeric", "complex"] as const).map((key) => {
    const v = vectors[key];
    if (!v) throw new Error(`missing vector section ${key}`);
    return { name: `vectors:${key}`, spec: v.spec, reference: v.reference, wrong: [], inputs: v.cases.map((c) => c.input) };
  }),
  ...extra.sections.map((s) => ({ ...s, wrong: s.wrong ?? [] })),
];

const results = sections.flatMap((s) =>
  s.inputs.map((input) => ({ section: s.name, input, grade: gradeExactNumeric(input, s.spec, s.reference, s.wrong) })),
);
process.stdout.write(JSON.stringify(results));
