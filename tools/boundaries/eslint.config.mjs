// Lints the boundary tool itself; its fixtures break the rules on purpose and are never linted.
import base from "../../eslint.config.mjs";

export default [{ ignores: ["fixtures/**"] }, ...base];
