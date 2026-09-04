import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';

/**
 * Resolves the caller's Clerk user id from the Authorization header.
 *
 * This is the only place a user id may enter the system. Nothing downstream may
 * take an id from a request body or query string, or a caller could simply ask
 * for someone else's rows.
 */
export async function requireUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('[api] CLERK_SECRET_KEY is not set; refusing to authenticate.');
    return null;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: authorizedParties(),
    });
    return payload.sub ?? null;
  } catch (error) {
    // Expired or forged tokens are routine; log at debug level only.
    console.warn('[api] token verification failed', (error as Error).message);
    return null;
  }
}

function authorizedParties(): string[] | undefined {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    configured.push(`https://${process.env.VERCEL_URL}`);
  }

  return configured.length > 0 ? configured : undefined;
}
