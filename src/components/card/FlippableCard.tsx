/**
 * The 3D identity card: drag to spin, flick to fling, tap to flip.
 *
 * Ported from the native Reanimated implementation. The physics are reproduced
 * rather than approximated with CSS transitions, because the flip carries the
 * velocity of the gesture that started it -- see `lib/spring.ts`.
 *
 * Rotation is unclamped, so the card spins continuously in whichever direction
 * it is pushed instead of snapping between two states. Face visibility is
 * therefore decided from the angle modulo 360 rather than a boolean, and uses
 * opacity instead of `backface-visibility`, which browsers disagree about once
 * transformed elements are nested inside `preserve-3d`.
 *
 * Every frame writes transforms straight to the DOM through refs. Routing them
 * through React state would re-render the tree ~60 times a second during a drag
 * for values that never affect the markup.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Spring, clamp, interpolate, normaliseDegrees } from '@/lib/spring';

const DEPTH_PX = 6;
const CORNER_R = 14;
/** Five stacked white layers read as a solid core edge-on. */
const CHASSIS_SLICES = [-2.6, -1.3, 0, 1.3, 2.6];

const FLIP_SPRING = { damping: 28, stiffness: 280, mass: 0.8 };
const PITCH_SPRING = { damping: 24, stiffness: 240, mass: 0.8 };
const TILT_SPRING = { damping: 22, stiffness: 180, mass: 1 };

const FLING_VELOCITY = 250;
const TAP_MAX_MS = 250;
const TAP_MAX_DISTANCE = 8;
const LONG_PRESS_MS = 500;
const MAX_PITCH = 25;

/**
 * The beam is 45% of the card wide and 260% of it tall, so sweeps expressed as
 * a fraction of the card convert to percentages of the beam itself. That keeps
 * the card fully responsive without measuring it every frame.
 */
const BEAM_W_FRACTION = 0.45;
const BEAM_H_FRACTION = 2.6;
const BEAM_SWEEP_X = (0.75 / BEAM_W_FRACTION) * 100;
const BEAM_SWEEP_Y = (0.35 / BEAM_H_FRACTION) * 100;
/** `top` resolves against the card, not the beam, so this is card height. */
const BEAM_TOP_PCT = -80;

const BEAM_GRADIENT =
  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 25%, ' +
  'rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.04) 75%, transparent 100%)';

