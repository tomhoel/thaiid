/**
 * FlippableCard — Single-container flip for max performance.
 * All animations on UI thread via react-native-reanimated.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StyleSheet, View, Image, Pressable, Dimensions, ActivityIndicator, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../context/ProfileContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;
const CARD_H = CARD_W * 0.63;

/* ── 3 colors instead of 5 — halves the Image count ── */
const HOLO_COLORS = ['#50E8FF', '#FFD750', '#FF70C0'];

const EMBLEMS = [
  { top: '6%',  left: '5%',  size: 68 },
  { top: '6%',  left: '74%', size: 48 },
  { top: '50%', left: '60%', size: 60 },
  { top: '48%', left: '12%', size: 40 },
];

/* ── Color layer ── */
function ColorLayer({
  color, colorIndex, combined, size,
}: {
  color: string; colorIndex: number; combined: SharedValue<number>; size: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const center = -0.5 + colorIndex * 0.5;
    return {
      opacity: interpolate(combined.value, [center - 0.4, center, center + 0.4], [0, 1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, style]}>
      <Image
        source={require('../../assets/garuda.png')}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

/* ── Holographic emblem ── */
function HoloEmblem({
  top, left, size, tiltX, tiltY, index,
}: {
  top: string; left: string; size: number;
  tiltX: SharedValue<number>; tiltY: SharedValue<number>; index: number;
}) {
  const xW = index % 2 === 0 ? 1 : -1;
  const yW = index < 2 ? 1 : -1;

  const combined = useDerivedValue(() => {
    'worklet';
    return tiltX.value * xW * 0.6 + tiltY.value * yW * 0.4;
  });

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        combined.value,
        [-0.8, -0.2, 0, 0.2, 0.8],
        [0.15, 0.45, 0.2, 0.5, 0.15],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', top, left, width: size, height: size }, containerStyle]}>
      {HOLO_COLORS.map((color, ci) => (
        <ColorLayer key={ci} color={color} colorIndex={ci} combined={combined} size={size} />
      ))}
    </Animated.View>
  );
}

/* ── Holographic border ── */
function HoloBorder({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  const borderStyle = useAnimatedStyle(() => {
    'worklet';
    const combined = tiltX.value * 0.6 + tiltY.value * 0.4;
    const mag = tiltX.value * tiltX.value + tiltY.value * tiltY.value;
    return {
      borderColor: interpolateColor(
        combined,
        [-1, -0.33, 0.33, 1],
        ['#50E8FF', '#FFD750', '#FF70C0', '#50E8FF'],
      ),
      opacity: interpolate(mag, [0, 0.15, 0.6], [0.45, 0.72, 0.95], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius: 14, borderWidth: 2 }, borderStyle]}
    />
  );
}

/* ── Holo overlay (only rendered once — shared by both faces via parent rotation) ── */
function HoloOverlay({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: 14, overflow: 'hidden' }]}>
      {EMBLEMS.map((e, i) => (
        <HoloEmblem key={i} top={e.top} left={e.left} size={e.size} tiltX={tiltX} tiltY={tiltY} index={i} />
      ))}
    </View>
  );
}

