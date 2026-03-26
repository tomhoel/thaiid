/**
 * FlippableCard — Single-container flip for max performance.
 * All animations on UI thread via react-native-reanimated.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
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

  Easing,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../context/ProfileContext';
import { useCountry } from '../context/CountryContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;
const CARD_H = CARD_W * 0.63;
const CHIP_W = Math.round(CARD_W * 0.14);
const CHIP_H = Math.round(CARD_H * 0.22);

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
  color, colorIndex, combined, size, emblemSource,
}: {
  color: string; colorIndex: number; combined: SharedValue<number>; size: number; emblemSource: any;
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
        source={emblemSource}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

/* ── Holographic emblem ── */
function HoloEmblem({
  top, left, size, tiltX, tiltY, index, emblemSource,
}: {
  top: string; left: string; size: number;
  tiltX: SharedValue<number>; tiltY: SharedValue<number>; index: number; emblemSource: any;
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
        <ColorLayer key={ci} color={color} colorIndex={ci} combined={combined} size={size} emblemSource={emblemSource} />
      ))}
    </Animated.View>
  );
}


/* ── Card border — single clean hairline ── */
function HoloBorder() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
      }]}
    />
  );
}

/* ── Holo overlay (only rendered once — shared by both faces via parent rotation) ── */
function HoloOverlay({ tiltX, tiltY, emblemSource }: { tiltX: SharedValue<number>; tiltY: SharedValue<number>; emblemSource: any }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: 14, overflow: 'hidden' }]}>
      {EMBLEMS.map((e, i) => (
        <HoloEmblem key={i} top={e.top} left={e.left} size={e.size} tiltX={tiltX} tiltY={tiltY} index={i} emblemSource={emblemSource} />
      ))}
    </View>
  );
}


/* ── Holographic surface — iridescent sheen that sweeps with tilt ── */
function HoloSurface({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  const bandStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: tiltX.value * CARD_W * 0.55 },
        { translateY: tiltY.value * CARD_H * 0.30 },
      ],
    };
  });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: 14, overflow: 'hidden' }]}>
      <Animated.View style={[{
        position: 'absolute',
        top: -CARD_H * 0.6, bottom: -CARD_H * 0.6,
        left: -CARD_W * 0.3, right: -CARD_W * 0.3,
      }, bandStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(140,220,255,0.09)', 'rgba(255,255,255,0.11)', 'rgba(255,210,90,0.07)', 'rgba(255,130,190,0.05)', 'transparent']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

/* ── Holographic security strip — rainbow band that shifts on tilt ── */
function HoloStrip({ tiltX, tiltY, side, offset }: { tiltX: SharedValue<number>; tiltY: SharedValue<number>; side: 'left' | 'right'; offset: number }) {
  const bandStyle = useAnimatedStyle(() => {
    'worklet';
    const shift = (tiltX.value * 0.5 + tiltY.value * 0.5) * CARD_H * 0.7;
    return {
      transform: [{ translateY: shift }],
    };
  });

  const opacityStyle = useAnimatedStyle(() => {
    'worklet';
    const tiltFactor = side === 'right' ? -tiltX.value : tiltX.value;
    return {
      opacity: interpolate(tiltFactor, [-1, -0.2, 0, 0.3, 1], [0.12, 0.2, 0.35, 0.55, 0.4], Extrapolation.CLAMP),
    };
  });

  const posStyle = side === 'right'
    ? { right: CARD_W * offset, top: 8, bottom: 8 }
    : { left: CARD_W * offset, top: 8, bottom: 8 };

  return (
    <Animated.View pointerEvents="none" style={[{
      position: 'absolute', width: 22, borderRadius: 11, overflow: 'hidden', ...posStyle,
    }, opacityStyle]}>
      <Animated.View style={[{ position: 'absolute', top: -CARD_H, bottom: -CARD_H, left: 0, right: 0 }, bandStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,80,80,0.7)',
            'rgba(255,210,50,0.7)',
            'rgba(80,255,120,0.7)',
            'rgba(50,180,255,0.7)',
            'rgba(160,80,255,0.7)',
            'rgba(255,80,180,0.7)',
            'rgba(255,210,50,0.5)',
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Animated.View>
  );
}

/* ── Edge highlights — 1px lines simulate card edge catching light ── */
function EdgeHighlights({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  const topStyle    = useAnimatedStyle(() => { 'worklet'; return { opacity: interpolate(tiltY.value, [-1,0,1], [0.06,0.18,0.65], Extrapolation.CLAMP) }; });
  const bottomStyle = useAnimatedStyle(() => { 'worklet'; return { opacity: interpolate(tiltY.value, [-1,0,1], [0.60,0.14,0.05], Extrapolation.CLAMP) }; });
  const leftStyle   = useAnimatedStyle(() => { 'worklet'; return { opacity: interpolate(tiltX.value, [-1,0,1], [0.06,0.15,0.60], Extrapolation.CLAMP) }; });
  const rightStyle  = useAnimatedStyle(() => { 'worklet'; return { opacity: interpolate(tiltX.value, [-1,0,1], [0.55,0.12,0.05], Extrapolation.CLAMP) }; });
  const E = 'rgba(255,255,255,0.92)';
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position:'absolute', top:0,    left:14,   right:14,  height:1, backgroundColor:E }, topStyle]}    />
      <Animated.View pointerEvents="none" style={[{ position:'absolute', bottom:0, left:14,   right:14,  height:1, backgroundColor:E }, bottomStyle]} />
      <Animated.View pointerEvents="none" style={[{ position:'absolute', left:0,   top:14,    bottom:14, width:1,  backgroundColor:E }, leftStyle]}   />
      <Animated.View pointerEvents="none" style={[{ position:'absolute', right:0,  top:14,    bottom:14, width:1,  backgroundColor:E }, rightStyle]}  />
    </>
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

/* ── Entrance shimmer — single sweep on mount ── */
function EntranceShimmer() {
  const sweepX = useSharedValue(-CARD_W * 0.3);

  useEffect(() => {
    sweepX.value = withDelay(550, withTiming(CARD_W * 1.4, {
      duration: 650,
      easing: Easing.inOut(Easing.quad),
    }));
  }, []);

  const style = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: sweepX.value }, { rotate: '18deg' }],
      opacity: interpolate(
        sweepX.value,
        [-CARD_W * 0.3, CARD_W * 0.4, CARD_W * 1.4],
        [0, 0.45, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        top: -30, bottom: -30,
        width: 55,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 25,
      }, style]}
    />
  );
}

