// Pure graders shared by the web app and the offline client (doc 03 section 13, doc 08 section 2).
// No network, file system, environment or clock: everything is an argument.
export const PACKAGE_NAME = "@polymath/grading-core" as const;

export { gradeExactNumeric, normalizeUnit, parseComplex, within } from "./numeric.ts";
export type { Grade, GraderEntry, NumericSpec, Tolerance, WrongAnswer } from "./numeric.ts";
export { gradeMultipleChoice } from "./multiple-choice.ts";
export type { McKey, McOption, McTiming } from "./multiple-choice.ts";
export { convertUnits, UnitDimensionError, UnitParseError } from "./units.ts";
export type { Complex } from "./complex-expr.ts";