export interface FlippableCardProps {
  frontSrc: string;
  backSrc: string;
  /** Covers the card with a progress overlay while a render is in flight. */
  isGenerating?: boolean;
  /** Shown briefly once a render finishes. */
  updatedLabel?: string;
  onLongPress?: () => void;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function FlippableCard({
  frontSrc,
  backSrc,
  isGenerating = false,
  updatedLabel = 'ID Card Updated',
  onLongPress,
  className,
}: FlippableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontBeamRef = useRef<HTMLDivElement>(null);
  const backBeamRef = useRef<HTMLDivElement>(null);

  const springs = useRef({
    rotY: new Spring(0, FLIP_SPRING),
    rotX: new Spring(0, PITCH_SPRING),
    tiltX: new Spring(0, TILT_SPRING),
    tiltY: new Spring(0, TILT_SPRING),
  });

  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startRotY: 0,
    startedAt: 0,
    moved: 0,
    /** Recent samples, used to derive fling velocity on release. */
    samples: [] as { x: number; t: number }[],
  });

  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useRef(false);

  const [genPercent, setGenPercent] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const vibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10);
      } catch {
        // A browser may refuse without a user gesture; the flip still happens.
      }
    }
  }, []);

  /** Writes the current spring values to the DOM. */
  const paint = useCallback(() => {
    const { rotY, rotX, tiltX, tiltY } = springs.current;
    const dragging = drag.current.active;

    const hoverY = dragging ? 0 : interpolate(tiltX.value, [-1, 1], [-16, 16]);
    const hoverX = dragging ? 0 : interpolate(tiltY.value, [-1, 1], [14, -14]);
    const totalY = rotY.value + hoverY;
    const totalX = rotX.value + hoverX;

    if (cardRef.current) {
      cardRef.current.style.transform = `rotateY(${totalY}deg) rotateX(${totalX}deg)`;
    }

    const norm = normaliseDegrees(rotY.value);
    const facingFront = norm <= 90 || norm >= 270;
    if (frontRef.current) frontRef.current.style.opacity = facingFront ? '1' : '0';
    if (backRef.current) backRef.current.style.opacity = facingFront ? '0' : '1';

    // The beam sweeps across whichever face is turned toward the viewer, so each
    // is driven by its own angle relative to that face.
    const frontAngle = norm > 180 ? norm - 360 : norm;
    const backAngle = norm - 180;

    const applyBeam = (el: HTMLDivElement | null, angle: number, invert: boolean) => {
      if (!el) return;
      const direction = invert ? -1 : 1;
      const x = interpolate(angle, [-60, 0, 60], [-BEAM_SWEEP_X, 0, BEAM_SWEEP_X]) * direction;
      const y = interpolate(rotX.value, [-MAX_PITCH, 0, MAX_PITCH], [BEAM_SWEEP_Y, 0, -BEAM_SWEEP_Y]);
      el.style.transform = `translate(${x}%, ${y}%) rotate(25deg)`;
      el.style.opacity = String(interpolate(Math.abs(angle), [0, 45, 80], [0.38, 0.22, 0]));
    };

    applyBeam(frontBeamRef.current, frontAngle, false);
    applyBeam(backBeamRef.current, backAngle, true);
  }, []);

  /** Runs only while something is actually moving. */
  const ensureFrameLoop = useCallback(() => {
    if (frameRef.current !== null) return;

    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const { rotY, rotX, tiltX, tiltY } = springs.current;
      let moving = false;
      if (!drag.current.active) {
        moving = rotY.step(delta) || moving;
        moving = rotX.step(delta) || moving;
        moving = tiltX.step(delta) || moving;
        moving = tiltY.step(delta) || moving;
      }

      paint();

      if (moving && !drag.current.active) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [paint]);

  useEffect(() => {
    reducedMotion.current = prefersReducedMotion();
    paint();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, [paint]);

  const flipBy = useCallback(
    (steps: number) => {
      const { rotY } = springs.current;
      rotY.animateTo((Math.round(rotY.value / 180) + steps) * 180);
      vibrate();
      ensureFrameLoop();
    },
    [ensureFrameLoop, vibrate],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isGenerating) return;
      const state = drag.current;
      state.active = true;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.startRotY = springs.current.rotY.value;
      state.startedAt = performance.now();
      state.moved = 0;
      state.samples = [{ x: event.clientX, t: state.startedAt }];

      springs.current.rotY.jumpTo(springs.current.rotY.value);
      event.currentTarget.setPointerCapture(event.pointerId);

      if (onLongPress) {
        cancelLongPress();
        longPressTimer.current = setTimeout(() => {
          if (drag.current.moved <= TAP_MAX_DISTANCE) {
            drag.current.active = false;
            onLongPress();
          }
        }, LONG_PRESS_MS);
      }
    },
    [cancelLongPress, isGenerating, onLongPress],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;

      if (!state.active || event.pointerId !== state.pointerId) {
        // Not dragging: a hovering mouse tilts the card toward the cursor.
        if (event.pointerType !== 'mouse' || reducedMotion.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        springs.current.tiltX.animateTo(
          clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        );
        springs.current.tiltY.animateTo(
          clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
        );
        ensureFrameLoop();
        return;
      }

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      state.moved = Math.max(state.moved, Math.hypot(dx, dy));
      if (state.moved > TAP_MAX_DISTANCE) cancelLongPress();

      const rect = event.currentTarget.getBoundingClientRect();
      const degPerPixel = 180 / Math.max(1, rect.width * 0.75);
      springs.current.rotY.jumpTo(state.startRotY + dx * degPerPixel);
      springs.current.rotX.jumpTo(clamp(-dy * 0.25, -MAX_PITCH, MAX_PITCH));

      const now = performance.now();
      state.samples.push({ x: event.clientX, t: now });
      // 80 ms of history is enough to read intent without lagging behind it.
      while (state.samples.length > 2 && now - state.samples[0].t > 80) state.samples.shift();

      paint();
    },
    [cancelLongPress, ensureFrameLoop, paint],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state.active || event.pointerId !== state.pointerId) return;

      cancelLongPress();
      state.active = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const now = performance.now();
      const oldest = state.samples[0];
      const elapsed = now - oldest.t;
      const velocityX =
        elapsed > 0 ? ((event.clientX - oldest.x) / elapsed) * 1000 : 0;

      const { rotY, rotX } = springs.current;

      if (now - state.startedAt < TAP_MAX_MS && state.moved <= TAP_MAX_DISTANCE) {
        rotX.animateTo(0);
        flipBy(1);
        return;
      }

      let target = Math.round(rotY.value / 180) * 180;
      if (velocityX > FLING_VELOCITY) {
        target = Math.ceil((rotY.value + 20) / 180) * 180;
        if (target === state.startRotY) target += 180;
      } else if (velocityX < -FLING_VELOCITY) {
        target = Math.floor((rotY.value - 20) / 180) * 180;
        if (target === state.startRotY) target -= 180;
      }

      rotY.animateTo(target);
      rotX.animateTo(0);
      vibrate();
      ensureFrameLoop();
    },
    [cancelLongPress, ensureFrameLoop, flipBy, vibrate],
  );

  const handlePointerLeave = useCallback(() => {
    if (drag.current.active) return;
    springs.current.tiltX.animateTo(0);
    springs.current.tiltY.animateTo(0);
    ensureFrameLoop();
  }, [ensureFrameLoop]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      flipBy(1);
    },
    [flipBy],
  );

  // Tilt with the device, the web stand-in for the native accelerometer.
  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion.current) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (drag.current.active || event.gamma === null || event.beta === null) return;
      springs.current.tiltX.animateTo(clamp(event.gamma / 25, -1, 1));
      springs.current.tiltY.animateTo(clamp((event.beta - 45) / 30, -1, 1));
      ensureFrameLoop();
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [ensureFrameLoop]);

  // Progress readout. The percentage is deliberately fictional -- the model
  // reports nothing -- so it eases toward 99 and only completes on success.
  useEffect(() => {
    if (!isGenerating) {
      setGenPercent(100);
      return;
    }
    setGenPercent(0);
    let pct = 0;
    const timer = setInterval(() => {
      if (pct < 30) pct += Math.random() * 4 + 2;
      else if (pct < 70) pct += Math.random() * 2 + 0.8;
      else if (pct < 95) pct += Math.random() * 1.2 + 0.3;
      setGenPercent(Math.min(99, Math.round(pct)));
    }, 250);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const wasGenerating = useRef(false);
  useEffect(() => {
    if (wasGenerating.current && !isGenerating) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2500);
      wasGenerating.current = isGenerating;
      return () => clearTimeout(timer);
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating]);

  const beamStyle = {
    position: 'absolute' as const,
    top: `${BEAM_TOP_PCT}%`,
    left: '25%',
    width: `${BEAM_W_FRACTION * 100}%`,
    height: `${BEAM_H_FRACTION * 100}%`,
    backgroundImage: BEAM_GRADIENT,
    willChange: 'transform, opacity',
  };

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full max-w-[390px] select-none ${className ?? ''}`}
      style={{ perspective: '1000px', aspectRatio: '1 / 0.63', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Identity card. Press Enter to flip."
    >
      <div
        ref={cardRef}
        className="relative h-full w-full cursor-grab active:cursor-grabbing"
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          borderRadius: CORNER_R,
        }}
      >
        {/* Solid white core, so the card reads as a physical slab edge-on. */}
        {CHASSIS_SLICES.map((z) => (
          <div
            key={z}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-white"
            style={{ transform: `translateZ(${z}px)`, borderRadius: CORNER_R, zIndex: 5 }}
          />
        ))}

        {/* Perimeter walls, rotated out of the plane to form the card's edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bg-white"
          style={{
            left: CORNER_R,
            right: CORNER_R,
            height: DEPTH_PX,
            top: -DEPTH_PX / 2,
            transform: 'rotateX(90deg)',
            zIndex: 10,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: CORNER_R,
            right: CORNER_R,
            height: DEPTH_PX,
            bottom: -DEPTH_PX / 2,
            backgroundColor: '#EDEDED',
            transform: 'rotateX(-90deg)',
            zIndex: 10,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: CORNER_R,
            bottom: CORNER_R,
            width: DEPTH_PX,
            left: -DEPTH_PX / 2,
            backgroundColor: '#F6F6F6',
            transform: 'rotateY(-90deg)',
            zIndex: 10,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: CORNER_R,
            bottom: CORNER_R,
            width: DEPTH_PX,
            right: -DEPTH_PX / 2,
            backgroundColor: '#F6F6F6',
            transform: 'rotateY(90deg)',
            zIndex: 10,
          }}
        />

        {/* Corner fills, joining the straight walls around the radius. */}
        {(
          [
            { corner: { top: 0, left: 0 }, radius: { borderTopLeftRadius: CORNER_R } },
            { corner: { top: 0, right: 0 }, radius: { borderTopRightRadius: CORNER_R } },
            { corner: { bottom: 0, left: 0 }, radius: { borderBottomLeftRadius: CORNER_R } },
            { corner: { bottom: 0, right: 0 }, radius: { borderBottomRightRadius: CORNER_R } },
          ] as const
        ).map(({ corner, radius }, index) => (
          <div
            key={index}
            aria-hidden
            className="pointer-events-none absolute overflow-hidden"
            style={{ ...corner, width: CORNER_R, height: CORNER_R, zIndex: 10 }}
          >
            <div className="absolute inset-0 bg-white" style={radius} />
          </div>
        ))}

        <div
          ref={frontRef}
          className="absolute inset-0 overflow-hidden"
          style={{ transform: `translateZ(${DEPTH_PX / 2}px)`, borderRadius: CORNER_R, zIndex: 20 }}
        >
          <img
            src={frontSrc}
            alt="Front of the identity card"
            className="h-full w-full object-cover"
            style={{ borderRadius: CORNER_R }}
            draggable={false}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div ref={frontBeamRef} style={beamStyle} />
          </div>
        </div>

        <div
          ref={backRef}
          className="absolute inset-0 overflow-hidden"
          style={{
            transform: `rotateY(180deg) translateZ(${DEPTH_PX / 2}px)`,
            borderRadius: CORNER_R,
            zIndex: 20,
          }}
        >
          <img
            src={backSrc}
            alt="Back of the identity card"
            className="h-full w-full object-cover"
            style={{ borderRadius: CORNER_R }}
            draggable={false}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div ref={backBeamRef} style={beamStyle} />
          </div>
        </div>
      </div>

      {isGenerating && (
        <div
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: 'rgba(6,10,20,0.92)', borderRadius: CORNER_R }}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center">
            <span className="text-[38px] font-extralight tracking-[2px] text-white tabular-nums">
              {genPercent}%
            </span>
            <span className="mt-1 mb-4 text-[10px] font-semibold tracking-[4px] text-white/45">
              PROCESSING
            </span>
            <div className="h-[3px] w-[55%] min-w-[140px] overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gold-light transition-[width] duration-200"
                style={{ width: `${genPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1"
          style={{
            backgroundColor: 'rgba(6,10,20,0.88)',
            borderColor: 'rgba(212,175,55,0.4)',
          }}
          role="status"
          aria-live="polite"
        >
          <span className="text-xs font-bold text-gold-light">✓</span>
          <span className="text-[11px] font-semibold tracking-[0.5px] text-white">
            {updatedLabel}
          </span>
        </div>
      )}
    </div>
  );
}
