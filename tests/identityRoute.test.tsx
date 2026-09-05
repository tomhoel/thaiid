// @vitest-environment jsdom
/**
 * Tests for the Identity screen and the card-image hook.
 *
 * These stub `fetch` rather than the data hooks, so the real `apiClient`,
 * the real react-query wiring and the real component all run. That matters
 * here: the screen's whole job is to turn two API responses plus a country
 * config into a rendered card, and mocking the hooks would assert nothing.
 */
import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const signOutMock = vi.fn(async () => {});

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1', signOut: signOutMock }),
  useUser: () => ({
    user: {
      fullName: 'Tom Hoel',
      firstName: 'Tom',
      primaryEmailAddress: { emailAddress: 'tom@example.com' },
    },
  }),
}));

const { Identity } = await import('../src/routes/Identity');
const { useCardImage } = await import('../src/features/profiles/useCardImage');
const { getCountryConfig, COUNTRY_CODES } = await import('../src/countries');

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

interface Prefs {
  user_id: string;
  active_country: string;
  theme: 'dark' | 'light';
  language: string;
  created_at: string;
  updated_at: string;
}

let prefs: Prefs;
let profile: Record<string, unknown> | null;
let requests: { url: string; method: string; body?: string }[];
let createdUrls: string[];
let revokedUrls: string[];

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
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
  profile = null;
  requests = [];
  createdUrls = [];
  revokedUrls = [];

  let counter = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:mock-${++counter}`;
    createdUrls.push(url);
    return url;
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn((url: string) => {
    revokedUrls.push(url);
  }) as unknown as typeof URL.revokeObjectURL;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      requests.push({ url: input, method, body: init.body as string | undefined });

      if (input.startsWith('/api/preferences')) {
        if (method === 'PATCH') {
          const patch = JSON.parse(init.body as string) as { activeCountry?: string };
          if (patch.activeCountry) prefs = { ...prefs, active_country: patch.activeCountry };
          return json({ preferences: prefs });
        }
        return json({ preferences: prefs });
      }

      if (input.startsWith('/api/profiles')) {
        return json({ profile });
      }

      if (input.startsWith('/api/cards')) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          blob: async () => new Blob(['image-bytes'], { type: 'image/png' }),
        };
      }

      throw new Error(`Unexpected request: ${method} ${input}`);
    }),
  );

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

let container: HTMLDivElement;
let root: Root;

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.documentElement.classList.remove('theme-light');
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Renders, then drains the query promises the render kicked off. */
const render = async (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
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

const flagButtons = () => Array.from(container.querySelectorAll('nav[aria-label="Country"] button'));

describe('Identity', () => {
  it('renders the active country from the stored preferences', async () => {
    await render(<Identity />);
    const th = getCountryConfig('TH');

    expect(container.textContent).toContain(th.name.primary);
    expect(container.textContent).toContain(th.issuer.english);
  });

  it('offers every supported country and marks the active one', async () => {
    await render(<Identity />);
    const buttons = flagButtons();

    expect(buttons).toHaveLength(COUNTRY_CODES.length);
    const current = buttons.filter((b) => b.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
  });

  it('shows the sample card data when the user has no saved profile', async () => {
    await render(<Identity />);
    const sample = getCountryConfig('TH').defaultCardData;

    expect(container.textContent).toContain(sample.idNumber);
    expect(container.textContent).toContain(sample.fullNameEnglish);
    expect(container.textContent).toContain('sample');
  });

  it('prefers saved profile data over the sample', async () => {
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: { ...getCountryConfig('TH').defaultCardData, fullNameEnglish: 'Real Person' },
      card_front_path: null,
      portrait_path: null,
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);

    expect(container.textContent).toContain('Real Person');
    expect(container.textContent).not.toContain('sample');
  });

  it('switches country through the preferences endpoint', async () => {
    await render(<Identity />);
    const sgIndex = COUNTRY_CODES.indexOf('SG');

    await act(async () => {
      flagButtons()[sgIndex].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain('SG');
    expect(container.textContent).toContain(getCountryConfig('SG').name.primary);
    expect(container.textContent).not.toContain(getCountryConfig('TH').issuer.english);
  });

  it('does not write when the active country is re-selected', async () => {
    await render(<Identity />);
    const thIndex = COUNTRY_CODES.indexOf('TH');

    await act(async () => {
      flagButtons()[thIndex].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();

    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(0);
  });

  it('loads the private card render through the authenticated endpoint', async () => {
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: {},
      card_front_path: 'cards/user_1/TH.png',
      portrait_path: null,
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);
    await settle();

    expect(requests.some((r) => r.url.includes('/api/cards?path='))).toBe(true);
    const front = container.querySelector('img');
    expect(front?.getAttribute('src')).toBe(createdUrls[0]);
  });

  it('falls back to the bundled card image when nothing is stored', async () => {
    await render(<Identity />);

    expect(requests.some((r) => r.url.startsWith('/api/cards'))).toBe(false);
    const front = container.querySelector('img');
    expect(front?.getAttribute('src')).toBe(getCountryConfig('TH').cardImages.front);
  });

  it('applies the light theme class only when preferences ask for it', async () => {
    await render(<Identity />);
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);

    await act(async () => root.unmount());
    root = createRoot(container);
    prefs = { ...prefs, theme: 'light' };

    await render(<Identity />);
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('signs out through the auth adapter', async () => {
    await render(<Identity />);
    const button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Sign out',
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('reports an expired card as expired', async () => {
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: { ...getCountryConfig('TH').defaultCardData, dateOfExpiry: '1 Jan. 2010' },
      card_front_path: null,
      portrait_path: null,
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);

    expect(container.textContent).toContain(
      getCountryConfig('TH').translations['details.statusExpired'].en,
    );
  });

  it('warns when the card expires inside 90 days', async () => {
    const soon = new Date(Date.now() + 30 * 86_400_000);
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: { ...getCountryConfig('TH').defaultCardData, dateOfExpiry: soon.toDateString() },
      card_front_path: null,
      portrait_path: null,
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);

    expect(container.textContent).toContain(
      getCountryConfig('TH').translations['details.statusExpiring'].en,
    );
  });

  it('labels details in the preferred language', async () => {
    prefs = { ...prefs, language: 'th' };

    await render(<Identity />);

    expect(container.textContent).toContain(
      getCountryConfig('TH').translations['details.idNumber'].th,
    );
  });
});

function CardImageProbe({ path }: { path: string | null }) {
  const url = useCardImage(path);
  return <span data-testid="url">{url ?? 'none'}</span>;
}

describe('useCardImage', () => {
  it('returns null without a path and makes no request', async () => {
    await render(<CardImageProbe path={null} />);

    expect(container.textContent).toBe('none');
    expect(requests).toHaveLength(0);
  });

  it('revokes the object URL when the component unmounts', async () => {
    await render(<CardImageProbe path="cards/user_1/TH.png" />);
    await settle();
    expect(createdUrls).toHaveLength(1);

    await act(async () => root.unmount());
    root = createRoot(container);

    expect(revokedUrls).toEqual(createdUrls);
  });

  it('replaces the object URL when the path changes', async () => {
    let setPath!: (next: string) => void;

    function Switcher() {
      const [path, update] = useState('a.png');
      setPath = update;
      return <CardImageProbe path={path} />;
    }

    await render(<Switcher />);
    await settle();

    await act(async () => setPath('b.png'));
    await settle();

    expect(createdUrls).toHaveLength(2);
    expect(revokedUrls).toContain(createdUrls[0]);
  });

  it('yields null when the card cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, text: async () => '', blob: async () => null })),
    );

    await render(<CardImageProbe path="cards/other/TH.png" />);
    await settle();

    expect(container.textContent).toBe('none');
  });
});
