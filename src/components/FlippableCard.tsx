/**
 * FlippableCard — High-Performance Continuous 360° Solid 3D Smart Card Engine.
 * Features:
 *   1. Continuous, Unclamped Rotational Drag (Spin left or right infinitely in real-time)
 *   2. Dual-Axis 3D Spatial Physics (Horizontal drag spins Y, vertical drag pitches X)
 *   3. Dynamic Inertia & Velocity Fling Snap (Snaps to nearest 180° face on release)
 *   4. Tap / Click to flip 180°
 *   5. Solid Pure White Chassis Core with identical R = 14px curvature
 *   6. Long Press to open Version History
 *   7. Smooth 3D mouse hover & gyroscope tilt
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Image, Dimensions, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../context/ProfileContext';
import { useCountry } from '../context/CountryContext';
import { useLang } from '../i18n/LanguageContext';
import VersionHistorySheet from './VersionHistorySheet';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - 40, 390);
const CARD_H = CARD_W * 0.63;
const CARD_DEPTH = 6; // 6px physical card thickness (±3px)
const CORNER_R = 14;

// 24 dense white chassis micro-slices with exact R = 14px corner radius from -2.8px to +2.8px
const CHASSIS_SLICES = [
  -2.8, -2.56, -2.32, -2.08, -1.84, -1.6, -1.36, -1.12, -0.88, -0.64, -0.4, -0.16,
   0.08,  0.32,  0.56,  0.8,  1.04,  1.28,  1.52,  1.76,  2.0,  2.24,  2.48,  2.8,
];

export default function FlippableCard() {
  const { profile, isGenerating } = useProfile();
  const { config } = useCountry();
  const { t } = useLang();

  // Continuous unclamped rotational angle in degrees (0, 180, 360, etc.)
  const rotY = useSharedValue(0);
  const startRotY = useSharedValue(0);

  const rotX = useSharedValue(0);
  const startRotX = useSharedValue(0);

  const isDragging = useSharedValue(false);

  const hoverTiltX = useSharedValue(0);
  const hoverTiltY = useSharedValue(0);

  // Trigger light haptic feedback
  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch {}
    }
  }, []);

  // Sensor tracking for mobile devices
  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;
    Accelerometer.isAvailableAsync().then(available => {
      if (!available) return;
      Accelerometer.setUpdateInterval(32);
      sub = Accelerometer.addListener(({ x, y }) => {
        if (isDragging.value) return;
        hoverTiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 20, stiffness: 120 });
        hoverTiltY.value = withSpring(Math.max(-1, Math.min(1, y - 0.5)), { damping: 20, stiffness: 120 });
      });
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (isDragging.value || e.gamma === null || e.beta === null) return;
        const x = Math.max(-1, Math.min(1, e.gamma / 25));
        const y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
        hoverTiltX.value = withSpring(x, { damping: 22, stiffness: 160 });
        hoverTiltY.value = withSpring(y, { damping: 22, stiffness: 160 });
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        sub?.remove();
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }

    return () => { sub?.remove(); };
  }, [hoverTiltX, hoverTiltY, isDragging]);

  // Mouse hover tracking for desktop web
  const handlePointerMove = useCallback((e: any) => {
    if (Platform.OS !== 'web' || isDragging.value) return;
    const target = e.currentTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    hoverTiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 24, stiffness: 220 });
    hoverTiltY.value = withSpring(Math.max(-1, Math.min(1, y)), { damping: 24, stiffness: 220 });
  }, [hoverTiltX, hoverTiltY, isDragging]);

  const handlePointerLeave = useCallback(() => {
    if (Platform.OS !== 'web' || isDragging.value) return;
    hoverTiltX.value = withSpring(0, { damping: 20, stiffness: 180 });
    hoverTiltY.value = withSpring(0, { damping: 20, stiffness: 180 });
  }, [hoverTiltX, hoverTiltY, isDragging]);

  // Version history sheet
  const [showHistory, setShowHistory] = useState(false);
  const openHistory = useCallback(() => {
    if (isGenerating) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    setShowHistory(true);
  }, [isGenerating]);

  // Success toast
  const [showSuccess, setShowSuccess] = useState(false);
  const prevIsGenerating = useRef(false);
  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2500);
      return () => clearTimeout(timer);
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating]);

  // Generating overlay progress
  const genPulse = useSharedValue(0);
  const [genPercent, setGenPercent] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      setGenPercent(0);
      genPulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      let pct = 0;
      const tick = setInterval(() => {
        if (pct < 30) pct += Math.random() * 4 + 2;
        else if (pct < 70) pct += Math.random() * 2 + 0.8;
        else if (pct < 95) pct += Math.random() * 1.2 + 0.3;
        setGenPercent(Math.min(99, Math.round(pct)));
      }, 250);
      return () => clearInterval(tick);
    } else {
      genPulse.value = 0;
      setGenPercent(100);
    }
  }, [isGenerating, genPulse]);

  const progressBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(genPulse.value, [0, 1], [0.6, 1]),
  }));

  /* ── Interactive Gestures: Continuous 360° Pan + Tap to Flip + LongPress ── */
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startRotY.value = rotY.value;
      startRotX.value = rotX.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      // Dragging left rotates positive Y (front -> back), dragging right rotates negative Y
      const degPerPixel = 180 / (CARD_W * 0.75);
      rotY.value = startRotY.value - e.translationX * degPerPixel;
      // Vertical drag applies realistic 3D pitch
      rotX.value = Math.max(-25, Math.min(25, -e.translationY * 0.25));
    })
    .onEnd((e) => {
      'worklet';
      isDragging.value = false;
      // Calculate snap target to the nearest multiple of 180°
      let targetDeg = Math.round(rotY.value / 180) * 180;
      if (e.velocityX < -350) targetDeg = Math.floor((rotY.value - 45) / 180) * 180;
      if (e.velocityX > 350) targetDeg = Math.ceil((rotY.value + 45) / 180) * 180;

      rotY.value = withSpring(targetDeg, {
        damping: 24,
        stiffness: 220,
      });
      rotX.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
      });
      runOnJS(triggerHaptic)();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      const currentNearest = Math.round(rotY.value / 180);
      const nextTarget = (currentNearest + 1) * 180;
      rotY.value = withSpring(nextTarget, {
        damping: 24,
        stiffness: 220,
      });
      runOnJS(triggerHaptic)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(openHistory)();
    });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  // Unified single-matrix 3D transform for Continuous Rotations + Hover Tilt
  const card3DStyle = useAnimatedStyle(() => {
    'worklet';
    const hoverY = interpolate(hoverTiltX.value, [-1, 1], [-16, 16]);
    const hoverX = interpolate(hoverTiltY.value, [-1, 1], [14, -14]);

    const totalY = rotY.value + (isDragging.value ? 0 : hoverY);
    const totalX = rotX.value + (isDragging.value ? 0 : hoverX);

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${totalY}deg` },
        { rotateX: `${totalX}deg` },
      ],
    };
  });

  // Continuous normalized opacity for 360° rotations
  const frontOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    // Front face is visible in [0..90] and [270..360]
    const isFront = norm <= 90 || norm >= 270;
    return {
      opacity: isFront ? 1 : 0,
    };
  });

  const backOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    // Back face is visible in [90..270]
    const isBack = norm > 90 && norm < 270;
    return {
      opacity: isBack ? 1 : 0,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={styles.container}
        {...(Platform.OS === 'web' ? ({ onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } as any) : {})}
      >
        <Animated.View style={[styles.card3DContainer, card3DStyle]}>
          {/* ═══ Solid Pure White Chassis Core (24 Dense Micro-Slices, 100% exact R = 14px) ═══ */}
          {CHASSIS_SLICES.map((z, idx) => (
            <View
              key={idx}
              pointerEvents="none"
              style={[
                styles.chassisSlice,
                { transform: [{ translateZ: z }] as any },
              ]}
            />
          ))}

          {/* ═══ Front Face (Z = +3.0px, exact R = 14px) ═══ */}
          <Animated.View
            style={[
              styles.face,
              frontOpacityStyle,
              { transform: [{ translateZ: CARD_DEPTH / 2 }] as any, zIndex: 20 },
            ]}
          >
            <Image
              source={profile.cardFrontUri ? { uri: profile.cardFrontUri } : config.cardImages.front}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* ═══ Back Face (Z = -3.0px, pre-rotated 180°, exact R = 14px) ═══ */}
          <Animated.View
            style={[
              styles.face,
              { transform: [{ rotateY: '180deg' }, { translateZ: CARD_DEPTH / 2 }] as any, zIndex: 20 },
              backOpacityStyle,
            ]}
          >
            <Image source={config.cardImages.back} style={styles.cardImage} resizeMode="cover" />
          </Animated.View>
        </Animated.View>

        {/* Generating overlay — percentage progress */}
        {isGenerating && (
          <View pointerEvents="none" style={styles.genOverlay}>
            <View style={styles.genCenter}>
              <Text style={styles.genPercent}>{genPercent}%</Text>
              <Text style={styles.genLabel}>PROCESSING</Text>
              <View style={styles.genBarTrack}>
                <Animated.View style={[styles.genBarFill, { width: `${genPercent}%` }, progressBarStyle]} />
              </View>
            </View>
          </View>
        )}

        {/* Success toast */}
        {showSuccess && (
          <View pointerEvents="none" style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>{t('card.updated')}</Text>
          </View>
        )}

        <VersionHistorySheet visible={showHistory} onClose={() => setShowHistory(false)} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: 'transparent',
    userSelect: 'none',
    cursor: 'grab',
  } as any,
  card3DContainer: {
    width: '100%',
    height: '100%',
    borderRadius: CORNER_R,
    backgroundColor: 'transparent',
    transformStyle: 'preserve-3d',
  } as any,
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_R,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: '100%', borderRadius: CORNER_R },

  /* Solid Pure White Chassis Core with identical R = 14px curvature */
  chassisSlice: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_R,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 0.5,
    zIndex: 5,
  },

  genOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_R,
    overflow: 'hidden',
    backgroundColor: 'rgba(6,10,20,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  genCenter: {
    alignItems: 'center',
  },
  genPercent: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '200',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  genLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 4,
    marginTop: 4,
    marginBottom: 16,
  },
  genBarTrack: {
    width: CARD_W * 0.55,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  genBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 1.5,
  },
  successBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6,10,20,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 60,
  },
  successIcon: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
  },
  successText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
