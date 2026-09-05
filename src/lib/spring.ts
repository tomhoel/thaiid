/**
 * A damped harmonic oscillator, the DOM replacement for Reanimated's
 * `withSpring`.
 *
 * The native card leaned on Reanimated for its flip physics, and CSS
 * transitions cannot reproduce it: a flick carries velocity into the animation,
 * so the card must continue at the speed the finger left it and settle with the
 * overshoot that gives the flip its weight. An easing curve always restarts
 * from zero velocity and lands flat.
 *
 * Integration uses fixed 1 ms sub-steps rather than one step per frame, so the
 * result does not change with display refresh rate. A 120 Hz phone and a 60 Hz
 * monitor settle identically.
 */

export interface SpringConfig {
  /** Resistance. Higher settles sooner with less overshoot. */
  damping: number;
  /** Pull toward the target. Higher is faster and snappier. */
  stiffness: number;
  mass: number;
}

const REST_DISPLACEMENT = 0.01;
const REST_VELOCITY = 0.05;
const STEP_MS = 1;
/** Guards against a huge dt after a background tab resumes. */
const MAX_FRAME_MS = 64;

export class Spring {
  value: number;
  velocity = 0;
  private target: number;
  private readonly config: SpringConfig;

  constructor(initial: number, config: SpringConfig) {
    this.value = initial;
    this.target = initial;
    this.config = config;
  }

  /** Animates toward `target`, preserving current velocity. */
  animateTo(target: number): void {
    this.target = target;
  }

  /** Jumps to `value` with no motion, e.g. while a finger is dragging. */
  jumpTo(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  get isAtRest(): boolean {
    return (
      Math.abs(this.value - this.target) < REST_DISPLACEMENT &&
      Math.abs(this.velocity) < REST_VELOCITY
    );
  }

  /**
   * Advances the simulation by `deltaMs`. Returns false once settled, at which
   * point the value is snapped exactly onto the target so a flipped card rests
   * at precisely 180° rather than 179.996°.
   */
  step(deltaMs: number): boolean {
    const clamped = Math.min(deltaMs, MAX_FRAME_MS);
    const { damping, stiffness, mass } = this.config;

    for (let elapsed = 0; elapsed < clamped; elapsed += STEP_MS) {
      const dt = Math.min(STEP_MS, clamped - elapsed) / 1000;
      const displacement = this.value - this.target;
      const acceleration = (-stiffness * displacement - damping * this.velocity) / mass;
      this.velocity += acceleration * dt;
      this.value += this.velocity * dt;
    }

    if (this.isAtRest) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    return true;
  }
}

/** Linear map from one range to another, clamped at both ends. */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
): number {
  const inputs = inputRange;
  const outputs = outputRange;

  if (input <= inputs[0]) return outputs[0];
  const last = inputs.length - 1;
  if (input >= inputs[last]) return outputs[last];

  for (let i = 0; i < last; i++) {
    if (input <= inputs[i + 1]) {
      const span = inputs[i + 1] - inputs[i];
      const progress = span === 0 ? 0 : (input - inputs[i]) / span;
      return outputs[i] + progress * (outputs[i + 1] - outputs[i]);
    }
  }
  return outputs[last];
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Normalises any angle, including negative ones, into [0, 360). */
export const normaliseDegrees = (deg: number): number => ((deg % 360) + 360) % 360;
