# Digital ID

A sovereign-grade digital identity wallet, built as an installable PWA.

Five country profiles (Thailand, Singapore, Brazil, USA, Vietnam) each carry their
own card artwork, translations, date formatting and default data. Card faces are
generated through Google Gemini behind a server-side proxy.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens in `src/index.css`) |
| Routing | React Router 7 |
| Server state | TanStack Query |
| Auth | Clerk (Google OAuth) |
| Database | Neon (serverless Postgres) |
| File storage | Vercel Blob (private store) |
| API | Vercel Functions in `api/` |
| Offline shell | `vite-plugin-pwa` (Workbox) |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

`npm run dev` serves the client only. The `api/` functions need the Vercel
runtime, so run `vercel dev` when you need the API as well.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (client only) |
| `npm run build` | Typecheck client + API, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc` over `src/` and `api/` |
| `npm test` | Vitest |
| `npm run db:push` | Apply `db/schema.sql` to `DATABASE_URL` |

`npm test` includes `tests/apiHandlers.integration.test.ts`, which runs the real
handlers against real Clerk tokens, the real Neon database and the real private
Blob store. It creates two throwaway Clerk users and deletes them, along with
their rows and blobs, afterwards. It skips itself when `CLERK_SECRET_KEY`,
`DATABASE_URL` or `BLOB_READ_WRITE_TOKEN` is missing, so the suite still runs on
an unconfigured machine.

The handlers are invoked in-process rather than over HTTP because Clerk's
Backend API cannot mint a token carrying an `azp` claim — only a browser session
gets one — while `vercel dev` always sets `VERCEL_URL`, which switches on
`authorizedParties` enforcement. The `azp` path is covered by real sign-in.

### First-time setup

See **[SETUP.md](SETUP.md)** for the full walkthrough. In short:

1. **Clerk** — create an application, enable the Google social connection, and
   copy the publishable and secret keys.
2. **Neon** — create a project, put the pooled connection string in
   `DATABASE_URL`, then apply the schema with `npm run db:push`.
3. **Vercel Blob** — create a store with **private** access and link it to the
   project.
4. **Gemini** — create an API key in Google AI Studio.
5. Set every server variable below in the Vercel project settings as well as in
   `.env.local`.

### Environment

Anything prefixed `VITE_` is compiled into the JavaScript bundle and is readable
by anyone who loads the site. Everything else stays server-side.

| Variable | Scope | Required | Notes |
| --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | yes | Designed to be public |
| `VITE_GEMINI_API_KEY` | client | no | Local-only direct-to-Google fallback. **Never set this in Vercel** — it would ship the key to every visitor |
| `CLERK_SECRET_KEY` | server | yes | Verifies session tokens in `api/` |
| `DATABASE_URL` | server | yes | Neon pooled connection string |
| `GEMINI_API_KEY` | server | yes | Read only by `api/gemini.ts` |
| `BLOB_READ_WRITE_TOKEN` | server | yes | Set automatically once a Blob store is linked |
| `ALLOWED_ORIGINS` | server | no | Comma-separated. Localhost is always allowed |

## Architecture notes

**The browser never holds a database credential.** A Vite SPA has no server, so
every read and write goes through a function in `api/`. Each one resolves the
caller's Clerk user id from the `Authorization` header and scopes its SQL to that
id. No handler reads a user id from a request body or query string — that is the
single rule keeping one user out of another's rows.

**The Gemini proxy is authenticated.** `api/gemini.ts` refuses requests without a
valid session, so the API key cannot be spent by anyone who finds the URL. The
model name is checked against an allowlist before it is interpolated into the
upstream URL; unchecked, it could reshape the request path and aim the key at
arbitrary Google endpoints.

**Card images are private.** Renders go to a private Blob store under
`<userId>/<country>/<uuid>` and are streamed back through `api/cards.ts` after an
ownership check, rather than served from a public URL. An unguessable URL still
survives being pasted into a chat log; an authenticated read does not.

**The service worker is not a security boundary.** Cache Storage is readable by
any script on the origin, so `vite.config.ts` runs an explicit allowlist:
content-hashed build output and the public card templates may be cached, and
anything that can carry identity data — `/api` requests, auth callbacks — is
never cached. Offline retention of documents is planned as a separate, explicitly
opt-in, client-encrypted vault rather than a caching side effect.

**Card templates live in `public/templates/`, not in the bundle.** They total
~1.3 MB and only the generation path reads them, so they are fetched and encoded
on demand. `scripts/extract-templates.mjs` is the one-shot migration that lifted
them out of TypeScript source.

**Country configs are data, not code.** `src/countries/<country>.ts` each export a
`CountryConfig`; `src/countries/index.ts` exposes the registry. Adding a country
means adding one file and one registry entry.

## Repository layout

```
api/                Vercel Functions (gemini proxy, profiles, preferences, cards)
api/_lib/           Shared auth, database and HTTP helpers
db/schema.sql       Neon schema
public/templates/   Card templates + default portrait (fetched, never bundled)
src/countries/      Per-country configuration and the registry
src/features/auth/  Clerk provider, token bridge and the auth gate
src/features/profiles/  TanStack Query hooks over the API
src/lib/            API client, query client, error reporting
src/routes/         Route components
src/services/       Gemini generation pipeline, QR token service
tests/              Vitest suites
```

## Known issues

`npm audit` reports advisories in `undici`, pulled in by `@vercel/node`. That
package is a devDependency used only for request/response types and is never
deployed. `npm audit fix --force` "resolves" it by downgrading `@vercel/node` to
an older major, which is worse; production dependencies audit clean.

## History

The v4 React Native / Expo application lives on the `wave-1-bridge-and-errors`
branch and is kept as reference only. It is not maintained.
