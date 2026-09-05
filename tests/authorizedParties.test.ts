/**
 * Clerk sets a token's `azp` claim to the origin of the page that requested it,
 * and rejects the token when that origin is not in `authorizedParties`. Getting
 * the scheme wrong therefore does not fail loudly at deploy time -- it rejects
 * every signed-in request at runtime, which is how the localhost https bug went
 * unnoticed until a real browser token was tried.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authorizedParties } from '../api/_lib/auth';

const saved = { ...process.env };

beforeEach(() => {
  delete process.env.VERCEL_URL;
  delete process.env.ALLOWED_ORIGINS;
});

afterEach(() => {
  process.env = { ...saved };
});

describe('authorizedParties', () => {
  it('is undefined when nothing is configured, which disables azp enforcement', () => {
    expect(authorizedParties()).toBeUndefined();
  });

  it.each(['localhost:3000', 'localhost', '127.0.0.1:3000', '127.0.0.1'])(
    'uses http for %s, because vercel dev serves it over http',
    (host) => {
      process.env.VERCEL_URL = host;
      expect(authorizedParties()).toEqual([`http://${host}`]);
    },
  );

  it('uses https for a deployment host', () => {
    process.env.VERCEL_URL = 'thaiid-abc123.vercel.app';
    expect(authorizedParties()).toEqual(['https://thaiid-abc123.vercel.app']);
  });

  it('does not mistake a hostname merely starting with localhost for the real thing', () => {
    process.env.VERCEL_URL = 'localhost.evil.com';
    expect(authorizedParties()).toEqual(['https://localhost.evil.com']);
  });

  it('carries ALLOWED_ORIGINS through for custom domains', () => {
    process.env.ALLOWED_ORIGINS = 'https://id.example.com, https://www.example.com';
    expect(authorizedParties()).toEqual(['https://id.example.com', 'https://www.example.com']);
  });

  it('combines a custom domain with the deployment host', () => {
    process.env.ALLOWED_ORIGINS = 'https://id.example.com';
    process.env.VERCEL_URL = 'thaiid-abc123.vercel.app';
    expect(authorizedParties()).toEqual([
      'https://id.example.com',
      'https://thaiid-abc123.vercel.app',
    ]);
  });

  it('ignores blank entries rather than authorising an empty origin', () => {
    process.env.ALLOWED_ORIGINS = ' , ,';
    expect(authorizedParties()).toBeUndefined();
  });
});
