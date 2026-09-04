import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId } from './_lib/auth.js';
import { applyCors, fail, failInternal, isOriginAllowed } from './_lib/http.js';

/**
 * Gemini proxy.
 *
 * Keeps GEMINI_API_KEY server-side and spends it only for signed-in users.
 * Without the auth check this would be an open endpoint: anyone who found the
 * URL could bill generations to this key.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

// The model is interpolated into the upstream URL, so it must never be
// caller-controlled text. An unchecked value could reshape the request path and
// point this key at arbitrary Google endpoints.
const ALLOWED_MODELS = new Set([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash',
]);

export const config = {
  api: {
    bodyParser: { sizeLimit: '12mb' },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    fail(res, 405, 'Method not allowed');
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    fail(res, 500, 'GEMINI_API_KEY is not configured on the server');
    return;
  }

  const requested = req.query.model;
  const model = typeof requested === 'string' && requested ? requested : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    fail(res, 400, 'Unsupported model');
    return;
  }

  if (!req.body || typeof req.body !== 'object') {
    fail(res, 400, 'Invalid JSON body');
    return;
  }

  try {
    const upstream = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(text);
  } catch (error) {
    failInternal(res, 'gemini upstream request failed', error);
  }
}
