// Ajv (JSON Schema 2020-12) validators for content files (BL-0013; doc 07 section 10, G0).
// The schemas are imported from polymath-app-spec/schemas, never copied (root CLAUDE.md). A JSON
// import is resolved by the module system, so the package stays free of runtime I/O (rule 2.9).
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import lessonSchema from "../../../polymath-app-spec/schemas/lesson.schema.json" with { type: "json" };
import problemTemplateSchema from "../../../polymath-app-spec/schemas/problem-template.schema.json" with { type: "json" };
import projectSchema from "../../../polymath-app-spec/schemas/project.schema.json" with { type: "json" };
import skillNodeSchema from "../../../polymath-app-spec/schemas/skill-node.schema.json" with { type: "json" };

export type SchemaError = { path: string; message: string; keyword: string };
export type ValidationResult = { valid: true; errors: [] } | { valid: false; errors: SchemaError[] };

// strict mode stays on (unknown keywords, formats and so on fail compilation) except strictTypes:
// the schemas' if/then branches add `required` without repeating `type: object`, which is valid
// JSON Schema and how the Python oracle (jsonschema Draft202012Validator) reads them.
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTypes: false,
  strictRequired: false,
  allowUnionTypes: true,
});
addFormats(ajv, ["date"]);

function compile(schema: object): ValidateFunction {
  return ajv.compile(schema);
}

const compiled = {
  template: compile(problemTemplateSchema),
  lesson: compile(lessonSchema),
  project: compile(projectSchema),
  skillNode: compile(skillNodeSchema),
};

function toErrors(errors: ErrorObject[] | null | undefined): SchemaError[] {
  return (errors ?? []).map((e) => ({
    path: e.instancePath === "" ? "/" : e.instancePath,
    message: e.message ?? "invalid",
    keyword: e.keyword,
  }));
}

function run(fn: ValidateFunction, doc: unknown): ValidationResult {
  if (fn(doc)) return { valid: true, errors: [] };
  return { valid: false, errors: toErrors(fn.errors) };
}

/** G0 for one item template file (content/templates/**). */
export function validateTemplate(doc: unknown): ValidationResult {
  return run(compiled.template, doc);
}

/** G0 for one concept primer file (content/lessons/*.yaml, doc 07 section 15). */
export function validateLesson(doc: unknown): ValidationResult {
  return run(compiled.lesson, doc);
}

/** G0 for the project ladder file. */
export function validateProject(doc: unknown): ValidationResult {
  return run(compiled.project, doc);
}

/** G0 for one skill node (an entry of the skill graph). */
export function validateSkillNode(doc: unknown): ValidationResult {
  return run(compiled.skillNode, doc);
}

/** The schema documents, for callers that report against them (for example content:lint). */
export const SCHEMAS = {
  template: problemTemplateSchema,
  lesson: lessonSchema,
  project: projectSchema,
  skillNode: skillNodeSchema,
} as const;
