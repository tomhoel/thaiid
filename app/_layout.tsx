import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BiometricProvider, useBiometric } from '../src/context/BiometricContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import LockScreen from '../src/components/LockScreen';
import AppSplash from '../src/components/AppSplash';

const SPLASH_MIN_MS = 800;

function AppShell() {
  const { authenticated, ready: bioReady } = useBiometric();
  const { theme, colors, themeLoaded } = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0C1526');
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  // Ensure splash shows for at least SPLASH_MIN_MS
  useEffect(() => {
    timerRef.current = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const loading = !themeLoaded || !bioReady || !splashDone;

  if (loading) return <AppSplash />;

  if (!authenticated) return <LockScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" backgroundColor={colors.navy} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ProfileProvider>
          <BiometricProvider>
            <AppShell />
          </BiometricProvider>
        </ProfileProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
