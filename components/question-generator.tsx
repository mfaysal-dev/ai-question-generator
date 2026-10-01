"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { QuestionCard } from "@/components/question-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIFFICULTIES,
  generateRequestSchema,
  questionSetSchema,
  type Difficulty,
  type GenerateRequest,
  type Question,
  type QuestionSet,
} from "@/lib/questions/schema";

const LEVEL_PRESETS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Undergraduate",
  "Other",
] as const;

const SAMPLE_REQUEST: GenerateRequest = {
  topic: "Artificial Intelligence",
  difficulty: "Beginner",
  count: 1,
  level: "Class 8",
};

const SAMPLE_QUESTION: Question = questionSetSchema(SAMPLE_REQUEST).parse({
  questions: [
    {
      question: "Which of these is an example of artificial intelligence?",
      options: [
        "A printed bus timetable",
        "A program that learns to recognize cats in photos",
        "A wall light switch",
        "A paper dictionary",
      ],
      correctAnswer: "A program that learns to recognize cats in photos",
      explanation:
        "That program improves by looking at examples. A timetable, a light switch, and a paper dictionary follow fixed instructions and do not learn.",
      difficulty: "Beginner",
      topic: "Artificial Intelligence",
    },
  ],
}).questions[0];

type FieldErrors = Record<string, string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value) || !isRecord(value.fieldErrors)) {
    return {};
  }

  const entries = Object.entries(value.fieldErrors).flatMap(([key, messages]) => {
    if (!Array.isArray(messages)) {
      return [];
    }
    const text = messages.filter((message): message is string => typeof message === "string");
    return text.length > 0 ? [[key, text] as const] : [];
  });

  return Object.fromEntries(entries);
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionGenerator() {
  const [topic, setTopic] = useState("Artificial Intelligence");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [countInput, setCountInput] = useState("10");
  const [levelPreset, setLevelPreset] = useState<(typeof LEVEL_PRESETS)[number]>("Class 8");
  const [customLevel, setCustomLevel] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuestionSet | null>(null);
  const [request, setRequest] = useState<GenerateRequest | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  const level = levelPreset === "Other" ? customLevel : levelPreset;
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);

  function toggleRevealed(index: number) {
    setRevealed((current) =>
      current.map((value, itemIndex) => (itemIndex === index ? !value : value)),
    );
  }

  function setAllRevealed(value: boolean) {
    setRevealed((current) => current.map(() => value));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      topic,
      difficulty,
      count: Number(countInput),
      level,
    };
    const parsedRequest = generateRequestSchema.safeParse(payload);
    if (!parsedRequest.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsedRequest.error.issues) {
        const key = issue.path[0];
        const field = typeof key === "string" ? key : "form";
        nextErrors[field] ??= [];
        nextErrors[field].push(issue.message);
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRequest.data),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : "The generator could not finish that request. Please try again.";
        setFieldErrors(readFieldErrors(data));
        setError(message);
        return;
      }

      const parsedQuestions = questionSetSchema(parsedRequest.data).safeParse(data);
      if (!parsedQuestions.success) {
        setError("The server returned questions in an unexpected format.");
        return;
      }

      setRequest(parsedRequest.data);
      setResult(parsedQuestions.data);
      setRevealed(parsedQuestions.data.questions.map(() => false));
    } catch {
      setError("The browser could not reach the generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <section className="lg:sticky lg:top-6">
        <div className="mb-5">
          <h1 className="text-3xl tracking-tight text-balance sm:text-4xl">
            Questions for the class in front of you
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Set a topic, how hard the paper should be, and who it is for. Each card
            comes back with four options, one correct answer, and a short explanation.
          </p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>New set</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
              <Field
                label="Topic"
                htmlFor="topic"
                error={fieldErrors.topic?.[0]}
                hint="Example: Artificial Intelligence"
              >
                <Input
                  id="topic"
                  name="topic"
                  value={topic}
                  maxLength={200}
                  className="h-10"
                  aria-invalid={Boolean(fieldErrors.topic)}
                  aria-describedby={fieldErrors.topic ? "topic-error" : undefined}
                  onChange={(event) => setTopic(event.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field
                label="Difficulty"
                htmlFor="difficulty"
                error={fieldErrors.difficulty?.[0]}
              >
                <Select
                  value={difficulty}
                  onValueChange={(value) => {
                    if (
                      value === "Beginner" ||
                      value === "Intermediate" ||
                      value === "Advanced"
                    ) {
                      setDifficulty(value);
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="difficulty"
                    className="h-10 w-full"
                    aria-invalid={Boolean(fieldErrors.difficulty)}
                  >
                    <SelectValue placeholder="Choose difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Number of questions"
                htmlFor="count"
                hint="Whole number from 1 to 20."
                error={fieldErrors.count?.[0]}
              >
                <Input
                  id="count"
                  name="count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  step={1}
                  value={countInput}
                  className="h-10"
                  aria-invalid={Boolean(fieldErrors.count)}
                  aria-describedby={fieldErrors.count ? "count-error" : undefined}
                  onChange={(event) => setCountInput(event.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field
                label="Student level"
                htmlFor="level"
                hint="Example: Class 8"
                error={levelPreset === "Other" ? undefined : fieldErrors.level?.[0]}
              >
                <Select
                  value={levelPreset}
                  onValueChange={(value) => {
                    if (LEVEL_PRESETS.some((preset) => preset === value)) {
                      setLevelPreset(value as (typeof LEVEL_PRESETS)[number]);
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="level"
                    className="h-10 w-full"
                    aria-invalid={levelPreset !== "Other" && Boolean(fieldErrors.level)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_PRESETS.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {levelPreset === "Other" ? (
                <Field label="Custom level" htmlFor="custom-level" error={fieldErrors.level?.[0]}>
                  <Input
                    id="custom-level"
                    name="custom-level"
                    value={customLevel}
                    maxLength={80}
                    placeholder="Year 9"
                    className="h-10"
                    aria-invalid={Boolean(fieldErrors.level)}
                    onChange={(event) => setCustomLevel(event.target.value)}
                    disabled={loading}
                  />
                </Field>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
                >
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                {loading ? "Writing questions" : "Generate questions"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Generation runs on the server. The Gemini API key stays in the server
                environment and is never sent to the browser.
              </p>
            </form>
          </CardContent>
        </Card>
      </section>

      <section aria-live="polite" className="grid gap-4">
        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            <p className="text-sm text-muted-foreground">
              Drafting {countInput || "the"} questions on {topic.trim() || "your topic"}…
            </p>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        ) : null}

        {!loading && result && request ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl tracking-tight">
                  {request.count} {request.difficulty.toLowerCase()}{" "}
                  {request.count === 1 ? "question" : "questions"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.topic} · {request.level}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => setAllRevealed(!allRevealed)}
              >
                {allRevealed ? "Hide all answers" : "Reveal all answers"}
              </Button>
            </div>
            {result.questions.map((item, index) => (
              <QuestionCard
                key={`${item.question}-${index}`}
                item={item}
                index={index}
                revealed={revealed[index] ?? false}
                onToggle={() => toggleRevealed(index)}
              />
            ))}
          </div>
        ) : null}

        {!loading && !result ? (
          <div className="grid gap-4">
            <div>
              <h2 className="text-2xl tracking-tight">What you get back</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                A set like the example below: Artificial Intelligence, Beginner, Class 8.
                The sample is fixed copy, not a generated paper. Reveal the answer to
                see the explanation.
              </p>
            </div>
            <SampleCard />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SampleCard() {
  const [revealed, setRevealed] = useState(false);

  return (
    <QuestionCard
      item={SAMPLE_QUESTION}
      index={0}
      revealed={revealed}
      onToggle={() => setRevealed((value) => !value)}
      sample
    />
  );
}
