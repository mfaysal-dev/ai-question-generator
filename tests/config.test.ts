import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/ai/redact";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("secret handling", () => {
  it("redacts Gemini key material", () => {
    const redacted = redactSecrets(
      "GEMINI_API_KEY=AIzaSySECRETKEY1234567890 failed for AIzaSySECRETKEY1234567890",
    );
    expect(redacted).not.toContain("AIzaSySECRETKEY1234567890");
    expect(redacted).toContain("[redacted]");
  });

  it("keeps the example env file free of a real key", () => {
    const example = source(".env.example");
    expect(example).toContain("GEMINI_API_KEY=");
    expect(example).toContain("GEMINI_MODEL=gemini-3.5-flash-lite");
    expect(example).not.toMatch(/GEMINI_API_KEY=\S+/);
    expect(example).not.toMatch(/NEXT_PUBLIC_\w+=/);
  });

  it("gitignores local env files and still tracks the example", () => {
    const ignore = source(".gitignore");
    expect(ignore).toContain(".env*");
    expect(ignore).toContain("!.env.example");
  });

  it("does not reference the key from client files", () => {
    const files = [
      "app/page.tsx",
      "app/layout.tsx",
      "components/question-generator.tsx",
      "components/question-card.tsx",
    ];

    for (const file of files) {
      const text = source(file);
      expect(text, file).not.toContain("GEMINI_API_KEY");
      expect(text, file).not.toContain("NEXT_PUBLIC_");
      expect(text, file).not.toContain("@google/genai");
    }
  });

  it("uses the Gemini SDK only on the server", () => {
    const gemini = source("lib/ai/gemini.ts");
    const route = source("app/api/generate/route.ts");
    const pkg = JSON.parse(source("package.json")) as {
      dependencies: Record<string, string>;
    };

    expect(gemini).toContain('import "server-only"');
    expect(gemini).toContain("process.env.GEMINI_API_KEY");
    expect(gemini).toContain("process.env.GEMINI_MODEL");
    expect(gemini).toContain('responseMimeType: "application/json"');
    expect(gemini).toContain("responseSchema");
    expect(gemini).not.toContain("NEXT_PUBLIC_");
    expect(route).toContain("createLanguageModel");
    expect(pkg.dependencies["@google/genai"]).toBeDefined();
    expect(pkg.dependencies.openai).toBeUndefined();
  });
});
