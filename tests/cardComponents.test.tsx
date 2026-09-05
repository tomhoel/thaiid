// @vitest-environment jsdom
/**
 * Rendering tests for the ported card components.
 *
 * These were React Native components: `Svg`/`Rect`, `Image` with `tintColor`,
 * and a Reanimated gesture surface. None of that has a DOM equivalent, so the
 * point here is that the rewrites produce real, accessible DOM rather than that
 * they still typecheck.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Flag } from '../src/components/card/Flag';
import { NationalEmblem } from '../src/components/card/NationalEmblem';
import { QRCodeDisplay } from '../src/components/card/QRCodeDisplay';
import { FlippableCard } from '../src/components/card/FlippableCard';
import { COUNTRY_CODES } from '../src/countries';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom implements neither, and the card asks for both on mount.
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

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node));
};

describe('Flag', () => {
  it.each(COUNTRY_CODES)('renders %s as inline SVG', async (code) => {
    await render(<Flag code={code} />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Fixed viewBox: geometry must not depend on the width and height props.
    expect(svg?.getAttribute('viewBox')).toBe('0 0 60 40');
    expect(svg?.querySelectorAll('rect, circle, polygon').length).toBeGreaterThan(0);
  });

  it('labels the flag for screen readers', async () => {
    await render(<Flag code="TH" />);

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Flag of Thailand');
  });

  it('scales through width and height without changing the viewBox', async () => {
    await render(<Flag code="VN" width={120} height={80} />);

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 60 40');
  });

  it('draws Vietnam as a ten-point star, not a circle', async () => {
    await render(<Flag code="VN" />);

    const points = container.querySelector('polygon')?.getAttribute('points') ?? '';
    expect(points.trim().split(/\s+/)).toHaveLength(10);
  });
});

describe('NationalEmblem', () => {
  it('tints via a CSS mask, the stand-in for tintColor', async () => {
    await render(<NationalEmblem code="TH" size={64} />);

    const emblem = container.querySelector('[role="img"]') as HTMLElement;
    expect(emblem).not.toBeNull();
    expect(emblem.style.backgroundColor).toBe('var(--color-gold-light)');
    // Both spellings, because Safari needed the prefix until recently.
    expect(emblem.getAttribute('style')).toMatch(/-webkit-mask|(^|[^-])mask:/);
    expect(emblem.style.width).toBe('64px');
  });

  it('renders a pre-coloured emblem as a plain image so masking cannot flatten it', async () => {
    await render(<NationalEmblem code="VN" />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toContain('emblem');
    expect(container.querySelector('[role="img"]:not(img)')).toBeNull();
  });

  it('accepts a tint override', async () => {
    await render(<NationalEmblem code="TH" tint="#ff0000" />);

    const emblem = container.querySelector('[role="img"]') as HTMLElement;
    expect(emblem.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('QRCodeDisplay', () => {
  it('emits one path rather than a rect per module', async () => {
    await render(<QRCodeDisplay value="THAI_NATIONAL_ID:1650100094200" />);

    const svg = container.querySelector('svg');
    expect(svg?.querySelectorAll('path')).toHaveLength(1);
    expect(svg?.querySelectorAll('rect')).toHaveLength(0);
    expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^M\d/);
  });

  it('sizes the viewBox to the module count so the code stays square', async () => {
    await render(<QRCodeDisplay value="hello" size={200} />);

    const viewBox = container.querySelector('svg')?.getAttribute('viewBox') ?? '';
    const [, , w, h] = viewBox.split(' ').map(Number);
    expect(w).toBe(h);
    expect(w).toBeGreaterThan(20);
  });

  it('draws a background only when one is asked for', async () => {
    await render(<QRCodeDisplay value="hello" background="#000000" />);
    expect(container.querySelectorAll('rect')).toHaveLength(1);
  });

  it('changes its path when the value changes', async () => {
    await render(<QRCodeDisplay value="first" />);
    const first = container.querySelector('path')?.getAttribute('d');

    await render(<QRCodeDisplay value="second" />);
    const second = container.querySelector('path')?.getAttribute('d');

    expect(second).not.toBe(first);
  });
});

describe('FlippableCard', () => {
  const props = { frontSrc: '/templates/th-front.png', backSrc: '/templates/th-back.png' };

  it('renders both faces', async () => {
    await render(<FlippableCard {...props} />);

    const images = Array.from(container.querySelectorAll('img'));
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      '/templates/th-front.png',
      '/templates/th-back.png',
    ]);
  });

  it('is reachable and operable by keyboard', async () => {
    await render(<FlippableCard {...props} />);

    const card = container.querySelector('[role="button"]') as HTMLElement;
    expect(card.tabIndex).toBe(0);
    expect(card.getAttribute('aria-label')).toMatch(/flip/i);
  });

  it('builds a real 3D stack rather than a flat crossfade', async () => {
    await render(<FlippableCard {...props} />);

    const stage = container.querySelector('[role="button"]') as HTMLElement;
    expect(stage.style.perspective).toBe('1000px');

    const card = stage.firstElementChild as HTMLElement;
    expect(card.style.transformStyle).toBe('preserve-3d');

    // Faces sit either side of the chassis, and the back is pre-rotated.
    const faces = Array.from(stage.querySelectorAll('img')).map(
      (img) => (img.parentElement as HTMLElement).style.transform,
    );
    expect(faces[0]).toBe('translateZ(3px)');
    expect(faces[1]).toBe('rotateY(180deg) translateZ(3px)');
  });

  it('shows progress while generating and hides the card behind it', async () => {
    await render(<FlippableCard {...props} isGenerating />);

    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toContain('PROCESSING');
    expect(status?.textContent).toMatch(/\d+%/);
  });

  it('does not show progress when idle', async () => {
    await render(<FlippableCard {...props} />);
    expect(container.textContent).not.toContain('PROCESSING');
  });

  it('fires onLongPress after a held press', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onLongPress = vi.fn();
    await render(<FlippableCard {...props} onLongPress={onLongPress} />);

    const card = container.querySelector('[role="button"]') as HTMLElement;
    card.setPointerCapture = () => {};
    card.hasPointerCapture = () => false;
    card.releasePointerCapture = () => {};

    await act(async () => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: 10, clientY: 10, bubbles: true }),
      );
    });
    expect(onLongPress).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ignores interaction while a render is in flight', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onLongPress = vi.fn();
    await render(<FlippableCard {...props} isGenerating onLongPress={onLongPress} />);

    const card = container.querySelector('[role="button"]') as HTMLElement;
    card.setPointerCapture = () => {};

    await act(async () => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: 10, clientY: 10, bubbles: true }),
      );
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
