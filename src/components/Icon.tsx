import type { SVGProps } from 'react';

/**
 * The icons the app needs.
 *
 * The native app pulled these from `@expo/vector-icons`, which is a React
 * Native package and ships a font file. Rather than add an icon dependency for
 * a couple of dozen glyphs, they are drawn here on a 24×24 grid.
 * `currentColor` means they inherit text colour, so the theme tokens still
 * drive them.
 *
 * Most are stroked outlines. The tab bar needs solid variants too, because
 * Ionicons swaps to filled artwork for the focused tab; those names live in
 * `FILLED` and are rendered with a fill and no stroke.
 */

export type IconName =
  | 'fingerprint'
  | 'copy'
  | 'calendar'
  | 'hourglass'
  | 'ribbon'
  | 'clock'
  | 'location'
  | 'chip'
  | 'body'
  | 'scan'
  | 'eye'
  | 'document'
  | 'person'
  | 'card'
  | 'cardFilled'
  | 'qrCode'
  | 'qrCodeFilled'
  | 'cog'
  | 'cogFilled'
  | 'sync'
  | 'moon'
  | 'sun'
  | 'globe'
  | 'language'
  | 'bell'
  | 'lock'
  | 'eyeOff'
  | 'tools'
  | 'logout'
  | 'trash'
  | 'shield'
  | 'info'
  | 'checkmark'
  | 'chevronLeft'
  | 'chevronRight';

/** Rendered solid rather than stroked. */
const FILLED = new Set<IconName>(['cardFilled', 'qrCodeFilled', 'cogFilled']);

