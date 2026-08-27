import React, { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { type ColorPalette } from '../constants/colors';
import { useBiometric } from '../context/BiometricContext';
import { useCountry } from '../context/CountryContext';
import { useLang } from '../i18n/LanguageContext';
import BackgroundAtmosphere from './BackgroundAtmosphere';

export default function LockScreen() {
  const { authenticate, biometricLabel } = useBiometric();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: Colors } = useTheme();
  const { config } = useCountry();
  const { t } = useLang();
  const [error, setError] = useState(false);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const handleAuthenticate = async () => {
    setError(false);
    const success = await authenticate();
    if (!success) {
      setError(true);
    }
  };

  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    if (biometricLabel.includes('Face')) return 'scan-outline';
    if (biometricLabel.includes('Touch') || biometricLabel.includes('Fingerprint')) return 'finger-print-outline';
    if (biometricLabel.includes('Windows')) return 'shield-checkmark-outline';
    return 'finger-print-outline';
  };

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
      <BackgroundAtmosphere tintCenter={0.5} />
      <View style={styles.content}>
        <Image
          source={config.emblemAsset}
          style={
            config.emblemTinted !== false
              ? { width: 52, height: 52, tintColor: Colors.goldLight, opacity: 0.7 }
              : { width: 52, height: 52, opacity: 0.7 }
          }
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('lock.title')}</Text>
        <Text style={styles.sub}>{config.issuer.primary}</Text>

        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={28} color={Colors.goldLight} />
        </View>

        <Text style={styles.message}>{t('lock.message')}</Text>

        <View style={styles.authBadge}>
          <Ionicons name="shield-checkmark" size={13} color={Colors.goldLight} />
          <Text style={styles.authBadgeText}>{biometricLabel} Protected Vault</Text>
        </View>

        <Pressable style={styles.btn} onPress={handleAuthenticate}>
          <Ionicons name={getBiometricIcon()} size={20} color={Colors.navy} />
          <Text style={styles.btnText}>Unlock with {biometricLabel}</Text>
        </Pressable>

        {error && (
          <Text style={styles.errorText}>Authentication failed. Try again.</Text>
        )}
      </View>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
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
      marginTop: 24,
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
      marginTop: 4,
    },
    authBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(212, 175, 55, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.2)',
      marginTop: 4,
      marginBottom: 6,
    },
    authBadgeText: {
      color: Colors.goldLight,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: Colors.goldLight,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 8,
      shadowColor: Colors.goldLight,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    btnText: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.navy,
      letterSpacing: 0.2,
    },
    errorText: {
      fontSize: 12,
      color: '#EF4444',
      marginTop: 8,
    },
  });
