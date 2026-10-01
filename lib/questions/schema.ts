import { z } from "zod";

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 20;

export const generateRequestSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(1, "Enter a topic.")
      .max(200, "Topic must be 200 characters or fewer."),
    difficulty: z.enum(DIFFICULTIES, "Choose Beginner, Intermediate, or Advanced."),
    count: z
      .number("Number of questions must be a whole number from 1 to 20.")
      .int("Number of questions must be a whole number.")
      .min(MIN_QUESTIONS, `Ask for at least ${MIN_QUESTIONS} question.`)
      .max(MAX_QUESTIONS, `Ask for at most ${MAX_QUESTIONS} questions.`),
    level: z
      .string()
      .trim()
      .min(1, "Enter a student level, such as Class 8.")
      .max(80, "Student level must be 80 characters or fewer."),
  })
  .strict();

export type Difficulty = (typeof DIFFICULTIES)[number];
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

const optionSchema = z
  .string()
  .trim()
  .min(1, "Each option must contain text.")
  .max(300, "Each option must be 300 characters or fewer.");

export function questionSchema(request: GenerateRequest) {
  return z
    .object({
      question: z
        .string()
        .trim()
        .min(1, "Question text is required.")
        .max(800, "Question text must be 800 characters or fewer."),
      options: z
        .array(optionSchema)
        .length(4, "Each question needs exactly four options."),
      correctAnswer: z
        .string()
        .trim()
        .min(1, "A correct answer is required.")
        .max(300, "The correct answer must be 300 characters or fewer."),
      explanation: z
        .string()
        .trim()
        .min(1, "An explanation is required.")
        .max(2000, "The explanation must be 2000 characters or fewer."),
      difficulty: z.literal(request.difficulty, "Difficulty must match the request."),
      topic: z.literal(request.topic, "Topic must match the request."),
    })
    .strict()
    .superRefine((question, ctx) => {
      const normalized = question.options.map((option) => option.toLowerCase());
      if (new Set(normalized).size !== question.options.length) {
        ctx.addIssue({
          code: "custom",
          message: "Options must be distinct.",
          path: ["options"],
        });
      }

      if (!question.options.includes(question.correctAnswer)) {
        ctx.addIssue({
          code: "custom",
          message: "correctAnswer must be one of the four options.",
          path: ["correctAnswer"],
        });
      }
    });
}

export function questionSetSchema(request: GenerateRequest) {
  return z
    .object({
      questions: z
        .array(questionSchema(request))
        .length(request.count, `Expected exactly ${request.count} questions.`),
    })
    .strict();
}

export type Question = z.infer<ReturnType<typeof questionSchema>>;
export type QuestionSet = z.infer<ReturnType<typeof questionSetSchema>>;

export function fieldErrorsFrom(
  error: z.ZodError,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    const field =
      typeof key === "string" || typeof key === "number" ? String(key) : "form";
    fields[field] ??= [];
    fields[field].push(issue.message);
  }

  return fields;
}

export function formatValidationIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "response";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}
