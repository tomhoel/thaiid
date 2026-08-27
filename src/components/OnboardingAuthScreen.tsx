import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
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
      snackbar.show('Entered Demo & Offline Mode', 'info');
    } catch (err: any) {
      snackbar.show(err?.message || 'Failed to enter demo mode', 'error');
    }
  };

  const isDesktop = width > 600;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: top + 16, paddingBottom: bottom + 16 }]}>
      <BackgroundAtmosphere tintCenter={0.5} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && { maxWidth: 520, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Emblem & Title ── */}
        <View style={styles.header}>
          <View style={styles.emblemGlowContainer}>
            <Image
              source={config.emblemAsset}
              style={
                config.emblemTinted !== false
                  ? { width: 68, height: 68, tintColor: colors.goldLight }
                  : { width: 68, height: 68 }
              }
              resizeMode="contain"
            />
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.officialBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.officialBadgeText}>Sovereign Digital Identity</Text>
            </View>
            <View style={[styles.officialBadge, { backgroundColor: 'rgba(217, 119, 6, 0.15)' }]}>
              <Ionicons name="hardware-chip-outline" size={12} color="#F59E0B" />
              <Text style={[styles.officialBadgeText, { color: '#F59E0B' }]}>e-ID Vault</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {config.name.english}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {config.issuer.primary} • Digital Identity & Credential System
          </Text>
        </View>

        {/* ── Feature Highlights ── */}
        <View style={styles.featuresList}>
          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
              <Ionicons name="card-outline" size={22} color="#4285F4" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Photorealistic 3D Smart Card
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                True-to-life official card with gyroscopic motion physics, specular light beam, and flip animation.
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="qr-code-outline" size={22} color="#10B981" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Dynamic 15-Second Offline QR
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Rotating TOTP cryptographic tokens with digital signatures for instant offline presentation.
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="finger-print-outline" size={22} color="#F59E0B" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                WebAuthn Passkey Protection
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Biometric hardware lock protecting your credentials on-device with zero-knowledge encryption.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0C1526" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#0C1526" style={{ marginRight: 10 }} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.guestButton,
              { borderColor: colors.cardBorder, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleGuestContinue}
            disabled={loading}
          >
            <Ionicons name="shield-outline" size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.guestButtonText, { color: colors.textPrimary }]}>
              Explore Demo / Offline Mode
            </Text>
          </Pressable>

          <Text style={[styles.securityFooter, { color: colors.textTertiary || '#6B7280' }]}>
            ISO/IEC 7810 ID-1 Standard • AES-256 GCM Local Hardware Vault
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  emblemGlowContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  officialBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  featuresList: {
    gap: 12,
    marginVertical: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextCol: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionContainer: {
    gap: 12,
    marginTop: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  googleButtonText: {
    color: '#0C1526',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  securityFooter: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
