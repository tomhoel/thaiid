import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SystemUI from 'expo-system-ui';
import { useFonts, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Asset } from 'expo-asset';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BiometricProvider, useBiometric } from '../src/context/BiometricContext';
import { ProfileProvider, useProfile } from '../src/context/ProfileContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import LockScreen from '../src/components/LockScreen';
import AppSplash from '../src/components/AppSplash';

const SPLASH_MIN_MS = 800;

const PRELOAD_ASSETS = [
  require('../pics/1.png'),
  require('../pics/2.png'),
  require('../assets/garuda.png'),
];

function AppShell() {
  const { authenticated, ready: bioReady } = useBiometric();
  const { colors, themeLoaded } = useTheme();
  const { ready: profileReady } = useProfile();
  const [fontsLoaded] = useFonts({ IBMPlexMono_500Medium });
  const [splashDone, setSplashDone] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [splashRemoved, setSplashRemoved] = useState(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0C1526');
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  // Minimum splash duration
  useEffect(() => {
    timerRef.current = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Pre-load card images so they render instantly when content mounts
  useEffect(() => {
    Asset.loadAsync(PRELOAD_ASSETS)
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, []);

  const ready = themeLoaded && bioReady && splashDone && fontsLoaded && assetsReady && profileReady;

  // Cross-fade: splash fades out to reveal content underneath
  useEffect(() => {
    if (ready && !splashRemoved) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setSplashRemoved(true));
    }
  }, [ready, splashRemoved]);

  return (
    <View style={{ flex: 1, backgroundColor: themeLoaded ? colors.bg : '#0C1526' }}>
      {ready && (
        !authenticated ? <LockScreen /> : (
          <>
            <StatusBar style="light" backgroundColor={colors.navy} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </>
        )
      )}
      {!splashRemoved && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
          <AppSplash />
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <ProfileProvider>
            <BiometricProvider>
              <AppShell />
            </BiometricProvider>
          </ProfileProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
