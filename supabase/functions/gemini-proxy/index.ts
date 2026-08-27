// Supabase Edge Function — Gemini API proxy
// Keeps the Gemini API key server-side instead of bundling it in the app.
//
// Required secret (set with `supabase secrets set GEMINI_API_KEY=...`):
//   - GEMINI_API_KEY
//
// Deploy with: supabase functions deploy gemini-proxy

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
    });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'GEMINI_API_KEY not configured on server' } }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }), {
      status: 400,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
    });
  }

  const url = new URL(req.url);
  const model = url.searchParams.get('model') || DEFAULT_MODEL;

  const upstream = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      ...CORS_HEADERS,
    },
  });
});
