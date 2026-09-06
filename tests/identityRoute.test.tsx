// @vitest-environment jsdom
/**
 * Tests for the ported identity screen.
 *
 * The native screen is the reference: a navy title bar, the flippable card, and
 * a draggable document panel holding the cardholder rows. These assert the
 * ported DOM reproduces that structure and stays wired to live preferences,
 * stubbing only `fetch` so the real hooks and `apiClient` still run.
 */
import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1', signOut: async () => {} }),
  useUser: () => ({ user: { fullName: 'Tom Hoel', firstName: 'Tom' } }),
}));

const { Identity } = await import('../src/routes/Identity');
const { useCardImage } = await import('../src/features/profiles/useCardImage');
const { getCountryConfig } = await import('../src/countries');

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const TH = getCountryConfig('TH');

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
let clipboard: string[];
let container: HTMLDivElement;
let root: Root;

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

  // jsdom ships neither; the panel measures with one and captures the pointer.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.setPointerCapture ??= function () {};
  Element.prototype.releasePointerCapture ??= function () {};
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
  clipboard = [];

  let counter = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:mock-${++counter}`;
    createdUrls.push(url);
    return url;
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn((url: string) => revokedUrls.push(url)) as unknown as typeof URL.revokeObjectURL;

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => void clipboard.push(text) },
  });

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      requests.push({ url: input, method, body: init.body as string | undefined });

      if (input.startsWith('/api/preferences')) {
        if (method === 'PATCH') {
          const patch = JSON.parse(init.body as string) as Partial<Prefs> & { language?: string };
          if (patch.language) prefs = { ...prefs, language: patch.language };
          return json({ preferences: prefs });
        }
        return json({ preferences: prefs });
      }
      if (input.startsWith('/api/profiles')) return json({ profile });
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

  // jsdom's rAF is tied to a real clock, so a spring would never settle inside
  // a test. Driving it from the microtask queue with a fixed 16ms step lets
  // `act` flush the whole animation deterministically.
  let clock = performance.now();
  let handle = 0;
  const cancelled = new Set<number>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++handle;
    clock += 16;
    const at = clock;
    queueMicrotask(() => {
      if (!cancelled.has(id)) cb(at);
    });
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => cancelled.add(id));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.documentElement.classList.remove('theme-light');
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const render = async (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>{node}</MemoryRouter>
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
const button = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

describe('Identity screen', () => {
  it('renders the title bar from the country translations', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.translations['header.title'].en);
    expect(text()).toContain(TH.translations['header.sub'].en);
  });

  it('shows the official document header with both country names', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.name.english);
    expect(text()).toContain(TH.name.primary);
  });

  it('renders the cardholder name uppercased in English', async () => {
    await render(<Identity />);
    const { firstName, lastName } = TH.defaultCardData;

    expect(text()).toContain(`${firstName.toUpperCase()}  ${lastName.toUpperCase()}`);
  });

  it('shows the ID number and copies it on demand', async () => {
    await render(<Identity />);
    expect(text()).toContain(TH.defaultCardData.idNumber);

    await act(async () => {
      button('Copy ID number')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();

    expect(clipboard).toEqual([TH.defaultCardData.idNumber]);
  });

  it('renders the date grid and the computed age', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.translations['info.dob'].en);
    expect(text()).toContain(TH.translations['info.age'].en);
    expect(text()).toContain(TH.translations['info.issued'].en);
    expect(text()).toContain(TH.translations['info.expires'].en);
    expect(text()).toContain(TH.defaultCardData.dateOfIssue);
  });

  it('formats the address through the country formatter', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.addressFormatter(TH.defaultCardData, 'en'));
  });

  it('includes the collapsed expanded-detail sections', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.translations['expanded.smartCard'].en);
    expect(text()).toContain(TH.chipSerial);
    expect(text()).toContain(TH.translations['expanded.biometric'].en);
    expect(text()).toContain('ISO/IEC 7816-4');
  });

  it('offers the card details link', async () => {
    await render(<Identity />);

    expect(text()).toContain(TH.translations['details.cardDetails'].en);
  });

  it('switches language through the preferences endpoint', async () => {
    await render(<Identity />);

    const toggle = button(`Switch language to ${TH.secondaryLanguage.langName}`);
    expect(toggle).not.toBeNull();

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();

    const patch = requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toContain('"language":"th"');
    expect(text()).toContain(TH.translations['info.dob'].th);
  });

  it('falls back to initials when no portrait is stored', async () => {
    await render(<Identity />);
    const { firstName, lastName } = TH.defaultCardData;

    expect(text()).toContain(`${firstName.charAt(0)}${lastName.charAt(0)}`);
    expect(requests.some((r) => r.url.startsWith('/api/cards'))).toBe(false);
  });

  it('loads the private portrait and card render when the profile has them', async () => {
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: {},
      card_front_path: 'cards/user_1/TH.png',
      portrait_path: 'portraits/user_1/TH.png',
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);
    await settle();

    const cardRequests = requests.filter((r) => r.url.startsWith('/api/cards'));
    expect(cardRequests).toHaveLength(2);
    expect(createdUrls).toHaveLength(2);
  });

  it('marks an expired card with a status dot', async () => {
    profile = {
      id: 'p1',
      country_code: 'TH',
      data: { ...TH.defaultCardData, isValid: false },
      card_front_path: null,
      portrait_path: null,
      created_at: '',
      updated_at: '',
    };

    await render(<Identity />);

    expect(container.querySelector('.bg-danger')).not.toBeNull();
  });

  it('leaves a valid card without a status dot', async () => {
    await render(<Identity />);

    expect(container.querySelector('.bg-danger')).toBeNull();
    expect(container.querySelector('.bg-warn')).toBeNull();
  });

  it('drags the document panel with the pointer and snaps it open', async () => {
    // Every element reports the same height, so the panel's measured range is
    // cardZone - 16 = 200px. Nothing else in the screen measures itself.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 216,
    });

    try {
      await act(async () => root.unmount());
      root = createRoot(container);
      await render(<Identity />);

      // The panel must claim the vertical gesture outright; `pan-y` would leave
      // it to the browser and the panel would never follow the finger.
      const handle = container.querySelector<HTMLElement>('.touch-none');
      expect(handle).not.toBeNull();

      // `paint` is the only writer of an inline translateY in this screen.
      const panel = container.querySelector<HTMLElement>('[style*="translateY"]');
      expect(panel).not.toBeNull();

      const pointer = (type: string, clientY: number) =>
        new PointerEvent(type, { bubbles: true, clientY, pointerId: 1, button: 0 });

      await act(async () => {
        handle!.dispatchEvent(pointer('pointerdown', 400));
        handle!.dispatchEvent(pointer('pointermove', 300));
      });

      // 100px up across a 200px range is half the travel, tracked one-to-one.
      expect(panel!.style.transform).toBe('translateY(-100px)');

      await act(async () => {
        handle!.dispatchEvent(pointer('pointerup', 300));
      });
      await settle();

      // Past the 0.4 threshold, so it springs the rest of the way open.
      expect(panel!.style.transform).toBe('translateY(-200px)');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
    }
  });

  it('ignores pointer movement below the drag threshold so taps still land', async () => {
    await render(<Identity />);
    const panel = container.querySelector<HTMLElement>('.touch-none');
    expect(panel).not.toBeNull();

    const pointer = (type: string, clientY: number) =>
      new PointerEvent(type, { bubbles: true, clientY, pointerId: 1, button: 0 });

    await act(async () => {
      panel?.dispatchEvent(pointer('pointerdown', 400));
      panel?.dispatchEvent(pointer('pointermove', 398));
      panel?.dispatchEvent(pointer('pointerup', 398));
    });

    await act(async () => {
      button('Copy ID number')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();

    expect(clipboard).toHaveLength(1);
  });
});

function CardImageProbe({ path }: { path: string | null }) {
  const url = useCardImage(path);
  return <span>{url ?? 'none'}</span>;
}

describe('useCardImage', () => {
  it('returns null without a path and makes no request', async () => {
    await render(<CardImageProbe path={null} />);

    expect(text()).toBe('none');
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

    expect(text()).toBe('none');
  });
});
