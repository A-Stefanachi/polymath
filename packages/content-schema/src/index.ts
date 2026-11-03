// Content validation (doc 03 section 13): key formats and the G0 schema validators. Content YAML is
// validated only through this package (doc 03 section 13.1).
export const PACKAGE_NAME = "@polymath/content-schema" as const;

export { isKey, KEY_PATTERNS, MODULE_KEY, PROJECT_KEY, SKILL_KEY, STEP_KEY, TEMPLATE_KEY, type KeyKind } from "./keys.ts";
export {
  SCHEMAS,
  validateProject,
  validateSkillNode,
  validateTemplate,
  type SchemaError,
  type ValidationResult,
} from "./validators.ts";
