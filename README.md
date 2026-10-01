# Quizwright

Quizwright writes multiple-choice questions for a class. You choose a topic, a difficulty, how many questions you want, and the student level. Each question comes back with four options, one correct answer, and a short explanation.

The browser only talks to `POST /api/generate`. Gemini is called from that server route with the official `@google/genai` SDK. The API key is read from `GEMINI_API_KEY` and is never sent to the client.

## Requirements

- Node.js 20.9 or newer
- npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Run locally

### Windows (Command Prompt)

```bat
npm install
copy .env.example .env.local
notepad .env.local
npm run dev
```

### Windows (PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

### macOS and Linux

```bash
npm install
cp .env.example .env.local
npm run dev
```

Put your key on the `GEMINI_API_KEY=` line in `.env.local`, save the file, then start the dev server. Open [http://localhost:3000](http://localhost:3000).

`.env.local` is gitignored. Do not commit it, and do not rename the variable to anything starting with `NEXT_PUBLIC_`.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Server-only Gemini API key. |
| `GEMINI_MODEL` | No | Model id. Defaults to `gemini-3.5-flash-lite`. |

Restart `npm run dev` after changing `.env.local`. Next.js only reads env files at startup.

## Deploy on Vercel

1. Import this repository in Vercel. The framework preset is Next.js.
2. Open the project **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` and paste the key from [Google AI Studio](https://aistudio.google.com/apikey). Enable it for Production and Preview (and Development if you use `vercel dev`).
4. Optionally add `GEMINI_MODEL`. Leave it unset to use `gemini-3.5-flash-lite`.
5. Do not add `NEXT_PUBLIC_GEMINI_API_KEY`. A `NEXT_PUBLIC_` prefix would expose the key in the browser bundle.
6. Redeploy. Vercel does not upload `.env.local`; the dashboard variables are what the deployed server reads.

The key is only used when someone generates questions, so the project can build before the variable is set. Requests fail with a clear error until `GEMINI_API_KEY` is present.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run unit tests once. |

## How a request is checked

1. The route validates the body with Zod: topic, difficulty (`Beginner`, `Intermediate`, or `Advanced`), question count from 1 to 20, and student level.
2. Gemini is asked for JSON with `responseMimeType: "application/json"` and a response schema for that count, topic, and difficulty.
3. The route parses the JSON and checks it again with Zod: the right number of questions, four non-empty distinct options, `correctAnswer` equal to one of those options, a non-empty explanation, and difficulty and topic copied from the request.
4. If that check fails, the route retries once with the validation errors. If the second response still fails, the client gets a clear error and no question cards.
5. The page renders a set only after the same schema accepts it.

The model adapter lives in `lib/ai/gemini.ts`. Question checking lives in `lib/questions/` and does not import the SDK, so another provider can replace the adapter without changing the validation rules.
