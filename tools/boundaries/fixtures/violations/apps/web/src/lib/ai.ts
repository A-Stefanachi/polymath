// Violation: llm-sdk-only-in-packages-llm (web code importing an LLM SDK).
import OpenAI from "openai";

export const client = new OpenAI();
