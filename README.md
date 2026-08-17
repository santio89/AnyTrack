# AnyTrack

AI-powered web monitoring. Add a URL, describe what to extract, and get structured values on a schedule.

## How it works

1. **Track** – You set a URL and a plain-language target (price, headline, stock status, etc.).
2. **Extract** – Playwright loads the page and vision AI reads a screenshot to pull the value.
3. **Monitor** – Signed-in users get scheduled checks, change alerts, and cloud sync. Guests can run checks manually in the browser.

Optional reference screenshots help the model find the right element. English and Spanish UI.

## Run locally

This repo pins **npm 11.16.0** (same as Docker/Render). One-time setup:

```bash
corepack enable
```

Then:

```bash
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Dashboard: `/dashboard`.

**Clerk** (required for sign-in): create an app at [dashboard.clerk.com](https://dashboard.clerk.com), copy the API keys into `.env`, and enable your auth providers.

**Supabase** (required): Postgres stores all server data; Storage holds screenshots and reference images. See [Production setup](#production-setup-supabase) below.

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
| `npm run db:push` | Push Drizzle schema to Postgres (initial/local setup) |

## Stack

Next.js, Clerk, Supabase (Postgres + Storage), Drizzle, Playwright, OpenAI-compatible vision APIs. A `Dockerfile` is included for containerized hosting.

## Production setup (Supabase)

Render's free plan has no persistent disk. Use **Supabase** for the database and image files.

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Wait for the database to finish provisioning.

### 2. Database connection string

1. **Project Settings → Database → Connection string**
2. Choose **URI**
3. For the app on Render, use the **Session pooler** string (port `5432` on `pooler.supabase.com`, or port `6543` with `?pgbouncer=true` depending on your dashboard).
4. Copy it into `DATABASE_URL`.

For `npm run db:push` from your machine, use the **Direct** or pooler URI with port `5432` once to create tables.

On startup, the app runs Drizzle migrations from `drizzle/` automatically.

### 3. API keys

**Project Settings → API**

| Variable | Where |
|----------|--------|
| `SUPABASE_URL` | Project URL (server-only; `NEXT_PUBLIC_SUPABASE_URL` still works as a legacy alias) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) or legacy `service_role` (server only) |

### 4. Storage bucket

1. **Storage → New bucket**
2. Name: `anytrack`
3. **Private** bucket (the app serves files through your API with auth checks)
4. No public policies needed; the server uses the service role key.

### 5. Push schema (once)

Add `DATABASE_URL` to `.env`, then:

```bash
npm run db:push
```

### 6. Render environment

Add to your Render service:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Session pooler URI from Supabase |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key or `service_role` |
| `SUPABASE_STORAGE_BUCKET` | `anytrack` |
| `AI_CREDENTIALS_ENCRYPTION_KEY` | Required if users save API keys (generate per `.env.example`) |
| `AI_GATEWAY_API_KEY` / `OPENROUTER_API_KEY` | At least one for hosted AI |
| `NEXT_PUBLIC_SITE_URL` | Your public app URL |
| Clerk vars | Publishable + secret keys, sign-in URLs |
| `RESEND_API_KEY` / `NOTIFICATION_FROM_EMAIL` | Optional email alerts |

Redeploy. Trackers, logs, and screenshots survive redeploys.

### Auth: Clerk vs Supabase Auth

This app uses **Clerk** for sign-in. Supabase is only used for **Postgres + Storage**. You do not need to enable Supabase Auth unless you want to migrate away from Clerk later.
