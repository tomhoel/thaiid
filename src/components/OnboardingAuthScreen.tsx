import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCountry } from '../context/CountryContext';
import { useSnackbar } from '../context/SnackbarContext';
import BackgroundAtmosphere from './BackgroundAtmosphere';

export default function OnboardingAuthScreen() {
  const { loading, signInWithGoogle, completeOnboarding } = useAuth();
  const { colors } = useTheme();
  const { config } = useCountry();
  const { top, bottom } = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();

  const NAVY = colors.navy;
  const GOLD = colors.goldLight;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      snackbar.show(err?.message || 'Google sign-in failed', 'error');
    }
  };

  const handleGuestContinue = async () => {
    try {
      await completeOnboarding();
    } catch (err: any) {
      snackbar.show(err?.message || 'Failed to enter demo mode', 'error');
    }
  };

  const isDesktop = Platform.OS === 'web' && width > 500;

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom, backgroundColor: NAVY }]}>
      <BackgroundAtmosphere tintCenter={0.5} />

      <View style={[styles.content, isDesktop && { maxWidth: 420, width: '100%' }]}>
        {/* ── Official Emblem ── */}
        <Image
          source={config.emblemAsset}
          style={
            config.emblemTinted !== false
              ? [styles.emblem, { tintColor: GOLD }]
              : styles.emblem
          }
          resizeMode="contain"
        />

        {/* ── Official Authority Titles ── */}
        <Text style={styles.title}>{config.name.english}</Text>
        <Text style={styles.titleTh}>{config.name.primary}</Text>
        <Text style={styles.dept}>{config.issuer.english}</Text>
        <Text style={styles.deptTh}>{config.issuer.primary}</Text>

        {/* ── Subtle Divider ── */}
        <View style={styles.divider} />

        {/* ── Auth Actions ── */}
        <View style={styles.actionsBox}>
          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0C1526" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#0C1526" style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.guestBtn,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleGuestContinue}
            disabled={loading}
          >
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255, 255, 255, 0.45)" />
          </Pressable>
        </View>
      </View>

      {/* ── Official Footer ── */}
      <Text style={styles.footer}>{config.splashFooter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0C1526',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblem: {
    width: 90,
    height: 90,
    tintColor: '#D4AF37',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 3,
    textAlign: 'center',
  },
  titleTh: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 1,
    marginTop: 2,
    textAlign: 'center',
  },
  dept: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.38)',
    letterSpacing: 1.2,
    marginTop: 18,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  deptTh: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.28)',
    marginTop: 2,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 1.5,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    marginVertical: 24,
    borderRadius: 1,
  },
  actionsBox: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    alignItems: 'center',
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleBtnText: {
    color: '#0C1526',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  guestBtnText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footer: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.20)',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
});
