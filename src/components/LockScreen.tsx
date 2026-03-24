import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GarudaEmblem from './GarudaEmblem';
import { useTheme } from '../context/ThemeContext';
import { type ColorPalette } from '../constants/colors';
import { useBiometric } from '../context/BiometricContext';

export default function LockScreen() {
  const { authenticate } = useBiometric();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
      <View style={styles.content}>
        <GarudaEmblem size={52} opacity={0.7} />
        <Text style={styles.title}>Thai National ID</Text>
        <Text style={styles.sub}>กรมการปกครอง</Text>

        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={28} color={Colors.goldLight} />
        </View>

        <Text style={styles.message}>Authentication required{'\n'}to access your ID card</Text>

        <Pressable style={styles.btn} onPress={authenticate}>
          <Ionicons name="finger-print-outline" size={20} color={Colors.navy} />
          <Text style={styles.btnText}>Authenticate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.t1,
    letterSpacing: -0.3,
    marginTop: 6,
  },
  sub: {
    fontSize: 11,
    color: Colors.t4,
  },
  lockIcon: {
    marginTop: 32,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.goldBg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 13,
    color: Colors.t3,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 24,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
});
