// @vitest-environment jsdom
/**
 * Tests for the tab shell and the two remaining ported tabs.
 *
 * As with the identity suite, only `fetch` is stubbed so the real hooks,
 * `apiClient` and react-query run. The reference is the native app: a three-tab
 * bar over the screens, a QR that reissues on a timer, and a settings list whose
 * language/country/theme rows write through to server-held preferences.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn(async () => {});

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1', signOut }),
  useUser: () => ({ user: { fullName: 'Tom Hoel', firstName: 'Tom' } }),
}));

const { TabBar } = await import('../src/components/TabBar');
const { TabLayout } = await import('../src/routes/TabLayout');
const { DigitalId } = await import('../src/routes/DigitalId');
const { Settings } = await import('../src/routes/Settings');
const { getCountryConfig } = await import('../src/countries');

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const TH = getCountryConfig('TH');
const SG = getCountryConfig('SG');

interface Prefs {
  user_id: string;
  active_country: string;
  theme: 'dark' | 'light';
  language: string;
  created_at: string;
  updated_at: string;
}

let prefs: Prefs;
let requests: { url: string; method: string; body?: string }[];
let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  // jsdom implements neither top-layer method on <dialog>.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };

  // Node's experimental webstorage global shadows jsdom's and is inert without
  // --localstorage-file, so give the device-local settings a real store.
  if (typeof localStorage?.clear !== 'function') {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, String(value)),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
      },
    });
  }
});

const json = (payload: unknown) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(payload),
  blob: async () => new Blob([JSON.stringify(payload)]),
});

beforeEach(() => {
  prefs = {
    user_id: 'user_1',
    active_country: 'TH',
    theme: 'dark',
    language: 'en',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };
  requests = [];
  localStorage.clear();

  URL.createObjectURL = vi.fn(() => 'blob:mock') as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      requests.push({ url: input, method, body: init.body as string | undefined });

      if (input.startsWith('/api/preferences')) {
        if (method === 'PATCH') {
          const patch = JSON.parse(init.body as string) as {
            language?: string;
            theme?: 'dark' | 'light';
            activeCountry?: string;
          };
          prefs = {
            ...prefs,
            ...(patch.language ? { language: patch.language } : {}),
            ...(patch.theme ? { theme: patch.theme } : {}),
            ...(patch.activeCountry ? { active_country: patch.activeCountry } : {}),
          };
          return json({ preferences: prefs });
        }
        return json({ preferences: prefs });
      }
      if (input.startsWith('/api/profiles')) return json({ profile: null });
      if (input.startsWith('/api/cards')) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          blob: async () => new Blob(['bytes'], { type: 'image/png' }),
        };
      }
      throw new Error(`Unexpected request: ${method} ${input}`);
    }),
  );

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.documentElement.classList.remove('theme-light');
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const render = async (node: ReactNode, path = '/') => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const text = () => container.textContent ?? '';
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await settle();
};
const rowByLabel = (label: string) =>
  [...container.querySelectorAll('button')].find((node) =>
    node.textContent?.startsWith(label),
  );

describe('TabBar', () => {
  it('renders the three native tabs with their translated labels', async () => {
    await render(<TabBar />);

    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/qr', '/settings']);
    expect(links.map((a) => a.textContent)).toEqual([
      TH.translations['tab.identity'].en,
      TH.translations['tab.qr'].en,
      TH.translations['tab.settings'].en,
    ]);
  });

  it('marks only the tab for the current route as current', async () => {
    await render(<TabBar />, '/qr');

    const current = [...container.querySelectorAll('a[aria-current="page"]')];
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe('/qr');
  });

  it('lights no tab on the details route, matching href: null in the navigator', async () => {
    await render(<TabBar />, '/details');

    expect(container.querySelectorAll('a[aria-current="page"]')).toHaveLength(0);
  });

  it('follows the active country when preferences name another one', async () => {
    prefs = { ...prefs, active_country: 'SG' };
    await render(<TabBar />);

    expect(text()).toContain(SG.translations['tab.identity'].en);
  });
});

describe('TabLayout', () => {
  it('renders the routed screen above the tab bar', async () => {
    await render(
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<div>screen body</div>} />
        </Route>
      </Routes>,
    );

    expect(text()).toContain('screen body');
    expect(container.querySelector('nav[aria-label="Main"]')).toBeTruthy();
  });
});

describe('Digital ID screen', () => {
  it('renders the title bar and scan hint from the country translations', async () => {
    await render(<DigitalId />);

    expect(text()).toContain(TH.translations['digital.title'].en);
    expect(text()).toContain(TH.translations['digital.scanHint'].en);
  });

  it('encodes the country QR type and the cardholder into the code', async () => {
    await render(<DigitalId />);

    const qr = container.querySelector('svg[role="img"][aria-label*="verification code"]');
    expect(qr).toBeTruthy();
    expect(qr!.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });

  it('shows the cardholder id and expiry from the country defaults', async () => {
    await render(<DigitalId />);

    expect(text()).toContain(TH.defaultCardData.idNumber);
    expect(text()).toContain(TH.defaultCardData.dateOfExpiry);
  });

  it('counts the reissue timer down each second', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render(<DigitalId />);

    expect(text()).toContain('0:15');
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(text()).toContain('0:13');
  });

  it('rolls the nonce and restarts the countdown when it reaches zero', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render(<DigitalId />);

    const before = container.querySelector('svg[aria-label*="verification code"] path')!
      .getAttribute('d');

    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(text()).toContain('0:15');
    const after = container.querySelector('svg[aria-label*="verification code"] path')!
      .getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('switches language through the shared header toggle', async () => {
    await render(<DigitalId />);

    await click(
      container.querySelector(
        `button[aria-label="Switch language to ${TH.secondaryLanguage.langName}"]`,
      ),
    );

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain(`"language":"${TH.secondaryLanguage.code}"`);
    expect(text()).toContain(TH.translations['digital.title'].th);
  });
});

describe('Settings screen', () => {
  it('renders the native sections and the cardholder summary', async () => {
    await render(<Settings />);

    expect(text()).toContain(TH.translations['settings.title'].en);
    expect(text()).toContain(TH.translations['settings.security'].en);
    expect(text()).toContain(TH.translations['settings.preferences'].en);
    expect(text()).toContain(TH.defaultCardData.fullNameEnglish);
    expect(text()).toContain(TH.defaultCardData.idNumber);
  });

  it('shows the system section and the ministry attribution', async () => {
    await render(<Settings />);

    expect(text()).toContain(TH.systemReference);
    expect(text()).toContain(TH.issuer.primary);
    expect(text()).toContain(TH.ministry);
    expect(text()).toContain(TH.translations['attribution.dept'].en);
  });

  it('writes the chosen country through to preferences', async () => {
    await render(<Settings />);

    await click(rowByLabel(TH.translations['settings.country'].en));
    await click(
      [...container.querySelectorAll('dialog button')].find((b) => b.textContent === 'Singapore'),
    );

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain('"activeCountry":"SG"');
    expect(text()).toContain(SG.translations['settings.title'].en);
  });

  it('writes the chosen theme through to preferences and applies it', async () => {
    await render(<Settings />);

    await click(rowByLabel(TH.translations['settings.theme'].en));
    await click(
      [...container.querySelectorAll('dialog button')].find((b) => b.textContent === 'Light'),
    );

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain('"theme":"light"');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('writes the chosen language through to preferences', async () => {
    await render(<Settings />);

    await click(rowByLabel(TH.translations['settings.language'].en));
    await click(
      [...container.querySelectorAll('dialog button')].find(
        (b) => b.textContent === TH.secondaryLanguage.langName,
      ),
    );

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain(`"language":"${TH.secondaryLanguage.code}"`);
    expect(text()).toContain(TH.translations['settings.title'].th);
  });

  it('closes the picker without a request when dismissed', async () => {
    await render(<Settings />);

    await click(rowByLabel(TH.translations['settings.theme'].en));
    expect(container.querySelector('dialog')).toBeTruthy();

    await click(container.querySelector('dialog'));

    expect(container.querySelector('dialog')).toBeNull();
    expect(requests.some((r) => r.method === 'PATCH')).toBe(false);
  });

  it('keeps device-local toggles in localStorage rather than on the server', async () => {
    await render(<Settings />);

    const biometric = rowByLabel(TH.translations['settings.biometric'].en);
    expect(biometric?.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false');

    await click(biometric);

    expect(localStorage.getItem('thaiid:biometric')).toBe('true');
    expect(requests.some((r) => r.method === 'PATCH')).toBe(false);
  });

  it('signs the user out from the account section', async () => {
    await render(<Settings />);

    await click(rowByLabel('Sign out'));

    expect(signOut).toHaveBeenCalled();
  });
});
