// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Boot smoke test.
 *
 * The app had never actually been mounted before this existed — everything was
 * verified by typecheck and by the dev server returning 200, neither of which
 * catches a provider that throws on first render.
 *
 * Both cases stub VITE_CLERK_PUBLISHABLE_KEY explicitly. An earlier version
 * relied on no key being present in the ambient environment, so it passed only
 * on a machine that had not been configured yet and started failing the moment
 * real credentials landed in .env.local.
 *
 * AuthProvider reads the key at module scope, so the stub has to be in place
 * before the module is imported — hence resetModules plus a dynamic import
 * rather than a static one.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function mountApp(publishableKey: string) {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', publishableKey);
  vi.resetModules();

  const { App } = await import('../src/App');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  return {
    container,
    async cleanup() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

// Well-formed but fake: Clerk parses the key, so it has to decode to a host.
// btoa('fake-instance-1.clerk.accounts.dev$')
const FAKE_KEY = `pk_test_${btoa('fake-instance-1.clerk.accounts.dev$')}`;

describe('App', () => {
  it('mounts without throwing when a Clerk key is present', async () => {
    const { container, cleanup } = await mountApp(FAKE_KEY);

    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).not.toContain('Authentication is not configured');

    await cleanup();
  });

  it('explains a missing Clerk key rather than rendering a blank screen', async () => {
    const { container, cleanup } = await mountApp('');

    expect(container.textContent).toContain('Authentication is not configured');
    expect(container.textContent).toContain('VITE_CLERK_PUBLISHABLE_KEY');

    await cleanup();
  });
});
