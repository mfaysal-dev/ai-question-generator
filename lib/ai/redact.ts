const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{10,}/g,
  /GEMINI_API_KEY\s*[=:]\s*\S+/gi,
];

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[redacted]"),
    value,
  );
}
