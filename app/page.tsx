import { QuestionGenerator } from "@/components/question-generator";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/80 bg-card/90">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-heading text-lg text-primary-foreground">
            Q
          </span>
          <div>
            <p className="font-heading text-lg leading-none tracking-tight">Quizwright</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Classroom multiple-choice sets
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <QuestionGenerator />
      </main>
    </div>
  );
}
