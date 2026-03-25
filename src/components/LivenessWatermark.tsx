import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');
const WATERMARK_SIZE = SW * 0.60;
const garudaAsset = require('../../assets/garuda.png');

/**
 * Slowly rotating Garuda watermark — identity tab only.
 * Rendered behind all content via StyleSheet.absoluteFill + pointerEvents="none".
 */
const LivenessWatermark = React.memo(function LivenessWatermark({ showEmblem = true }: { showEmblem?: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 50000, easing: Easing.linear }),
      -1, false,
    );
  }, []);

  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!showEmblem) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{
        position: 'absolute',
        top:  (SH - WATERMARK_SIZE) * 0.4,
        left: (SW - WATERMARK_SIZE) / 2,
      }, emblemStyle]}>
        <Image
          source={garudaAsset}
          style={{ width: WATERMARK_SIZE, height: WATERMARK_SIZE, tintColor: '#D4AF37', opacity: 0.10 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
});

export default LivenessWatermark;
