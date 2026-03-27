import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useLang } from '../../src/i18n/LanguageContext';

export default function TabLayout() {
  const { theme, colors } = useTheme();
  const { t } = useLang();

  const screenOptions = useMemo(() => ({
    lazy: false,
    headerShown: false,
    animation: 'none' as const,
    tabBarActiveTintColor: colors.goldLight,
    tabBarInactiveTintColor: theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    tabBarStyle: {
      backgroundColor: theme === 'dark' ? colors.navy : colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: colors.b1,
      height: 78,
      paddingTop: 6,
      paddingBottom: 28,
      elevation: 0,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const, marginTop: 1 },
    tabBarIconStyle: { marginBottom: -2 },
  }), [theme, colors]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{
        title: 'Identity',
        tabBarLabel: t('tab.identity'),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="digital" options={{
        title: 'QR Code',
        tabBarLabel: t('tab.qr'),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarLabel: t('tab.settings'),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cog' : 'cog-outline'} size={20} color={color} />
        ),
      }} />
      <Tabs.Screen name="details" options={{ href: null }} />
    </Tabs>
  );
}
