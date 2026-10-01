export type ModelCompletionRequest = {
  system: string;
  user: string;
  responseSchema: Record<string, unknown>;
};

/** A model that returns a JSON string. The Gemini adapter is the only implementation. */
export interface LanguageModel {
  completeJson(request: ModelCompletionRequest): Promise<string>;
}
