import type { GenerateRequest } from "@/lib/questions/schema";

const QUESTION_FIELDS = [
  "question",
  "options",
  "correctAnswer",
  "explanation",
  "difficulty",
  "topic",
] as const;

/** Gemini response schema. Shape only; Zod still enforces the cross-field rules. */
export function buildResponseSchema(input: GenerateRequest): Record<string, unknown> {
  return {
    type: "OBJECT",
    required: ["questions"],
    propertyOrdering: ["questions"],
    properties: {
      questions: {
        type: "ARRAY",
        minItems: input.count,
        maxItems: input.count,
        description: `Exactly ${input.count} questions.`,
        items: {
          type: "OBJECT",
          required: [...QUESTION_FIELDS],
          propertyOrdering: [...QUESTION_FIELDS],
          properties: {
            question: {
              type: "STRING",
              description: "The question, written for the requested student level.",
            },
            options: {
              type: "ARRAY",
              minItems: 4,
              maxItems: 4,
              description: "Exactly four distinct, non-empty answer choices.",
              items: { type: "STRING" },
            },
            correctAnswer: {
              type: "STRING",
              description: "Copied exactly from one of the four options.",
            },
            explanation: {
              type: "STRING",
              description: "Why the correct option is right, in language for this level.",
            },
            difficulty: {
              type: "STRING",
              format: "enum",
              enum: [input.difficulty],
            },
            topic: {
              type: "STRING",
              format: "enum",
              enum: [input.topic],
            },
          },
        },
      },
    },
  };
}
