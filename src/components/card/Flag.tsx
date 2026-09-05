/**
 * National flags, drawn as SVG so they stay crisp at any size and cost nothing
 * to load.
 *
 * The native app had one component per country. Here a single component
 * switches on the country code, because every call site already has one and
 * five near-identical files earned their keep only under React Native's import
 * rules.
 *
 * Geometry is expressed against a fixed 60x40 viewBox and scaled by the width
 * and height attributes, so the shapes are resolution-independent rather than
 * recomputed from props as they were natively.
 */
import type { JSX } from 'react';
import type { CountryCode } from '@/types/profile';

const VIEW_W = 60;
const VIEW_H = 40;

interface FlagProps {
  code: CountryCode;
  width?: number;
  height?: number;
  className?: string;
  /** Overrides the default "Flag of <country>" label. */
  title?: string;
}

const COUNTRY_NAMES: Record<CountryCode, string> = {
  TH: 'Thailand',
  SG: 'Singapore',
  BR: 'Brazil',
  US: 'the United States',
  VN: 'Vietnam',
};

function ThailandFlag() {
  const stripe = VIEW_H / 6;
  return (
    <>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#ED1C24" rx={2} />
      <rect x={0} y={stripe} width={VIEW_W} height={stripe * 4} fill="#FFFFFF" />
      <rect x={0} y={stripe * 2} width={VIEW_W} height={stripe * 2} fill="#241D4F" />
    </>
  );
}

function SingaporeFlag() {
  const halfH = VIEW_H / 2;
  const cx = VIEW_W * 0.28;
  const cy = VIEW_H * 0.25;
  const starR = VIEW_H * 0.04;
  const moonR = VIEW_H * 0.18;
  const moonInnerR = VIEW_H * 0.14;
  const spread = VIEW_H * 0.12;

  const stars = [
    { x: cx, y: cy - spread },
    { x: cx + spread * 0.95, y: cy - spread * 0.31 },
    { x: cx + spread * 0.59, y: cy + spread * 0.81 },
    { x: cx - spread * 0.59, y: cy + spread * 0.81 },
    { x: cx - spread * 0.95, y: cy - spread * 0.31 },
  ];

  return (
    <>
      <rect x={0} y={0} width={VIEW_W} height={halfH} fill="#EE2536" rx={2} />
      <rect x={0} y={halfH} width={VIEW_W} height={halfH} fill="#FFFFFF" />
      {/* Crescent, cut from two overlapping circles. */}
      <circle cx={cx - moonR * 0.2} cy={cy} r={moonR} fill="#FFFFFF" />
      <circle cx={cx + moonR * 0.15} cy={cy} r={moonInnerR} fill="#EE2536" />
      {stars.map((star) => (
        <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={starR} fill="#FFFFFF" />
      ))}
    </>
  );
}

function BrazilFlag() {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const dw = VIEW_W * 0.42;
  const dh = VIEW_H * 0.4;

  return (
    <>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#009739" rx={2} />
      <polygon
        points={`${cx},${cy - dh} ${cx + dw},${cy} ${cx},${cy + dh} ${cx - dw},${cy}`}
        fill="#FEDD00"
      />
      <circle cx={cx} cy={cy} r={VIEW_H * 0.22} fill="#002776" />
      <rect
        x={cx - VIEW_W * 0.25}
        y={cy - VIEW_H * 0.035}
        width={VIEW_W * 0.5}
        height={VIEW_H * 0.07}
        fill="#FFFFFF"
        rx={1}
      />
    </>
  );
}

function UnitedStatesFlag() {
  const stripe = VIEW_H / 13;
  const cantonW = VIEW_W * 0.4;
  const cantonH = stripe * 7;
  const starOffsets = [0.2, 0.5, 0.8];

  return (
    <>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#FFFFFF" rx={2} />
      {[0, 2, 4, 6, 8, 10, 12].map((row) => (
        <rect key={row} x={0} y={row * stripe} width={VIEW_W} height={stripe} fill="#B22234" />
      ))}
      <rect x={0} y={0} width={cantonW} height={cantonH} fill="#3C3B6E" rx={2} />
      {/* Stars are suggested rather than drawn; at this size they read as dots. */}
      {starOffsets.map((fx) =>
        starOffsets.map((fy) => (
          <rect
            key={`${fx}-${fy}`}
            x={cantonW * fx - 1}
            y={cantonH * fy - 1}
            width={2}
            height={2}
            fill="#FFFFFF"
          />
        )),
      )}
    </>
  );
}

function VietnamFlag() {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const outer = VIEW_H * 0.32;
  const inner = outer * 0.4;

  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = Math.PI / 2 + i * ((2 * Math.PI) / 5);
    points.push(`${cx + outer * Math.cos(outerAngle)},${cy - outer * Math.sin(outerAngle)}`);
    const innerAngle = outerAngle + Math.PI / 5;
    points.push(`${cx + inner * Math.cos(innerAngle)},${cy - inner * Math.sin(innerAngle)}`);
  }

  return (
    <>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#DA251D" rx={2} />
      <polygon points={points.join(' ')} fill="#FFDA00" />
    </>
  );
}

const SHAPES: Record<CountryCode, () => JSX.Element> = {
  TH: ThailandFlag,
  SG: SingaporeFlag,
  BR: BrazilFlag,
  US: UnitedStatesFlag,
  VN: VietnamFlag,
};

export function Flag({ code, width = 60, height = 40, className, title }: FlagProps) {
  const Shape = SHAPES[code] ?? ThailandFlag;
  const label = title ?? `Flag of ${COUNTRY_NAMES[code] ?? code}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <Shape />
    </svg>
  );
}
