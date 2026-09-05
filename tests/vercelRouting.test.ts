/**
 * The SPA rewrite in vercel.json is the one piece of routing that no other test
 * covers, and it fails in an unusually quiet way.
 *
 * The original pattern was `/((?!api/).*)`, which matches every path that is not
 * an API call -- including `/assets/index-abc.js` and `/icons/favicon.png`. In
 * production that damage is hidden, because Vercel runs its filesystem check
 * before applying rewrites, so real files win and only unmatched routes fall
 * through to index.html. Under `vercel dev` there is no built `dist/` to check
 * against, so the rewrite swallowed `/@vite/client` and `/src/main.tsx` too, the
 * browser received HTML where it expected JavaScript, and the app rendered a
 * blank page with no server-side error.
 *
 * These tests assert the pattern directly, so the dev server keeps working
 * without depending on Vercel's filesystem-check ordering to save us.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as { rewrites: { source: string; destination: string }[] };

const spaRewrite = config.rewrites.find((r) => r.destination === '/index.html');

/** Vercel anchors `source` at both ends, so mirror that here. */
const matches = (path: string) => new RegExp(`^${spaRewrite!.source}$`).test(path);

describe('vercel.json SPA rewrite', () => {
  it('is present and falls back to the app shell', () => {
    expect(spaRewrite).toBeDefined();
  });

  it.each([
    ['/', 'the app shell itself'],
    ['/sign-in', 'a client route'],
    ['/identity', 'a client route'],
    ['/auth/callback/google', 'the OAuth splat route'],
    ['/some/unknown/deep/link', 'an unknown route, handled by the NotFound element'],
  ])('rewrites %s (%s)', (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    ['/api/profiles', 'a function'],
    ['/api/cards', 'a function'],
    ['/src/main.tsx', 'the dev entry module'],
    ['/src/features/auth/AuthProvider.tsx', 'a dev source module'],
    ['/@vite/client', "Vite's dev client"],
    ['/@react-refresh', "React Fast Refresh's runtime"],
    ['/node_modules/.vite/deps/react.js', 'a prebundled dependency'],
    ['/assets/index-D8WvH6_w.js', 'a built bundle'],
    ['/assets/index-abc123.css', 'a built stylesheet'],
    ['/icons/favicon.png', 'a static icon'],
    ['/templates/th-front.png', 'a card template'],
    ['/sw.js', 'the service worker'],
    ['/manifest.webmanifest', 'the PWA manifest'],
  ])('leaves %s alone (%s)', (path) => {
    expect(matches(path)).toBe(false);
  });
});
