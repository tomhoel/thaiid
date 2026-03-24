import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAVY = '#0C1526';
const GOLD = '#D4AF37';

export default function AppSplash() {
  const { top, bottom } = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.6)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(bar, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: pulse }}>
          <Image
            source={require('../../assets/garuda.png')}
            style={styles.emblem}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.title}>KINGDOM OF THAILAND</Text>
        <Text style={styles.titleTh}>ราชอาณาจักรไทย</Text>
        <Text style={styles.dept}>Department of Provincial Administration</Text>
        <Text style={styles.deptTh}>กรมการปกครอง</Text>
      </View>

      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>

      <Text style={styles.footer}>ระบบบัตรประจำตัวประชาชน</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  content: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  emblem: {
    width: 90,
    height: 90,
    tintColor: GOLD,
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 3,
  },
  titleTh: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginTop: 2,
  },
  dept: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 1.2,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  deptTh: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.28)',
    marginTop: 2,
  },
  barTrack: {
    width: 120,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 1,
    marginBottom: 40,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 1,
  },
  footer: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.20)',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
});
