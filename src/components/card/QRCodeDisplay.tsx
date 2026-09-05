/**
 * Renders a QR code as SVG.
 *
 * `qrcode` can draw to a canvas, but SVG stays sharp when the card is scaled or
 * printed, and a canvas would need a device-pixel-ratio dance to avoid looking
 * soft on retina screens.
 *
 * The whole matrix is emitted as a single `<path>` rather than one `<rect>` per
 * module. A version 10 code is 57x57, so rects would mean ~1,600 DOM nodes per
 * code; the path is one node and measurably cheaper to re-render.
 */
import { useMemo } from 'react';
import QRCodeLib from 'qrcode';
import { reportError } from '@/lib/reportError';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  color?: string;
  background?: string;
  className?: string;
  /** Describes the code's purpose to screen readers. */
  label?: string;
}

interface Matrix {
  path: string;
  moduleCount: number;
}

function buildPath(value: string): Matrix | null {
  try {
    const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
    const data = qr.modules.data;
    const moduleCount = qr.modules.size;

    // Runs of adjacent dark modules collapse into one horizontal segment, which
    // keeps the path short without changing what is drawn.
    const segments: string[] = [];
    for (let row = 0; row < moduleCount; row++) {
      let runStart = -1;
      for (let col = 0; col <= moduleCount; col++) {
        const dark = col < moduleCount && data[row * moduleCount + col] === 1;
        if (dark && runStart === -1) {
          runStart = col;
        } else if (!dark && runStart !== -1) {
          segments.push(`M${runStart} ${row}h${col - runStart}v1h-${col - runStart}z`);
          runStart = -1;
        }
      }
    }
    return { path: segments.join(''), moduleCount };
  } catch (error) {
    reportError('QRCodeDisplay.create', error);
    return null;
  }
}

export function QRCodeDisplay({
  value,
  size = 180,
  color = '#FFFFFF',
  background = 'transparent',
  className,
  label = 'QR code',
}: QRCodeDisplayProps) {
  const matrix = useMemo(() => buildPath(value), [value]);

  if (!matrix) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${matrix.moduleCount} ${matrix.moduleCount}`}
      className={className}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      {background !== 'transparent' && (
        <rect
          x={0}
          y={0}
          width={matrix.moduleCount}
          height={matrix.moduleCount}
          fill={background}
        />
      )}
      <path d={matrix.path} fill={color} />
    </svg>
  );
}
