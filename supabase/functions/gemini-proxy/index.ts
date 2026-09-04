// Supabase Edge Function — Gemini API proxy
//
// Keeps the Gemini API key server-side instead of bundling it in the app, and
// gates access on a real signed-in user so the key cannot be spent by anyone
// who happens to know the (public) anon key.
//
// Required secret (set with `supabase secrets set GEMINI_API_KEY=...`):
//   - GEMINI_API_KEY
//
// Optional secret — comma-separated origin allowlist for CORS. When unset, only
// localhost development origins are permitted:
//   - ALLOWED_ORIGINS=https://thaiid.vercel.app,https://example.com
//
// Deploy with: supabase functions deploy gemini-proxy

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

// The proxy interpolates the model into an upstream URL, so it must never
// forward caller-controlled text. Only these exact values are accepted.
const ALLOWED_MODELS = new Set([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash',
]);

// Card renders carry a base64 template plus an optional portrait. 12 MB leaves
// headroom over the 10 MB storage cap while still bounding memory per request.
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const DEV_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;
  return DEV_ORIGINS.some((pattern) => pattern.test(origin));
}

function corsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

function fail(message: string, status: number, origin: string): Response {
  return json({ error: { message } }, status, origin);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return fail('Method not allowed', 405, origin);
  }

  // A browser request carrying a disallowed Origin is rejected outright rather
  // than relying on the client to honour a missing CORS header.
  if (origin && !isOriginAllowed(origin)) {
    return fail('Origin not allowed', 403, origin);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return fail('GEMINI_API_KEY not configured on server', 500, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return fail('Supabase environment not configured', 500, origin);
  }

  // Authenticate the caller. The anon key is itself a valid project JWT, so
  // platform-level verify_jwt is not sufficient on its own — resolve the token
  // to an actual user and reject anything that does not map to one.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return fail('Missing authorization', 401, origin);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return fail('Sign in required', 401, origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return fail('Payload too large', 413, origin);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return fail('Payload too large', 413, origin);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('Invalid JSON body', 400, origin);
  }

  const requestedModel = new URL(req.url).searchParams.get('model') ?? DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return fail('Unsupported model', 400, origin);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_BASE}/${requestedModel}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('gemini upstream request failed', error);
    return fail('Upstream request failed', 502, origin);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      ...corsHeaders(origin),
    },
  });
});
