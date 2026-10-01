import "server-only";

import { createGeminiModel } from "@/lib/ai/gemini";
import type { LanguageModel } from "@/lib/ai/types";

export function createLanguageModel(): LanguageModel {
  return createGeminiModel();
}
