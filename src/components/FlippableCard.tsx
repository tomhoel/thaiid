/**
 * FlippableCard — Tap to flip between front/back card images.
 * Uses React Native Animated with spring physics for a satisfying flip.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useProfile } from '../context/ProfileContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;
const CARD_H = CARD_W * 0.63;

export default function FlippableCard() {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const { profile } = useProfile();

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
      {/* Shadow layer */}
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
  faceBack: {
    // back face sits behind front, flipped in
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
});