/* ── Security chip glint — diagonal sweep every ~4.5 s ── */
function ChipGlint() {
  const glintX = useSharedValue(-30);

  useEffect(() => {
    glintX.value = withRepeat(
      withSequence(
        withDelay(4500, withTiming(52, { duration: 380, easing: Easing.inOut(Easing.quad) })),
        withTiming(-30, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glintX.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.chipArea}>
      <View style={styles.chipBody}>
        <Animated.View style={[styles.chipSweep, sweepStyle]} />
      </View>
    </View>
  );
}

/* ── Main component ── */
export default function FlippableCard() {
  const { profile, isGenerating } = useProfile();

  const isFocused = useIsFocused();
  const flipProgress = useSharedValue(0);
  const flipTarget = useRef(0);

  const rawTiltX = useSharedValue(0);
  const rawTiltY = useSharedValue(0);

  const tiltX = useDerivedValue(() => {
    'worklet';
    return withSpring(rawTiltX.value, { damping: 14, stiffness: 120, mass: 0.5 });
  });
  const tiltY = useDerivedValue(() => {
    'worklet';
    return withSpring(rawTiltY.value, { damping: 14, stiffness: 120, mass: 0.5 });
  });

  useEffect(() => {
    if (!isFocused) return;
    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;
    Accelerometer.isAvailableAsync().then(available => {
      if (!available) return;
      Accelerometer.setUpdateInterval(32);
      sub = Accelerometer.addListener(({ x, y }) => {
        rawTiltX.value = Math.max(-1, Math.min(1, x));
        rawTiltY.value = Math.max(-1, Math.min(1, y - 0.5));
      });
    });
    return () => { sub?.remove(); };
  }, [isFocused]);

  /* ── Success toast ── */
  const [showSuccess, setShowSuccess] = useState(false);
  const prevIsGenerating = useRef(false);
  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating) {
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 2500);
      return () => clearTimeout(t);
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating]);

  /* ── Generating shimmer sweep ── */
  const genProgress = useSharedValue(0);
  useEffect(() => {
    if (isGenerating) {
      genProgress.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      genProgress.value = 0;
    }
  }, [isGenerating]);

  const genShimmerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: interpolate(genProgress.value, [0, 1], [-CARD_W, CARD_W * 1.5]) }],
    };
  });

  /* ── Flip — clean timing, zero overshoot ── */
  const handleFlip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flipTarget.current = flipTarget.current === 0 ? 1 : 0;
    flipProgress.value = withTiming(flipTarget.current, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  /* ── 3D tilt + directional shadow ── */
  const bodyStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(tiltX.value, [-1, 1], [-5, 5])}deg` },
        { rotateX: `${interpolate(tiltY.value, [-1, 1], [5, -5])}deg` },
      ],
    };
  });

  /*
   * Single-container flip: ONE rotateY 0→180 on the parent.
   * Front image faces forward, back image is pre-rotated 180°.
   * No per-face animated styles needed for the flip itself.
   */
  const flipStyle = useAnimatedStyle(() => {
    'worklet';
    const rot = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rot}deg` }],
    };
  });

  const frontOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: interpolate(flipProgress.value, [0, 0.45, 0.55, 1], [1, 1, 0, 0], Extrapolation.CLAMP) };
  });

  const backOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: interpolate(flipProgress.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolation.CLAMP) };
  });

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      <Animated.View style={[styles.shadowWrap, bodyStyle]}>
        {/* Single rotating container — one transform for the flip */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { borderRadius: 14, backgroundColor: '#0C1526' }, flipStyle]}>
          {/* Front face */}
          <Animated.View style={[styles.face, frontOpacityStyle]}>
            <Image
              source={profile.cardFrontUri ? { uri: profile.cardFrontUri } : require('../../pics/1.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {/* Security chip glint — front face only */}
            <ChipGlint />
          </Animated.View>

          {/* Back face — pre-rotated 180° so it reads correctly when flipped */}
          <Animated.View style={[styles.face, { transform: [{ rotateY: '180deg' }] }, backOpacityStyle]}>
            <Image source={require('../../pics/2.png')} style={styles.cardImage} resizeMode="cover" />
          </Animated.View>

          {/* Holo overlay — single instance, rotates with the card */}
          <HoloOverlay tiltX={tiltX} tiltY={tiltY} />

          {/* Holo border — outside HoloOverlay to avoid double overflow:hidden clipping at corners */}
          <HoloBorder tiltX={tiltX} tiltY={tiltY} />
        </Animated.View>

        {/* Generating overlay — sits outside flip so it never rotates */}
        {isGenerating && (
          <View pointerEvents="none" style={styles.genOverlay}>
            <Animated.View style={[styles.genShimmer, genShimmerStyle]} />
            <ActivityIndicator color="#D4AF37" size="small" />
            <Text style={styles.genText}>GENERATING</Text>
          </View>
        )}

        {/* Success toast */}
        {showSuccess && (
          <View pointerEvents="none" style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>ID Card Updated</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', width: CARD_W, height: CARD_H, backgroundColor: 'transparent' },
  shadowWrap: {
    flex: 1, borderRadius: 14,
    backgroundColor: 'transparent',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14, overflow: 'hidden',
  },
  cardImage: { width: '100%', height: '100%', borderRadius: 14 },

  /* Security chip — position matches chip on card template (14% left, 38% top) */
  chipArea: { position: 'absolute', top: '38%', left: '14%' },
  chipBody: {
    width: 50, height: 38, borderRadius: 4, overflow: 'hidden',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.30)',
  },
  chipSweep: {
    position: 'absolute', top: -10, width: 20, height: 56,
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ rotate: '-18deg' }],
  },

  genOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  genShimmer: {
    position: 'absolute',
    top: -20, bottom: -20, width: 80,
    backgroundColor: 'rgba(212,175,55,0.28)',
    transform: [{ rotate: '12deg' }],
  },
  genText: {
    color: '#D4AF37',
    fontSize: 10, fontWeight: '800',
    letterSpacing: 2.5, textTransform: 'uppercase',
  },

  successBadge: {
    position: 'absolute',
    bottom: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.92)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  successIcon: { color: '#fff', fontSize: 13, fontWeight: '800' },
  successText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
