import type { LanguageModel } from "@/lib/ai/types";
import { QuestionValidationError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/questions/parse";
import { buildResponseSchema } from "@/lib/questions/response-schema";
import {
  formatValidationIssues,
  questionSetSchema,
  type GenerateRequest,
  type QuestionSet,
} from "@/lib/questions/schema";

const MAX_ATTEMPTS = 2;
const MAX_FEEDBACK_LENGTH = 2000;

const SYSTEM_PROMPT = [
  "You write accurate multiple-choice questions for school and early university students.",
  "Return only JSON that matches the response schema.",
  "correctAnswer must be copied character-for-character from one of the four options.",
  "difficulty and topic must be copied exactly from the request.",
  "Write the explanation in plain language for the stated student level.",
  'Do not use "all of the above" or "none of the above".',
  "Vary which option is correct.",
].join(" ");

function buildUserPrompt(input: GenerateRequest, previousError: string | null): string {
  const lines = [
    `Write ${input.count} ${input.difficulty.toLowerCase()} multiple-choice questions.`,
    `Student level: ${input.level}`,
    `Topic (copy exactly): ${input.topic}`,
    `Difficulty (copy exactly): ${input.difficulty}`,
    `Number of questions: ${input.count}`,
    "Each question needs exactly four non-empty, distinct options.",
  ];

  if (previousError) {
    const feedback =
      previousError.length > MAX_FEEDBACK_LENGTH
        ? `${previousError.slice(0, MAX_FEEDBACK_LENGTH)}…`
        : previousError;
    lines.push(
      "",
      "Your previous response failed validation. Fix every issue and return a new JSON object:",
      feedback,
    );
  }

  return lines.join("\n");
}

export async function generateQuestions(
  input: GenerateRequest,
  model: LanguageModel,
): Promise<QuestionSet> {
  const schema = questionSetSchema(input);
  let lastDetails = "The model response was empty.";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const raw = await model.completeJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input, attempt === 0 ? null : lastDetails),
      responseSchema: buildResponseSchema(input),
    });

    const parsed = parseModelJson(raw);
    if (!parsed.ok) {
      lastDetails = parsed.error;
      continue;
    }

    const result = schema.safeParse(parsed.value);
    if (!result.success) {
      lastDetails = formatValidationIssues(result.error);
      continue;
    }

    return result.data;
  }

  throw new QuestionValidationError(lastDetails);
}
