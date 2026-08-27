/**
 * FlippableCard — High-Performance Single-Matrix 3D Card Engine.
 * Features:
 *   1. Tap / Click to flip 180°
 *   2. Drag / Swipe horizontally in real time to flip with physical inertia
 *   3. Real 3D Physical Card Thickness (0.76mm Polycarbonate / PVC multi-ply core visible at all angles)
 *   4. Long Press to open Version History
 *   5. Smooth 3D mouse hover & gyroscope tilt
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

export default function FlippableCard() {
  const { profile, isGenerating } = useProfile();
  const { config } = useCountry();
  const { t } = useLang();

  const flipProgress = useSharedValue(0);
  const startFlip = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

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
        tiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 18, stiffness: 100 });
        tiltY.value = withSpring(Math.max(-1, Math.min(1, y - 0.5)), { damping: 18, stiffness: 100 });
      });
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (isDragging.value || e.gamma === null || e.beta === null) return;
        const x = Math.max(-1, Math.min(1, e.gamma / 25));
        const y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
        tiltX.value = withSpring(x, { damping: 20, stiffness: 150 });
        tiltY.value = withSpring(y, { damping: 20, stiffness: 150 });
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        sub?.remove();
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }

    return () => { sub?.remove(); };
  }, [tiltX, tiltY, isDragging]);

  // Mouse hover tracking for desktop web
  const handlePointerMove = useCallback((e: any) => {
    if (Platform.OS !== 'web' || isDragging.value) return;
    const target = e.currentTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 24, stiffness: 220 });
    tiltY.value = withSpring(Math.max(-1, Math.min(1, y)), { damping: 24, stiffness: 220 });
  }, [tiltX, tiltY, isDragging]);

  const handlePointerLeave = useCallback(() => {
    if (Platform.OS !== 'web' || isDragging.value) return;
    tiltX.value = withSpring(0, { damping: 20, stiffness: 180 });
    tiltY.value = withSpring(0, { damping: 20, stiffness: 180 });
  }, [tiltX, tiltY, isDragging]);

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

  /* ── Interactive Gestures: Pan to Drag Flip + Tap to Flip + LongPress ── */
  const panGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => {
      'worklet';
      startFlip.value = flipProgress.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      const dragFactor = startFlip.value < 0.5 ? -1 : 1;
      const delta = (e.translationX / (CARD_W * 0.75)) * dragFactor;
      const raw = startFlip.value + delta;
      flipProgress.value = Math.max(0, Math.min(1, raw));
    })
    .onEnd((e) => {
      'worklet';
      isDragging.value = false;
      let target = flipProgress.value > 0.5 ? 1 : 0;
      if (e.velocityX < -350) target = 1;
      if (e.velocityX > 350) target = 0;

      flipProgress.value = withSpring(target, {
        damping: 22,
        stiffness: 260,
        overshootClamping: true,
      });
      runOnJS(triggerHaptic)();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      const target = flipProgress.value > 0.5 ? 0 : 1;
      flipProgress.value = withSpring(target, {
        damping: 22,
        stiffness: 260,
        overshootClamping: true,
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

  // Unified single-matrix 3D transform for Tilt + Drag Flip
  const card3DStyle = useAnimatedStyle(() => {
    'worklet';
    const flipRot = interpolate(flipProgress.value, [0, 1], [0, 180]);
    const tiltYDeg = interpolate(tiltX.value, [-1, 1], [-18, 18]);
    const tiltXDeg = interpolate(tiltY.value, [-1, 1], [15, -15]);

    const effectiveTiltY = flipProgress.value > 0.5 ? -tiltYDeg : tiltYDeg;
    const effectiveTiltX = flipProgress.value > 0.5 ? -tiltXDeg : tiltXDeg;

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${flipRot + effectiveTiltY}deg` },
        { rotateX: `${effectiveTiltX}deg` },
      ],
    };
  });

  // Physical 0.76mm Card Thickness: dynamically expands up to 7px when viewed edge-on (at 90°)
  const edgeThicknessStyle = useAnimatedStyle(() => {
    'worklet';
    const flipRot = interpolate(flipProgress.value, [0, 1], [0, 180]);
    const sinFactor = Math.sin((flipRot * Math.PI) / 180);
    const visibleWidth = Math.max(0.5, Math.abs(sinFactor) * 7);
    const isEdgeOn = Math.abs(sinFactor) > 0.08;

    return {
      opacity: isEdgeOn ? 1 : 0,
      width: visibleWidth,
      transform: [
        { translateX: -visibleWidth / 2 },
      ],
    };
  });

  const frontOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(flipProgress.value, [0, 0.48, 0.52, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
    };
  });

  const backOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(flipProgress.value, [0, 0.48, 0.52, 1], [0, 0, 1, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={styles.container}
        {...(Platform.OS === 'web' ? ({ onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } as any) : {})}
      >
        <Animated.View style={[styles.card3DContainer, card3DStyle]}>
          {/* Physical 3D Core Layer 1 (Back Layer, Z = -2.5px) */}
          <View style={[styles.face, styles.coreLayer, { transform: [{ translateZ: -2.5 }] as any }]} />

          {/* Physical 3D Core Layer 2 (Mid Polycarbonate Layer, Z = 0px) */}
          <View style={[styles.face, styles.coreLayer, { backgroundColor: '#F1F5F9', transform: [{ translateZ: 0 }] as any }]} />

          {/* Physical 3D Core Layer 3 (Front Layer, Z = +2.5px) */}
          <View style={[styles.face, styles.coreLayer, { transform: [{ translateZ: 2.5 }] as any }]} />

          {/* Physical 0.76mm Plastic Edge Slab (Visible during 3D rotation and 90° Edge-on view) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.edgeSlab,
              edgeThicknessStyle,
            ]}
          >
            {/* Multi-ply PVC sandwich laminates inside the edge */}
            <View style={{ flex: 1, backgroundColor: '#E2E8F0', borderWidth: 0.5, borderColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: '30%', width: '40%', backgroundColor: '#94A3B8' }} />
            </View>
          </Animated.View>

          {/* Front face (Z = +3px) */}
          <Animated.View style={[styles.face, frontOpacityStyle, { transform: [{ translateZ: 3 }] as any }]}>
            <Image
              source={profile.cardFrontUri ? { uri: profile.cardFrontUri } : config.cardImages.front}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Back face (Z = -3px, pre-rotated 180°) */}
          <Animated.View style={[styles.face, { transform: [{ rotateY: '180deg' }, { translateZ: 3 }] as any }, backOpacityStyle]}>
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
    borderRadius: 14,
    backgroundColor: 'transparent',
    transformStyle: 'preserve-3d',
  } as any,
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  coreLayer: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  edgeSlab: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    borderRadius: 2,
    overflow: 'hidden',
    zIndex: 15,
  },
  cardImage: { width: '100%', height: '100%', borderRadius: 14 },

  genOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
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
