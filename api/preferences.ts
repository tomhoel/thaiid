import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId } from './_lib/auth.js';
import { db } from './_lib/db.js';
import { applyCors, fail, failInternal, isOriginAllowed } from './_lib/http.js';

/** Per-user preferences. Read-modify-write, keyed on the verified Clerk user id. */

const COUNTRY_CODES = ['TH', 'SG', 'BR', 'US', 'VN'] as const;
const THEMES = ['dark', 'light'] as const;
const LANGUAGES = ['en', 'th', 'zh', 'pt', 'vi'] as const;

function oneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!isOriginAllowed(req.headers.origin)) {
    fail(res, 403, 'Origin not allowed');
    return;
  }

  const userId = await requireUserId(req);
  if (!userId) {
    fail(res, 401, 'Sign in required');
    return;
  }

  try {
    const sql = db();

    if (req.method === 'GET') {
      // Created on first read so a new user never sees a null preferences object.
      const rows = await sql`
        insert into user_preferences (user_id)
        values (${userId})
        on conflict (user_id) do update set user_id = excluded.user_id
        returning user_id, active_country, theme, language, created_at, updated_at
      `;
      res.status(200).json({ preferences: rows[0] });
      return;
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { activeCountry, theme, language } = body;

      if (activeCountry !== undefined && !oneOf(COUNTRY_CODES, activeCountry)) {
        fail(res, 400, 'Unknown country code');
        return;
      }
      if (theme !== undefined && !oneOf(THEMES, theme)) {
        fail(res, 400, 'Unknown theme');
        return;
      }
      if (language !== undefined && !oneOf(LANGUAGES, language)) {
        fail(res, 400, 'Unknown language');
        return;
      }

      const rows = await sql`
        insert into user_preferences (user_id, active_country, theme, language)
        values (
          ${userId},
          coalesce(${activeCountry ?? null}::country_code, 'TH'::country_code),
          coalesce(${theme ?? null}, 'dark'),
          coalesce(${language ?? null}, 'en')
        )
        on conflict (user_id) do update
          set active_country = coalesce(${activeCountry ?? null}::country_code, user_preferences.active_country),
              theme = coalesce(${theme ?? null}, user_preferences.theme),
              language = coalesce(${language ?? null}, user_preferences.language)
        returning user_id, active_country, theme, language, created_at, updated_at
      `;
      res.status(200).json({ preferences: rows[0] });
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (error) {
    failInternal(res, 'preferences handler failed', error);
  }
}
