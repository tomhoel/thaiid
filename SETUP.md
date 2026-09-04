# Setup

Getting `thaiid` running locally and then deployed. Roughly 20 minutes.

Every service here has a free tier that covers this project.

## Before you start

You need accounts on [Clerk](https://clerk.com), [Neon](https://neon.tech),
[Vercel](https://vercel.com) and [Google AI Studio](https://aistudio.google.com).
Sign in to all four with GitHub or Google and you can skip most of the forms.

`.env.local` already exists in the repo root with the right keys and empty
values. It is gitignored — fill it in as you go and never commit it.

```powershell
npm install
```

---

## 1. Clerk (authentication)

Clerk handles Google sign-in and issues the session tokens that `api/` verifies.

1. In the [Clerk dashboard](https://dashboard.clerk.com), click **Create
   application**.
2. Name it `thaiid`. Under sign-in options, enable **Google** and disable the
   rest unless you want them.
3. Click **Create application**.
4. Go to **Configure → API keys** and copy both keys into `.env.local`:

```ini
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**You do not need a Google Cloud OAuth app yet.** Clerk development instances
use shared Google credentials out of the box. You only need your own Google
OAuth client when you go to production — the Clerk dashboard will prompt you,
and gives you the redirect URI to paste into Google Cloud Console.

The publishable key is *designed* to be public, which is why it carries the
`VITE_` prefix and ships in the bundle. The secret key must never get that
prefix — see the warning in step 6.

**Verify:** `npm run dev`, open the site. If you see "Authentication is not
configured", the publishable key did not load — restart the dev server, since
Vite only reads `.env.local` at startup.

---

## 2. Neon (database)

1. In the [Neon console](https://console.neon.tech), click **Create project**.
2. Name it `thaiid` and pick the region closest to you.
3. On the project dashboard click **Connect**.
4. **Make sure the "Connection pooling" toggle is ON.** The hostname must
   contain `-pooler`.
5. Copy the string into `.env.local`:

```ini
DATABASE_URL=******ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Pooling matters because serverless functions open a connection per invocation
and a direct connection will exhaust Postgres' connection limit under any real
traffic.

Now apply the schema:

```powershell
npm run db:push
```

This uses the Neon driver already in the project, so you do not need `psql`
installed. It is safe to run more than once — every statement guards with
`if not exists` or `or replace`.

**Verify:** the command prints

```
Applied db/schema.sql
Tables now present: card_versions, profiles, user_preferences
```

---

## 3. Vercel (hosting + Blob storage)

Link the repo first — the Blob token comes from the linked project.

```powershell
vercel login
vercel link
```

Accept the prompts to create a new project named `thaiid`.

Then create the store:

1. In the [Vercel dashboard](https://vercel.com/dashboard), open your project
   and go to the **Storage** tab.
2. **Create** → **Blob**.
3. Name it `thaiid-cards`.
4. Set access to **Private**. This is the important one: a public store serves
   every uploaded ID photo from a guessable URL, with no way to revoke it.
5. Connect it to the `thaiid` project.

Pull the generated token down to your machine:

```powershell
vercel env pull .env.vercel
```

Copy the `BLOB_READ_WRITE_TOKEN` line from `.env.vercel` into `.env.local`, then
delete `.env.vercel`.

**Verify:** `BLOB_READ_WRITE_TOKEN` in `.env.local` starts with
`vercel_blob_rw_`.

---

## 4. Gemini (card generation)

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) → **Create
   API key**.
2. Put it in `.env.local` under the **unprefixed** name:

```ini
GEMINI_API_KEY=AIza...
```

You already have a value in `VITE_GEMINI_API_KEY`. That prefix means Vite
compiles it into the JavaScript bundle, where anyone can read it and spend your
quota. It exists only as a local fallback for when you run `npm run dev` without
the API. Leave it out of Vercel entirely.

`api/gemini.ts` reads only `GEMINI_API_KEY`, requires a signed-in user, caps
payloads at 12 MB and allowlists model names.

---

## 5. Run it

`npm run dev` serves the client only — there is no `/api` on that server, so
sign-in works but nothing that touches data will. To run the functions too:

```powershell
vercel dev
```

Then walk through:

1. **Sign in** — click through Google OAuth and land back on the app.
2. **Profile** — the app fetches `/api/profiles`. First load returns an empty
   list, not an error.
3. **Preferences** — `/api/preferences` upserts a row on first read.
4. **Card upload** — renders to the private Blob store and reads it back
   through `/api/cards`.

None of this has ever run against live services, so expect to hit something.
The failures are usually one of the items in Troubleshooting below.

---

## 6. Deploy

Add the four server variables to Vercel. `BLOB_READ_WRITE_TOKEN` is already
there from step 3.

```powershell
vercel env add CLERK_SECRET_KEY production
vercel env add DATABASE_URL production
vercel env add GEMINI_API_KEY production
vercel env add VITE_CLERK_PUBLISHABLE_KEY production
```

Repeat with `preview` in place of `production` if you want preview deployments
to work.

> **Do not add `VITE_GEMINI_API_KEY` to Vercel.** Anything with that prefix is
> baked into the public bundle at build time. Adding it there publishes your
> Gemini key to every visitor.

Deploy:

```powershell
vercel --prod
```

Finally, set `ALLOWED_ORIGINS` to your deployed URL:

```powershell
vercel env add ALLOWED_ORIGINS production
# value: https://thaiid.vercel.app
```

This is read in two places — the CORS check in `api/_lib/http.ts` and Clerk's
`authorizedParties` in `api/_lib/auth.ts`, which stops a token minted for
another site from being replayed against your API. Vercel's own `VERCEL_URL` is
trusted automatically, so you only need this for a custom domain. Localhost is
always allowed, so you can skip it for local development.

---

## Environment reference

| Variable | Scope | Required | Source |
| --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | yes | Clerk → API keys |
| `CLERK_SECRET_KEY` | server | yes | Clerk → API keys |
| `DATABASE_URL` | server | yes | Neon → Connect (pooled) |
| `GEMINI_API_KEY` | server | yes | Google AI Studio |
| `BLOB_READ_WRITE_TOKEN` | server | yes | `vercel env pull` after linking a store |
| `ALLOWED_ORIGINS` | server | no | Your deployed origin. Localhost always allowed |
| `VITE_GEMINI_API_KEY` | client | no | Local dev fallback. **Never set in Vercel** |

---

## Troubleshooting

**"Authentication is not configured"** — `VITE_CLERK_PUBLISHABLE_KEY` is missing
or the dev server started before you set it. Restart it.

**`npm run db:push` says DATABASE_URL is not set** — it reads `.env.local`. Check
the value is on one line with no surrounding quotes.

**Database connection hangs or drops** — your connection string is probably the
direct one. It must contain `-pooler`.

**401 from `/api/*` while signed in** — the browser origin is not in
`authorizedParties`. Add it to `ALLOWED_ORIGINS`. On localhost this should not
happen; the dev origins are matched by pattern.

**404 reading a card you just uploaded** — expected if the blob path does not
begin with your Clerk user id. `api/cards.ts` returns 404 rather than 403 on an
ownership mismatch so that probing cannot confirm a file exists.

**`/api` 404s under `npm run dev`** — that server does not run functions. Use
`vercel dev`.

**`npm audit` flags `undici`** — comes from `@vercel/node`, a devDependency used
for types only. It is not in the deployed bundle. `npm audit fix --force`
downgrades `@vercel/node` a major version and breaks the build.
