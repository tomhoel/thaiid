/**
 * FlippableCard — Single-container flip for max performance.
 * All animations on UI thread via react-native-reanimated.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Image, Pressable, Dimensions, Text, type ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  withRepeat,
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
import { useLang } from '../i18n/LanguageContext';
import VersionHistorySheet from './VersionHistorySheet';

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
  color, colorIndex, combined, size, emblemSource,
}: {
  color: string; colorIndex: number; combined: SharedValue<number>; size: number; emblemSource: ImageSourcePropType;
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
  tiltX: SharedValue<number>; tiltY: SharedValue<number>; index: number; emblemSource: ImageSourcePropType;
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
function HoloOverlay({ tiltX, tiltY, emblemSource }: { tiltX: SharedValue<number>; tiltY: SharedValue<number>; emblemSource: ImageSourcePropType }) {
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
  const { t } = useLang();

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

  /* ── Version history sheet ── */
  const [showHistory, setShowHistory] = useState(false);
  const handleLongPress = useCallback(() => {
    if (isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowHistory(true);
  }, [isGenerating]);

  /* ── Success toast ── */
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

  /* ── Generating overlay — percentage progress ── */
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
      // Simulate progress: fast start, slow middle, fast finish
      let pct = 0;
      const tick = setInterval(() => {
        if (pct < 30) pct += Math.random() * 4 + 2;
        else if (pct < 70) pct += Math.random() * 1.5 + 0.3;
        else if (pct < 90) pct += Math.random() * 0.8 + 0.2;
        else pct += Math.random() * 0.3 + 0.05;
        pct = Math.min(pct, 95);
        setGenPercent(Math.floor(pct));
      }, 200);
      return () => clearInterval(tick);
    } else {
      if (genPercent > 0) {
        setGenPercent(100);
        const done = setTimeout(() => setGenPercent(0), 300);
        return () => clearTimeout(done);
      }
      genPulse.value = 0;
    }
  }, [isGenerating]);

  const progressBarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(genPulse.value, [0, 1], [0.7, 1]),
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
    <Pressable onPress={handleFlip} onLongPress={handleLongPress} delayLongPress={500} style={styles.container}>
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
            {/* Holographic surface sheen — front face only */}
            <HoloSurface tiltX={tiltX} tiltY={tiltY} />
            {/* Edge highlights — physical card thickness illusion */}
            <EdgeHighlights tiltX={tiltX} tiltY={tiltY} />
          </Animated.View>

          {/* Back face — pre-rotated 180° so it reads correctly when flipped */}
          <Animated.View style={[styles.face, { transform: [{ rotateY: '180deg' }] }, backOpacityStyle]}>
            <Image source={config.cardImages.back} style={styles.cardImage} resizeMode="cover" />
          </Animated.View>

          {/* Holo border */}
          <HoloBorder />

          {/* Entrance shimmer */}
          <EntranceShimmer />
        </Animated.View>

        {/* Generating overlay — percentage progress */}
        {isGenerating && (
          <View pointerEvents="none" style={styles.genOverlay}>
            <View style={styles.genCenter}>
              <Text style={styles.genPercent}>{genPercent}%</Text>
              <Text style={styles.genLabel}>PROCESSING</Text>
              {/* Progress bar */}
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
      </Animated.View>

      <VersionHistorySheet visible={showHistory} onClose={() => setShowHistory(false)} />
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

  genOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: 'rgba(6,10,20,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  genCenter: {
    alignItems: 'center',
  },
  genPercent: {
    color: '#fff',
    fontSize: 38, fontWeight: '200',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  genLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10, fontWeight: '600',
    letterSpacing: 4, marginTop: 4, marginBottom: 16,
  },
  genBarTrack: {
    width: CARD_W * 0.55, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  genBarFill: {
    height: '100%', borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
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
