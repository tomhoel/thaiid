import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const ENTER_DURATION = 220;
const EXIT_DURATION = 180;

export function Snackbar({ text }: { text: string | null }) {
  const visible = text !== null;
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = withTiming(80, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!text) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        { backgroundColor: colors.bgElevated, borderColor: colors.b1 },
        animatedStyle,
      ]}
    >
      <Text style={[styles.text, { color: colors.t1 }]}>{text ?? ''}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
