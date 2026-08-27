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
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCountry } from '../context/CountryContext';
import { useSnackbar } from '../context/SnackbarContext';
import BackgroundAtmosphere from './BackgroundAtmosphere';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={styles.googleIcon}>
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export default function OnboardingAuthScreen() {
  const { loading, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const { config } = useCountry();
  const { top, bottom } = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();

  const NAVY = colors.navy || '#0C1526';
  const GOLD = colors.goldLight || '#D4AF37';

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      snackbar.show(err?.message || 'Google sign-in failed', 'error');
    }
  };

  const isDesktop = Platform.OS === 'web' && width > 500;
  const safeTop = Math.max(top, 24);
  const safeBottom = Math.max(bottom, 20);

  return (
    <View style={[styles.screen, { paddingTop: safeTop, paddingBottom: safeBottom, backgroundColor: NAVY }]}>
      <BackgroundAtmosphere tintCenter={0.5} />

      <View style={[styles.content, isDesktop && { maxWidth: 420, width: '100%' }]}>
        {/* ── Official Emblem ── */}
        <View style={styles.emblemContainer}>
          <Image
            source={config.emblemAsset}
            style={
              config.emblemTinted !== false
                ? [styles.emblem, { tintColor: GOLD }]
                : styles.emblem
            }
            resizeMode="contain"
          />
        </View>

        {/* ── Official Authority Titles ── */}
        <Text style={styles.title}>{config.name.english}</Text>
        <Text style={styles.titleTh}>{config.name.primary}</Text>
        <Text style={styles.dept}>{config.issuer.english}</Text>
        <Text style={styles.deptTh}>{config.issuer.primary}</Text>

        {/* ── Subtle Gold Divider ── */}
        <View style={styles.divider} />

        {/* ── Auth Actions (Strict Google Sign-In Only) ── */}
        <View style={styles.actionsBox}>
          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0C1526" />
            ) : (
              <>
                <GoogleIcon size={18} />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
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
  emblemContainer: {
    width: 90,
    height: 90,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblem: {
    width: 90,
    height: 90,
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
    maxWidth: 300,
    alignItems: 'center',
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    color: '#0C1526',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.20)',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
});
