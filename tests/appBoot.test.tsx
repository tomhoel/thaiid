// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../src/App';

/**
 * Boot smoke test.
 *
 * The app had never actually been mounted before this existed — everything was
 * verified by typecheck and by the dev server returning 200, neither of which
 * catches a provider that throws on first render.
 *
 * No Clerk key is set under test, so this also pins the contract that a missing
 * key produces a readable message instead of a blank screen.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

describe('App', () => {
  it('mounts without throwing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.innerHTML).not.toBe('');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('explains a missing Clerk key rather than rendering a blank screen', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Authentication is not configured');
    expect(container.textContent).toContain('VITE_CLERK_PUBLISHABLE_KEY');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
