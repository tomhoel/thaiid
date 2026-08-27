import { useMemo } from 'react';
import { Platform, Text } from 'react-native';
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
    tabBarInactiveTintColor: theme === 'dark' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
    tabBarStyle: {
      backgroundColor: theme === 'dark' ? colors.navy : colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: colors.b1,
      height: Platform.OS === 'web' ? 66 : 82,
      paddingTop: 6,
      paddingBottom: Platform.OS === 'web' ? 8 : 26,
      elevation: 0,
    },
    tabBarItemStyle: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 2,
    },
  }), [theme, colors]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{
        title: 'Identity',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, fontWeight: '600', marginTop: 3, textAlign: 'center' }}>
            {t('tab.identity')}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="digital" options={{
        title: 'QR Code',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, fontWeight: '600', marginTop: 3, textAlign: 'center' }}>
            {t('tab.qr')}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, fontWeight: '600', marginTop: 3, textAlign: 'center' }}>
            {t('tab.settings')}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cog' : 'cog-outline'} size={21} color={color} />
        ),
      }} />
      <Tabs.Screen name="details" options={{ href: null }} />
    </Tabs>
  );
}
