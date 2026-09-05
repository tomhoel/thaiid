/**
 * The country-specific atmospheric tint that sits behind the card.
 *
 * The native version was an `expo-linear-gradient` with three stops. A CSS
 * gradient does the same job with no element cost, and `color-mix` lets the
 * peak alpha come from a token so the light theme can soften it without the
 * component knowing which theme is active.
 */
interface BackgroundAtmosphereProps {
  /** Vertical position of the tint peak, 0–1. Defaults to just behind the card. */
  tintCenter?: number;
}

export function BackgroundAtmosphere({ tintCenter = 0.38 }: BackgroundAtmosphereProps) {
  const peak = 'color-mix(in srgb, var(--color-gold-light) var(--atmosphere-peak), transparent)';
  const edge = 'transparent';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `linear-gradient(to bottom, ${edge} 0%, ${peak} ${tintCenter * 100}%, ${edge} 92%)`,
      }}
    />
  );
}
