import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BiometricProvider, useBiometric } from '../src/context/BiometricContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import LockScreen from '../src/components/LockScreen';

SystemUI.setBackgroundColorAsync('#0C1526');

function AppShell() {
  const { authenticated } = useBiometric();
  const { theme, colors } = useTheme();

  if (!authenticated) return <LockScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
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
