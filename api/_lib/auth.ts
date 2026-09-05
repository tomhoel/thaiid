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

/**
 * The origins Clerk's `azp` claim is allowed to carry.
 *
 * Exported for testing: this is security-critical and easy to get subtly wrong,
 * and the failure mode is every browser token being rejected.
 */
export function authorizedParties(): string[] | undefined {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    // `vercel dev` sets VERCEL_URL to `localhost:3000`, which is served over
    // http. Assuming https there rejects every token a browser sends locally,
    // because Clerk sets `azp` to the page origin.
    const scheme = /^(localhost|127\.0\.0\.1)(:|$)/.test(vercelUrl) ? 'http' : 'https';
    configured.push(`${scheme}://${vercelUrl}`);
  }

  return configured.length > 0 ? configured : undefined;
}
