/**
 * The issuing country's national emblem.
 *
 * React Native recolours an image with `tintColor`. The DOM has no such
 * property, so a tinted emblem is drawn as a CSS mask instead: the artwork's
 * alpha channel becomes the mask and the colour comes from the background. That
 * keeps a single greyscale asset usable across both themes, which is why the
 * native app tinted it in the first place.
 *
 * Countries whose emblem is already coloured set `emblemTinted: false` and are
 * rendered as a plain image, because masking would flatten them to one colour.
 */
import { getCountryConfig } from '@/countries';
import type { CountryCode } from '@/types/profile';

interface NationalEmblemProps {
  code: CountryCode;
  size?: number;
  opacity?: number;
  /** Any CSS colour. Defaults to the theme's light gold token. */
  tint?: string;
  className?: string;
}

export function NationalEmblem({
  code,
  size = 80,
  opacity = 1,
  tint = 'var(--color-gold-light)',
  className,
}: NationalEmblemProps) {
  const config = getCountryConfig(code);
  const label = `${config.name.english} national emblem`;

  if (config.emblemTinted === false) {
    return (
      <img
        src={config.emblemAsset}
        alt={label}
        width={size}
        height={size}
        className={className}
        style={{ opacity, objectFit: 'contain' }}
        draggable={false}
      />
    );
  }

  const mask = `url(${JSON.stringify(config.emblemAsset)}) no-repeat center / contain`;

  return (
    <div
      role="img"
      aria-label={label}
      className={className}
      style={{
        width: size,
        height: size,
        opacity,
        backgroundColor: tint,
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
