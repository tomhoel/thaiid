import { NationalEmblem } from './card/NationalEmblem';
import type { CountryCode } from '@/types/profile';

/**
 * The slowly rotating emblem watermark behind the identity screen.
 *
 * Reanimated drove this with a 50 s linear `withRepeat` on the UI thread. A CSS
 * keyframe animation is the DOM equivalent and is composited off the main
 * thread for free, so there is no reason to run it in JavaScript.
 *
 * Sized in viewport units rather than from a measured window, which keeps it
 * correct across rotation and resize without a listener.
 */
interface LivenessWatermarkProps {
  code: CountryCode;
  /** The QR screen keeps the atmosphere but drops the emblem. */
  showEmblem?: boolean;
}

export function LivenessWatermark({ code, showEmblem = true }: LivenessWatermarkProps) {
  if (!showEmblem) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 motion-safe:[animation:watermark-spin_50s_linear_infinite]"
        style={{
          width: '60vw',
          height: '60vw',
          top: 'calc((100% - 60vw) * 0.4)',
          marginLeft: '-30vw',
        }}
      >
        <NationalEmblem code={code} size="100%" opacity={0.1} />
      </div>
    </div>
  );
}
