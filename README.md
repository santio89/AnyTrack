# AnyTrack

AI-powered web monitoring. Add a URL, describe what to extract, and get structured values on a schedule.

## How it works

1. **Track** – You set a URL and a plain-language target (price, headline, stock status, etc.).
2. **Extract** – Playwright loads the page and vision AI reads a screenshot to pull the value.
3. **Monitor** – Signed-in users get scheduled checks, change alerts, and cloud sync. Guests can run checks manually in the browser.

Optional reference screenshots help the model find the right element. English and Spanish UI.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Dashboard: `/dashboard`.

**Clerk** (required for sign-in): create an app at [dashboard.clerk.com](https://dashboard.clerk.com), copy the API keys into `.env`, and enable your auth providers.

**AI** (required for extractions): set `AI_GATEWAY_API_KEY` and/or `OPENROUTER_API_KEY`, or use your own key in Settings after sign-in.

See `.env.example` for all variables.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm test` | Tests |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Drizzle schema |

## Stack

Next.js, Clerk, SQLite (Drizzle), Playwright, OpenAI-compatible vision APIs. A `Dockerfile` is included for containerized hosting.
