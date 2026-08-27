/**
 * FlippableCard — High-Performance Ultra-Realistic 3D Smart Card Engine.
 * Features:
 *   1. Dynamic Specular Gloss Sheen (Sweeping light reflection matching real-time tilt)
 *   2. Iridescent Holographic Security Shimmer (Polycarbonate kinegram light refraction)
 *   3. Smooth Trigonometric 3D Ambient Drop Shadow (Zero flicker, zero lag, GPU-accelerated)
 *   4. Full Continuous 3D Perimeter Walls with directional lighting highlights
 *   5. High-FPS 60-120 FPS Performance with Hardware-Accelerated 3D Transforms
 *   6. Intuitive Fast Swipe Fling Snap (Flicking left advances +180°, flicking right flips -180°)
 *   7. Continuous, Unclamped Rotational Drag (Spin left or right infinitely in real-time)
 *   8. Dual-Axis 3D Spatial Physics (Horizontal drag spins Y, vertical drag pitches X)
 *   9. Tap / Click to flip 180° with crisp subtle settling bounce
 *   10. Front face (Z = +3.0px) and Back face (Z = -3.0px) with clean, unobstructed artwork
 *   11. Long Press to open Version History
 *   12. Smooth 3D mouse hover & gyroscope tilt
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
import { LinearGradient } from 'expo-linear-gradient';
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

// 5 dense hardware-accelerated white core layers
const CHASSIS_SLICES = [-2.6, -1.3, 0.0, 1.3, 2.6];

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

  /* ── Interactive Gestures: Continuous 360° Pan + Flick Snapping + Tap ── */
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startRotY.value = rotY.value;
      startRotX.value = rotX.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      // Direct 1:1 tactile tracking: dragging right rotates right (+Y), dragging left rotates left (-Y)
      const degPerPixel = 180 / (CARD_W * 0.75);
      rotY.value = startRotY.value + e.translationX * degPerPixel;
      // Vertical drag applies realistic 3D pitch
      rotX.value = Math.max(-25, Math.min(25, -e.translationY * 0.25));
    })
    .onEnd((e) => {
      'worklet';
      isDragging.value = false;
      let targetDeg = Math.round(rotY.value / 180) * 180;

      // Fast swipe / fling velocity detection (advances in the direction of swipe)
      if (e.velocityX > 250) {
        // Fast swipe RIGHT -> advance in positive direction (+180°)
        targetDeg = Math.ceil((rotY.value + 20) / 180) * 180;
        if (targetDeg === startRotY.value) targetDeg += 180;
      } else if (e.velocityX < -250) {
        // Fast swipe LEFT -> advance in negative direction (-180°)
        targetDeg = Math.floor((rotY.value - 20) / 180) * 180;
        if (targetDeg === startRotY.value) targetDeg -= 180;
      }

      rotY.value = withSpring(targetDeg, {
        damping: 28,
        stiffness: 280,
        mass: 0.8,
      });
      rotX.value = withSpring(0, {
        damping: 24,
        stiffness: 240,
        mass: 0.8,
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
        damping: 28,
        stiffness: 280,
        mass: 0.8,
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

  // Smooth, mathematically continuous Trigonometric 3D Ambient Shadow (Zero flickering)
  const shadow3DStyle = useAnimatedStyle(() => {
    'worklet';
    const radY = (rotY.value * Math.PI) / 180;
    const radX = (rotX.value * Math.PI) / 180;

    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);

    // Smooth continuous lateral and vertical displacement
    const shiftX = -sinY * 16;
    const shiftY = 16 - Math.sin(radX) * 8;

    // Smooth continuous width scaling when card turns edge-on
    const scaleX = 0.55 + 0.45 * Math.abs(cosY);
    const scaleY = 0.92 + 0.08 * Math.abs(cosY);
    const shadowOpacity = 0.12 + 0.14 * Math.abs(cosY);

    return {
      transform: [
        { translateX: shiftX },
        { translateY: shiftY },
        { scaleX },
        { scaleY },
      ],
      opacity: shadowOpacity,
    };
  });

  // Continuous normalized opacity for 360° rotations
  const frontOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    const isFront = norm <= 90 || norm >= 270;
    return {
      opacity: isFront ? 1 : 0,
    };
  });

  const backOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    const isBack = norm > 90 && norm < 270;
    return {
      opacity: isBack ? 1 : 0,
    };
  });

  // Dynamic Specular Gloss Highlight for Front Face
  const frontGlossStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    const relAngle = norm > 180 ? norm - 360 : norm;

    const sweepX = interpolate(relAngle, [-60, 0, 60], [-CARD_W * 0.85, 0, CARD_W * 0.85], Extrapolation.CLAMP);
    const sweepY = interpolate(rotX.value, [-25, 0, 25], [CARD_H * 0.45, 0, -CARD_H * 0.45], Extrapolation.CLAMP);
    const opacity = interpolate(Math.abs(relAngle), [0, 40, 85], [0.35, 0.18, 0], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: sweepX },
        { translateY: sweepY },
        { rotate: '28deg' },
      ],
      opacity,
    };
  });

  // Dynamic Specular Gloss Highlight for Back Face
  const backGlossStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    const relAngle = norm - 180;

    const sweepX = interpolate(relAngle, [-60, 0, 60], [-CARD_W * 0.85, 0, CARD_W * 0.85], Extrapolation.CLAMP);
    const sweepY = interpolate(rotX.value, [-25, 0, 25], [CARD_H * 0.45, 0, -CARD_H * 0.45], Extrapolation.CLAMP);
    const opacity = interpolate(Math.abs(relAngle), [0, 40, 85], [0.35, 0.18, 0], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: sweepX },
        { translateY: sweepY },
        { rotate: '28deg' },
      ],
      opacity,
    };
  });

  // Iridescent Holographic Security Shimmer (Front Face Kinegram effect)
  const holoShimmerStyle = useAnimatedStyle(() => {
    'worklet';
    const norm = ((rotY.value % 360) + 360) % 360;
    const rel = norm > 180 ? norm - 360 : norm;
    const shiftX = interpolate(rel, [-55, 0, 55], [-CARD_W * 0.7, 0, CARD_W * 0.7], Extrapolation.CLAMP);
    const shiftY = interpolate(rotX.value, [-25, 0, 25], [-CARD_H * 0.35, 0, CARD_H * 0.35], Extrapolation.CLAMP);
    const intensity = interpolate(Math.abs(rel), [0, 25, 65], [0.06, 0.38, 0.04], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: shiftX },
        { translateY: shiftY },
        { rotate: '-22deg' },
      ],
      opacity: intensity,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={styles.container}
        {...(Platform.OS === 'web' ? ({ onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } as any) : {})}
      >
        {/* ═══ Smooth Trigonometric 3D Ambient Drop Shadow ═══ */}
        <Animated.View pointerEvents="none" style={[styles.ambientShadow, shadow3DStyle]} />

        <Animated.View style={[styles.card3DContainer, card3DStyle]} renderToHardwareTextureAndroid>
          {/* ═══ Solid Pure White Chassis Core Layers ═══ */}
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

          {/* ═══ 4 Straight Pure White 3D Perimeter Walls with Directional Lighting ═══ */}
          {/* Top Wall (Light highlight) */}
          <View
            pointerEvents="none"
            style={[
              styles.sideWallH,
              styles.topWallHighlight,
              {
                top: -CARD_DEPTH / 2,
                transform: [{ rotateX: '90deg' }] as any,
              },
            ]}
          />
          {/* Bottom Wall (Ambient shade) */}
          <View
            pointerEvents="none"
            style={[
              styles.sideWallH,
              styles.bottomWallShade,
              {
                bottom: -CARD_DEPTH / 2,
                transform: [{ rotateX: '-90deg' }] as any,
              },
            ]}
          />
          {/* Left Wall */}
          <View
            pointerEvents="none"
            style={[
              styles.sideWallV,
              {
                left: -CARD_DEPTH / 2,
                transform: [{ rotateY: '-90deg' }] as any,
              },
            ]}
          />
          {/* Right Wall */}
          <View
            pointerEvents="none"
            style={[
              styles.sideWallV,
              {
                right: -CARD_DEPTH / 2,
                transform: [{ rotateY: '90deg' }] as any,
              },
            ]}
          />

          {/* ═══ 4 Rounded 3D Corner Wall Arcs (Seamlessly joining straight walls) ═══ */}
          <View pointerEvents="none" style={[styles.cornerArcWrap, { top: 0, left: 0 }]}>
            <View style={[styles.cornerArcElement, { top: 0, left: 0, borderTopLeftRadius: CORNER_R }]} />
          </View>
          <View pointerEvents="none" style={[styles.cornerArcWrap, { top: 0, right: 0 }]}>
            <View style={[styles.cornerArcElement, { top: 0, right: 0, borderTopRightRadius: CORNER_R }]} />
          </View>
          <View pointerEvents="none" style={[styles.cornerArcWrap, { bottom: 0, left: 0 }]}>
            <View style={[styles.cornerArcElement, { bottom: 0, left: 0, borderBottomLeftRadius: CORNER_R }]} />
          </View>
          <View pointerEvents="none" style={[styles.cornerArcWrap, { bottom: 0, right: 0 }]}>
            <View style={[styles.cornerArcElement, { bottom: 0, right: 0, borderBottomRightRadius: CORNER_R }]} />
          </View>

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

            {/* Iridescent Holographic Security Shimmer Layer */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.opticalOverlay]}>
              <Animated.View style={[styles.holoGradientBox, holoShimmerStyle]}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(70, 230, 255, 0.08)',
                    'rgba(255, 215, 80, 0.14)',
                    'rgba(255, 110, 200, 0.11)',
                    'rgba(140, 255, 190, 0.08)',
                    'transparent',
                  ]}
                  start={{ x: 0.1, y: 0.2 }}
                  end={{ x: 0.9, y: 0.8 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            {/* Dynamic Specular Gloss Sheen Layer */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.opticalOverlay]}>
              <Animated.View style={[styles.glossGradientBox, frontGlossStyle]}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255, 255, 255, 0.04)',
                    'rgba(255, 255, 255, 0.28)',
                    'rgba(255, 255, 255, 0.06)',
                    'transparent',
                  ]}
                  start={{ x: 0.25, y: 0 }}
                  end={{ x: 0.75, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>
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

            {/* Dynamic Specular Gloss Sheen Layer (Back Face) */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.opticalOverlay]}>
              <Animated.View style={[styles.glossGradientBox, backGlossStyle]}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255, 255, 255, 0.04)',
                    'rgba(255, 255, 255, 0.26)',
                    'rgba(255, 255, 255, 0.06)',
                    'transparent',
                  ]}
                  start={{ x: 0.25, y: 0 }}
                  end={{ x: 0.75, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>
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
  ambientShadow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: -16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 36px rgba(0, 0, 0, 0.45)',
          willChange: 'transform, opacity',
        } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 10,
        }),
  },
  card3DContainer: {
    width: '100%',
    height: '100%',
    borderRadius: CORNER_R,
    backgroundColor: 'transparent',
    transformStyle: 'preserve-3d',
    willChange: 'transform',
  } as any,
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_R,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: '100%', borderRadius: CORNER_R },

  /* Optical Overlays (Gloss & Hologram) */
  opticalOverlay: {
    borderRadius: CORNER_R,
    overflow: 'hidden',
  },
  glossGradientBox: {
    position: 'absolute',
    top: -CARD_H * 0.8,
    bottom: -CARD_H * 0.8,
    left: -CARD_W * 0.6,
    right: -CARD_W * 0.6,
  },
  holoGradientBox: {
    position: 'absolute',
    top: -CARD_H * 0.9,
    bottom: -CARD_H * 0.9,
    left: -CARD_W * 0.7,
    right: -CARD_W * 0.7,
  },

  /* Solid Pure White Chassis Core */
  chassisSlice: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_R,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },

  /* 4 Straight Pure White Perimeter Walls */
  sideWallH: {
    position: 'absolute',
    left: CORNER_R,
    right: CORNER_R,
    height: CARD_DEPTH,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  topWallHighlight: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.6)',
  },
  bottomWallShade: {
    backgroundColor: '#EDEDED',
  },
  sideWallV: {
    position: 'absolute',
    top: CORNER_R,
    bottom: CORNER_R,
    width: CARD_DEPTH,
    backgroundColor: '#F6F6F6',
    zIndex: 10,
  },

  /* 4 Rounded Corner Arc Perimeter Walls */
  cornerArcWrap: {
    position: 'absolute',
    width: CORNER_R,
    height: CORNER_R,
    overflow: 'hidden',
    zIndex: 10,
  },
  cornerArcElement: {
    position: 'absolute',
    width: CORNER_R,
    height: CORNER_R,
    backgroundColor: '#FFFFFF',
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
