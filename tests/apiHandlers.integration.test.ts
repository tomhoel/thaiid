/**
 * Integration test for the API handlers.
 *
 * Runs the real handlers against the real Neon database, the real private Blob
 * store and real Clerk-issued tokens. Nothing here is mocked, because the thing
 * worth proving is precisely the part mocks would paper over: that every query
 * is scoped to the user id carried by the verified token.
 *
 * Why the handlers are invoked directly instead of over HTTP against
 * `vercel dev`: Clerk's Backend API cannot mint a token containing an `azp`
 * claim — only a browser session gets one — and `vercel dev` always sets
 * VERCEL_URL, which switches on `authorizedParties` enforcement. Calling the
 * handlers in-process leaves VERCEL_URL unset, so a Backend-minted token
 * verifies. The azp path itself is covered by the browser sign-in.
 *
 * Skips cleanly when credentials are absent, so `npm test` still runs on a
 * machine that has never been configured.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Vite does not put .env.local into process.env for node tests.
function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // No .env.local — the suite will skip below.
  }
}

loadEnvLocal();

// Must be unset for a Backend-minted token (which has no azp) to verify.
delete process.env.VERCEL_URL;
delete process.env.ALLOWED_ORIGINS;

const configured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.DATABASE_URL && process.env.BLOB_READ_WRITE_TOKEN,
);

const CLERK = 'https://api.clerk.com/v1';

async function clerk(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CLERK}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body as Record<string, never> & { id: string; jwt?: string };
}

type Handler = (req: never, res: never) => Promise<void> | void;

interface Invocation {
  method: string;
  query?: Record<string, string>;
  body?: unknown;
  token: string;
}

interface Captured {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/** Minimal stand-in for the Vercel req/res pair the handlers expect. */
async function invoke(handler: Handler, { method, query = {}, body, token }: Invocation): Promise<Captured> {
  const captured: Captured = { status: 0, body: undefined, headers: {} };

  const res = {
    setHeader(key: string, value: string) {
      captured.headers[key.toLowerCase()] = String(value);
      return res;
    },
    status(code: number) {
      captured.status = code;
      return res;
    },
    json(payload: unknown) {
      captured.body = payload;
      return res;
    },
    send(payload: unknown) {
      captured.body = payload;
      return res;
    },
    end() {
      return res;
    },
  };

  const req = {
    method,
    query,
    body,
    headers: { authorization: `Bearer ${token}` },
  };

  await handler(req as never, res as never);
  return captured;
}

