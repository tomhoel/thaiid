import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { requireUserId } from './_lib/auth.js';
import { db } from './_lib/db.js';
import { applyCors, fail, failInternal, isOriginAllowed } from './_lib/http.js';

/**
 * Rendered card storage.
 *
 * Cards are identity documents, so they go to a private blob store and are
 * streamed back through this function rather than served from a URL. A URL,
 * even an unguessable one, survives being pasted into a chat or a log; an
 * authenticated read does not.
 *
 * Object keys are `<userId>/<country>/<uuid>.<ext>`, and reads assert the
 * leading segment matches the caller. That check is what stops one user from
 * requesting another's card by pathname.
 */

const COUNTRY_CODES = ['TH', 'SG', 'BR', 'US', 'VN'] as const;
type CountryCode = (typeof COUNTRY_CODES)[number];

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const config = {
  api: {
    bodyParser: { sizeLimit: '12mb' },
  },
};

function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

/** A pathname is readable only if it sits under the caller's own prefix. */
function ownsPath(pathname: string, userId: string): boolean {
  if (pathname.includes('..') || pathname.startsWith('/')) return false;
  return pathname.startsWith(`${userId}/`);
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
    if (req.method === 'GET') {
      const pathname = req.query.path;
      if (typeof pathname !== 'string' || !pathname) {
        fail(res, 400, 'A path query parameter is required');
        return;
      }
      if (!ownsPath(pathname, userId)) {
        // Deliberately 404, not 403: a probe learns nothing about what exists.
        fail(res, 404, 'Not found');
        return;
      }

      const result = await get(pathname, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) {
        fail(res, 404, 'Not found');
        return;
      }

      const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
      res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(buffer);
      return;
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { countryCode, imageBase64, mimeType, model, dataSnapshot } = body;

      if (!isCountryCode(countryCode)) {
        fail(res, 400, 'A valid countryCode is required');
        return;
      }
      if (typeof imageBase64 !== 'string' || !imageBase64) {
        fail(res, 400, 'imageBase64 is required');
        return;
      }

      const type = typeof mimeType === 'string' ? mimeType : 'image/png';
      const extension = EXTENSIONS[type];
      if (!extension) {
        fail(res, 400, 'Unsupported image type');
        return;
      }

      const buffer = Buffer.from(imageBase64, 'base64');
      if (buffer.length === 0) {
        fail(res, 400, 'imageBase64 was not valid base64');
        return;
      }

      const pathname = `${userId}/${countryCode}/${randomUUID()}.${extension}`;
      await put(pathname, buffer, {
        access: 'private',
        contentType: type,
        addRandomSuffix: false,
      });

      const sql = db();
      const snapshot = typeof dataSnapshot === 'object' && dataSnapshot !== null ? dataSnapshot : {};

      // Attach to the profile only if one already exists for this country; the
      // profile row is owned by the profiles endpoint.
      const profiles = await sql`
        update profiles
        set card_front_path = ${pathname}
        where user_id = ${userId} and country_code = ${countryCode}::country_code
        returning id
      `;

      const profileId = profiles[0]?.id as string | undefined;
      if (profileId) {
        await sql`
          insert into card_versions (profile_id, user_id, data_snapshot, card_front_path, model)
          values (
            ${profileId},
            ${userId},
            ${JSON.stringify(snapshot)}::jsonb,
            ${pathname},
            ${typeof model === 'string' ? model : null}
          )
        `;
      }

      res.status(201).json({ path: pathname, url: `/api/cards?path=${encodeURIComponent(pathname)}` });
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (error) {
    failInternal(res, 'cards handler failed', error);
  }
}
