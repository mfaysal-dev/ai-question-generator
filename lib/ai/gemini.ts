import "server-only";

import { GoogleGenAI, type Schema } from "@google/genai";

import { MissingApiKeyError, ProviderRequestError } from "@/lib/ai/errors";
import { redactSecrets } from "@/lib/ai/redact";
import type { LanguageModel, ModelCompletionRequest } from "@/lib/ai/types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function createGeminiModel(): LanguageModel {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  return {
    async completeJson(request: ModelCompletionRequest): Promise<string> {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: request.user,
          config: {
            systemInstruction: request.system,
            responseMimeType: "application/json",
            responseSchema: request.responseSchema as Schema,
            maxOutputTokens: 8192,
            temperature: 0.7,
          },
        });

        return response.text ?? "";
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown Gemini error";
        console.error("Gemini request failed:", redactSecrets(detail));
        throw new ProviderRequestError();
      }
    },
  };
}
