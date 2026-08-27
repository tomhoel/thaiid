/**
 * FlippableCard — High-Performance Single-Matrix 3D Card Engine.
 * Combines 3D mouse/gyroscope perspective tilt + 180° flip into a unified GPU transform.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Image, Pressable, Dimensions, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
  Extrapolation,
} from 'react-native-reanimated';
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
  const flipTarget = useRef(0);

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  // Sensor tracking for mobile devices
  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;
    Accelerometer.isAvailableAsync().then(available => {
      if (!available) return;
      Accelerometer.setUpdateInterval(32);
      sub = Accelerometer.addListener(({ x, y }) => {
        tiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 18, stiffness: 100 });
        tiltY.value = withSpring(Math.max(-1, Math.min(1, y - 0.5)), { damping: 18, stiffness: 100 });
      });
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.gamma === null || e.beta === null) return;
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
  }, [tiltX, tiltY]);

  // Mouse hover tracking for desktop web
  const handlePointerMove = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    const target = e.currentTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tiltX.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 24, stiffness: 220 });
    tiltY.value = withSpring(Math.max(-1, Math.min(1, y)), { damping: 24, stiffness: 220 });
  }, [tiltX, tiltY]);

  const handlePointerLeave = useCallback(() => {
    if (Platform.OS !== 'web') return;
    tiltX.value = withSpring(0, { damping: 20, stiffness: 180 });
    tiltY.value = withSpring(0, { damping: 20, stiffness: 180 });
  }, [tiltX, tiltY]);

  // Version history sheet
  const [showHistory, setShowHistory] = useState(false);
  const handleLongPress = useCallback(() => {
    if (isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

  const handleFlip = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch {}
    }
    flipTarget.current = flipTarget.current === 0 ? 1 : 0;
    flipProgress.value = withTiming(flipTarget.current, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [flipProgress]);

  // Unified single-matrix 3D transform for Tilt + Flip
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
    <Pressable
      onPress={handleFlip}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={styles.container}
      {...(Platform.OS === 'web' ? ({ onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } as any) : {})}
    >
      <Animated.View style={[styles.card3DContainer, card3DStyle]}>
        {/* Front face */}
        <Animated.View style={[styles.face, frontOpacityStyle]}>
          <Image
            source={profile.cardFrontUri ? { uri: profile.cardFrontUri } : config.cardImages.front}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Back face — pre-rotated 180° so it reads correctly when flipped */}
        <Animated.View style={[styles.face, { transform: [{ rotateY: '180deg' }] }, backOpacityStyle]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', width: CARD_W, height: CARD_H, backgroundColor: 'transparent' },
  card3DContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
