import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useCountry } from '../context/CountryContext';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');
const WATERMARK_SIZE = Math.min(SW * 0.72, 270);

/**
 * LivenessWatermark — Slowly rotating National Emblem background watermark.
 * Rendered behind all content via StyleSheet.absoluteFill + pointerEvents="none".
 */
const LivenessWatermark = React.memo(function LivenessWatermark({
  showEmblem = true,
}: {
  showEmblem?: boolean;
}) {
  const { config } = useCountry();
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 42000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!showEmblem) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.centerWrap, emblemStyle]}>
        <Image
          source={config.emblemAsset}
          style={[
            styles.emblemImage,
            config.emblemTinted !== false ? { tintColor: colors.goldLight } : undefined,
          ]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'web' ? 140 : 130,
    zIndex: 0,
  },
  centerWrap: {
    width: WATERMARK_SIZE,
    height: WATERMARK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: WATERMARK_SIZE,
    height: WATERMARK_SIZE,
    opacity: 0.14,
  },
});

export default LivenessWatermark;
