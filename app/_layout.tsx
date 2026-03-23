import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BiometricProvider, useBiometric } from '../src/context/BiometricContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import LockScreen from '../src/components/LockScreen';

SystemUI.setBackgroundColorAsync('#0C1526');

function AppShell() {
  const { authenticated } = useBiometric();

  if (!authenticated) return <LockScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0C1526' }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ProfileProvider>
        <BiometricProvider>
          <AppShell />
        </BiometricProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}
