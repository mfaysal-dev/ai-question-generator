import {
  MissingApiKeyError,
  ProviderRequestError,
  QuestionValidationError,
} from "@/lib/ai/errors";
import { redactSecrets } from "@/lib/ai/redact";
import type { LanguageModel } from "@/lib/ai/types";
import { generateQuestions } from "@/lib/questions/generate";
import {
  fieldErrorsFrom,
  generateRequestSchema,
} from "@/lib/questions/schema";

const MISSING_KEY_MESSAGE =
  "The server is missing GEMINI_API_KEY. Add it to .env.local and restart the dev server, or set it in your Vercel project environment variables and redeploy.";

const VALIDATION_MESSAGE =
  "The model returned questions that did not match the required format. Please try again.";

const PROVIDER_MESSAGE =
  "The question generator could not reach Gemini. Check the server configuration and try again.";

const GENERIC_MESSAGE =
  "Something went wrong while generating questions. Please try again.";

export async function handleGenerateRequest(
  request: Request,
  createModel: () => LanguageModel,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Check the topic, difficulty, number of questions, and student level.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const questions = await generateQuestions(parsed.data, createModel());
    return Response.json(questions);
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
    }

    if (error instanceof QuestionValidationError) {
      console.error("Question validation failed:", redactSecrets(error.details));
      return Response.json({ error: VALIDATION_MESSAGE }, { status: 502 });
    }

    if (error instanceof ProviderRequestError) {
      return Response.json({ error: PROVIDER_MESSAGE }, { status: 502 });
    }

    const detail = error instanceof Error ? error.message : "unknown";
    console.error("Generate failed:", redactSecrets(detail));
    return Response.json({ error: GENERIC_MESSAGE }, { status: 500 });
  }
}
