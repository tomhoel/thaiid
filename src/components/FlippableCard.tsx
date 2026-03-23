/**
 * FlippableCard — Tap to flip between front/back card images.
 * Holographic shimmer effect responds to device tilt (accelerometer).
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useProfile } from '../context/ProfileContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;
const CARD_H = CARD_W * 0.63;

// Holographic shimmer overlay
function HoloShimmer({ tiltX, tiltY }: { tiltX: Animated.Value; tiltY: Animated.Value }) {
  const translateX = tiltX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-CARD_W * 0.8, CARD_W * 0.8],
  });
  const translateY = tiltY.interpolate({
    inputRange: [-1, 1],
    outputRange: [-CARD_H * 0.8, CARD_H * 0.8],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { borderRadius: 14, overflow: 'hidden' },
      ]}
    >
      <Animated.View
        style={{
          width: CARD_W * 2,
          height: CARD_H * 2,
          position: 'absolute',
          top: -CARD_H * 0.5,
          left: -CARD_W * 0.5,
          transform: [{ translateX }, { translateY }],
        }}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,50,50,0.18)',
            'rgba(255,180,30,0.22)',
            'rgba(50,255,120,0.18)',
            'rgba(60,130,255,0.22)',
            'rgba(180,60,255,0.18)',
            'rgba(255,50,150,0.15)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function FlippableCard() {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const { profile } = useProfile();

  // Accelerometer-driven tilt values
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;

    Accelerometer.isAvailableAsync().then(available => {
      if (!available) return;
      Accelerometer.setUpdateInterval(80);
      sub = Accelerometer.addListener(({ x, y }) => {
        // Clamp and smooth — spring towards target
        Animated.spring(tiltX, {
          toValue: Math.max(-1, Math.min(1, x)),
          friction: 12, tension: 40, useNativeDriver: true,
        }).start();
        Animated.spring(tiltY, {
          toValue: Math.max(-1, Math.min(1, y - 0.5)), // offset for phone held upright
          friction: 12, tension: 40, useNativeDriver: true,
        }).start();
      });
    });

    return () => { sub?.remove(); };
  }, []);

  const handleFlip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  }, [isFlipped, flipAnim]);

  // Front face: 0° → 90° then hidden
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5],
    outputRange: [1, 1, 0],
  });

  // Back face: hidden until 90° → 0°
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0.5, 0.51, 1],
    outputRange: [0, 1, 1],
  });

  // Subtle scale punch on flip
  const scale = flipAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.96, 0.94, 0.96, 1],
  });

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      <View style={styles.shadowWrap}>
        {/* Front */}
        <Animated.View
          style={[
            styles.face,
            {
               transform: [
                 { perspective: 1200 },
                 { rotateY: frontInterpolate },
                 { scale },
               ],
               opacity: frontOpacity,
            },
          ]}
        >
          <Image
            source={profile.pictureUri ? { uri: profile.pictureUri } : require('../../pics/1.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <HoloShimmer tiltX={tiltX} tiltY={tiltY} />
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.face,
            styles.faceBack,
            {
              transform: [
                { perspective: 1200 },
                { rotateY: backInterpolate },
                { scale },
              ],
              opacity: backOpacity,
            },
          ]}
        >
          <Image
            source={require('../../pics/2.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <HoloShimmer tiltX={tiltX} tiltY={tiltY} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: CARD_W,
    height: CARD_H,
  },
  shadowWrap: {
    flex: 1,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    borderRadius: 14,
    overflow: 'hidden',
  },
  faceBack: {},
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
});
