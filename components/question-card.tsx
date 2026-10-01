"use client";

import { Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Question } from "@/lib/questions/schema";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

type QuestionCardProps = {
  item: Question;
  index: number;
  revealed: boolean;
  onToggle: () => void;
  sample?: boolean;
};

export function QuestionCard({
  item,
  index,
  revealed,
  onToggle,
  sample = false,
}: QuestionCardProps) {
  return (
    <Card className="border-l-4 border-l-primary shadow-none ring-foreground/10">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {sample ? "Sample" : `Question ${index + 1}`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sample ? <Badge variant="outline">Not generated</Badge> : null}
            <Badge variant="secondary">{item.topic}</Badge>
            <Badge variant="outline">{item.difficulty}</Badge>
          </div>
        </div>
        <h3 className="text-xl leading-snug text-balance">{item.question}</h3>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-2">
          {item.options.map((option, optionIndex) => {
            const correct = revealed && option === item.correctAnswer;
            return (
              <li
                key={`${optionIndex}-${option}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border px-3 py-2.5",
                  correct && "border-primary bg-primary/10",
                )}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary font-heading text-sm">
                  {LETTERS[optionIndex]}
                </span>
                <span className="min-w-0 flex-1 leading-6">{option}</span>
                {correct ? (
                  <span className="text-sm font-medium text-primary">Correct</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 bg-transparent">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full sm:w-fit"
          aria-expanded={revealed}
          onClick={onToggle}
        >
          {revealed ? <EyeOff /> : <Eye />}
          {revealed ? "Hide answer" : "Reveal answer"}
        </Button>
        {revealed ? (
          <div className="rounded-lg bg-muted px-3 py-3">
            <p className="text-sm font-medium">Answer: {item.correctAnswer}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
