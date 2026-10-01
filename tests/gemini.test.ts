import { afterEach, describe, expect, it, vi } from "vitest";

import { MissingApiKeyError, ProviderRequestError } from "@/lib/ai/errors";
import { createGeminiModel, DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini";

const generateContent = vi.hoisted(() => vi.fn());
const constructed = vi.hoisted(() => ({ apiKey: undefined as string | undefined }));

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor(options?: { apiKey?: string }) {
        constructed.apiKey = options?.apiKey;
      }

      models = { generateContent };
    },
  };
});

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  process.env.GEMINI_API_KEY = originalKey;
  process.env.GEMINI_MODEL = originalModel;
  generateContent.mockReset();
  constructed.apiKey = undefined;
});

describe("createGeminiModel", () => {
  it("refuses to call Gemini when the server key is missing", () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => createGeminiModel()).toThrow(MissingApiKeyError);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("sends JSON mode, the response schema, and the configured model", async () => {
    process.env.GEMINI_API_KEY = "AIzaSyTESTKEY123456789012345";
    process.env.GEMINI_MODEL = " gemini-2.5-flash-lite ";
    generateContent.mockResolvedValue({ text: '{"questions":[]}' });

    const model = createGeminiModel();
    const schema = { type: "OBJECT", required: ["questions"] };
    const text = await model.completeJson({
      system: "Write questions.",
      user: "Topic: plants",
      responseSchema: schema,
    });

    expect(text).toBe('{"questions":[]}');
    expect(constructed.apiKey).toBe("AIzaSyTESTKEY123456789012345");
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-lite",
      contents: "Topic: plants",
      config: {
        systemInstruction: "Write questions.",
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });
  });

  it("defaults to the cheap flash model", async () => {
    process.env.GEMINI_API_KEY = "AIzaSyTESTKEY123456789012345";
    delete process.env.GEMINI_MODEL;
    generateContent.mockResolvedValue({ text: "{}" });

    const model = createGeminiModel();
    await model.completeJson({
      system: "s",
      user: "u",
      responseSchema: { type: "OBJECT" },
    });

    expect(generateContent.mock.calls[0]?.[0].model).toBe(DEFAULT_GEMINI_MODEL);
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-2.5-flash");
  });

  it("does not pass provider error text that contains the key", async () => {
    process.env.GEMINI_API_KEY = "AIzaSyTESTKEY123456789012345";
    generateContent.mockRejectedValue(
      new Error("permission denied for AIzaSyTESTKEY123456789012345"),
    );

    const model = createGeminiModel();
    await expect(
      model.completeJson({ system: "s", user: "u", responseSchema: {} }),
    ).rejects.toBeInstanceOf(ProviderRequestError);
    await expect(
      model.completeJson({ system: "s", user: "u", responseSchema: {} }),
    ).rejects.toThrow(/^The Gemini request failed\.$/);
  });
});
