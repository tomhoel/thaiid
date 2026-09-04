import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared HTTP plumbing for the API functions.
 *
 * The browser and the functions are served from the same origin in every
 * deployment, so cross-origin access is denied by default. Local development is
 * the exception: Vite serves on a different port than `vercel dev`.
 */

const DEV_ORIGINS = [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

function configuredOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Same-origin and server-to-server carry no Origin.
  if (configuredOrigins().includes(origin)) return true;
  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true;
  return DEV_ORIGINS.some((pattern) => pattern.test(origin));
}

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function fail(res: VercelResponse, status: number, message: string): void {
  res.status(status).json({ error: { message } });
}

/** Never let a thrown error leak a stack trace or connection string to a client. */
export function failInternal(res: VercelResponse, context: string, error: unknown): void {
  console.error(`[api] ${context}`, error);
  res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } });
}
