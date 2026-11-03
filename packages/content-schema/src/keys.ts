// Content key formats: the single source of truth in TypeScript (CLAUDE.md section 5, doc 05
// section 7, doc 03 section 13.1). Each pattern equals the JSON Schema pattern of
// polymath-app-spec/schemas/*.schema.json and the check constraint on the key column of the
// matching table in the database; tests compare all three.

/** `{node}.{module}.{slug}`, for example `elec.dc.voltage-divider` (skills.key). */
export const SKILL_KEY = /^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/;

/** `{node}.{module}` (modules.key). */
export const MODULE_KEY = /^[a-z]+\.[a-z0-9-]+$/;

/** `tpl.{node}.{slug}` (item_templates.key). */
export const TEMPLATE_KEY = /^tpl\.[a-z]+\.[a-z0-9-]+$/;

/** `prj.L{0-9}.{slug}` (projects.key). */
export const PROJECT_KEY = /^prj\.L[0-9]\.[a-z0-9-]+$/;

/** `{project key}#s{NN}` (project_steps.key). */
export const STEP_KEY = /^prj\.L[0-9]\.[a-z0-9-]+#s[0-9]{2}$/;

export const KEY_PATTERNS = {
  skill: SKILL_KEY,
  module: MODULE_KEY,
  template: TEMPLATE_KEY,
  project: PROJECT_KEY,
  step: STEP_KEY,
} as const;

export type KeyKind = keyof typeof KEY_PATTERNS;

export function isKey(kind: KeyKind, value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERNS[kind].test(value);
}