/* ── Main component ── */
export default function FlippableCard() {
  const { profile, isGenerating } = useProfile();
  const { config } = useCountry();

  const flipProgress = useSharedValue(0);
  const flipTarget = useRef(0);

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

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
    return () => { sub?.remove(); };
  }, []);

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

  /* ── 3D tilt ── */
  const bodyStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(tiltX.value, [-1, 1], [-8, 8])}deg` },
        { rotateX: `${interpolate(tiltY.value, [-1, 1], [8, -8])}deg` },
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
        <Animated.View style={[StyleSheet.absoluteFillObject, { borderRadius: 14, backgroundColor: 'transparent' }, flipStyle]}>
          {/* Front face */}
          <Animated.View style={[styles.face, frontOpacityStyle]}>
            <Image
              source={profile.cardFrontUri ? { uri: profile.cardFrontUri } : config.cardImages.front}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {/* Security chip glint — front face only */}
            {/* ChipGlint removed */}
          </Animated.View>

          {/* Back face — pre-rotated 180° so it reads correctly when flipped */}
          <Animated.View style={[styles.face, { transform: [{ rotateY: '180deg' }] }, backOpacityStyle]}>
            <Image source={config.cardImages.back} style={styles.cardImage} resizeMode="cover" />
          </Animated.View>

          {/* Holographic surface sheen */}
          <HoloSurface tiltX={tiltX} tiltY={tiltY} />

          {/* Holo overlay emblems */}
          {/* Holographic strip removed */}

          {/* Edge highlights — physical card thickness illusion */}
          <EdgeHighlights tiltX={tiltX} tiltY={tiltY} />

          {/* Holo border */}
          <HoloBorder />

          {/* Entrance shimmer */}
          <EntranceShimmer />
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
  chipArea: { position: 'absolute', top: '35.5%', left: '14.2%' },
  chipBody: {
    width: CHIP_W, height: CHIP_H, borderRadius: 4, overflow: 'hidden',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.30)',
  },
  chipSweep: {
    position: 'absolute', top: -10, width: 20, height: CHIP_H + 20,
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
