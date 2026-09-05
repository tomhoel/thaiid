import type { SVGProps } from 'react';

/**
 * The icons the identity screen needs.
 *
 * The native app pulled these from `@expo/vector-icons`, which is a React
 * Native package and ships a font file. Rather than add an icon dependency for
 * thirteen glyphs, they are drawn here as plain stroked paths on a 24×24 grid.
 * `currentColor` means they inherit text colour, so the theme tokens still
 * drive them.
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
  | 'chevronLeft'
  | 'chevronRight';

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
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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
