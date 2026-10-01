export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set.");
    this.name = "MissingApiKeyError";
  }
}

export class ProviderRequestError extends Error {
  constructor() {
    super("The Gemini request failed.");
    this.name = "ProviderRequestError";
  }
}

export class QuestionValidationError extends Error {
  readonly details: string;

  constructor(details: string) {
    super("The model response failed validation.");
    this.name = "QuestionValidationError";
    this.details = details;
  }
}
