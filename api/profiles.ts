import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId } from './_lib/auth.js';
import { db } from './_lib/db.js';
import { applyCors, fail, failInternal, isOriginAllowed } from './_lib/http.js';

/**
 * Profile CRUD.
 *
 * Every statement filters on the `user_id` resolved from the verified Clerk
 * token. The client cannot pass a user id — there is no code path that reads one
 * from the request.
 */

const COUNTRY_CODES = ['TH', 'SG', 'BR', 'US', 'VN'] as const;
type CountryCode = (typeof COUNTRY_CODES)[number];

function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
      const country = req.query.country;
      if (country !== undefined) {
        if (!isCountryCode(country)) {
          fail(res, 400, 'Unknown country code');
          return;
        }
        const rows = await sql`
          select id, country_code, data, card_front_path, portrait_path, created_at, updated_at
          from profiles
          where user_id = ${userId} and country_code = ${country}::country_code
        `;
        res.status(200).json({ profile: rows[0] ?? null });
        return;
      }

      const rows = await sql`
        select id, country_code, data, card_front_path, portrait_path, created_at, updated_at
        from profiles
        where user_id = ${userId}
        order by country_code
      `;
      res.status(200).json({ profiles: rows });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = isPlainObject(req.body) ? req.body : {};
      const { countryCode, data, cardFrontPath, portraitPath } = body;

      if (!isCountryCode(countryCode)) {
        fail(res, 400, 'A valid countryCode is required');
        return;
      }
      if (!isPlainObject(data)) {
        fail(res, 400, 'data must be an object');
        return;
      }

      const rows = await sql`
        insert into profiles (user_id, country_code, data, card_front_path, portrait_path)
        values (
          ${userId},
          ${countryCode}::country_code,
          ${JSON.stringify(data)}::jsonb,
          ${cardFrontPath ?? null},
          ${portraitPath ?? null}
        )
        on conflict (user_id, country_code) do update
          set data = excluded.data,
              card_front_path = coalesce(excluded.card_front_path, profiles.card_front_path),
              portrait_path = coalesce(excluded.portrait_path, profiles.portrait_path)
        returning id, country_code, data, card_front_path, portrait_path, created_at, updated_at
      `;
      res.status(200).json({ profile: rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const country = req.query.country;
      if (!isCountryCode(country)) {
        fail(res, 400, 'A valid country query parameter is required');
        return;
      }
      await sql`
        delete from profiles
        where user_id = ${userId} and country_code = ${country}::country_code
      `;
      res.status(204).end();
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (error) {
    failInternal(res, 'profiles handler failed', error);
  }
}
