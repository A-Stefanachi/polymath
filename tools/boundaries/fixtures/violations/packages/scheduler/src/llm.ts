// Violation: core-packages-isolated (the scheduler depending on packages/llm).
import { LLM } from "../../llm/src/index";

export const usesLlm = LLM;