const PATHS: Record<IconName, React.ReactNode> = {
  fingerprint: (
    <>
      <path d="M12 11v3.5" />
      <path d="M8.5 10a3.5 3.5 0 0 1 7 0v2a12 12 0 0 1-.6 3.8" />
      <path d="M5.5 9.5a6.5 6.5 0 0 1 13 0v2.5a18 18 0 0 1-.5 4" />
      <path d="M9 20a16 16 0 0 0 1.2-5.5V10" />
      <path d="M2.8 8a9.5 9.5 0 0 1 17-1.2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 2h12M6 22h12" />
      <path d="M6 2c0 5 6 6 6 10S6 17 6 22" />
      <path d="M18 2c0 5-6 6-6 10s6 5 6 10" />
    </>
  ),
  ribbon: (
    <>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 12.5 6 22l6-3 6 3-2.5-9.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5V12l3.5 2.5" />
    </>
  ),
  location: (
    <>
      <path d="M12 22s7-6.2 7-11.5A7 7 0 0 0 5 10.5C5 15.8 12 22 12 22Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M12 8v7M12 8 7.5 10M12 8l4.5 2M12 15l-2.5 6M12 15l2.5 6" />
    </>
  ),
  scan: (
    <>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M3 12h18" />
    </>
  ),
  eye: (
    <>
      <path d="M1.8 12S5.5 5.5 12 5.5 22.2 12 22.2 12 18.5 18.5 12 18.5 1.8 12 1.8 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2.5 12S6 6 12 6c1.4 0 2.7.3 3.8.8M21.5 12s-1.2 2-3.3 3.6" />
      <path d="M9.8 9.9A3.2 3.2 0 0 0 12 15.2c.9 0 1.7-.4 2.3-1" />
      <path d="M4 20 20 4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
    </>
  ),
  language: (
    <>
      <path d="M3 5.5h9M7.5 3.5v2M10 5.5c0 4.5-3 8-7 9.5" />
      <path d="M5 10.5c1.5 2.5 3.7 4 6.5 4.8" />
      <path d="m12.5 21 4.5-10 4.5 10M14.3 17.5h5.4" />
    </>
  ),
  tools: (
    <path d="M14.7 6.3a3.9 3.9 0 0 1 5.2 4.9l-9.3 9.3a2.3 2.3 0 0 1-3.3-3.3l9.3-9.3a1.5 1.5 0 0 0-2-2L5.9 14.6a4.4 4.4 0 0 0 6.2 6.2" />
  ),
  document: (
    <>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h7" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7.5" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  cardFilled: (
    <>
      <path d="M4.5 4h15A2.5 2.5 0 0 1 22 6.5V9H2V6.5A2.5 2.5 0 0 1 4.5 4Z" />
      <path d="M2 11v6.5A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5V11H2Zm4 4h4v2H6v-2Z" />
    </>
  ),
  qrCode: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM21 14v3M14 21h3M21 21v.01" />
    </>
  ),
  qrCodeFilled: (
    <>
      <path d="M4.5 3h4A1.5 1.5 0 0 1 10 4.5v4A1.5 1.5 0 0 1 8.5 10h-4A1.5 1.5 0 0 1 3 8.5v-4A1.5 1.5 0 0 1 4.5 3Zm1 2v3h2V5h-2Z" />
      <path d="M15.5 3h4A1.5 1.5 0 0 1 21 4.5v4A1.5 1.5 0 0 1 19.5 10h-4A1.5 1.5 0 0 1 14 8.5v-4A1.5 1.5 0 0 1 15.5 3Zm1 2v3h2V5h-2Z" />
      <path d="M4.5 14h4A1.5 1.5 0 0 1 10 15.5v4A1.5 1.5 0 0 1 8.5 21h-4A1.5 1.5 0 0 1 3 19.5v-4A1.5 1.5 0 0 1 4.5 14Zm1 2v3h2v-3h-2Z" />
      <path d="M14 14h3.2v3.2H14zM19.4 14H21v3.2h-1.6zM14 19.4h3.2V21H14zM19.4 19.4H21V21h-1.6z" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2-1.2L14.6 3H9.4L9 5.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5.2l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.07-.4.1-.8.1-1.2Z" />
    </>
  ),
  cogFilled: (
    <>
      <path d="M9.4 2h5.2a1 1 0 0 1 1 .86l.3 2.05c.43.2.84.44 1.22.72l1.93-.8a1 1 0 0 1 1.25.43l2.6 4.5a1 1 0 0 1-.25 1.3l-1.63 1.22a8.6 8.6 0 0 1 0 1.44l1.63 1.22a1 1 0 0 1 .25 1.3l-2.6 4.5a1 1 0 0 1-1.25.43l-1.93-.8c-.38.28-.79.52-1.22.72l-.3 2.05a1 1 0 0 1-1 .86H9.4a1 1 0 0 1-1-.86l-.3-2.05a8.5 8.5 0 0 1-1.22-.72l-1.93.8a1 1 0 0 1-1.25-.43l-2.6-4.5a1 1 0 0 1 .25-1.3l1.63-1.22a8.6 8.6 0 0 1 0-1.44L1.35 11.06a1 1 0 0 1-.25-1.3l2.6-4.5a1 1 0 0 1 1.25-.43l1.93.8c.38-.28.79-.52 1.22-.72l.3-2.05A1 1 0 0 1 9.4 2Zm2.6 6.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
    </>
  ),
  sync: (
    <>
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9M3.5 12a8.5 8.5 0 0 1 14.6-5.9" />
      <path d="M18.1 2.5v3.6h-3.6M5.9 21.5v-3.6h3.6" />
    </>
  ),
  moon: <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.7 8.7 0 1 0 10.8 10.8Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.3" />
      <path d="M2.9 12h18.2" />
      <path d="M12 2.7c2.3 2.5 3.6 5.8 3.6 9.3s-1.3 6.8-3.6 9.3c-2.3-2.5-3.6-5.8-3.6-9.3S9.7 5.2 12 2.7Z" />
    </>
  ),
  logout: (
    <>
      <path d="M15 17v2.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2V7" />
      <path d="M20.5 12H9.5M17 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6h17M9 6V3.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6" />
      <path d="M18.5 6 17.7 20a1.8 1.8 0 0 1-1.8 1.7H8.1A1.8 1.8 0 0 1 6.3 20L5.5 6" />
      <path d="M10 10.5v7M14 10.5v7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 4 5.7v6c0 4.6 3.2 8.9 8 9.8 4.8-.9 8-5.2 8-9.8v-6L12 2.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9.3" />
      <path d="M12 11v5.5M12 7.6v.01" />
    </>
  ),
  checkmark: <path d="m4.5 12.5 5 5 10-11" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, strokeWidth = 1.8, ...rest }: IconProps) {
  const solid = FILLED.has(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={solid ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
