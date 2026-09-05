/**
 * The spring replaced Reanimated's `withSpring`, so the properties that make a
 * flip feel right are asserted here rather than left to visual inspection.
 */
import { describe, expect, it } from 'vitest';
import { Spring, clamp, interpolate, normaliseDegrees } from '../src/lib/spring';

const FLIP = { damping: 28, stiffness: 280, mass: 0.8 };

/** Runs the spring to rest, returning how long it took and whether it settled. */
function settle(spring: Spring, frameMs = 16, maxFrames = 2000) {
  let frames = 0;
  while (spring.step(frameMs)) {
    frames++;
    if (frames > maxFrames) return { frames, settled: false };
  }
  return { frames, settled: true };
}

describe('Spring', () => {
  it('starts at rest, so a card that is not touched does not animate', () => {
    const spring = new Spring(0, FLIP);
    expect(spring.isAtRest).toBe(true);
    expect(spring.step(16)).toBe(false);
  });

  it('lands exactly on the target rather than near it', () => {
    const spring = new Spring(0, FLIP);
    spring.animateTo(180);

    const { settled } = settle(spring);

    expect(settled).toBe(true);
    // A card resting at 179.996deg would show a hairline of the wrong face.
    expect(spring.value).toBe(180);
    expect(spring.velocity).toBe(0);
  });

  it('is frame-rate independent, so 60Hz and 120Hz settle alike', () => {
    const at60 = new Spring(0, FLIP);
    const at120 = new Spring(0, FLIP);
    at60.animateTo(180);
    at120.animateTo(180);

    // 192ms divides evenly into both frame sizes, so each simulates the same
    // wall-clock duration and any difference is the integrator's, not the test's.
    for (let ms = 0; ms < 192; ms += 16) at60.step(16);
    for (let ms = 0; ms < 192; ms += 8) at120.step(8);

    expect(at120.value).toBeCloseTo(at60.value, 1);
  });

  it('carries velocity into the animation, which is what a flick needs', () => {
    const flicked = new Spring(0, FLIP);
    const still = new Spring(0, FLIP);
    flicked.velocity = 900;
    flicked.animateTo(180);
    still.animateTo(180);

    flicked.step(16);
    still.step(16);

    expect(flicked.value).toBeGreaterThan(still.value);
  });

  it('overshoots before settling, giving the flip its weight', () => {
    const spring = new Spring(0, { damping: 12, stiffness: 280, mass: 0.8 });
    spring.animateTo(180);

    let peak = 0;
    for (let i = 0; i < 200; i++) {
      spring.step(16);
      peak = Math.max(peak, spring.value);
    }

    expect(peak).toBeGreaterThan(180);
  });

  it('survives a long pause without launching the card across the screen', () => {
    const spring = new Spring(0, FLIP);
    spring.animateTo(180);

    // A backgrounded tab can resume with a delta of many seconds.
    spring.step(30_000);

    expect(Number.isFinite(spring.value)).toBe(true);
    expect(Math.abs(spring.value)).toBeLessThanOrEqual(360);
  });

  it('jumpTo moves without motion, as a drag does', () => {
    const spring = new Spring(0, FLIP);
    spring.velocity = 500;
    spring.jumpTo(90);

    expect(spring.value).toBe(90);
    expect(spring.velocity).toBe(0);
    expect(spring.isAtRest).toBe(true);
  });

  it('settles a full flip in a plausible amount of time', () => {
    const spring = new Spring(0, FLIP);
    spring.animateTo(180);

    const { frames } = settle(spring, 16);

    // Roughly 0.1s-1.5s at 60fps: fast enough to feel responsive, slow enough to see.
    expect(frames).toBeGreaterThan(6);
    expect(frames).toBeLessThan(90);
  });
});

describe('interpolate', () => {
  it('maps through the middle of a range', () => {
    expect(interpolate(0, [-1, 1], [-16, 16])).toBe(0);
    expect(interpolate(0.5, [-1, 1], [-16, 16])).toBe(8);
  });

  it('clamps outside the range instead of extrapolating', () => {
    expect(interpolate(-5, [-1, 1], [-16, 16])).toBe(-16);
    expect(interpolate(5, [-1, 1], [-16, 16])).toBe(16);
  });

  it('handles a three-point range, as the specular beam uses', () => {
    expect(interpolate(0, [-60, 0, 60], [-166, 0, 166])).toBe(0);
    expect(interpolate(-60, [-60, 0, 60], [-166, 0, 166])).toBe(-166);
    expect(interpolate(30, [-60, 0, 60], [-166, 0, 166])).toBe(83);
  });

  it('does not divide by zero on a degenerate range', () => {
    expect(Number.isFinite(interpolate(5, [0, 0], [0, 10]))).toBe(true);
  });
});

describe('normaliseDegrees', () => {
  it.each([
    [0, 0],
    [180, 180],
    [360, 0],
    [540, 180],
    [-180, 180],
    [-360, 0],
    [-90, 270],
  ])('maps %i to %i, so spinning backwards still picks the right face', (input, expected) => {
    expect(normaliseDegrees(input)).toBe(expected);
  });
});

describe('clamp', () => {
  it('bounds a value', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
