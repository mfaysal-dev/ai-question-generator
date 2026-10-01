export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseModelJson(raw: string): JsonParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Model response was empty." };
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] ?? trimmed;

  try {
    return { ok: true, value: JSON.parse(candidate) as unknown };
  } catch {
    return { ok: false, error: "Model response was not valid JSON." };
  }
}
