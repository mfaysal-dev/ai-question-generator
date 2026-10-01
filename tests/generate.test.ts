import { describe, expect, it, vi } from "vitest";

import { QuestionValidationError } from "@/lib/ai/errors";
import type { LanguageModel } from "@/lib/ai/types";
import { generateQuestions } from "@/lib/questions/generate";
import type { GenerateRequest } from "@/lib/questions/schema";

const request: GenerateRequest = {
  topic: "Artificial Intelligence",
  difficulty: "Beginner",
  count: 1,
  level: "Class 8",
};

function validSet() {
  return {
    questions: [
      {
        question: "Which of these is a learning program?",
        options: ["A timetable", "A photo classifier", "A light switch", "A dictionary"],
        correctAnswer: "A photo classifier",
        explanation: "It improves from examples instead of following a fixed list.",
        difficulty: "Beginner",
        topic: "Artificial Intelligence",
      },
    ],
  };
}

function modelReturning(...payloads: string[]): LanguageModel & { completeJson: ReturnType<typeof vi.fn> } {
  const completeJson = vi.fn();
  for (const payload of payloads) {
    completeJson.mockResolvedValueOnce(payload);
  }
  return { completeJson };
}

describe("generateQuestions", () => {
  it("returns a validated set from a JSON response", async () => {
    const model = modelReturning(JSON.stringify(validSet()));
    const result = await generateQuestions(request, model);

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.correctAnswer).toBe("A photo classifier");
    expect(model.completeJson).toHaveBeenCalledTimes(1);
    expect(model.completeJson.mock.calls[0]?.[0].responseSchema.type).toBe("OBJECT");
  });

  it("retries once after an invalid response, then returns the valid set", async () => {
    const invalid = {
      questions: [
        {
          ...validSet().questions[0],
          options: ["Only", "Three", "Choices"],
        },
      ],
    };
    const model = modelReturning(JSON.stringify(invalid), JSON.stringify(validSet()));

    const result = await generateQuestions(request, model);

    expect(result.questions[0]?.options).toHaveLength(4);
    expect(model.completeJson).toHaveBeenCalledTimes(2);
    const retryPrompt = String(model.completeJson.mock.calls[1]?.[0].user);
    expect(retryPrompt).toContain("failed validation");
    expect(retryPrompt).toContain("exactly four options");
  });

  it("stops after one retry when both responses fail", async () => {
    const model = modelReturning("not json", "{");

    await expect(generateQuestions(request, model)).rejects.toBeInstanceOf(QuestionValidationError);
    expect(model.completeJson).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the model throws", async () => {
    const completeJson = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(generateQuestions(request, { completeJson })).rejects.toThrow("network down");
    expect(completeJson).toHaveBeenCalledTimes(1);
  });
});
