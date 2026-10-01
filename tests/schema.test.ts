import { describe, expect, it } from "vitest";

import { parseModelJson } from "@/lib/questions/parse";
import { buildResponseSchema } from "@/lib/questions/response-schema";
import {
  generateRequestSchema,
  questionSetSchema,
  type GenerateRequest,
} from "@/lib/questions/schema";

const request: GenerateRequest = {
  topic: "Artificial Intelligence",
  difficulty: "Beginner",
  count: 2,
  level: "Class 8",
};

function question(overrides: Record<string, unknown> = {}) {
  return {
    question: "Which of these is a learning program?",
    options: ["A timetable", "A photo classifier", "A light switch", "A dictionary"],
    correctAnswer: "A photo classifier",
    explanation: "It improves from examples instead of following a fixed list.",
    difficulty: "Beginner",
    topic: "Artificial Intelligence",
    ...overrides,
  };
}

describe("generateRequestSchema", () => {
  it("accepts a class set and trims text", () => {
    const parsed = generateRequestSchema.parse({
      topic: "  Artificial Intelligence  ",
      difficulty: "Beginner",
      count: 10,
      level: " Class 8 ",
    });

    expect(parsed).toEqual({
      topic: "Artificial Intelligence",
      difficulty: "Beginner",
      count: 10,
      level: "Class 8",
    });
  });

  it("rejects empty fields, bad difficulty, and counts outside 1-20", () => {
    const parsed = generateRequestSchema.safeParse({
      topic: "   ",
      difficulty: "Easy",
      count: 0,
      level: "",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Enter a topic.");
      expect(messages).toContain("Choose Beginner, Intermediate, or Advanced.");
      expect(messages).toContain("Ask for at least 1 question.");
      expect(messages).toContain("Enter a student level, such as Class 8.");
    }

    expect(generateRequestSchema.safeParse({ ...request, count: 21 }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...request, count: 1.5 }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...request, count: "10" }).success).toBe(false);
  });

  it("rejects unknown request fields", () => {
    const parsed = generateRequestSchema.safeParse({ ...request, apiKey: "nope" });
    expect(parsed.success).toBe(false);
  });
});

describe("questionSetSchema", () => {
  it("accepts the requested count with four distinct options", () => {
    const parsed = questionSetSchema(request).parse({
      questions: [
        question(),
        question({
          question: "What does a classifier learn from?",
          correctAnswer: "A light switch",
          options: ["A timetable", "A photo classifier", "A light switch", "A dictionary"],
        }),
      ],
    });

    expect(parsed.questions).toHaveLength(2);
  });

  it("rejects the wrong number of questions", () => {
    const parsed = questionSetSchema(request).safeParse({ questions: [question()] });
    expect(parsed.success).toBe(false);
  });

  it("rejects fewer or more than four options", () => {
    const three = question({ options: ["One", "Two", "Three"] });
    const five = question({
      options: ["One", "Two", "Three", "Four", "Five"],
      correctAnswer: "One",
    });

    expect(questionSetSchema({ ...request, count: 1 }).safeParse({ questions: [three] }).success).toBe(
      false,
    );
    expect(questionSetSchema({ ...request, count: 1 }).safeParse({ questions: [five] }).success).toBe(
      false,
    );
  });

  it("rejects blank or duplicate options", () => {
    const blank = question({
      options: ["One", "   ", "Three", "Four"],
      correctAnswer: "One",
    });
    const duplicates = question({
      options: ["Same", "same", "Other", "Another"],
      correctAnswer: "Same",
    });
    const schema = questionSetSchema({ ...request, count: 1 });

    expect(schema.safeParse({ questions: [blank] }).success).toBe(false);
    expect(schema.safeParse({ questions: [duplicates] }).success).toBe(false);
  });

  it("rejects a correct answer that is not one of the options", () => {
    const parsed = questionSetSchema({ ...request, count: 1 }).safeParse({
      questions: [question({ correctAnswer: "A photo classifier." })],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.includes("correctAnswer"))).toBe(true);
    }
  });

  it("rejects an empty explanation", () => {
    const parsed = questionSetSchema({ ...request, count: 1 }).safeParse({
      questions: [question({ explanation: "   " })],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects difficulty or topic that do not match the request", () => {
    const schema = questionSetSchema({ ...request, count: 1 });
    expect(schema.safeParse({ questions: [question({ difficulty: "Advanced" })] }).success).toBe(
      false,
    );
    expect(schema.safeParse({ questions: [question({ topic: "Biology" })] }).success).toBe(false);
  });
});

describe("parseModelJson", () => {
  it("parses raw JSON and fenced JSON", () => {
    expect(parseModelJson('{"questions":[]}')).toEqual({ ok: true, value: { questions: [] } });
    expect(parseModelJson('```json\n{"ok":true}\n```')).toEqual({ ok: true, value: { ok: true } });
  });

  it("rejects empty and invalid JSON without throwing", () => {
    expect(parseModelJson("  ")).toEqual({ ok: false, error: "Model response was empty." });
    expect(parseModelJson("not json")).toEqual({
      ok: false,
      error: "Model response was not valid JSON.",
    });
  });
});

describe("buildResponseSchema", () => {
  it("asks Gemini for the requested count and four options", () => {
    const schema = buildResponseSchema(request);
    const questions = (schema.properties as { questions: { minItems: number; items: { properties: { options: { minItems: number; maxItems: number }; difficulty: { enum: string[] }; topic: { enum: string[] } } } } }).questions;

    expect(schema.type).toBe("OBJECT");
    expect(questions.minItems).toBe(2);
    expect(questions.items.properties.options.minItems).toBe(4);
    expect(questions.items.properties.options.maxItems).toBe(4);
    expect(questions.items.properties.difficulty.enum).toEqual(["Beginner"]);
    expect(questions.items.properties.topic.enum).toEqual(["Artificial Intelligence"]);
  });
});
