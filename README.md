# Digital ID

A sovereign-grade digital identity wallet, built as an installable PWA.

Five country profiles (Thailand, Singapore, Brazil, USA, Vietnam) each carry their
own card artwork, translations, date formatting and default data. Card faces are
generated through Google Gemini behind a Supabase edge function.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens in `src/index.css`) |
| Routing | React Router 7 |
| Server state | TanStack Query |
| Auth / data | Supabase (Google OAuth, Postgres, Storage) |
| Offline shell | `vite-plugin-pwa` (Workbox) |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Safe to expose; access is enforced by row level security |
| `VITE_GEMINI_API_KEY` | no | Local-only direct-to-Google fallback. **Never set this in Vercel** — it would ship the key to every visitor. |

## Architecture notes

**The service worker is not a security boundary.** Cache Storage is readable by
any script on the origin, so `vite.config.ts` runs an explicit allowlist:
content-hashed build output and the public card templates may be cached, and
anything that can carry identity data — Supabase requests, auth callbacks, API
calls — is never cached. Offline retention of documents is planned as a separate,
explicitly opt-in, client-encrypted vault rather than a caching side effect.

**Card templates live in `public/templates/`, not in the bundle.** They total
~1.3 MB and only the generation path reads them, so they are fetched and encoded
on demand. `scripts/extract-templates.mjs` is the one-shot migration that lifted
them out of TypeScript source.

**Country configs are data, not code.** `src/countries/<country>.ts` each export a
`CountryConfig`; `src/countries/index.ts` exposes the registry. Adding a country
means adding one file and one registry entry.

## Repository layout

```
public/templates/   Card templates + default portrait (fetched, never bundled)
src/countries/      Per-country configuration and the registry
src/features/auth/  Supabase session provider and the auth gate
src/lib/            Supabase client, query client, error reporting
src/routes/         Route components
src/services/       Gemini generation pipeline, QR token service
supabase/functions/ Edge functions (Gemini proxy)
tests/              Vitest suites
```

## History

The v4 React Native / Expo application lives on the `wave-1-bridge-and-errors`
branch and is kept as reference only. It is not maintained.