async function makeUser(label: string) {
  const user = await clerk('/users', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Integration',
      last_name: label,
      external_id: `it-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    }),
  });
  const session = await clerk('/sessions', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id }),
  });
  const { jwt } = await clerk(`/sessions/${session.id}/tokens`, {
    method: 'POST',
    body: JSON.stringify({ expires_in_seconds: 600 }),
  });
  if (!jwt) throw new Error('Clerk returned no jwt');
  return { id: user.id, token: jwt };
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe.skipIf(!configured)('API handlers (integration)', () => {
  let profiles: Handler;
  let preferences: Handler;
  let cards: Handler;
  let userA: { id: string; token: string };
  let userB: { id: string; token: string };
  let cardPath: string | undefined;

  beforeAll(async () => {
    profiles = (await import('../api/profiles')).default as Handler;
    preferences = (await import('../api/preferences')).default as Handler;
    cards = (await import('../api/cards')).default as Handler;
    userA = await makeUser('A');
    userB = await makeUser('B');
  }, 60_000);

  afterAll(async () => {
    for (const user of [userA, userB]) {
      if (!user) continue;
      try {
        const { db } = await import('../api/_lib/db');
        const sql = db();
        await sql`delete from card_versions where user_id = ${user.id}`;
        await sql`delete from profiles where user_id = ${user.id}`;
        await sql`delete from user_preferences where user_id = ${user.id}`;
      } catch {
        // Best effort.
      }
      await clerk(`/users/${user.id}`, { method: 'DELETE' }).catch(() => undefined);
    }
    if (cardPath) {
      try {
        const { del } = await import('@vercel/blob');
        await del(cardPath);
      } catch {
        // Best effort.
      }
    }
  }, 60_000);

  it('rejects a request with no token', async () => {
    const res = await invoke(profiles, { method: 'GET', token: '' });
    expect(res.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const res = await invoke(profiles, { method: 'GET', token: 'eyJhbGciOiJSUzI1NiJ9.forged.sig' });
    expect(res.status).toBe(401);
  });

  it('accepts a real Clerk token and starts empty', async () => {
    const res = await invoke(profiles, { method: 'GET', token: userA.token });
    expect(res.status).toBe(200);
    expect((res.body as { profiles: unknown[] }).profiles).toEqual([]);
  });

  it('creates a profile and preserves Thai text', async () => {
    const res = await invoke(profiles, {
      method: 'POST',
      token: userA.token,
      body: { countryCode: 'TH', data: { fullName: 'Integration Test', fullNameLocal: 'สโมค เทสต์' } },
    });
    expect(res.status).toBe(200);
    const { profile } = res.body as { profile: { data: { fullNameLocal: string }; country_code: string } };
    expect(profile.country_code).toBe('TH');
    expect(profile.data.fullNameLocal).toBe('สโมค เทสต์');
  });

  it('rejects an unknown country code', async () => {
    const res = await invoke(profiles, { method: 'GET', query: { country: 'XX' }, token: userA.token });
    expect(res.status).toBe(400);
  });

  it('upserts preferences on first read and defaults to TH', async () => {
    const res = await invoke(preferences, { method: 'GET', token: userA.token });
    expect(res.status).toBe(200);
    const { preferences: prefs } = res.body as { preferences: { user_id: string; active_country: string } };
    expect(prefs.user_id).toBe(userA.id);
    expect(prefs.active_country).toBe('TH');
  });

  it('persists a preference change', async () => {
    await invoke(preferences, {
      method: 'PATCH',
      token: userA.token,
      body: { activeCountry: 'VN', language: 'vi' },
    });
    const res = await invoke(preferences, { method: 'GET', token: userA.token });
    const { preferences: prefs } = res.body as { preferences: { active_country: string; language: string } };
    expect(prefs.active_country).toBe('VN');
    expect(prefs.language).toBe('vi');
  });

  it('rejects an invalid theme', async () => {
    const res = await invoke(preferences, { method: 'PATCH', token: userA.token, body: { theme: 'neon' } });
    expect(res.status).toBe(400);
  });

  it('uploads a card to the private store under the caller id', async () => {
    const res = await invoke(cards, {
      method: 'POST',
      token: userA.token,
      body: { countryCode: 'TH', imageBase64: PNG.toString('base64'), mimeType: 'image/png' },
    });
    expect(res.status).toBe(201);
    const { path } = res.body as { path: string };
    expect(path.startsWith(`${userA.id}/`)).toBe(true);
    cardPath = path;
  }, 30_000);

  it('lets the owner read the card back byte for byte', async () => {
    expect(cardPath).toBeDefined();
    const res = await invoke(cards, { method: 'GET', query: { path: cardPath! }, token: userA.token });
    expect(res.status).toBe(200);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).equals(PNG)).toBe(true);
  }, 30_000);

  it('rejects an unsupported image type', async () => {
    const res = await invoke(cards, {
      method: 'POST',
      token: userA.token,
      body: { countryCode: 'TH', imageBase64: PNG.toString('base64'), mimeType: 'image/gif' },
    });
    expect(res.status).toBe(400);
  });

  describe('isolation', () => {
    it('does not leak profiles across users', async () => {
      const res = await invoke(profiles, { method: 'GET', token: userB.token });
      expect(res.status).toBe(200);
      expect((res.body as { profiles: unknown[] }).profiles).toEqual([]);
    });

    it('returns null rather than another user profile', async () => {
      const res = await invoke(profiles, { method: 'GET', query: { country: 'TH' }, token: userB.token });
      expect((res.body as { profile: unknown }).profile).toBeNull();
    });

    it("refuses to serve another user's card, as 404 not 403", async () => {
      expect(cardPath).toBeDefined();
      const res = await invoke(cards, { method: 'GET', query: { path: cardPath! }, token: userB.token });
      expect(res.status).toBe(404);
    });

    it('refuses path traversal', async () => {
      const res = await invoke(cards, {
        method: 'GET',
        query: { path: `${userB.id}/../${userA.id}/TH/x.png` },
        token: userB.token,
      });
      expect(res.status).toBe(404);
    });

    it('refuses a leading-slash escape', async () => {
      const res = await invoke(cards, {
        method: 'GET',
        query: { path: `/${userA.id}/TH/x.png` },
        token: userB.token,
      });
      expect(res.status).toBe(404);
    });

    it('ignores a user id supplied in the request body', async () => {
      await invoke(profiles, {
        method: 'POST',
        token: userB.token,
        body: { countryCode: 'SG', data: { spoof: true }, userId: userA.id, user_id: userA.id },
      });

      const res = await invoke(profiles, { method: 'GET', token: userA.token });
      const codes = (res.body as { profiles: { country_code: string }[] }).profiles.map((p) => p.country_code);
      expect(codes).toEqual(['TH']);
    });
  });
});
