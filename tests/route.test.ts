import { beforeEach, describe, expect, it, vi } from "vitest";

import { MissingApiKeyError, ProviderRequestError } from "@/lib/ai/errors";
import type { LanguageModel } from "@/lib/ai/types";
import { POST } from "@/app/api/generate/route";
import { createLanguageModel } from "@/lib/ai/provider";

vi.mock("@/lib/ai/provider", () => ({
  createLanguageModel: vi.fn(),
}));

const createModel = vi.mocked(createLanguageModel);

const body = {
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

function request(payload: unknown) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    createModel.mockReset();
  });

  it("returns validated questions from a mocked Gemini response", async () => {
    const completeJson = vi.fn().mockResolvedValue(JSON.stringify(validSet()));
    createModel.mockReturnValue({ completeJson } satisfies LanguageModel);

    const response = await POST(request(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.questions).toHaveLength(1);
    expect(json.questions[0].correctAnswer).toBe("A photo classifier");
    expect(JSON.stringify(json)).not.toContain("GEMINI_API_KEY");
    expect(JSON.stringify(json)).not.toContain("AIza");
  });

  it("retries a mocked invalid response once, then succeeds", async () => {
    const invalid = {
      questions: [
        {
          ...validSet().questions[0],
          correctAnswer: "Not one of the options",
        },
      ],
    };
    const completeJson = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(invalid))
      .mockResolvedValueOnce(JSON.stringify(validSet()));
    createModel.mockReturnValue({ completeJson });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(completeJson).toHaveBeenCalledTimes(2);
    const sentSchema = completeJson.mock.calls[0]?.[0].responseSchema;
    expect(sentSchema.properties.questions.items.properties.difficulty.enum).toEqual(["Beginner"]);
  });

  it("returns a clear error after the mocked response fails twice", async () => {
    const completeJson = vi.fn().mockResolvedValue('{"questions":"LEAKED_RAW_OPTION"}');
    createModel.mockReturnValue({ completeJson });

    const response = await POST(request(body));
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe(
      "The model returned questions that did not match the required format. Please try again.",
    );
    expect(JSON.stringify(json)).not.toContain("LEAKED_RAW_OPTION");
    expect(completeJson).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid request before calling the model", async () => {
    const completeJson = vi.fn();
    createModel.mockReturnValue({ completeJson });

    const response = await POST(
      request({ topic: "", difficulty: "Beginner", count: 50, level: "Class 8" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.fieldErrors.topic).toContain("Enter a topic.");
    expect(json.fieldErrors.count[0]).toMatch(/at most 20/);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", { method: "POST", body: "nope" }),
    );
    expect(response.status).toBe(400);
    expect(createModel).not.toHaveBeenCalled();
  });

  it("reports a missing key without echoing a secret", async () => {
    createModel.mockImplementation(() => {
      throw new MissingApiKeyError();
    });

    const response = await POST(request(body));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toContain("GEMINI_API_KEY");
    expect(json.error).not.toMatch(/AIza/);
  });

  it("hides provider errors that include a key", async () => {
    createModel.mockImplementation(() => {
      throw new Error("request failed for AIzaSySECRETKEY1234567890");
    });

    const response = await POST(request(body));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("AIzaSySECRETKEY1234567890");
    expect(text).toContain("Something went wrong");
  });

  it("maps a provider failure to a clear error", async () => {
    const completeJson = vi.fn().mockRejectedValue(new ProviderRequestError());
    createModel.mockReturnValue({ completeJson });

    const response = await POST(request(body));
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toMatch(/could not reach Gemini/i);
  });
});
