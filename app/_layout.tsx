import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, Animated, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SystemUI from 'expo-system-ui';
import { useFonts, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools/production';
import { queryClient, asyncStoragePersister } from '../src/query/queryClient';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BiometricProvider, useBiometric } from '../src/context/BiometricContext';
import { ProfileProvider, useProfile } from '../src/context/ProfileContext';
import { ThemeProvider, ThemeAccentBridge, useTheme } from '../src/context/ThemeContext';
import { CountryProvider, useCountry } from '../src/context/CountryContext';
import { SnackbarProvider } from '../src/context/SnackbarContext';
import { AuthProvider } from '../src/context/AuthContext';
import LockScreen from '../src/components/LockScreen';
import AppSplash from '../src/components/AppSplash';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = async () => {
    await AsyncStorage.clear();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0C1526' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Reset App</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const SPLASH_MIN_MS = 800;

function AppShell() {
  const { authenticated, ready: bioReady } = useBiometric();
  const { colors, themeLoaded } = useTheme();
  const { ready: profileReady } = useProfile();
  const { countryLoaded, config } = useCountry();
  const [fontsLoaded] = useFonts({ IBMPlexMono_500Medium });
  const [splashDone, setSplashDone] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [splashRemoved, setSplashRemoved] = useState(false);
  const { width: winW, height: winH } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && winW > 500;

  const preloadAssets = useMemo(() => [
    config.cardImages.front,
    config.cardImages.back,
    config.emblemAsset,
  ], [config]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0C1526').catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 1. Register Service Worker for PWA Offline Caching
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          }).catch((err) => {
            console.log('[PWA] Service Worker registration failed:', err);
          });
        });
      }

      // 2. Ensure PWA Manifest link tag is present
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }

      // 3. Apple Touch Icon and Mobile Web App Meta Tags
      const metaTags = [
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Digital ID' },
        { name: 'theme-color', content: '#0C1526' },
      ];
      metaTags.forEach(({ name, content }) => {
        if (!document.querySelector(`meta[name="${name}"]`)) {
          const meta = document.createElement('meta');
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      });
    }
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  // Minimum splash duration
  useEffect(() => {
    timerRef.current = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Pre-load card images so they render instantly when content mounts
  useEffect(() => {
    Asset.loadAsync(preloadAssets)
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, [preloadAssets]);

  // Wait for auth to complete before revealing — biometric prompt fires during splash,
  // so the user authenticates behind the splash and goes straight to the main app
  const ready = themeLoaded && countryLoaded && bioReady && splashDone && fontsLoaded && assetsReady && profileReady;

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
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <ThemeProvider>
              <CountryProvider>
                <ThemeAccentBridge>
                <SnackbarProvider>
                <LanguageProvider>
                  <ProfileProvider>
                    <BiometricProvider>
                      <AppShell />
                    </BiometricProvider>
                  </ProfileProvider>
                </LanguageProvider>
                </SnackbarProvider>
                </ThemeAccentBridge>
              </CountryProvider>
            </ThemeProvider>
          </AuthProvider>
        </GestureHandlerRootView>
        {Platform.OS === 'web' && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
