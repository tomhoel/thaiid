import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, clearTokenGetter, registerTokenGetter } from '../src/lib/apiClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearTokenGetter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokenGetter();
  });

  function lastHeaders(): Headers {
    return new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
  }

  it('attaches the session token when one is available', async () => {
    registerTokenGetter(async () => 'token-123');
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/profiles');

    expect(lastHeaders().get('Authorization')).toBe('Bearer token-123');
  });

  it('omits the header entirely when signed out, rather than sending an empty bearer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/profiles');

    expect(lastHeaders().has('Authorization')).toBe(false);
  });

  it('sets a JSON content type only when there is a body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/profiles', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(lastHeaders().get('Content-Type')).toBe('application/json');
  });

  it('surfaces the server error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'Sign in required' } }, 401));

    await expect(apiFetch('/api/profiles')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Sign in required',
    });
  });

  it('accepts a plain string error field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Nope' }, 400));

    await expect(apiFetch('/api/profiles')).rejects.toThrow('Nope');
  });

  it('does not choke when a crashing function returns HTML', async () => {
    fetchMock.mockResolvedValue(
      new Response('<!doctype html><h1>500</h1>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const error = await apiFetch('/api/profiles').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it('returns undefined for 204 rather than trying to parse an empty body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch('/api/profiles', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('stops sending the token once the getter is cleared', async () => {
    registerTokenGetter(async () => 'token-123');
    clearTokenGetter();
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/profiles');

    expect(lastHeaders().has('Authorization')).toBe(false);
  });
});
