/**
 * Thin client for the `/api` Vercel Functions.
 *
 * The browser never talks to Postgres or to Google directly. Every call goes
 * through a function that verifies the caller's Clerk session token, so the
 * database URL and the Gemini key stay server-side.
 *
 * Clerk exposes the session token through a hook, which a plain module cannot
 * call. `AuthProvider` registers a getter on mount and clears it on unmount;
 * until then requests simply go out unauthenticated and the server rejects them.
 */

type TokenGetter = () => Promise<string | null>;

let getSessionToken: TokenGetter = async () => null;

export function registerTokenGetter(getter: TokenGetter): void {
  getSessionToken = getter;
}

export function clearTokenGetter(): void {
  getSessionToken = async () => null;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }
  return fallback;
}

/**
 * Fetches a binary response, such as a card image from the private Blob store.
 *
 * A plain `<img src="/api/cards?path=...">` cannot carry an Authorization
 * header, and the card endpoint requires one, so the bytes are fetched here and
 * handed to the caller as a Blob to turn into an object URL.
 */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const token = await getSessionToken();

  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed (HTTP ${response.status}).`, response.status);
  }
  return response.blob();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionToken();

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  // A function that crashes can return HTML, so never assume the body is JSON.
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    if (!response.ok) {
      throw new ApiError(`Request to ${path} failed (HTTP ${response.status}).`, response.status);
    }
    throw new ApiError(`Response from ${path} was not valid JSON.`, response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      extractMessage(payload, `Request to ${path} failed (HTTP ${response.status}).`),
      response.status
    );
  }

  return payload as T;
}
